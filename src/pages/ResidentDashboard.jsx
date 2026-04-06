import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import ProfilePage from './ProfilePage';
import { Mic, Building2, Plus, Send, AlertTriangle, CheckCircle, Clock, Phone, Mail, Loader2, Zap, BrainCircuit } from 'lucide-react';

const GROQ_SYSTEM_PROMPT = `You are EaseStay's AI issue categorization engine for a PG accommodation system.
Analyze the resident's issue report and return ONLY valid JSON with no extra text.

Return:
{
  "category": "<Plumbing|Electrical|Cleaning|Network|Maintenance|Emergency|Other>",
  "priority": "<Low|Medium|High|Critical>",
  "title": "<concise 6-10 word title>",
  "intent": "<1 sentence summary of the issue>",
  "is_emergency": <true if fire, real sparks/smoke, gas leak, flooding — else false>
}

Priority rules: Critical=life-threatening, High=broken critical system, Medium=significant inconvenience, Low=minor issue.
Return ONLY valid JSON.`;

async function callGroqAI(text) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('Groq API key not configured. Add VITE_GROQ_API_KEY to your .env file.');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: GROQ_SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const rawContent = data.choices?.[0]?.message?.content ?? '{}';
  const cleaned = rawContent.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

export default function ResidentDashboard({ session }) {
  const [profile, setProfile] = useState(null);
  const [memberInfo, setMemberInfo] = useState(null);
  const [community, setCommunity] = useState(null);
  const [issues, setIssues] = useState([]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [joinCode, setJoinCode] = useState('');
  const [roomNumber, setRoomNumber] = useState('');

  const [isListening, setIsListening] = useState(false);
  const [issueText, setIssueText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => { fetchUserData(); }, [session]);

  const fetchUserData = async () => {
    const { data: profData } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    setProfile(profData || { full_name: 'Unknown User' });
    const { data: memData } = await supabase.from('members').select('*').eq('user_id', session.user.id).maybeSingle();
    if (memData) {
      setMemberInfo(memData);
      const { data: comData } = await supabase.from('communities').select('*').eq('id', memData.community_id).single();
      setCommunity(comData);
      fetchIssues(memData.community_id);
    }
  };

  const fetchIssues = async (communityId) => {
    const { data } = await supabase.from('issues')
      .select('*, workers(id, name, role, phone, email)')
      .eq('community_id', communityId).eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (data) setIssues(data);
  };

  useEffect(() => {
    if (!memberInfo) return;
    const sub = supabase.channel('public:issues_resident')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues', filter: `community_id=eq.${memberInfo.community_id}` }, () => {
        fetchIssues(memberInfo.community_id);
      }).subscribe();
    return () => supabase.removeChannel(sub);
  }, [memberInfo]);

  const handleJoinCommunity = async (e) => {
    e.preventDefault();
    try {
      const { data: com, error } = await supabase.from('communities').select('id').eq('join_code', joinCode).single();
      if (error || !com) throw new Error('Community not found. Double-check the code.');
      const { error: joinErr } = await supabase.from('members').insert([{ user_id: session.user.id, community_id: com.id, room_number: roomNumber }]);
      if (joinErr) throw joinErr;
      fetchUserData();
    } catch (err) { alert(err.message); }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported. Try Chrome.'); return;
    }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.continuous = false; recognition.interimResults = true;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e) => setIssueText(Array.from(e.results).map(r => r[0].transcript).join(''));
    recognitionRef.current = recognition;
    recognition.start();
  };

  // ── AI-Powered submit: Groq called directly from browser ──
  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    if (!issueText.trim() || !memberInfo) return;

    setIsAnalyzing(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    setAiResult(null);

    try {
      // Step 1: Call Groq AI directly
      const ai = await callGroqAI(issueText);
      setAiResult(ai);

      // Step 2: Insert into Supabase with AI results
      const { error } = await supabase.from('issues').insert([{
        user_id: session.user.id,
        community_id: memberInfo.community_id,
        room_number: memberInfo.room_number,
        title: ai.title || issueText.split(' ').slice(0, 6).join(' ') + '...',
        description: issueText,
        category: ai.category || 'Other',
        priority: ai.priority || 'Low',
        status: 'Pending',
      }]);
      if (error) throw new Error(error.message);

      setIssueText('');
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 6000);

      if (ai.is_emergency) {
        setTimeout(() => alert('🚨 Emergency detected! Your PG Owner has been notified.'), 100);
      }

      fetchIssues(memberInfo.community_id);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPriorityColor = (p) => {
    if (p === 'Critical') return 'text-red-600 bg-red-50 border-red-200';
    if (p === 'High') return 'text-orange-600 bg-orange-50 border-orange-200';
    if (p === 'Medium') return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  };

  const getPriorityBar = (p) => {
    if (p === 'Critical') return 'bg-red-500';
    if (p === 'High') return 'bg-orange-400';
    if (p === 'Medium') return 'bg-yellow-400';
    return 'bg-emerald-400';
  };

  const getStatusIcon = (status) => {
    if (status === 'Resolved') return <CheckCircle className="text-emerald-500" size={16} />;
    if (status === 'In Progress') return <Clock className="text-blue-500 animate-pulse" size={16} />;
    return <AlertTriangle className="text-amber-500" size={16} />;
  };

  if (!profile) return null;

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar role="resident" activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 p-8 md:p-12 overflow-y-auto w-full max-w-5xl mx-auto">

        {activeTab === 'profile' && <ProfilePage session={session} />}

        {activeTab !== 'profile' && !memberInfo && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center space-y-6">
            <div className="w-24 h-24 bg-white border border-slate-200 shadow-sm rounded-[2rem] flex items-center justify-center"><Plus size={40} className="text-primary" /></div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Join your PG</h1>
            <p className="text-slate-500 font-medium">Enter the 6-digit code provided by your PG Owner.</p>
            <form onSubmit={handleJoinCommunity} className="w-full space-y-4">
              <input type="text" placeholder="Community Code (e.g., A1B2C3)" required value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-center text-xl tracking-widest font-mono uppercase focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-400 shadow-sm" />
              <input type="text" placeholder="Your Room Number" required value={roomNumber}
                onChange={e => setRoomNumber(e.target.value)}
                className="w-full bg-white border border-slate-200 p-4 rounded-2xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium placeholder:text-slate-400 shadow-sm" />
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold p-4 rounded-2xl transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.1)]">Join Community</button>
            </form>
          </div>
        )}

        {activeTab !== 'profile' && memberInfo && (
          <div className="space-y-10 w-full">
            <header className="flex justify-between items-end border-b border-slate-200 pb-8 w-full">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs mb-3">
                  <Building2 size={12} /> {community?.name}
                </div>
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Hi, {profile.full_name}</h1>
                <p className="text-slate-500 mt-2 font-medium">Room {memberInfo.room_number}</p>
              </div>
            </header>

            {/* AI Issue Reporter */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-5 right-5 flex items-center gap-1.5 bg-gradient-to-r from-violet-50 to-purple-50 text-violet-600 px-3 py-1.5 rounded-full text-xs font-extrabold border border-violet-200">
                <BrainCircuit size={12} /> AI-Powered
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-1">Report an Issue</h2>
              <p className="text-slate-500 text-sm font-medium mb-5">Speak or type — AI will categorize and prioritize it automatically.</p>

              {submitSuccess && aiResult && (
                <div className={`mb-4 p-4 rounded-xl border flex items-start gap-3 ${aiResult.is_emergency ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                  <CheckCircle size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">{aiResult.is_emergency ? '🚨 Emergency detected — Owner notified!' : '✓ Issue submitted & categorized!'}</p>
                    <p className="text-xs font-medium mt-0.5 opacity-80">AI detected: <b>{aiResult.category}</b> · <b>{aiResult.priority}</b> priority · "{aiResult.intent}"</p>
                  </div>
                </div>
              )}

              {submitError && (
                <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
                  ⚠️ {submitError}
                </div>
              )}

              <form onSubmit={handleSubmitIssue} className="relative">
                <textarea value={issueText} onChange={e => setIssueText(e.target.value)}
                  placeholder="e.g. 'Sparks and smoke from switchboard!' or tap mic to speak..."
                  disabled={isAnalyzing}
                  className="w-full h-36 bg-slate-50 border border-slate-200 shadow-inner rounded-2xl p-5 pr-20 resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="absolute right-3 top-3 bottom-3 flex flex-col justify-between">
                  <button type="button" onClick={handleVoiceInput} disabled={isAnalyzing}
                    className={`p-3 rounded-xl transition-all shadow-sm ${isListening ? 'bg-red-50 text-red-500 animate-pulse border border-red-200' : 'bg-white text-slate-400 hover:text-primary hover:bg-slate-50 border border-slate-200 hover:border-primary/30'}`}>
                    <Mic size={20} />
                  </button>
                  <button type="submit" disabled={!issueText.trim() || isAnalyzing}
                    className="p-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 shadow-sm transition-all disabled:cursor-not-allowed">
                    {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                </div>
              </form>

              {/* Analyzing overlay */}
              {isAnalyzing && (
                <div className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-violet-50 border border-violet-200">
                  <Loader2 size={18} className="animate-spin text-violet-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-violet-700">AI is analyzing your report...</p>
                    <p className="text-xs text-violet-500 font-medium">Categorizing priority, type & urgency — just a moment</p>
                  </div>
                </div>
              )}

              {/* Live keyword hints */}
              {!isAnalyzing && issueText && !submitSuccess && (
                <div className="mt-3 flex gap-2 text-xs font-semibold items-center flex-wrap">
                  <span className="text-slate-400">Quick hints:</span>
                  {/spark|wire|switch|electricit/i.test(issueText) && <span className="px-2.5 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-700">⚡ Electrical</span>}
                  {/leak|water|tap|plumb|toilet/i.test(issueText) && <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700">💧 Plumbing</span>}
                  {/smoke|fire|gas|emergency|spark/i.test(issueText) && <span className="px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 font-extrabold">🚨 Possible Emergency</span>}
                  {/wifi|internet|network|router/i.test(issueText) && <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600">📶 Network</span>}
                  <span className="text-slate-300 ml-auto italic font-normal">AI will finalize on submit</span>
                </div>
              )}
            </div>

            {/* Issues List */}
            <div>
              <h2 className="text-xl font-bold mb-6 text-slate-900">Your Recent Issues</h2>
              {issues.length === 0 ? (
                <div className="p-10 border border-dashed border-slate-300 rounded-[2rem] bg-slate-50 text-center text-slate-500 font-medium">
                  No issues reported yet ☀️
                </div>
              ) : (
                <div className="grid gap-4">
                  {issues.map(issue => (
                    <div key={issue.id} className="border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
                      <div className={`h-1 w-full ${getPriorityBar(issue.priority)}`} />
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold border ${getPriorityColor(issue.priority)}`}>{issue.priority}</span>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border border-slate-200 px-2.5 py-0.5 rounded-full bg-slate-50">{issue.category}</span>
                          <span className="text-xs font-medium text-slate-400 ml-auto">{new Date(issue.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg leading-snug mb-1">{issue.title}</h3>
                        <p className="text-sm font-medium text-slate-500 line-clamp-2">{issue.description}</p>

                        <div className="mt-4 flex flex-col sm:flex-row gap-3">
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 w-max shadow-sm shrink-0">
                            {getStatusIcon(issue.status)}
                            <span>{issue.status}</span>
                          </div>

                          {issue.workers ? (
                            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-col gap-2">
                              <div>
                                <span className="text-[9px] font-extrabold text-amber-500 uppercase tracking-wider">Assigned Technician</span>
                                <p className="font-bold text-amber-900 text-sm mt-0.5">
                                  {issue.workers.name} <span className="font-normal text-amber-700 capitalize">({issue.workers.role})</span>
                                </p>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {issue.workers.phone && (
                                  <a href={`tel:${issue.workers.phone}`}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-800 text-xs font-bold rounded-lg hover:bg-amber-100 transition-all shadow-sm">
                                    <Phone size={12} /> Call {issue.workers.phone}
                                  </a>
                                )}
                                {issue.workers.email && (
                                  <a href={`mailto:${issue.workers.email}?subject=Issue: ${encodeURIComponent(issue.title)}&body=Hi ${issue.workers.name},%0A%0AI have an issue (Room ${memberInfo.room_number}): ${encodeURIComponent(issue.description)}`}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-800 text-xs font-bold rounded-lg hover:bg-amber-100 transition-all shadow-sm">
                                    <Mail size={12} /> Email Technician
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 bg-slate-50 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 flex items-center">
                              <span className="text-xs font-semibold text-slate-400">⏳ No technician assigned yet</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
