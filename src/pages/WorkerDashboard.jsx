import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Wrench, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function WorkerDashboard({ session }) {
  const [profile, setProfile] = useState(null);
  const [assignedIssues, setAssignedIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [session]);

  const fetchData = async () => {
    setLoading(true);
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    setProfile(prof || { full_name: 'Worker' });

    // Find their worker record
    const { data: workerData } = await supabase
      .from('workers')
      .select('id, communities(name)')
      .eq('profile_id', session.user.id)
      .maybeSingle();

    if (workerData) {
      const { data: issues } = await supabase
        .from('issues')
        .select('*')
        .eq('assigned_worker_id', workerData.id)
        .order('created_at', { ascending: false });
      setAssignedIssues(issues || []);
    }
    setLoading(false);
  };

  const updateStatus = async (issueId, newStatus) => {
    await supabase.from('issues').update({ status: newStatus }).eq('id', issueId);
    fetchData();
  };

  const handleSignOut = () => supabase.auth.signOut();

  const getPriorityColor = (p) => {
    switch (p) {
      case 'Critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Medium': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default: return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Simple left panel */}
      <div className="w-64 h-screen border-r border-slate-200 bg-white flex flex-col justify-between sticky top-0 shrink-0 shadow-sm hidden md:flex">
        <div className="p-6">
          <h2 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 mb-10 tracking-tight">EaseStay</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-primary/5 text-primary border border-primary/10 font-semibold">
              <Wrench size={20} /> My Tasks
            </div>
          </div>
        </div>
        <div className="p-6">
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 border border-transparent transition-all font-medium text-sm">
            Sign Out
          </button>
        </div>
      </div>

      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-8">
          <header className="border-b border-slate-200 pb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-600 font-bold text-xs mb-3 uppercase tracking-wider">
              <Wrench size={12} /> Technician
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Hi, {profile?.full_name} 👷</h1>
            <p className="text-slate-500 mt-2 font-medium">Here are the issues assigned to you.</p>
          </header>

          <div className="space-y-5">
            {loading && <p className="text-slate-400 font-medium text-center py-8">Loading your tasks...</p>}
            {!loading && assignedIssues.length === 0 && (
              <div className="p-12 border border-dashed border-slate-300 rounded-[2rem] bg-slate-50 text-center text-slate-500 font-medium">
                No issues assigned to you yet. Check back later.
              </div>
            )}
            {assignedIssues.map(issue => (
              <div key={issue.id} className="p-6 border border-slate-200 rounded-2xl bg-white shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-extrabold border ${getPriorityColor(issue.priority)}`}>{issue.priority}</span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border border-slate-200 px-2 py-0.5 rounded">{issue.category}</span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">{issue.title}</h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">Room {issue.room_number}</p>
                </div>
                <div className="flex flex-col gap-2 min-w-[160px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Update Status</span>
                  <select
                    value={issue.status}
                    onChange={e => updateStatus(issue.id, e.target.value)}
                    className="w-full py-2 px-3 rounded-lg text-sm bg-white border border-slate-200 font-bold outline-none cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm text-slate-700"
                  >
                    <option value="Pending">⏳ Pending</option>
                    <option value="In Progress">🔧 In Progress</option>
                    <option value="Resolved">✅ Resolved</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
