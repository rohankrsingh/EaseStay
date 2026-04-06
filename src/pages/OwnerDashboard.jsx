import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import ProfilePage from './ProfilePage';
import { Building, Users, AlertCircle, CheckCircle2, Clock, Plus, Wrench, Trash2 } from 'lucide-react';

export default function OwnerDashboard({ session }) {
  const [profile, setProfile] = useState(null);
  const [communities, setCommunities] = useState([]);
  const [activeCommunity, setActiveCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [workers, setWorkers] = useState([]);
  
  const [activeTab, setActiveTab] = useState('issues');
  const [newCommunityName, setNewCommunityName] = useState('');
  
  // Worker form state
  const [workerName, setWorkerName] = useState('');
  const [workerRole, setWorkerRole] = useState('plumber');
  const [addingWorker, setAddingWorker] = useState(false);

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
    
    const { data: issuesData } = await supabase
      .from('issues')
      .select('*, profiles(full_name), workers(name, role)')
      .eq('community_id', commId)
      .order('created_at', { ascending: false });
    const sorted = (issuesData || []).sort((a, b) => priorityWeights[b.priority] - priorityWeights[a.priority]);
    setIssues(sorted);

    const { data: memsData } = await supabase
      .from('members').select('*, profiles(full_name)').eq('community_id', commId);
    setMembers(memsData || []);

    const { data: workersData } = await supabase
      .from('workers').select('*').eq('community_id', commId);
    setWorkers(workersData || []);
  };

  useEffect(() => {
    if (!activeCommunity) return;
    const channel = supabase
      .channel('public:issues_owner')
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

  const updateIssueStatus = async (issueId, newStatus) => {
    const { error } = await supabase.from('issues').update({ status: newStatus }).eq('id', issueId);
    if (error) alert(error.message);
  };

  const assignWorker = async (issueId, workerId) => {
    await supabase.from('issues').update({ assigned_worker_id: workerId || null }).eq('id', issueId);
  };

  const handleAddWorker = async (e) => {
    e.preventDefault();
    setAddingWorker(true);
    const { error } = await supabase.from('workers').insert([{
      name: workerName, role: workerRole, community_id: activeCommunity.id
    }]);
    if (error) { alert(error.message); }
    else { setWorkerName(''); fetchCommunityData(activeCommunity.id); }
    setAddingWorker(false);
  };

  const handleDeleteWorker = async (workerId) => {
    if (!confirm('Remove this worker?')) return;
    await supabase.from('workers').delete().eq('id', workerId);
    fetchCommunityData(activeCommunity.id);
  };

  const workerRoleLabel = { plumber: '🔧 Plumber', electrician: '⚡ Electrician', cleaner: '🧹 Cleaner', maintenance: '🔨 Maintenance' };
  const priorityColor = (p) => {
    if (p === 'Critical') return 'text-red-600 bg-red-50 border-red-200';
    if (p === 'High') return 'text-orange-600 bg-orange-50 border-orange-200';
    if (p === 'Medium') return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar role="owner" activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <ProfilePage session={session} />
        )}

        {/* Community creation screen */}
        {activeTab !== 'profile' && !activeCommunity && communities.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-6">
            <div className="w-24 h-24 bg-white border border-slate-200 shadow-sm rounded-[2rem] flex items-center justify-center mb-4">
              <Building size={40} className="text-primary" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create your first PG Community</h1>
            <p className="text-slate-500 font-medium">Manage issues, track members, and streamline your PG operations perfectly.</p>
            <form onSubmit={handleCreateCommunity} className="w-full space-y-4">
              <input type="text" placeholder="PG Name (e.g. Sunrise PG)" required value={newCommunityName}
                onChange={e => setNewCommunityName(e.target.value)}
                className="w-full bg-white border border-slate-200 shadow-sm p-4 rounded-2xl text-center text-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-900"
              />
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold p-4 rounded-2xl transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.1)]">
                Create Community
              </button>
            </form>
          </div>
        )}

        {/* Main dashboard tabs */}
        {activeTab !== 'profile' && (activeCommunity || communities.length > 0) && (
          <div className="space-y-10 text-left w-full max-w-5xl mx-auto">
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

            {/* ISSUES TAB */}
            {activeTab === 'issues' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><AlertCircle size={24} className="text-primary" /> Active Issues</h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-white rounded-full border border-slate-200 text-slate-400 shadow-sm">Sorted by Priority</span>
                </div>

                {issues.length === 0 ? (
                  <div className="p-12 border border-dashed border-slate-300 rounded-[2rem] bg-slate-50 text-center text-slate-500 font-medium">
                    No issues reported yet. Everything is serene! ☕
                  </div>
                ) : issues.map(issue => (
                  <div key={issue.id} className="p-6 border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-extrabold border ${priorityColor(issue.priority)}`}>{issue.priority}</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border border-slate-200 px-2 py-0.5 rounded bg-slate-50">{issue.category}</span>
                      </div>
                      <h3 className="font-bold text-xl text-slate-900 mb-1">{issue.title}</h3>
                      <p className="text-sm font-medium text-slate-500 line-clamp-2">{issue.description}</p>
                      <p className="mt-2 text-xs text-slate-400 font-semibold">By: {issue.profiles?.full_name} · Room {issue.room_number}</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</span>
                        <div className="relative">
                          <select value={issue.status} onChange={(e) => updateIssueStatus(issue.id, e.target.value)}
                            className="w-full py-2 px-3 pl-8 rounded-lg text-sm bg-white border border-slate-200 appearance-none font-bold outline-none cursor-pointer focus:ring-2 focus:ring-primary/20 shadow-sm">
                            <option value="Pending">⏳ Pending</option>
                            <option value="In Progress">🔧 In Progress</option>
                            <option value="Resolved">✅ Resolved</option>
                          </select>
                          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                            {issue.status === 'Resolved' ? <CheckCircle2 size={14} className="text-emerald-500" /> :
                             issue.status === 'In Progress' ? <Clock size={14} className="text-blue-500" /> :
                             <AlertCircle size={14} className="text-amber-500" />}
                          </div>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Assign Technician</span>
                        <select value={issue.assigned_worker_id || ''} onChange={(e) => assignWorker(issue.id, e.target.value)}
                          className="w-full py-2 px-3 rounded-lg text-sm bg-white border border-slate-200 font-semibold outline-none cursor-pointer focus:ring-2 focus:ring-primary/20 shadow-sm text-slate-700">
                          <option value="">— Unassigned —</option>
                          {workers.map(w => (
                            <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* WORKERS TAB */}
            {activeTab === 'workers' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><Wrench size={24} className="text-primary" /> Manage Technicians</h2>
                
                {/* Add worker form */}
                <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                  <h3 className="font-extrabold text-slate-900 text-base mb-4 flex items-center gap-2"><Plus size={16} className="text-primary" /> Add New Technician</h3>
                  <form onSubmit={handleAddWorker} className="flex flex-col sm:flex-row gap-3">
                    <input type="text" placeholder="Technician Name" required value={workerName} onChange={e => setWorkerName(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm font-medium"
                    />
                    <select value={workerRole} onChange={e => setWorkerRole(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm font-semibold cursor-pointer">
                      <option value="plumber">🔧 Plumber</option>
                      <option value="electrician">⚡ Electrician</option>
                      <option value="cleaner">🧹 Cleaner</option>
                      <option value="maintenance">🔨 Maintenance</option>
                    </select>
                    <button type="submit" disabled={addingWorker}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-sm disabled:opacity-50 whitespace-nowrap">
                      {addingWorker ? 'Adding...' : 'Add Technician'}
                    </button>
                  </form>
                </div>

                {/* Workers list */}
                {workers.length === 0 ? (
                  <div className="p-12 border border-dashed border-slate-300 rounded-[2rem] bg-slate-50 text-center text-slate-500 font-medium">
                    No technicians added yet.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {workers.map(worker => (
                      <div key={worker.id} className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm flex items-center justify-between gap-4 hover:shadow-md transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-extrabold text-lg">
                            <Wrench size={22} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">{worker.name}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{workerRoleLabel[worker.role]}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteWorker(worker.id)} className="p-2.5 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-200 text-slate-400 hover:text-red-500 transition-all">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* COMMUNITY/RESIDENTS TAB */}
            {activeTab === 'community' && (
               <div className="space-y-6">
                <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><Users size={24} className="text-primary" /> Member Directory</h2>
                {members.length === 0 ? (
                  <div className="p-12 border border-dashed border-slate-300 rounded-[2rem] bg-slate-50 text-center text-slate-500 font-medium">
                    No residents have joined yet.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {members.map(member => (
                      <div key={member.id} className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow group">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xl group-hover:bg-primary group-hover:text-white transition-colors">
                          {member.room_number}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-900">{member.profiles?.full_name}</h3>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-1">Joined {new Date(member.joined_at).toLocaleDateString()}</p>
                        </div>
                      </div>
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
