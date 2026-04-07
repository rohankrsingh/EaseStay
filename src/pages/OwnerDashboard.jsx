import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../components/DashboardLayout';
import ProfilePage from './ProfilePage';
import NotificationSystem from '../components/NotificationSystem';
import {
  Building, Users, AlertCircle, CheckCircle2, Clock, Plus, Wrench, Trash2, X,
  Mail, Phone, ChevronDown, Video, Filter, Search, ChevronRight, ChevronUp, Bell,
  Shield, ShieldOff, Crown, ToggleLeft, ToggleRight, Sliders,Building2
} from 'lucide-react';

// ── Confirmation Modal ──
function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-7 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-extrabold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm font-medium mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all">Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ── Emergency Alert Modal ──
function EmergencyAlert({ issue, onDismiss }) {
  return (
    <div className="fixed inset-0 bg-red-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] border-2 border-red-500 shadow-2xl p-8 w-full max-w-md text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-red-500 animate-pulse" />
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
          <AlertCircle size={40} className="text-red-600 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black text-red-700 mb-2">🚨 Emergency Alert!</h2>
        <p className="text-slate-600 font-semibold mb-1">{issue.title}</p>
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-600">{issue.category}</span>
          <span className="text-xs text-slate-500 font-medium">Room {issue.room_number || '?'}</span>
        </div>
        <p className="text-sm text-slate-500 font-medium mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">"{issue.description}"</p>
        <button onClick={onDismiss} className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold transition-all">
          Acknowledge & Take Action
        </button>
      </div>
    </div>
  );
}

// ── Video Call Button ──
function VideoCallButton({ issueId, issueTitle }) {
  const roomName = `easestay-issue-${issueId.slice(0, 8)}`;
  const jitsiUrl = `https://meet.jit.si/${roomName}`;
  return (
    <a href={jitsiUrl} target="_blank" rel="noopener noreferrer"
      title={`Video call about: ${issueTitle}`}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-all shadow-sm">
      <Video size={12} /> Video Call
    </a>
  );
}

export default function OwnerDashboard({ session }) {
  const [profile, setProfile] = useState(null);
  const [communities, setCommunities] = useState([]);
  const [activeCommunity, setActiveCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [workers, setWorkers] = useState([]);

  const [activeTab, setActiveTab] = useState('issues');
  const [newCommunityName, setNewCommunityName] = useState('');

  // Worker form
  const [workerName, setWorkerName] = useState('');
  const [workerRole, setWorkerRole] = useState('plumber');
  const [workerPhone, setWorkerPhone] = useState('');
  const [workerEmail, setWorkerEmail] = useState('');
  const [addingWorker, setAddingWorker] = useState(false);

  // Modals
  const [confirm, setConfirm] = useState(null);
  const [emergency, setEmergency] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [expandedResident, setExpandedResident] = useState(null);

  // Filters
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // Notification count
  const [notifCount, setNotifCount] = useState(0);

  // PG Info form state
  const [commDesc, setCommDesc] = useState('');
  const [commAddress, setCommAddress] = useState('');
  const [commFreeRooms, setCommFreeRooms] = useState(0);
  const [commFeatures, setCommFeatures] = useState('');
  const [commImages, setCommImages] = useState([]);
  const [updatingComm, setUpdatingComm] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (activeCommunity) {
      setCommDesc(activeCommunity.description || '');
      setCommAddress(activeCommunity.location_address || '');
      setCommFreeRooms(activeCommunity.free_rooms || 0);
      setCommFeatures(activeCommunity.features ? activeCommunity.features.join(', ') : '');
      setCommImages(activeCommunity.images || []);
    }
  }, [activeCommunity]);

  useEffect(() => { fetchData(); }, [session]);

  const fetchData = async () => {
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    setProfile(prof || { full_name: 'Owner' });
    
    // Fetch communities where user is owner OR a co_owner
    const [{ data: ownedComms }, { data: coOwnedMembers }] = await Promise.all([
      supabase.from('communities').select('*').eq('owner_id', session.user.id),
      supabase.from('members').select('communities(*)').eq('user_id', session.user.id).eq('community_role', 'co_owner')
    ]);
    
    const allComms = [...(ownedComms || []), ...(coOwnedMembers?.map(m => m.communities) || [])];
    const uniqueComms = Array.from(new Map(allComms.map(c => [c.id, c])).values()).filter(Boolean);
    
    setCommunities(uniqueComms);
    if (uniqueComms.length > 0) {
      setActiveCommunity(uniqueComms[0]);
      fetchCommunityData(uniqueComms[0].id);
      if (activeTab === 'issues') setActiveTab('communities_overview'); // Default to overview
    }
  };

  const fetchCommunityData = async (commId) => {
    const priorityWeights = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    const { data: issuesData } = await supabase.from('issues')
      .select('*, profiles(full_name), workers(id, name, role, phone, email)')
      .eq('community_id', commId).order('created_at', { ascending: false });
    const sorted = (issuesData || []).sort((a, b) => priorityWeights[b.priority] - priorityWeights[a.priority]);
    setIssues(sorted);

    const { data: memsData } = await supabase.from('members')
      .select('*, profiles(id, full_name, phone, bio, role, created_at)').eq('community_id', commId);
    setMembers(memsData || []);

    const { data: workersData } = await supabase.from('workers').select('*').eq('community_id', commId);
    setWorkers(workersData || []);
  };

  // Real-time: detect emergency issues, update state, count notifications
  useEffect(() => {
    if (!activeCommunity) return;
    const channel = supabase.channel('owner_realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'issues',
        filter: `community_id=eq.${activeCommunity.id}`,
      }, (payload) => {
        const issue = payload.new;
        setNotifCount(n => n + 1);
        // Trigger emergency alert
        if (issue.priority === 'Critical' || issue.category === 'Emergency') {
          setEmergency(issue);
        }
        fetchCommunityData(activeCommunity.id);
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'issues',
        filter: `community_id=eq.${activeCommunity.id}`,
      }, () => {
        fetchCommunityData(activeCommunity.id);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeCommunity]);

  const handleUpdatePGInfo = async (e) => {
    e.preventDefault();
    setUpdatingComm(true);
    try {
      const featuresArray = (typeof commFeatures === 'string' ? commFeatures : '').split(',').map(f => f.trim()).filter(f => f);
      const { error } = await supabase.from('communities').update({
        description: commDesc,
        location_address: commAddress,
        free_rooms: parseInt(commFreeRooms) || 0,
        features: featuresArray,
        images: commImages
      }).eq('id', activeCommunity.id);
      
      if (error) throw error;
      
      alert("PG Info updated successfully.");
      setActiveCommunity({
        ...activeCommunity,
        description: commDesc,
        location_address: commAddress,
        free_rooms: parseInt(commFreeRooms) || 0,
        features: featuresArray,
        images: commImages
      });
      fetchData();
    } catch (err) {
      alert("Error updating PG Info: " + err.message);
    } finally {
      setUpdatingComm(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${activeCommunity.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('community-images').upload(filePath, file);
      
      if (uploadError) {
        if (uploadError.message.toLowerCase().includes('bucket')) {
           throw new Error("Bucket 'community-images' not found or permissions denied. Please create it in your Supabase dashboard under Storage and set the policy to Public.");
        }
        throw uploadError;
      }
      
      const { data } = supabase.storage.from('community-images').getPublicUrl(filePath);
      setCommImages(prev => [...prev, data.publicUrl]);
    } catch (err) {
      alert("Upload Error: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase.from('communities').insert([{ name: newCommunityName, owner_id: session.user.id, join_code: code }]).select();
    if (error) { alert(error.message); return; }
    if (data) { setCommunities([...communities, data[0]]); setActiveCommunity(data[0]); setNewCommunityName(''); fetchCommunityData(data[0].id); }
  };

  const askThenRun = useCallback((title, message, action) => {
    setConfirm({ title, message, onConfirm: async () => { setConfirm(null); await action(); } });
  }, []);

  const updateIssueStatus = useCallback((issueId, newStatus, currentStatus) => {
    if (newStatus === currentStatus) return;
    askThenRun('Update Status', `Change status to "${newStatus}"?`, async () => {
      setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: newStatus } : i));
      const { error } = await supabase.from('issues').update({ status: newStatus }).eq('id', issueId);
      if (error) { alert(error.message); fetchCommunityData(activeCommunity.id); }
    });
  }, [activeCommunity, askThenRun]);

  const assignWorker = useCallback((issueId, workerId, currentWorkerId) => {
    if (workerId === (currentWorkerId || '')) return;
    const worker = workers.find(w => w.id === workerId);
    const label = worker ? `Assign "${worker.name}" to this issue?` : 'Remove assigned technician?';
    askThenRun('Technician Assignment', label, async () => {
      setIssues(prev => prev.map(i => i.id === issueId ? { ...i, assigned_worker_id: workerId || null, workers: worker || null } : i));
      await supabase.from('issues').update({ assigned_worker_id: workerId || null }).eq('id', issueId);
    });
  }, [workers, askThenRun]);

  const handleAddWorker = async (e) => {
    e.preventDefault(); setAddingWorker(true);
    const { error } = await supabase.from('workers').insert([{ name: workerName, role: workerRole, phone: workerPhone, email: workerEmail, community_id: activeCommunity.id }]);
    if (error) alert(error.message);
    else { setWorkerName(''); setWorkerPhone(''); setWorkerEmail(''); fetchCommunityData(activeCommunity.id); }
    setAddingWorker(false);
  };

  const handleDeleteWorker = async (workerId) => {
    if (!window.confirm('Remove this technician?')) return;
    await supabase.from('workers').delete().eq('id', workerId);
    fetchCommunityData(activeCommunity.id);
  };

  const handleBanMember = useCallback(async (memberId, currentStatus) => {
    const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
    const label = newStatus === 'banned' ? 'Ban this member from the community?' : 'Unban this member?';
    if (!window.confirm(label)) return;
    await supabase.from('members').update({ status: newStatus }).eq('id', memberId);
    fetchCommunityData(activeCommunity.id);
  }, [activeCommunity]);

  const handleApproveMember = useCallback(async (memberId) => {
    await supabase.from('members').update({ status: 'active' }).eq('id', memberId);
    fetchCommunityData(activeCommunity.id);
  }, [activeCommunity]);

  const handleSetRole = useCallback(async (memberId, currentRole) => {
    const newRole = currentRole === 'co_owner' ? 'resident' : 'co_owner';
    const label = newRole === 'co_owner' ? 'Make this member a Co-Owner?' : 'Remove co-owner privileges?';
    if (!window.confirm(label)) return;
    await supabase.from('members').update({ community_role: newRole }).eq('id', memberId);
    fetchCommunityData(activeCommunity.id);
  }, [activeCommunity]);

  const handleKickMember = useCallback(async (memberId, isPending = false) => {
    const msg = isPending ? 'Reject this join request?' : 'Are you sure you want to kick this member from the community? They will lose all access.';
    if (!window.confirm(msg)) return;
    await supabase.from('members').delete().eq('id', memberId);
    fetchCommunityData(activeCommunity.id);
  }, [activeCommunity]);

  // Filtered issues
  const filteredIssues = issues.filter(issue => {
    if (filterPriority && issue.priority !== filterPriority) return false;
    if (filterCategory && issue.category !== filterCategory) return false;
    if (filterStatus && issue.status !== filterStatus) return false;
    if (filterSearch && !issue.title.toLowerCase().includes(filterSearch.toLowerCase()) &&
        !issue.description?.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  // Issues grouped by member for residents tab
  const issuesByMember = members.map(member => ({
    ...member,
    memberIssues: issues.filter(i => i.user_id === member.user_id),
  }));

  const workerRoleEmoji = { plumber: '🔧', electrician: '⚡', cleaner: '🧹', maintenance: '🔨' };
  const priorityConfig = {
    Critical: { color: 'text-red-600 bg-red-50 border-red-200', bar: 'bg-red-500' },
    High:     { color: 'text-orange-600 bg-orange-50 border-orange-200', bar: 'bg-orange-400' },
    Medium:   { color: 'text-yellow-700 bg-yellow-50 border-yellow-200', bar: 'bg-yellow-400' },
    Low:      { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', bar: 'bg-emerald-400' },
  };
  const statusConfig = {
    Pending:      { icon: <AlertCircle size={13} />, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    'In Progress':{ icon: <Clock size={13} />, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    Resolved:     { icon: <CheckCircle2 size={13} />, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  };
  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm font-medium";

  const categories = [...new Set(issues.map(i => i.category))];

  return (
    <DashboardLayout profile={profile} role="owner" title="Owner Dashboard" activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); if (tab === 'issues') setNotifCount(0); }}>
      {activeCommunity && <NotificationSystem communityId={activeCommunity.id} role="owner" />}
      {emergency && <EmergencyAlert issue={emergency} onDismiss={() => setEmergency(null)} />}
      {confirm && <ConfirmModal title={confirm.title} message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      {/* Member detail modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedMember(null)}>
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl p-8 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedMember(null)} className="absolute top-5 right-5 p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X size={20} /></button>
            <div className="flex items-center gap-5 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-2xl">{selectedMember.room_number}</div>
              <div><h2 className="text-2xl font-extrabold text-slate-900">{selectedMember.profiles?.full_name || 'Unknown'}</h2><span className="text-xs font-bold uppercase text-primary">Resident</span></div>
            </div>
            {[{ l: 'Room', v: selectedMember.room_number }, { l: 'Phone', v: selectedMember.profiles?.phone || '—' }, { l: 'Bio', v: selectedMember.profiles?.bio || '—' }, { l: 'Joined', v: new Date(selectedMember.joined_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) }].map(({ l, v }) => (
              <div key={l} className="flex justify-between py-3 border-b border-slate-100">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{l}</span>
                <span className="text-slate-700 font-semibold text-sm">{v}</span>
              </div>
            ))}
            <button onClick={() => setSelectedMember(null)} className="mt-6 w-full py-3 rounded-xl bg-slate-900 text-white font-bold">Close</button>
          </div>
        </div>
      )}

      <main className="flex-1 p-5 sm:p-8 md:p-12 overflow-y-auto w-full max-w-5xl mx-auto">
        {activeTab === 'profile' && <ProfilePage session={session} />}

        {activeTab !== 'profile' && !activeCommunity && communities.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center space-y-6">
            <div className="w-24 h-24 bg-white border border-slate-200 shadow-sm rounded-[2rem] flex items-center justify-center"><Building size={40} className="text-primary" /></div>
            <h1 className="text-3xl font-extrabold text-slate-900">Create your first PG Community</h1>
            <form onSubmit={handleCreateCommunity} className="w-full space-y-4">
              <input type="text" placeholder="PG Name" required value={newCommunityName} onChange={e => setNewCommunityName(e.target.value)} className={inputClass + ' text-center text-xl'} />
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold p-4 rounded-2xl transition-all">Create Community</button>
            </form>
          </div>
        )}

        {activeTab !== 'profile' && (activeCommunity || communities.length > 0) && (
          <div className="space-y-10 w-full max-w-5xl mx-auto">
            <header className="flex flex-col gap-4 border-b border-slate-200 pb-8">
              <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                <div>
                  <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">PG Dashboard</h1>
                  <p className="text-slate-500 font-medium">Hello, {profile?.full_name}</p>
                  {notifCount > 0 && activeTab !== 'issues' && (
                    <button onClick={() => { setActiveTab('issues'); setNotifCount(0); }} className="mt-2 flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full animate-pulse">
                      <Bell size={12} /> {notifCount} new issue{notifCount > 1 ? 's' : ''} — View
                    </button>
                  )}
                </div>
                </div>
              {/* Multi-community switcher */}
              {communities.length > 1 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Community:</span>
                  {communities.map(com => (
                    <button key={com.id} onClick={() => { setActiveCommunity(com); fetchCommunityData(com.id); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border transition-all ${activeCommunity?.id === com.id ? 'bg-primary/10 text-primary border-primary/20' : 'bg-white border-slate-200 text-slate-600 hover:border-primary/20 hover:text-primary'}`}>
                      <Building size={13} /> {com.name}
                    </button>
                  ))}
                  <button onClick={() => { setNewCommunityName(''); setActiveTab('new_community'); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-bold border border-dashed border-slate-300 text-slate-400 hover:border-primary/30 hover:text-primary transition-all">
                    <Plus size={13} /> New PG
                  </button>
                </div>
              )}
            </header>

            {/* ── COMMUNITIES OVERVIEW TAB ── */}
            {activeTab === 'communities_overview' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><Building size={24} className="text-primary" /> My Communities</h2>
                  <button onClick={() => setActiveTab('new_community')} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl shadow-sm hover:bg-slate-800 transition-all">
                    <Plus size={16} /> New PG
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {communities.map(com => (
                    <div key={com.id} onClick={() => { setActiveCommunity(com); fetchCommunityData(com.id); setActiveTab('issues'); }}
                      className="group cursor-pointer bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 transition-all overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-[100px] z-0" />
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="w-14 h-14 bg-primary/10 text-primary flex items-center justify-center rounded-2xl mb-4 shrink-0 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all">
                          <Building size={28} strokeWidth={2.5} />
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 mb-1">{com.name}</h3>
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">Invite Code: <span className="text-primary">{com.join_code}</span></p>
                        
                        <div className="mt-auto flex items-center gap-2">
                          <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-lg ${com.owner_id === session.user.id ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>
                            {com.owner_id === session.user.id ? 'Owner' : 'Co-Owner'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ISSUES TAB ── */}
            {activeTab === 'issues' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><AlertCircle size={24} className="text-primary" /> Active Issues</h2>
                  <span className="text-xs font-bold text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">{filteredIssues.length} / {issues.length}</span>
                </div>

                {/* Filter Bar */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
                  <Filter size={16} className="text-slate-400 shrink-0" />
                  <div className="relative flex-1 min-w-[160px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search issues..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 font-medium" />
                  </div>
                  {[
                    { label: 'Priority', value: filterPriority, set: setFilterPriority, options: ['Critical', 'High', 'Medium', 'Low'] },
                    { label: 'Status', value: filterStatus, set: setFilterStatus, options: ['Pending', 'In Progress', 'Resolved'] },
                    { label: 'Category', value: filterCategory, set: setFilterCategory, options: categories },
                  ].map(({ label, value, set, options }) => (
                    <select key={label} value={value} onChange={e => set(e.target.value)}
                      className="py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 font-semibold text-slate-600 cursor-pointer">
                      <option value="">All {label}</option>
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ))}
                  {(filterPriority || filterStatus || filterCategory || filterSearch) && (
                    <button onClick={() => { setFilterPriority(''); setFilterStatus(''); setFilterCategory(''); setFilterSearch(''); }}
                      className="text-xs font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-all">
                      Clear
                    </button>
                  )}
                </div>

                {filteredIssues.length === 0 ? (
                  <div className="p-12 border border-dashed border-slate-300 rounded-[2rem] bg-slate-50 text-center text-slate-500 font-medium">
                    {issues.length === 0 ? 'No issues reported yet ☕' : 'No issues match the current filters.'}
                  </div>
                ) : filteredIssues.map(issue => {
                  const pc = priorityConfig[issue.priority] || priorityConfig.Low;
                  const sc = statusConfig[issue.status] || statusConfig.Pending;
                  return (
                    <div key={issue.id} className="border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
                      <div className={`h-1 w-full ${pc.bar}`} />
                      <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-5">
                        <div className="lg:col-span-3 flex flex-col justify-center">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold border ${pc.color}`}>{issue.priority}</span>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border border-slate-200 px-2.5 py-0.5 rounded-full bg-slate-50">{issue.category}</span>
                            <span className={`ml-auto flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${sc.color}`}>{sc.icon} {issue.status}</span>
                          </div>
                          <h3 className="font-extrabold text-lg text-slate-900 mb-1">{issue.title}</h3>
                          <p className="text-sm font-medium text-slate-500 line-clamp-2">{issue.description}</p>
                          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-400">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md">Room {issue.room_number}</span>
                            <span>·</span><span>{issue.profiles?.full_name}</span>
                            <span>·</span><span>{new Date(issue.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          </div>
                          {/* Video call action */}
                          <div className="mt-3">
                            <VideoCallButton issueId={issue.id} issueTitle={issue.title} />
                          </div>
                        </div>
                        <div className="lg:col-span-2 bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Update Status</label>
                            <div className="relative">
                              <select value={issue.status} onChange={e => updateIssueStatus(issue.id, e.target.value, issue.status)}
                                className="w-full py-2.5 pl-4 pr-8 rounded-lg text-sm bg-white border border-slate-200 font-bold outline-none cursor-pointer appearance-none focus:ring-2 focus:ring-primary/20 shadow-sm text-slate-700">
                                <option value="Pending">⏳ Pending</option>
                                <option value="In Progress">🔧 In Progress</option>
                                <option value="Resolved">✅ Resolved</option>
                              </select>
                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Assign Technician</label>
                            <div className="relative">
                              <select value={issue.assigned_worker_id || ''} onChange={e => assignWorker(issue.id, e.target.value, issue.assigned_worker_id)}
                                className="w-full py-2.5 pl-4 pr-8 rounded-lg text-sm bg-white border border-slate-200 font-semibold outline-none cursor-pointer appearance-none focus:ring-2 focus:ring-primary/20 shadow-sm text-slate-700">
                                <option value="">— Unassigned —</option>
                                {workers.map(w => <option key={w.id} value={w.id}>{workerRoleEmoji[w.role]} {w.name}</option>)}
                              </select>
                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                          {issue.workers && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs font-semibold text-amber-700 flex items-center gap-2">
                              <Wrench size={12} /> {issue.workers.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── RESIDENT PROFILES TAB ── */}
            {activeTab === 'residents' && (
              <div className="space-y-5">
                <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Users size={24} className="text-primary" /> Resident Profiles & Issues
                </h2>
                {issuesByMember.length === 0 ? (
                  <div className="p-12 border border-dashed border-slate-300 rounded-[2rem] bg-slate-50 text-center text-slate-500 font-medium">No residents have joined yet.</div>
                ) : issuesByMember.map(member => {
                  const isExpanded = expandedResident === member.id;
                  const memberIssues = member.memberIssues;
                  return (
                    <div key={member.id} className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
                      {/* Member header */}
                      <button
                        onClick={() => setExpandedResident(isExpanded ? null : member.id)}
                        className="w-full flex items-center gap-5 p-5 hover:bg-slate-50 transition-all text-left"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xl shrink-0">{member.room_number}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-extrabold text-slate-900 text-lg truncate">{member.profiles?.full_name || 'Unknown Resident'}</h3>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs font-semibold text-slate-400">Room {member.room_number}</span>
                            {member.profiles?.phone && <span className="text-xs text-slate-400 font-medium flex items-center gap-0.5"><Phone size={10} /> {member.profiles.phone}</span>}
                            <span className="text-xs font-bold text-primary bg-primary/5 border border-primary/10 px-2 py-0.5 rounded-full">{memberIssues.length} issue{memberIssues.length !== 1 ? 's' : ''}</span>
                          </div>
                          {member.profiles?.bio && <p className="text-xs text-slate-400 font-medium mt-1 truncate">{member.profiles.bio}</p>}
                        </div>
                        <div className="shrink-0 text-slate-300">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronRight size={20} />}
                        </div>
                      </button>

                      {/* Expanded issues */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-3 bg-slate-50/50">
                          {memberIssues.length === 0 ? (
                            <p className="text-sm text-slate-400 font-medium text-center py-4">No issues reported by this resident.</p>
                          ) : memberIssues.map(issue => {
                            const pc = priorityConfig[issue.priority] || priorityConfig.Low;
                            return (
                              <div key={issue.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4">
                                <div className={`w-1.5 self-stretch rounded-full shrink-0 ${pc.bar}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${pc.color}`}>{issue.priority}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{issue.category}</span>
                                    <span className={`ml-auto text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${(statusConfig[issue.status] || statusConfig.Pending).color}`}>{issue.status}</span>
                                  </div>
                                  <p className="font-bold text-slate-800 text-sm truncate">{issue.title}</p>
                                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{issue.description}</p>
                                  <p className="text-[10px] text-slate-400 font-medium mt-1">{new Date(issue.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── WORKERS TAB ── */}
            {activeTab === 'workers' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><Wrench size={24} className="text-primary" /> Manage Technicians</h2>
                <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                  <h3 className="font-extrabold text-slate-900 mb-5 flex items-center gap-2"><Plus size={16} className="text-primary" /> Add New Technician</h3>
                  <form onSubmit={handleAddWorker} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2 flex gap-3">
                      <input type="text" placeholder="Full Name" required value={workerName} onChange={e => setWorkerName(e.target.value)} className={inputClass} />
                      <select value={workerRole} onChange={e => setWorkerRole(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm font-semibold cursor-pointer min-w-[160px]">
                        <option value="plumber">🔧 Plumber</option><option value="electrician">⚡ Electrician</option>
                        <option value="cleaner">🧹 Cleaner</option><option value="maintenance">🔨 Maintenance</option>
                      </select>
                    </div>
                    <div className="relative"><div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400"><Phone size={16} /></div>
                      <input type="tel" placeholder="Phone Number" value={workerPhone} onChange={e => setWorkerPhone(e.target.value)} className={inputClass + ' pl-9'} /></div>
                    <div className="relative"><div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400"><Mail size={16} /></div>
                      <input type="email" placeholder="Email Address" value={workerEmail} onChange={e => setWorkerEmail(e.target.value)} className={inputClass + ' pl-9'} /></div>
                    <div className="sm:col-span-2">
                      <button type="submit" disabled={addingWorker} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-sm disabled:opacity-50">{addingWorker ? 'Adding...' : '+ Add Technician'}</button>
                    </div>
                  </form>
                </div>
                {workers.length === 0 ? (
                  <div className="p-12 border border-dashed border-slate-300 rounded-[2rem] bg-slate-50 text-center text-slate-500 font-medium">No technicians added yet.</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {workers.map(worker => (
                      <div key={worker.id} className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm flex items-start justify-between gap-4 hover:shadow-md transition-all">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 text-xl">{workerRoleEmoji[worker.role]}</div>
                          <div>
                            <h3 className="font-bold text-slate-900">{worker.name}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider capitalize">{worker.role}</p>
                            {worker.phone && <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1"><Phone size={11} /> {worker.phone}</p>}
                            {worker.email && <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Mail size={11} /> {worker.email}</p>}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteWorker(worker.id)} className="p-2.5 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-200 text-slate-400 hover:text-red-500 transition-all shrink-0"><Trash2 size={18} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── MEMBERS TAB ── */}
            {activeTab === 'community' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><Users size={24} className="text-primary" /> Member Directory</h2>
                  <div className="px-4 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl text-sm font-bold text-slate-500">
                    Invite Code: <span className="text-primary tracking-[0.2em] ml-2 font-mono text-lg">{activeCommunity?.join_code}</span>
                  </div>
                </div>
                {members.length === 0 ? (
                  <div className="p-12 border border-dashed border-slate-300 rounded-[2rem] bg-slate-50 text-center text-slate-500 font-medium">No residents yet.</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {members.map(member => {
                      const isBanned = member.status === 'banned';
                      const isCoOwner = member.community_role === 'co_owner';
                      return (
                        <div key={member.id}
                          className={`p-5 border rounded-2xl bg-white shadow-sm transition-all ${isBanned ? 'border-red-200 bg-red-50/30 opacity-70' : 'border-slate-200 hover:shadow-md'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl shrink-0 ${isBanned ? 'bg-red-100 text-red-400' : 'bg-primary/10 text-primary'}`}>{member.room_number}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg text-slate-900 truncate">{member.profiles?.full_name || 'Unknown'}</h3>
                                {isCoOwner && <span className="flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full"><Crown size={9} /> Co-Owner</span>}
                                {isBanned && <span className="text-[9px] font-extrabold uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">Banned</span>}
                                {member.status === 'pending' && <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Clock size={9} /> Pending Approval</span>}
                              </div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Room {member.room_number}</p>
                              {member.profiles?.phone && <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1"><Phone size={10} />{member.profiles.phone}</p>}
                            </div>
                          </div>
                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
                            <button onClick={() => setSelectedMember(member)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 transition-all">
                              View Details
                            </button>
                            
                            {member.status === 'pending' ? (
                              <>
                                <button onClick={() => handleApproveMember(member.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-all">
                                  <CheckCircle2 size={11} /> Approve
                                </button>
                                <button onClick={() => handleKickMember(member.id, true)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-red-300 text-red-600 hover:bg-red-600 hover:text-white transition-all ml-auto">
                                  <X size={11} /> Reject
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => handleSetRole(member.id, member.community_role)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${isCoOwner ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                                  <Crown size={11} /> {isCoOwner ? 'Remove Co-Owner' : 'Make Co-Owner'}
                                </button>
                                <button onClick={() => handleBanMember(member.id, member.status)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${isBanned ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`}>
                                  {isBanned ? <><ShieldOff size={11} /> Unban</> : <><Shield size={11} /> Ban</>}
                                </button>
                                <button onClick={() => handleKickMember(member.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-red-300 text-red-600 hover:bg-red-600 hover:text-white transition-all ml-auto">
                                  <Trash2 size={11} /> Kick
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── PG INFO TAB ── */}
            {activeTab === 'pg_info' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><Sliders size={24} className="text-primary" /> Edit PG Settings</h2>
                <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                  <form onSubmit={handleUpdatePGInfo} className="space-y-5">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Description</label>
                      <textarea rows="3" value={commDesc} onChange={e => setCommDesc(e.target.value)} className={inputClass} placeholder="Describe your community..." />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Address</label>
                        <input type="text" value={commAddress} onChange={e => setCommAddress(e.target.value)} className={inputClass} placeholder="Full Address" />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Free Rooms</label>
                        <input type="number" min="0" value={commFreeRooms} onChange={e => setCommFreeRooms(e.target.value)} className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Facilities / Features (comma separated)</label>
                      <input type="text" value={commFeatures} onChange={e => setCommFeatures(e.target.value)} className={inputClass} placeholder="e.g. WiFi, AC, Security" />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Images ({commImages.length})</label>
                      <div className="flex flex-wrap gap-3 mb-3">
                        {commImages.map((img, i) => (
                          <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 group">
                            <img src={img} alt="PG" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setCommImages(commImages.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all font-bold text-xs"><Trash2 size={16}/></button>
                          </div>
                        ))}
                        <label className="w-24 h-24 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-primary/30 hover:text-primary transition-all">
                          {uploadingImage ? <div className="animate-spin"><Building size={20}/></div> : <Plus size={20} />}
                          <span className="text-[10px] font-bold mt-1">Add Image</span>
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                        </label>
                      </div>
                    </div>
                    <button type="submit" disabled={updatingComm} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-sm">
                      {updatingComm ? 'Saving...' : 'Save PG Information'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── NEW COMMUNITY TAB ── */}
            {activeTab === 'new_community' && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] max-w-md mx-auto text-center space-y-6">
                <div className="w-24 h-24 bg-white border border-slate-200 shadow-sm rounded-[2rem] flex items-center justify-center"><Building2 size={40} className="text-primary" /></div>
                <h2 className="text-3xl font-extrabold text-slate-900">Create a New PG</h2>
                <form onSubmit={handleCreateCommunity} className="w-full space-y-4">
                  <input type="text" placeholder="PG Name" required value={newCommunityName} onChange={e => setNewCommunityName(e.target.value)} className={inputClass + ' text-center text-xl'} />
                  <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold p-4 rounded-2xl transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.1)]">Create Community</button>
                </form>
              </div>
            )}
          </div>
        )}
        </main>
    </DashboardLayout>
  );
}
