import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../components/DashboardLayout';
import ProfilePage from './ProfilePage';
import NotificationSystem from '../components/NotificationSystem';
import { DashboardTrendChart, DashboardStatusChart } from '../components/dashboard-visuals';
import { Mic, Building2, Plus, Send, AlertTriangle, CheckCircle, Clock, Phone, Mail, Loader2, Zap, BrainCircuit, Video, Trash2, LogOut, Star } from 'lucide-react';

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
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [isChangingRoom, setIsChangingRoom] = useState(false);
  const [roomChangeError, setRoomChangeError] = useState(null);
  const [roomHistory, setRoomHistory] = useState([]);

  const [isListening, setIsListening] = useState(false);
  const [issueText, setIssueText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const recognitionRef = useRef(null);

  // Rating Modal State
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [pgRating, setPgRating] = useState(5);
  const [pgComment, setPgComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    setIsSubmittingRating(true);
    const { error } = await supabase.from('reviews').upsert({
      community_id: memberInfo.community_id,
      resident_id: session.user.id,
      rating: pgRating,
      comment: pgComment,
    }, { onConflict: 'community_id, resident_id' });
    
    setIsSubmittingRating(false);
    if (error) alert("Error submitting rating: " + error.message);
    else {
      alert("Thanks for your feedback!");
      setShowRatingModal(false);
    }
  };

  const fetchIssues = useCallback(async (communityId) => {
    const { data } = await supabase.from('issues')
      .select('*, workers(id, name, role, phone, email)')
      .eq('community_id', communityId).eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (data) setIssues(data);
  }, [session.user.id]);

  const fetchRoomHistory = useCallback(async () => {
    // Prefer explicit history table. If it does not exist yet, fall back to issues snapshots.
    const { data, error } = await supabase.from('room_history')
      .select('id, room_number, change_type, changed_at, community_id, communities(name)')
      .eq('user_id', session.user.id)
      .order('changed_at', { ascending: false });

    if (!error) {
      setRoomHistory(data || []);
      return;
    }

    const { data: issueData } = await supabase.from('issues')
      .select('id, room_number, created_at, community_id, communities(name)')
      .eq('user_id', session.user.id)
      .not('room_number', 'is', null)
      .order('created_at', { ascending: false });

    const deduped = [];
    const seen = new Set();
    for (const row of issueData || []) {
      const key = `${row.community_id}|${row.room_number}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push({
        id: row.id,
        room_number: row.room_number,
        changed_at: row.created_at,
        change_type: 'recorded',
        community_id: row.community_id,
        communities: row.communities,
      });
    }
    setRoomHistory(deduped);
  }, [session.user.id]);

  const logRoomHistory = useCallback(async ({ communityId, roomNo, changeType }) => {
    const { error } = await supabase.from('room_history').insert([{
      user_id: session.user.id,
      community_id: communityId,
      room_number: roomNo,
      change_type: changeType,
    }]);

    if (error) {
      // Do not block main actions if room_history migration is not applied yet.
      return false;
    }
    return true;
  }, [session.user.id]);

  const fetchUserData = useCallback(async () => {
    const { data: profData } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    setProfile(profData || { full_name: 'Unknown User' });
      const { data: memberRows } = await supabase.from('members')
        .select('*')
        .eq('user_id', session.user.id)
        .order('joined_at', { ascending: false });

      const eligible = (memberRows || [])
        .map((row) => {
          const normalizedStatus = (row.status || '').toLowerCase();
          return {
            ...row,
            status: normalizedStatus === 'approved' ? 'active' : normalizedStatus,
          };
        })
        .filter((row) => ['active', 'approved', 'pending', 'banned'].includes(row.status));

      const selectedMembership =
        eligible.find((row) => row.status === 'active') ||
        eligible.find((row) => row.status === 'pending') ||
        eligible.find((row) => row.status === 'banned') ||
        null;

      if (selectedMembership) {
        setMemberInfo(selectedMembership);
        const { data: comData } = await supabase.from('communities').select('*').eq('id', selectedMembership.community_id).single();
        setCommunity(comData);
        fetchIssues(selectedMembership.community_id);
    } else {
      setMemberInfo(null);
      setCommunity(null);
      setIssues([]);
    }
    fetchRoomHistory();
  }, [session.user.id, fetchIssues, fetchRoomHistory]);

  useEffect(() => { fetchUserData(); }, [fetchUserData]);

  const deleteIssue = useCallback(async (issueId) => {
    if (!window.confirm('Delete this issue request?')) return;
    await supabase.from('issues').delete().eq('id', issueId).eq('user_id', session.user.id);
    setIssues(prev => prev.filter(i => i.id !== issueId));
  }, [session.user.id]);

  useEffect(() => {
    if (!memberInfo) return;
    const sub = supabase.channel('public:issues_resident')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues', filter: `community_id=eq.${memberInfo.community_id}` }, () => {
        fetchIssues(memberInfo.community_id);
      }).subscribe();
    return () => supabase.removeChannel(sub);
  }, [memberInfo, fetchIssues]);

  const handleJoinCommunity = useCallback(async (e) => {
    e.preventDefault();
    try {
      const { data: com, error } = await supabase.from('communities').select('id').eq('join_code', joinCode).single();
      if (error || !com) throw new Error('Community not found. Double-check the code.');
      const payload = { user_id: session.user.id, community_id: com.id, room_number: roomNumber, status: 'pending', joined_at: new Date().toISOString() };
      const { error: joinErr } = await supabase.from('members').upsert([payload], { onConflict: 'user_id,community_id' });
      if (joinErr) throw joinErr;
      await logRoomHistory({ communityId: com.id, roomNo: roomNumber, changeType: 'joined' });
      fetchUserData();
    } catch (err) { alert(err.message); }
  }, [joinCode, roomNumber, session.user.id, fetchUserData, logRoomHistory]);

  const handleLeaveCommunity = useCallback(async () => {
    if (!memberInfo) return;
    if (!window.confirm('Are you sure you want to leave this PG? You can still view your past room history after leaving.')) return;
    try {
      const { error } = await supabase.from('members')
        .update({ status: 'left' })
        .eq('user_id', session.user.id)
        .eq('community_id', memberInfo.community_id);
      if (error) throw error;

      await logRoomHistory({ communityId: memberInfo.community_id, roomNo: memberInfo.room_number, changeType: 'left' });

      setMemberInfo(null);
      setCommunity(null);
      setIssues([]);
      setActiveTab('dashboard');
      fetchRoomHistory();
    } catch (err) {
      alert('Error leaving community: ' + err.message);
    }
  }, [memberInfo, session.user.id, fetchRoomHistory, logRoomHistory]);

  const handleChangeRoom = useCallback(async (e) => {
    e.preventDefault();
    if (!memberInfo) return;

    const nextRoom = newRoomNumber.trim();
    if (!nextRoom) {
      setRoomChangeError('Room number cannot be empty.');
      return;
    }
    if (nextRoom === memberInfo.room_number) {
      setRoomChangeError('This is already your current room.');
      return;
    }

    setIsChangingRoom(true);
    setRoomChangeError(null);
    try {
      const { error } = await supabase.from('members')
        .update({ room_number: nextRoom })
        .eq('id', memberInfo.id)
        .eq('user_id', session.user.id);
      if (error) throw error;

      await logRoomHistory({ communityId: memberInfo.community_id, roomNo: nextRoom, changeType: 'changed' });

      setMemberInfo(prev => ({ ...prev, room_number: nextRoom }));
      setShowRoomModal(false);
      fetchRoomHistory();
    } catch (err) {
      setRoomChangeError(err.message || 'Unable to change room right now.');
    } finally {
      setIsChangingRoom(false);
    }
  }, [memberInfo, newRoomNumber, session.user.id, fetchRoomHistory, logRoomHistory]);

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

      // Step 2: Auto-assign worker if issue is critical
      let assigned_worker_id = null;
      if (ai.priority === 'Critical' || ai.is_emergency) {
        const roleMap = { 'Plumbing': 'plumber', 'Electrical': 'electrician', 'Cleaning': 'cleaner' };
        const targetRole = roleMap[ai.category] || 'maintenance';
        
        // Try getting specific role first
        const { data: specificWorkers } = await supabase.from('workers')
          .select('id').eq('community_id', memberInfo.community_id).eq('role', targetRole);
          
        if (specificWorkers && specificWorkers.length > 0) {
          assigned_worker_id = specificWorkers[0].id;
        } else {
          // Fallback to any worker
          const { data: anyWorker } = await supabase.from('workers')
            .select('id').eq('community_id', memberInfo.community_id).limit(1);
          if (anyWorker && anyWorker.length > 0) assigned_worker_id = anyWorker[0].id;
        }
      }

      // Step 3: Insert into Supabase with AI results
      const { error } = await supabase.from('issues').insert([{
        user_id: session.user.id,
        community_id: memberInfo.community_id,
        room_number: memberInfo.room_number,
        title: ai.title || issueText.split(' ').slice(0, 6).join(' ') + '...',
        description: issueText,
        category: ai.category || 'Other',
        priority: ai.priority || 'Low',
        status: 'Pending',
        assigned_worker_id: assigned_worker_id
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

  const handleVerifyResolution = async (issueId) => {
    try {
      const { error } = await supabase.from('issues').update({ resident_verified: true }).eq('id', issueId);
      if (error) throw error;
      setIssues(prev => prev.map(i => i.id === issueId ? { ...i, resident_verified: true } : i));
    } catch (err) { alert('Error verifying resolution: ' + err.message); }
  };

  const handleDisputeResolution = async (issueId) => {
    try {
      const { error } = await supabase.from('issues')
        .update({ status: 'In Progress', priority: 'High', resident_verified: false }).eq('id', issueId);
      if (error) throw error;
      setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: 'In Progress', priority: 'High', resident_verified: false } : i));
    } catch (err) { alert('Error reopening issue: ' + err.message); }
  };

  const getRoomHistoryLabel = (type) => {
    if (type === 'joined') return 'Joined';
    if (type === 'changed') return 'Room Changed';
    if (type === 'left') return 'Left Community';
    return 'Recorded';
  };

  const issueSummary = {
    active: issues.filter(i => i.status !== 'Resolved').length,
    resolved: issues.filter(i => i.status === 'Resolved').length,
    critical: issues.filter(i => i.priority === 'Critical').length,
  };

  const recentIssueTrend = (() => {
    const days = 7;
    const reference = new Date();
    reference.setHours(0, 0, 0, 0);
    const toLocalDayKey = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const buckets = Array.from({ length: days }, (_, index) => {
      const date = new Date(reference);
      date.setDate(reference.getDate() - (days - 1 - index));
      const key = toLocalDayKey(date);
      return {
        key,
        dateLabel: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
        value: 0,
      };
    });
    const bucketMap = new Map(buckets.map((item) => [item.key, item]));
    issues.forEach((issue) => {
      const key = toLocalDayKey(new Date(issue.created_at));
      if (bucketMap.has(key)) bucketMap.get(key).value += 1;
    });
    return buckets;
  })();

  const residentStatusChart = [
    { name: 'Pending', value: issues.filter(i => i.status === 'Pending').length, color: '#f59e0b' },
    { name: 'In Progress', value: issues.filter(i => i.status === 'In Progress').length, color: '#3b82f6' },
    { name: 'Resolved', value: issues.filter(i => i.status === 'Resolved').length, color: '#10b981' },
  ].filter((item) => item.value > 0);

  if (!profile) return null;

  return (
    <DashboardLayout profile={profile} role="resident" title="Resident Dashboard" activeTab={activeTab} setActiveTab={setActiveTab}>
      {showRatingModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95">
             <h2 className="text-2xl font-black text-slate-900 mb-2">Rate {community?.name}</h2>
             <p className="text-slate-500 font-medium mb-6 text-sm">Your feedback helps rank this PG on the public directory!</p>
             <form onSubmit={handleSubmitRating} className="space-y-5">
               <div>
                  <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Overall Rating</label>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(star => (
                      <button key={star} type="button" onClick={() => setPgRating(star)}
                         className={`p-2 rounded-full transition-all ${pgRating >= star ? 'text-amber-500 hover:scale-110 bg-amber-50' : 'text-slate-300 hover:text-slate-400 bg-slate-50'}`}>
                         <Star size={32} className={pgRating >= star ? 'fill-amber-500' : ''} />
                      </button>
                    ))}
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Comments (Optional)</label>
                  <textarea rows="3" value={pgComment} onChange={e => setPgComment(e.target.value)} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-4 font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none text-sm placeholder:text-slate-400" placeholder="What do you love? What could improve?" />
               </div>
               <div className="flex gap-3 mt-4">
                 <button type="button" onClick={() => setShowRatingModal(false)} className="flex-1 py-3 bg-slate-100 font-bold text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                 <button type="submit" disabled={isSubmittingRating} className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-md transition-colors disabled:opacity-50">
                    {isSubmittingRating ? 'Saving...' : 'Submit Rating'}
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}

      {showRoomModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95">
            <h2 className="text-2xl font-black text-slate-900 mb-2">Change Room</h2>
            <p className="text-slate-500 font-medium mb-6 text-sm">Update your current room for this PG so future issues and records stay accurate.</p>
            <form onSubmit={handleChangeRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">New Room Number</label>
                <input
                  type="text"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl p-4 font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
                  placeholder="e.g. 204B"
                />
              </div>
              {roomChangeError && <p className="text-sm font-semibold text-red-600">{roomChangeError}</p>}
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => { setShowRoomModal(false); setRoomChangeError(null); }} className="flex-1 py-3 bg-slate-100 font-bold text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" disabled={isChangingRoom} className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-colors disabled:opacity-50">
                  {isChangingRoom ? 'Saving...' : 'Update Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        <main className="flex-1 p-5 sm:p-8 md:p-12 overflow-y-auto w-full max-w-5xl mx-auto">
          {activeTab === 'profile' && <ProfilePage session={session} />}

          {activeTab !== 'profile' && !memberInfo && (
            <div className="space-y-8 max-w-3xl mx-auto">
              <div className="flex flex-col items-center justify-center min-h-[44vh] max-w-md mx-auto text-center space-y-6">
                <div className="w-24 h-24 bg-white border border-slate-200 shadow-sm rounded-4xl flex items-center justify-center"><Plus size={40} className="text-primary" /></div>
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

              <div className="bg-white p-6 sm:p-8 rounded-4xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold mb-2 text-slate-900">Your Past Room History</h2>
                <p className="text-sm font-medium text-slate-500 mb-5">You can still view your past rooms even when you are not currently in a PG.</p>
                {roomHistory.length === 0 ? (
                  <div className="p-6 border border-dashed border-slate-300 rounded-2xl bg-slate-50 text-center text-slate-500 font-medium">No room history found yet.</div>
                ) : (
                  <div className="grid gap-3">
                    {roomHistory.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
                        <div>
                          <p className="font-bold text-slate-900">Room {entry.room_number}</p>
                          <p className="text-xs font-medium text-slate-500">{entry.communities?.name || 'Community'} • {new Date(entry.changed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 border border-slate-300 px-2.5 py-1 rounded-full bg-white">{getRoomHistoryLabel(entry.change_type)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab !== 'profile' && memberInfo && memberInfo.status === 'pending' && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center space-y-6">
              <div className="w-24 h-24 bg-amber-50 border border-amber-200 shadow-sm rounded-4xl flex items-center justify-center"><Clock size={40} className="text-amber-500 animate-pulse" /></div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Request Pending</h1>
              <p className="text-slate-500 font-medium">Your request to join the community has been sent to the PG Owner. Waiting for approval.</p>
              <button onClick={handleLeaveCommunity} className="text-sm font-bold text-red-500 hover:text-red-700 underline underline-offset-4 decoration-red-500/30">Cancel Request</button>
            </div>
          )}

          {(activeTab === 'dashboard' || activeTab === 'overview') && memberInfo && memberInfo.status !== 'pending' && (
            <div className="space-y-10 w-full">
              {activeTab === 'dashboard' && <NotificationSystem communityId={memberInfo.community_id} role="resident" />}
              
              <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-slate-200 pb-8 w-full gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs mb-3">
                    <Building2 size={12} /> {community?.name}
                  </div>
                  <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Hi, {profile.full_name}</h1>
                  <p className="text-slate-500 mt-2 font-medium">Room {memberInfo.room_number}</p>
                </div>
                {activeTab === 'dashboard' && (
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setNewRoomNumber(memberInfo?.room_number || ''); setRoomChangeError(null); setShowRoomModal(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                      Change Room
                    </button>
                  </div>
                )}
              </header>

              {/* ── DASHBOARD TAB (Active) ── */}
              {activeTab === 'dashboard' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">Active Issues</p>
                      <p className="mt-1 text-2xl font-black text-blue-900">{issueSummary.active}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">Resolved</p>
                      <p className="mt-1 text-2xl font-black text-emerald-900">{issueSummary.resolved}</p>
                    </div>
                    <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-red-700">Critical Alerts</p>
                      <p className="mt-1 text-2xl font-black text-red-900">{issueSummary.critical}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <DashboardTrendChart
                      title="Issue Activity"
                      subtitle="How many issues you raised in the last 7 days"
                      data={recentIssueTrend}
                      dataKey="value"
                      nameKey="dateLabel"
                      color="#60a5fa"
                      tone="blue"
                    />
                    <DashboardStatusChart
                      title="Issue Status"
                      subtitle="Current distribution of your reported issues"
                      data={residentStatusChart}
                      tone="emerald"
                    />
                  </div>

                  <div className="space-y-4 bg-white p-6 sm:p-8 rounded-4xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Report an Issue</h2>
                        <p className="text-slate-500 text-sm font-medium">Describe your problem or use voice input for instant reporting.</p>
                      </div>
                      <button onClick={() => setShowRatingModal(true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold shadow-sm transition-all hover:bg-violet-700 w-full sm:w-auto">
                        <Star size={16} /> Rate This PG
                      </button>
                    </div>
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

                    {isAnalyzing && (
                      <div className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-violet-50 border border-violet-200">
                        <Loader2 size={18} className="animate-spin text-violet-600 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-violet-700">AI is analyzing your report...</p>
                          <p className="text-xs text-violet-500 font-medium">Categorizing priority, type & urgency — just a moment</p>
                        </div>
                      </div>
                    )}

                    {!isAnalyzing && issueText && !submitSuccess && (
                      <div className="mt-3 flex gap-2 text-xs font-semibold items-center flex-wrap">
                        <span className="text-slate-400">Quick hints:</span>
                        {/spark|wire|switch|electricit/i.test(issueText) && <span className="px-2.5 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-700">⚡ Electrical</span>}
                        {/leak|water|tap|plumb|toilet/i.test(issueText) && <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700">💧 Plumbing</span>}
                        {/smoke|fire|gas|emergency|spark/i.test(issueText) && <span className="px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 font-extrabold">🚨 Possible Emergency</span>}
                        {/wifi|internet|network|router/i.test(issueText) && <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600">📶 Network</span>}
                      </div>
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl font-bold mb-6 text-slate-900">Your Active Issues</h2>
                    {issues.filter(i => i.status !== 'Resolved').length === 0 ? (
                      <div className="p-8 border border-dashed border-slate-300 rounded-4xl bg-slate-50 text-center text-slate-500 font-medium">
                        No active issues. Everything looks good! ☀️
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {issues.filter(i => i.status !== 'Resolved').map(issue => (
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
                                      <a href={`https://meet.jit.si/easestay-issue-${issue.id.slice(0, 8)}`} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-all shadow-sm">
                                        <Video size={12} /> Video Call
                                      </a>
                                      {issue.workers.phone && (
                                        <a href={`tel:${issue.workers.phone}`}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-800 text-xs font-bold rounded-lg hover:bg-amber-100 transition-all shadow-sm">
                                          <Phone size={12} /> Call {issue.workers.phone}
                                        </a>
                                      )}
                                      {issue.workers.email && (
                                        <a href={`mailto:${issue.workers.email}`}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-800 text-xs font-bold rounded-lg hover:bg-amber-100 transition-all shadow-sm">
                                          <Mail size={12} /> Email
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
                              {issue.status === 'Pending' && (
                                <button onClick={() => deleteIssue(issue.id)}
                                  className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors">
                                  <Trash2 size={11} /> Delete Request
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── OVERVIEW TAB (Resolved/Past) ── */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div className="bg-red-50 border border-red-200 p-6 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-red-800 text-lg">Leave Community</h3>
                      <p className="text-red-600/80 font-medium text-sm">Once you leave, you will lose access to report new issues or see updates for this PG.</p>
                    </div>
                    <button onClick={handleLeaveCommunity} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 transition-all shadow-sm shrink-0">
                      <LogOut size={16} /> Leave PG
                    </button>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold mb-4 text-slate-900">Room History</h2>
                    {roomHistory.length === 0 ? (
                      <div className="p-8 border border-dashed border-slate-300 rounded-4xl bg-slate-50 text-center text-slate-500 font-medium mb-8">
                        No room history found.
                      </div>
                    ) : (
                      <div className="grid gap-3 mb-8">
                        {roomHistory.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div>
                              <p className="font-bold text-slate-900">Room {entry.room_number}</p>
                              <p className="text-xs font-medium text-slate-500">{entry.communities?.name || 'Community'} • {new Date(entry.changed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 border border-slate-300 px-2.5 py-1 rounded-full bg-slate-50">{getRoomHistoryLabel(entry.change_type)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <h2 className="text-xl font-bold mb-6 text-slate-900">Your Resolved Issues</h2>
                    {issues.filter(i => i.status === 'Resolved').length === 0 ? (
                      <div className="p-8 border border-dashed border-slate-300 rounded-4xl bg-slate-50 text-center text-slate-500 font-medium">
                        No resolved issues found.
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {issues.filter(i => i.status === 'Resolved').map(issue => (
                          <div key={issue.id} className="border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all overflow-hidden opacity-90">
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
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-700 w-max shadow-sm shrink-0">
                                  {getStatusIcon(issue.status)}
                                  <span>{issue.status}</span>
                                </div>
                              </div>

                              {!issue.resident_verified ? (
                                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
                                  <p className="text-xs font-bold text-slate-700">Please verify if this issue was fixed to your satisfaction:</p>
                                  <div className="flex gap-2">
                                    <button onClick={() => handleVerifyResolution(issue.id)} className="flex-1 py-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200 rounded-lg text-xs font-bold transition-all shadow-sm">
                                      ✅ Yes, it's fixed
                                    </button>
                                    <button onClick={() => handleDisputeResolution(issue.id)} className="flex-1 py-2 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold transition-all shadow-sm">
                                      ❌ No, reopen issue
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 w-max shadow-sm">
                                  <CheckCircle size={14} /> Verified successfully by you
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
    </DashboardLayout>
  );
}
