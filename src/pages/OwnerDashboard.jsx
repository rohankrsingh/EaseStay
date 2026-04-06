import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import ProfilePage from './ProfilePage';
import { Building, Users, AlertCircle, CheckCircle2, Clock, Plus, Wrench, Trash2, X, Mail, Phone, ChevronDown } from 'lucide-react';

// Confirmation modal for status & worker changes
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

  // Confirmation dialog state
  const [confirm, setConfirm] = useState(null); // { title, message, onConfirm }

  // Member detail modal
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => { fetchData(); }, [session]);

  const fetchData = async () => {
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    setProfile(prof || { full_name: 'Unknown Owner' });
    const { data: comms } = await supabase.from('communities').select('*').eq('owner_id', session.user.id);
    setCommunities(comms || []);
    if (comms && comms.length > 0) {
      setActiveCommunity(comms[0]);
      fetchCommunityData(comms[0].id);
    }
  };

  const fetchCommunityData = async (commId) => {
    const priorityWeights = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
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

  useEffect(() => {
    if (!activeCommunity) return;
    const channel = supabase.channel('public:issues_owner')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues', filter: `community_id=eq.${activeCommunity.id}` }, () => {
        fetchCommunityData(activeCommunity.id);
      }).subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeCommunity]);

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase.from('communities').insert([{
      name: newCommunityName, owner_id: session.user.id, join_code: code
    }]).select();
    if (error) { alert(error.message); return; }
    if (data) {
      setCommunities([...communities, data[0]]);
      setActiveCommunity(data[0]);
      setNewCommunityName('');
      fetchCommunityData(data[0].id);
    }
  };

  // Show confirmation then execute
  const askThenRun = useCallback((title, message, action) => {
    setConfirm({ title, message, onConfirm: async () => { setConfirm(null); await action(); } });
  }, []);

  const updateIssueStatus = useCallback((issueId, newStatus, currentStatus) => {
    if (newStatus === currentStatus) return;
    askThenRun(
      'Update Issue Status',
      `Change status to "${newStatus}"?`,
      async () => {
        setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: newStatus } : i));
        const { error } = await supabase.from('issues').update({ status: newStatus }).eq('id', issueId);
        if (error) { alert('Failed: ' + error.message); fetchCommunityData(activeCommunity.id); }
      }
    );
  }, [activeCommunity, askThenRun]);

  const assignWorker = useCallback((issueId, workerId, currentWorkerId) => {
    if (workerId === (currentWorkerId || '')) return;
    const worker = workers.find(w => w.id === workerId);
    const label = worker ? `Assign "${worker.name}" to this issue?` : 'Remove the assigned technician?';
    askThenRun('Technician Assignment', label, async () => {
      setIssues(prev => prev.map(i => i.id === issueId ? { ...i, assigned_worker_id: workerId || null, workers: worker || null } : i));
      await supabase.from('issues').update({ assigned_worker_id: workerId || null }).eq('id', issueId);
    });
  }, [workers, askThenRun]);

  const handleAddWorker = async (e) => {
    e.preventDefault();
    setAddingWorker(true);
    const { error } = await supabase.from('workers').insert([{
      name: workerName, role: workerRole, phone: workerPhone, email: workerEmail, community_id: activeCommunity.id
    }]);
    if (error) alert(error.message);
    else { setWorkerName(''); setWorkerPhone(''); setWorkerEmail(''); fetchCommunityData(activeCommunity.id); }
    setAddingWorker(false);
  };

  const handleDeleteWorker = async (workerId) => {
    if (!confirm('Remove this technician?')) return;
    await supabase.from('workers').delete().eq('id', workerId);
    fetchCommunityData(activeCommunity.id);
  };

  const workerRoleEmoji = { plumber: '🔧', electrician: '⚡', cleaner: '🧹', maintenance: '🔨' };
  const priorityConfig = {
    Critical: { color: 'text-red-600 bg-red-50 border-red-200', bar: 'bg-red-500' },
    High:     { color: 'text-orange-600 bg-orange-50 border-orange-200', bar: 'bg-orange-400' },
    Medium:   { color: 'text-yellow-700 bg-yellow-50 border-yellow-200', bar: 'bg-yellow-400' },
    Low:      { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', bar: 'bg-emerald-400' },
  };
  const statusConfig = {
    Pending:     { icon: <AlertCircle size={13} />, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    'In Progress': { icon: <Clock size={13} />, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    Resolved:    { icon: <CheckCircle2 size={13} />, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  };
  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm font-medium";

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar role="owner" activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Confirmation Modal */}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedMember(null)}>
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl p-8 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedMember(null)} className="absolute top-5 right-5 p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-all"><X size={20} /></button>
            <div className="flex items-center gap-5 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-2xl">{selectedMember.room_number}</div>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">{selectedMember.profiles?.full_name || 'Unknown'}</h2>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Resident</span>
              </div>
            </div>
            <div className="space-y-0">
              {[
                { label: 'Room', value: selectedMember.room_number },
                { label: 'Phone', value: selectedMember.profiles?.phone || '—' },
                { label: 'Bio', value: selectedMember.profiles?.bio || '—' },
                { label: 'Joined', value: new Date(selectedMember.joined_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) },
                { label: 'Account Created', value: selectedMember.profiles?.created_at ? new Date(selectedMember.profiles.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start py-3 border-b border-slate-100">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{label}</span>
                  <span className="text-slate-700 font-semibold text-right max-w-[60%] text-sm">{value}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setSelectedMember(null)} className="mt-6 w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all">Close</button>
          </div>
        </div>
      )}

      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        {activeTab === 'profile' && <ProfilePage session={session} />}

        {activeTab !== 'profile' && !activeCommunity && communities.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center space-y-6">
            <div className="w-24 h-24 bg-white border border-slate-200 shadow-sm rounded-[2rem] flex items-center justify-center"><Building size={40} className="text-primary" /></div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create your first PG Community</h1>
            <p className="text-slate-500 font-medium">Manage issues, track members, and streamline your PG operations.</p>
            <form onSubmit={handleCreateCommunity} className="w-full space-y-4">
              <input type="text" placeholder="PG Name (e.g. Sunrise PG)" required value={newCommunityName}
                onChange={e => setNewCommunityName(e.target.value)} className={inputClass + ' text-center text-xl'} />
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold p-4 rounded-2xl transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.1)]">Create Community</button>
            </form>
          </div>
        )}

        {activeTab !== 'profile' && (activeCommunity || communities.length > 0) && (
          <div className="space-y-10 w-full max-w-5xl mx-auto">
            <header className="flex flex-col sm:flex-row justify-between sm:items-end border-b border-slate-200 pb-8 gap-4">
              <div>
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">PG Dashboard</h1>
                <p className="text-slate-500 font-medium">Hello, Owner {profile?.full_name}</p>
              </div>
              {activeCommunity && (
                <div className="bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-sm w-max">
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1">Invite Code</p>
                  <code className="text-2xl font-mono text-primary font-bold tracking-[0.2em]">{activeCommunity.join_code}</code>
                </div>
              )}
            </header>

            {/* ── ISSUES ── */}
            {activeTab === 'issues' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><AlertCircle size={24} className="text-primary" /> Active Issues</h2>
                  <div className="text-xs font-bold text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">{issues.length} total</div>
                </div>

                {issues.length === 0 ? (
                  <div className="p-12 border border-dashed border-slate-300 rounded-[2rem] bg-slate-50 text-center text-slate-500 font-medium">No issues reported yet ☕</div>
                ) : issues.map(issue => {
                  const pc = priorityConfig[issue.priority] || priorityConfig.Low;
                  const sc = statusConfig[issue.status] || statusConfig.Pending;
                  return (
                    <div key={issue.id} className="border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
                      {/* Priority color bar */}
                      <div className={`h-1 w-full ${pc.bar}`} />
                      <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-5">
                        {/* Left: Issue info */}
                        <div className="lg:col-span-3 flex flex-col justify-center">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold border ${pc.color}`}>{issue.priority}</span>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border border-slate-200 px-2.5 py-0.5 rounded-full bg-slate-50">{issue.category}</span>
                            <span className={`ml-auto flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${sc.color}`}>
                              {sc.icon} {issue.status}
                            </span>
                          </div>
                          <h3 className="font-extrabold text-lg text-slate-900 mb-1 leading-snug">{issue.title}</h3>
                          <p className="text-sm font-medium text-slate-500 line-clamp-2 leading-relaxed">{issue.description}</p>
                          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-400">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md">Room {issue.room_number}</span>
                            <span>·</span>
                            <span>{issue.profiles?.full_name}</span>
                            <span>·</span>
                            <span>{new Date(issue.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>

                        {/* Right: Controls */}
                        <div className="lg:col-span-2 bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Update Status</label>
                            <div className="relative">
                              <select
                                value={issue.status}
                                onChange={(e) => updateIssueStatus(issue.id, e.target.value, issue.status)}
                                className="w-full py-2.5 pl-4 pr-8 rounded-lg text-sm bg-white border border-slate-200 font-bold outline-none cursor-pointer appearance-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm text-slate-700"
                              >
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
                              <select
                                value={issue.assigned_worker_id || ''}
                                onChange={(e) => assignWorker(issue.id, e.target.value, issue.assigned_worker_id)}
                                className="w-full py-2.5 pl-4 pr-8 rounded-lg text-sm bg-white border border-slate-200 font-semibold outline-none cursor-pointer appearance-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm text-slate-700"
                              >
                                <option value="">— Unassigned —</option>
                                {workers.map(w => (
                                  <option key={w.id} value={w.id}>{workerRoleEmoji[w.role]} {w.name}</option>
                                ))}
                              </select>
                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                          {issue.workers && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs font-semibold text-amber-700 flex items-center gap-2">
                              <Wrench size={12} /> Assigned to {issue.workers.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── WORKERS ── */}
            {activeTab === 'workers' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><Wrench size={24} className="text-primary" /> Manage Technicians</h2>
                <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                  <h3 className="font-extrabold text-slate-900 mb-5 flex items-center gap-2"><Plus size={16} className="text-primary" /> Add New Technician</h3>
                  <form onSubmit={handleAddWorker} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2 flex gap-3">
                      <input type="text" placeholder="Full Name" required value={workerName} onChange={e => setWorkerName(e.target.value)} className={inputClass} />
                      <select value={workerRole} onChange={e => setWorkerRole(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm font-semibold cursor-pointer min-w-[160px]">
                        <option value="plumber">🔧 Plumber</option>
                        <option value="electrician">⚡ Electrician</option>
                        <option value="cleaner">🧹 Cleaner</option>
                        <option value="maintenance">🔨 Maintenance</option>
                      </select>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400"><Phone size={16} /></div>
                      <input type="tel" placeholder="Phone Number" value={workerPhone} onChange={e => setWorkerPhone(e.target.value)} className={inputClass + ' pl-9'} />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400"><Mail size={16} /></div>
                      <input type="email" placeholder="Email Address" value={workerEmail} onChange={e => setWorkerEmail(e.target.value)} className={inputClass + ' pl-9'} />
                    </div>
                    <div className="sm:col-span-2">
                      <button type="submit" disabled={addingWorker} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-sm disabled:opacity-50">
                        {addingWorker ? 'Adding...' : '+ Add Technician'}
                      </button>
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
                        <button onClick={() => handleDeleteWorker(worker.id)} className="p-2.5 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-200 text-slate-400 hover:text-red-500 transition-all shrink-0">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── MEMBERS ── */}
            {activeTab === 'community' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Users size={24} className="text-primary" /> Member Directory
                  <span className="ml-2 text-sm font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Click for details</span>
                </h2>
                {members.length === 0 ? (
                  <div className="p-12 border border-dashed border-slate-300 rounded-[2rem] bg-slate-50 text-center text-slate-500 font-medium">No residents have joined yet.</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {members.map(member => (
                      <button key={member.id} onClick={() => setSelectedMember(member)}
                        className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm flex items-center gap-4 hover:shadow-md hover:border-primary/30 transition-all group text-left w-full">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xl group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                          {member.room_number}
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="font-bold text-lg text-slate-900 truncate">{member.profiles?.full_name || 'Unknown Resident'}</h3>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Room {member.room_number}</p>
                          {member.profiles?.phone && <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1"><Phone size={10} />{member.profiles.phone}</p>}
                        </div>
                        <div className="ml-auto text-slate-300 group-hover:text-primary transition-colors shrink-0">→</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
