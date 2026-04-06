import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import ProfilePage from './ProfilePage';
import NotificationSystem from '../components/NotificationSystem';
import { Wrench, CheckCircle, Clock, AlertTriangle, Plus, Building2, ChevronDown, Video, Phone, Mail, X } from 'lucide-react';
import MobileNavbar from '../components/MobileNavbar';
// Shared Jitsi room link per issue ID
function VideoCallButton({ issueId, issueTitle, compact = false }) {
  const roomName = `easestay-issue-${issueId.slice(0, 8)}`;
  const jitsiUrl = `https://meet.jit.si/${roomName}`;
  return (
    <a href={jitsiUrl} target="_blank" rel="noopener noreferrer" title={issueTitle}
      className={`flex items-center gap-1.5 font-bold rounded-lg transition-all shadow-sm bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 ${compact ? 'px-2.5 py-1.5 text-[10px]' : 'px-3 py-1.5 text-xs'}`}>
      <Video size={compact ? 10 : 12} /> {compact ? 'Call' : 'Video Call'}
    </a>
  );
}

export default function WorkerDashboard({ session }) {
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');

  // All communities this worker belongs to (via workers table with profile_id)
  const [myCommunities, setMyCommunities] = useState([]);
  const [activeCommunity, setActiveCommunity] = useState(null);
  const [assignedIssues, setAssignedIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Join community flow
  const [joinCode, setJoinCode] = useState('');
  const [workerRole, setWorkerRole] = useState('plumber');
  const [joinError, setJoinError] = useState('');

  useEffect(() => { fetchData(); }, [session]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    const resolvedProfile = prof || { full_name: 'Technician' };
    setProfile(resolvedProfile);

    const userEmail = session.user.email;

    // Find worker entries two ways:
    // 1. Already linked by profile_id (future logins after fix)
    // 2. Email match (manually-added workers by owner before profile_id was set)
    const [{ data: byProfileId }, { data: byEmail }] = await Promise.all([
      supabase.from('workers')
        .select('id, name, role, phone, email, community_id, communities(id, name, join_code)')
        .eq('profile_id', session.user.id),
      supabase.from('workers')
        .select('id, name, role, phone, email, community_id, communities(id, name, join_code)')
        .ilike('email', userEmail || '__no_match__'),
    ]);

    // Merge, deduplicate by id
    const merged = [...(byProfileId || []), ...(byEmail || [])];
    const seen = new Set();
    const unique = merged.filter(w => { if (seen.has(w.id)) return false; seen.add(w.id); return true; });

    // Backfill profile_id on rows that were found by email but lack it
    const needsUpdate = unique.filter(w => !byProfileId?.find(b => b.id === w.id));
    if (needsUpdate.length > 0) {
      await supabase.from('workers').update({ profile_id: session.user.id })
        .in('id', needsUpdate.map(w => w.id));
    }

    if (unique.length > 0) {
      setMyCommunities(unique);
      const active = unique[0];
      setActiveCommunity(active);
      fetchIssues(active.id);
    } else {
      setMyCommunities([]);
      setActiveCommunity(null);
      setAssignedIssues([]);
    }
    setLoading(false);
  }, [session.user.id, session.user.email]);

  const fetchIssues = useCallback(async (workerId) => {
    const { data } = await supabase
      .from('issues')
      .select('*, profiles(full_name)')
      .eq('assigned_worker_id', workerId)
      .order('created_at', { ascending: false });
    setAssignedIssues(data || []);
  }, []);

  const switchCommunity = (workerEntry) => {
    setActiveCommunity(workerEntry);
    fetchIssues(workerEntry.id);
  };

  // Worker joins a community by code (adds a workers row with their profile_id)
  const handleJoinCommunity = async (e) => {
    e.preventDefault();
    setJoinError('');
    const { data: com, error } = await supabase
      .from('communities').select('id, name').eq('join_code', joinCode.toUpperCase()).single();
    if (error || !com) { setJoinError('Community not found. Check the code.'); return; }

    // Check not already in it
    const alreadyIn = myCommunities.find(w => w.community_id === com.id);
    if (alreadyIn) { setJoinError('You are already part of this community.'); return; }

    const { error: insertErr } = await supabase.from('workers').insert([{
      name: profile.full_name,
      role: workerRole,
      community_id: com.id,
      profile_id: session.user.id,
    }]);
    if (insertErr) { setJoinError(insertErr.message); return; }
    setJoinCode('');
    fetchData();
  };

  const updateStatus = async (issueId, newStatus) => {
    await supabase.from('issues').update({ status: newStatus }).eq('id', issueId);
    if (activeCommunity) fetchIssues(activeCommunity.id);
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

  const getStatusIcon = (s) => {
    if (s === 'Resolved') return <CheckCircle size={14} className="text-emerald-500" />;
    if (s === 'In Progress') return <Clock size={14} className="text-blue-500 animate-pulse" />;
    return <AlertTriangle size={14} className="text-amber-500" />;
  };

  const workerRoleEmoji = { plumber: '🔧', electrician: '⚡', cleaner: '🧹', maintenance: '🔨' };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50/50">
      <Sidebar role="worker" activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <MobileNavbar role="worker" activeTab={activeTab} setActiveTab={setActiveTab} />
        {activeCommunity && <NotificationSystem communityId={activeCommunity.community_id} role="worker" />}

        <main className="flex-1 p-5 sm:p-8 md:p-12 overflow-y-auto w-full max-w-5xl mx-auto">
          {activeTab === 'profile' && <ProfilePage session={session} />}

        {activeTab === 'tasks' && (
          <div className="max-w-3xl mx-auto space-y-8">
            <header className="border-b border-slate-200 pb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 font-bold text-xs mb-3 uppercase tracking-wider">
                <Wrench size={12} /> Technician
              </div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Hi, {profile?.full_name} 👷</h1>
              <p className="text-slate-500 mt-2 font-medium">Your assigned tasks across all communities.</p>
            </header>

            {/* Community switcher */}
            {myCommunities.length > 1 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Community:</span>
                {myCommunities.map(entry => (
                  <button key={entry.id} onClick={() => switchCommunity(entry)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border transition-all ${activeCommunity?.id === entry.id ? 'bg-primary/10 text-primary border-primary/20' : 'bg-white border-slate-200 text-slate-600 hover:border-primary/20 hover:text-primary'}`}>
                    <Building2 size={13} /> {entry.communities?.name}
                  </button>
                ))}
              </div>
            )}

            {/* Active community banner */}
            {activeCommunity && (
              <div className="flex items-center gap-3 bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-lg">
                  {workerRoleEmoji[activeCommunity.role] || '🔧'}
                </div>
                <div>
                  <p className="font-extrabold text-slate-900">{activeCommunity.communities?.name}</p>
                  <p className="text-xs text-slate-400 font-semibold capitalize">{activeCommunity.role}</p>
                </div>
                <span className="ml-auto text-xs font-bold bg-slate-100 px-2.5 py-1 rounded-full text-slate-500">{assignedIssues.length} tasks</span>
              </div>
            )}

            {/* Tasks */}
            {loading && <p className="text-slate-400 font-medium text-center py-8">Loading your tasks...</p>}

            {!loading && myCommunities.length === 0 && (
              <div className="p-8 border border-dashed border-slate-300 rounded-[2rem] bg-slate-50 text-center text-slate-500 font-medium">
                You haven't joined any community yet. Use the form below to join one.
              </div>
            )}

            {!loading && myCommunities.length > 0 && assignedIssues.length === 0 && (
              <div className="p-12 border border-dashed border-slate-300 rounded-[2rem] bg-slate-50 text-center text-slate-500 font-medium">
                No issues assigned to you in this community yet ✅
              </div>
            )}

            <div className="space-y-4">
              {assignedIssues.map(issue => (
                <div key={issue.id} className="border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
                  <div className={`h-1 w-full ${getPriorityBar(issue.priority)}`} />
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold border ${getPriorityColor(issue.priority)}`}>{issue.priority}</span>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border border-slate-200 px-2.5 py-0.5 rounded-full bg-slate-50">{issue.category}</span>
                      <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                        {getStatusIcon(issue.status)} {issue.status}
                      </div>
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 mb-1">{issue.title}</h3>
                    <p className="text-sm text-slate-500 font-medium line-clamp-2">{issue.description}</p>
                    <div className="mt-1 text-xs text-slate-400 font-medium">Room {issue.room_number} · {issue.profiles?.full_name}</div>

                    <div className="mt-4 flex flex-wrap gap-3 items-center">
                      {/* Status selector */}
                      <div className="relative">
                        <select value={issue.status} onChange={e => updateStatus(issue.id, e.target.value)}
                          className="py-2 pl-3 pr-8 rounded-xl text-sm bg-white border border-slate-200 font-bold outline-none cursor-pointer appearance-none focus:ring-2 focus:ring-primary/20 shadow-sm text-slate-700">
                          <option value="Pending">⏳ Pending</option>
                          <option value="In Progress">🔧 In Progress</option>
                          <option value="Resolved">✅ Resolved</option>
                        </select>
                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      {/* Video Call (same Jitsi room as owner/resident) */}
                      <VideoCallButton issueId={issue.id} issueTitle={issue.title} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Join a new community */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
              <h3 className="font-extrabold text-slate-900 mb-1 flex items-center gap-2"><Plus size={16} className="text-primary" /> Join Another Community</h3>
              <p className="text-sm text-slate-500 font-medium mb-4">Ask your PG Owner for the join code.</p>
              {joinError && <p className="mb-3 text-sm font-semibold text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-xl">{joinError}</p>}
              <form onSubmit={handleJoinCommunity} className="flex flex-col sm:flex-row gap-3">
                <input type="text" placeholder="Community Code (e.g. A1B2C3)" required value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono uppercase tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm font-bold" />
                <select value={workerRole} onChange={e => setWorkerRole(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold focus:outline-none cursor-pointer shadow-sm text-slate-700">
                  <option value="plumber">🔧 Plumber</option>
                  <option value="electrician">⚡ Electrician</option>
                  <option value="cleaner">🧹 Cleaner</option>
                  <option value="maintenance">🔨 Maintenance</option>
                </select>
                <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-sm whitespace-nowrap">Join</button>
              </form>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}
