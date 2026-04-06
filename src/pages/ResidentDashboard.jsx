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

  useEffect(() => {
    fetchUserData();
  }, [session]);

  const fetchUserData = async () => {
    // 1. Fetch Profile
    const { data: profData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();
    setProfile(profData || { full_name: 'Unknown User' });

    // 2. Fetch Membership
    const { data: memData } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle(); // might not be joined yet
      
    if (memData) {
      setMemberInfo(memData);
      
      // 3. Fetch Community
      const { data: comData } = await supabase
        .from('communities')
        .select('*')
        .eq('id', memData.community_id)
        .single();
      setCommunity(comData);

      // 4. Fetch Issues
      fetchIssues(memData.community_id);
    }
  };

  const fetchIssues = async (communityId) => {
    const { data } = await supabase
      .from('issues')
      .select('*')
      .eq('community_id', communityId)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (data) setIssues(data);
  };

  useEffect(() => {
    if (!memberInfo) return;
    
    const issuesSubscription = supabase
      .channel('public:issues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues', filter: `community_id=eq.${memberInfo.community_id}` }, () => {
        fetchIssues(memberInfo.community_id);
      })
      .subscribe();
      
    return () => supabase.removeChannel(issuesSubscription);
  }, [memberInfo]);

  const handleJoinCommunity = async (e) => {
    e.preventDefault();
    try {
      const { data: com, error: comErr } = await supabase
        .from('communities')
        .select('id')
        .eq('join_code', joinCode)
        .single();
        
      if (comErr || !com) throw new Error('Community not found');
      
      const { error: joinErr } = await supabase
        .from('members')
        .insert([{
          user_id: session.user.id,
          community_id: com.id,
          room_number: roomNumber
        }]);
        
      if (joinErr) throw joinErr;
      
      fetchUserData();
    } catch (err) {
      alert(err.message);
    }
  };

  const analyzeIssue = (text) => {
    const t = text.toLowerCase();
    let category = 'Other';
    let priority = 'Low';

    if (t.match(/leak|water|tap|sink|plumbing|toilet/)) category = 'Plumbing';
    else if (t.match(/spark|switch|wire|power|electricity|light/)) category = 'Electrical';
    else if (t.match(/clean|dust|trash|sweep|mop/)) category = 'Cleaning';
    else if (t.match(/wifi|internet|network|router/)) category = 'Network';

    if (t.match(/fire|shock|smoke|gas|emergency|critical/)) {
      priority = 'Critical';
      category = 'Emergency';
    } else if (t.match(/urgent|asap|broken|immediately/)) {
      priority = 'High';
    } else if (t.match(/leak|outage|stop/)) {
      priority = 'Medium';
    }

    return { category, priority };
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser. Give Chrome a try.');
      return;
    }
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join('');
      setIssueText(transcript);
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
        user_id: session.user.id,
        community_id: memberInfo.community_id,
        title: title,
        description: issueText,
        category,
        priority,
        room_number: memberInfo.room_number
      }]);
      setIssueText('');
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityColor = (p) => {
    switch (p) {
      case 'Critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Medium': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default: return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Resolved': return <CheckCircle className="text-emerald-500" size={16} />;
      case 'In Progress': return <Clock className="text-blue-500 animate-pulse" size={16} />;
      default: return <AlertTriangle className="text-amber-500" size={16} />;
    }
  };

  if (!profile) return null;

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar role="resident" activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 p-8 md:p-12 overflow-y-auto w-full max-w-5xl mx-auto border-none">
        {/* Profile Tab */}
        {activeTab === 'profile' && <ProfilePage session={session} />}

        {/* Not joined community yet */}
        {activeTab !== 'profile' && !memberInfo ? (
          <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-6">
            <div className="w-24 h-24 bg-white border border-slate-200 shadow-sm rounded-[2rem] flex items-center justify-center mb-4">
              <Plus size={40} className="text-primary" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Join your PG</h1>
            <p className="text-slate-500 font-medium">Enter the 6-digit code provided by your PG Owner to connect to your community dashboard.</p>
            
            <form onSubmit={handleJoinCommunity} className="w-full space-y-4">
              <input 
                type="text" 
                placeholder="Community Code (e.g., A1B2C3)" 
                required
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                className="w-full bg-white border border-slate-200 shadow-sm p-4 rounded-2xl text-center text-xl tracking-widest font-mono uppercase focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:font-medium placeholder:text-slate-400"
              />
              <input 
                type="text" 
                placeholder="Your Room Number" 
                required
                value={roomNumber}
                onChange={e => setRoomNumber(e.target.value)}
                className="w-full bg-white border border-slate-200 shadow-sm p-4 rounded-2xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium placeholder:text-slate-400"
              />
              <button 
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold p-4 rounded-2xl transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.1)]"
              >
                Join Community
              </button>
            </form>
          </div>
        ) : activeTab !== 'profile' ? (
          <div className="space-y-10 text-left w-full">
            <header className="flex justify-between items-end border-b border-slate-200 pb-8 w-full text-left">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs mb-3">
                  <Building2 size={12} /> {community?.name}
                </div>
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Hi, {profile.full_name}</h1>
                <p className="text-slate-500 mt-2 font-medium">Room {memberInfo.room_number}</p>
              </div>
            </header>

            {/* Raise Issue Section */}
            <div className="space-y-4 w-full text-left bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Report an Issue</h2>
              <p className="text-slate-500 text-sm font-medium mb-4">Describe your problem directly or use voice input for instant reporting.</p>
              <form onSubmit={handleSubmitIssue} className="relative group w-full text-left">
                <textarea
                  value={issueText}
                  onChange={(e) => setIssueText(e.target.value)}
                  placeholder="Typing issue details... (e.g. 'Spark coming from the switchboard')"
                  className="w-full h-36 bg-slate-50 border border-slate-200 shadow-inner rounded-2xl p-5 pr-20 resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-left text-slate-900 placeholder:text-slate-400 font-medium leading-relaxed"
                />
                
                <div className="absolute right-3 top-3 bottom-3 flex flex-col justify-between">
                  {/* Voice Button */}
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`p-3 rounded-xl transition-all shadow-sm ${
                      isListening 
                        ? 'bg-red-50 text-red-500 animate-pulse border border-red-200' 
                        : 'bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <Mic size={20} />
                  </button>
                  
                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={!issueText.trim()}
                    className="p-3 rounded-xl bg-slate-900 text-white transition-all hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 shadow-sm"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
              
              {/* Live Analysis Preview */}
              {issueText && (
                <div className="flex gap-3 text-xs font-semibold w-full text-left pt-2 pb-1 items-center animate-in fade-in">
                  <span className="text-slate-400 flex items-center">Detected:</span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 shadow-sm">
                    {analyzeIssue(issueText).category}
                  </span>
                  <span className={`px-3 py-1 rounded-full border shadow-sm ${getPriorityColor(analyzeIssue(issueText).priority)}`}>
                    {analyzeIssue(issueText).priority} Priority
                  </span>
                </div>
              )}
            </div>

            {/* Issue Tracking */}
            <div className="pt-2 w-full text-left">
              <h2 className="text-xl font-bold mb-6 text-slate-900">Your Recent Issues</h2>
              
              {issues.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-300 rounded-[2rem] bg-slate-50 text-center text-slate-500 font-medium w-full">
                  No issues reported yet. Your room is in perfect shape! ☀️
                </div>
              ) : (
                <div className="grid gap-4 w-full">
                  {issues.map(issue => (
                    <div key={issue.id} className="p-6 border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4 w-full group">
                      <div className="w-full text-left overflow-hidden">
                        <div className="flex items-center gap-3 mb-3 w-full text-left">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-extrabold border ${getPriorityColor(issue.priority)}`}>
                            {issue.priority}
                          </span>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{issue.category}</span>
                          <span className="text-xs font-medium text-slate-400 ml-auto">
                            {new Date(issue.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 truncate w-full text-left text-lg">{issue.title}</h3>
                        <p className="text-sm font-medium text-slate-500 truncate w-full text-left mt-1">{issue.description}</p>
                      </div>
                      
                      <div className="sm:ml-4 flex flex-col sm:items-end justify-center shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6 text-left">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status</span>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 whitespace-nowrap shadow-sm">
                          {getStatusIcon(issue.status)}
                          <span>{issue.status}</span>
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
