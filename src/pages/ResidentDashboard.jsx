import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import ProfilePage from './ProfilePage';
import { Mic, Building2, Plus, Send, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

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
    const sub = supabase.channel('public:issues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues', filter: `community_id=eq.${memberInfo.community_id}` }, () => {
        fetchIssues(memberInfo.community_id);
      }).subscribe();
    return () => supabase.removeChannel(sub);
  }, [memberInfo]);

  const handleJoinCommunity = async (e) => {
    e.preventDefault();
    try {
      const { data: com, error: comErr } = await supabase.from('communities').select('id').eq('join_code', joinCode).single();
      if (comErr || !com) throw new Error('Community not found');
      const { error: joinErr } = await supabase.from('members').insert([{ user_id: session.user.id, community_id: com.id, room_number: roomNumber }]);
      if (joinErr) throw joinErr;
      fetchUserData();
    } catch (err) { alert(err.message); }
  };

  const analyzeIssue = (text) => {
    const t = text.toLowerCase();
    let category = 'Other';
    let priority = 'Low';
    if (t.match(/leak|water|tap|sink|plumbing|toilet/)) category = 'Plumbing';
    else if (t.match(/spark|switch|wire|power|electricity|light/)) category = 'Electrical';
    else if (t.match(/clean|dust|trash|sweep|mop/)) category = 'Cleaning';
    else if (t.match(/wifi|internet|network|router/)) category = 'Network';
    if (t.match(/fire|shock|smoke|gas|emergency|critical/)) { priority = 'Critical'; category = 'Emergency'; }
    else if (t.match(/urgent|asap|broken|immediately/)) priority = 'High';
    else if (t.match(/leak|outage|stop/)) priority = 'Medium';
    return { category, priority };
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
    recognition.onresult = (event) => {
      setIssueText(Array.from(event.results).map(r => r[0].transcript).join(''));
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    if (!issueText.trim() || !memberInfo) return;
    const { category, priority } = analyzeIssue(issueText);
    const title = issueText.split(' ').slice(0, 6).join(' ') + '...';
    try {
      await supabase.from('issues').insert([{
        user_id: session.user.id, community_id: memberInfo.community_id,
        title, description: issueText, category, priority, room_number: memberInfo.room_number
      }]);
      setIssueText('');
    } catch (err) { console.error(err); }
  };

  const getPriorityColor = (p) => {
    if (p === 'Critical') return 'text-red-600 bg-red-50 border-red-200';
    if (p === 'High') return 'text-orange-600 bg-orange-50 border-orange-200';
    if (p === 'Medium') return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-emerald-700 bg-emerald-50 border-emerald-200';
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

        {/* Profile Tab */}
        {activeTab === 'profile' && <ProfilePage session={session} />}

        {/* Join Community Screen */}
        {activeTab !== 'profile' && !memberInfo && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center space-y-6">
            <div className="w-24 h-24 bg-white border border-slate-200 shadow-sm rounded-[2rem] flex items-center justify-center">
              <Plus size={40} className="text-primary" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Join your PG</h1>
            <p className="text-slate-500 font-medium">Enter the 6-digit code provided by your PG Owner to connect to your community dashboard.</p>
            <form onSubmit={handleJoinCommunity} className="w-full space-y-4">
              <input type="text" placeholder="Community Code (e.g., A1B2C3)" required value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                className="w-full bg-white border border-slate-200 shadow-sm p-4 rounded-2xl text-center text-xl tracking-widest font-mono uppercase focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:font-medium placeholder:text-slate-400"
              />
              <input type="text" placeholder="Your Room Number" required value={roomNumber}
                onChange={e => setRoomNumber(e.target.value)}
                className="w-full bg-white border border-slate-200 shadow-sm p-4 rounded-2xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium placeholder:text-slate-400"
              />
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold p-4 rounded-2xl transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.1)]">
                Join Community
              </button>
            </form>
          </div>
        )}

        {/* Main Dashboard */}
        {activeTab !== 'profile' && memberInfo && (
          <div className="space-y-10 text-left w-full">
            <header className="flex justify-between items-end border-b border-slate-200 pb-8 w-full">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs mb-3">
                  <Building2 size={12} /> {community?.name}
                </div>
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Hi, {profile.full_name}</h1>
                <p className="text-slate-500 mt-2 font-medium">Room {memberInfo.room_number}</p>
              </div>
            </header>

            {/* Raise Issue */}
            <div className="space-y-4 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Report an Issue</h2>
              <p className="text-slate-500 text-sm font-medium">Describe your problem or use voice input for instant reporting.</p>
              <form onSubmit={handleSubmitIssue} className="relative">
                <textarea value={issueText} onChange={(e) => setIssueText(e.target.value)}
                  placeholder="e.g. 'Spark coming from the switchboard'"
                  className="w-full h-36 bg-slate-50 border border-slate-200 shadow-inner rounded-2xl p-5 pr-20 resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium leading-relaxed"
                />
                <div className="absolute right-3 top-3 bottom-3 flex flex-col justify-between">
                  <button type="button" onClick={handleVoiceInput}
                    className={`p-3 rounded-xl transition-all shadow-sm ${isListening ? 'bg-red-50 text-red-500 animate-pulse border border-red-200' : 'bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-slate-200'}`}>
                    <Mic size={20} />
                  </button>
                  <button type="submit" disabled={!issueText.trim()}
                    className="p-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 shadow-sm transition-all">
                    <Send size={20} />
                  </button>
                </div>
              </form>
              {issueText && (
                <div className="flex gap-3 text-xs font-semibold items-center pt-2">
                  <span className="text-slate-400">Detected:</span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 shadow-sm">{analyzeIssue(issueText).category}</span>
                  <span className={`px-3 py-1 rounded-full border shadow-sm ${getPriorityColor(analyzeIssue(issueText).priority)}`}>{analyzeIssue(issueText).priority} Priority</span>
                </div>
              )}
            </div>

            {/* Recent Issues */}
            <div>
              <h2 className="text-xl font-bold mb-6 text-slate-900">Your Recent Issues</h2>
              {issues.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-300 rounded-[2rem] bg-slate-50 text-center text-slate-500 font-medium">
                  No issues reported yet. Your room is in perfect shape! ☀️
                </div>
              ) : (
                <div className="grid gap-4">
                  {issues.map(issue => (
                    <div key={issue.id} className="border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
                      {/* Priority bar */}
                      <div className={`h-1 w-full ${issue.priority === 'Critical' ? 'bg-red-500' : issue.priority === 'High' ? 'bg-orange-400' : issue.priority === 'Medium' ? 'bg-yellow-400' : 'bg-emerald-400'}`} />
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold border ${getPriorityColor(issue.priority)}`}>{issue.priority}</span>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border border-slate-200 px-2 py-0.5 rounded-full bg-slate-50">{issue.category}</span>
                          <span className="text-xs font-medium text-slate-400 ml-auto">{new Date(issue.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg leading-snug mb-1">{issue.title}</h3>
                        <p className="text-sm font-medium text-slate-500 line-clamp-2">{issue.description}</p>

                        <div className="mt-4 flex flex-col sm:flex-row gap-3">
                          {/* Status */}
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 w-max shadow-sm">
                            {getStatusIcon(issue.status)}
                            <span>{issue.status}</span>
                          </div>

                          {/* Assigned Technician */}
                          {issue.workers ? (
                            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex flex-col gap-0.5">
                              <span className="text-[9px] font-extrabold text-amber-500 uppercase tracking-wider">Assigned Technician</span>
                              <p className="font-bold text-amber-900 text-sm">{issue.workers.name} <span className="font-normal text-amber-700 capitalize">({issue.workers.role})</span></p>
                              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                                {issue.workers.phone && (
                                  <span className="text-xs text-amber-700 font-medium flex items-center gap-1">📞 {issue.workers.phone}</span>
                                )}
                                {issue.workers.email && (
                                  <span className="text-xs text-amber-700 font-medium flex items-center gap-1">✉️ {issue.workers.email}</span>
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
