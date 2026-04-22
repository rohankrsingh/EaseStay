import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../components/DashboardLayout';
import { Building2, Shield, Users, Ban, BadgeCheck, Search, RefreshCw, UserCog, Mail, Camera, Save, FileText, AlertTriangle, Clock3, CheckCircle2, ArrowRight, Sparkles, Target, ClipboardList, Star, UserRoundCog, Layers3 } from 'lucide-react';
import { toast } from 'sonner';

const roleLabel = {
  resident: 'Resident',
  owner: 'Owner',
  worker: 'Worker',
  admin: 'Admin',
};

export default function AdminDashboard({ session }) {
  const [profile, setProfile] = useState(null);
  const [communities, setCommunities] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [communityFilter, setCommunityFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [profileDraft, setProfileDraft] = useState({ full_name: '', phone: '', bio: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: prof }, { data: comms }, { data: metricRows }, { data: profileRows }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
      supabase.from('communities').select('*, profiles:owner_id(full_name, phone)').order('created_at', { ascending: false }),
      supabase.from('community_metrics').select('*'),
      supabase.from('profiles').select('id, full_name, role, phone, created_at').order('created_at', { ascending: false }),
    ]);

    const nextProfile = prof || { full_name: 'Admin', phone: '', bio: '' };
    setProfile(nextProfile);
    setProfileDraft({
      full_name: nextProfile.full_name || '',
      phone: nextProfile.phone || '',
      bio: nextProfile.bio || '',
    });
    setCommunities(comms || []);
    setMetrics(metricRows || []);
    setUsers(profileRows || []);
    setLoading(false);
  }, [session.user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const metricsMap = useMemo(() => Object.fromEntries(metrics.map((row) => [row.community_id, row])), [metrics]);

  const communityRows = useMemo(() => {
    return communities
      .filter((community) => {
        if (communityFilter === 'all') return true;
        return (community.status || 'active') === communityFilter;
      })
      .filter((community) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return community.name.toLowerCase().includes(q) || (community.profiles?.full_name || '').toLowerCase().includes(q);
      })
      .map((community) => ({
        ...community,
        metrics: metricsMap[community.id] || { issues_resolved: 0, total_reviews: 0, resident_rating: 0, avg_resolution_hours: 0 },
      }));
  }, [communities, communityFilter, metricsMap, search]);

  const counts = useMemo(() => ({
    total: communities.length,
    active: communities.filter((community) => (community.status || 'active') === 'active').length,
    banned: communities.filter((community) => community.status === 'banned').length,
    users: users.length,
  }), [communities, users.length]);

  const adminHighlights = useMemo(() => {
    const mapped = communityRows.map((community) => ({
      ...community,
      rating: Number(community.metrics?.weighted_rating || 0),
      reviews: Number(community.metrics?.total_reviews || 0),
      resolved: Number(community.metrics?.issues_resolved || 0),
    }));

    return {
      lowRating: mapped
        .filter((community) => community.rating > 0)
        .sort((a, b) => a.rating - b.rating)
        .slice(0, 3),
      mostReviewed: mapped
        .filter((community) => community.reviews > 0)
        .sort((a, b) => b.reviews - a.reviews)
        .slice(0, 3),
      highResolved: mapped
        .filter((community) => community.resolved > 0)
        .sort((a, b) => b.resolved - a.resolved)
        .slice(0, 3),
      topOwners: users
        .filter((user) => user.role === 'owner')
        .slice(0, 5),
    };
  }, [communityRows, users]);

  const pendingWorkCount = useMemo(() => {
    return communities.filter((community) => (community.status || 'active') === 'active' && Number(metricsMap[community.id]?.total_reviews || 0) === 0).length;
  }, [communities, metricsMap]);

  const handleAdminProfileSave = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profileDraft.full_name,
        phone: profileDraft.phone,
        bio: profileDraft.bio,
      })
      .eq('id', session.user.id);

    if (error) {
      setProfileMessage({ type: 'error', text: error.message });
    } else {
      setProfileMessage({ type: 'success', text: 'Admin profile saved successfully.' });
      await fetchData();
    }
    setProfileSaving(false);
  };

  const updateCommunityStatus = async (community, nextStatus) => {
    setBusyId(community.id);
    try {
      const { error } = await supabase.from('communities').update({ status: nextStatus }).eq('id', community.id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyId(null);
    }
  };

  const deleteCommunity = async (community) => {
    setBusyId(community.id);
    try {
      const { error } = await supabase.from('communities').delete().eq('id', community.id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyId(null);
    }
  };

  const updateUserRole = async (user, nextRole) => {
    setBusyId(user.id);
    try {
      const { error } = await supabase.from('profiles').update({ role: nextRole }).eq('id', user.id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyId(null);
    }
  };

  const overviewCards = [
    { label: 'Total Communities', value: counts.total, icon: Building2, tone: 'slate' },
    { label: 'Active Communities', value: counts.active, icon: BadgeCheck, tone: 'emerald' },
    { label: 'Banned Communities', value: counts.banned, icon: Ban, tone: 'red' },
    { label: 'Users', value: counts.users, icon: Users, tone: 'amber' },
  ];

  if (loading) {
    return (
      <DashboardLayout profile={profile} role="admin" title="Admin Console" activeTab={activeTab} setActiveTab={setActiveTab}>
        <div className="p-6 sm:p-8">
          <div className="rounded-4xl bg-white border border-slate-200 p-8 shadow-sm animate-pulse">
            <div className="h-4 w-32 rounded-full bg-slate-200 mb-4" />
            <div className="h-10 w-2/3 rounded-2xl bg-slate-200 mb-3" />
            <div className="h-4 w-1/2 rounded-full bg-slate-200" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout profile={profile} role="admin" title="Admin Console" activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        {activeTab === 'overview' && (
          <>
            <section className="rounded-4xl bg-slate-950 text-white border border-slate-800 p-6 sm:p-8 shadow-2xl overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.14),transparent_30%)]" />
              <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-slate-400 mb-3">Admin-only control center</p>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Moderate communities, roles, and abuse from one place.</h2>
                  <p className="text-slate-300 mt-3 max-w-2xl font-medium">Ban or delete communities, promote or demote users, and enforce platform policy without leaving the dashboard.</p>
                </div>
                <button onClick={fetchData} className="inline-flex items-center gap-2 self-start rounded-full bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2.5 font-bold transition-colors">
                  <RefreshCw size={16} /> Refresh
                </button>
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {overviewCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="rounded-[1.75rem] bg-white border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{card.label}</p>
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${card.tone === 'red' ? 'bg-red-50 text-red-600' : card.tone === 'emerald' ? 'bg-emerald-50 text-emerald-600' : card.tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                        <Icon size={20} />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{card.value}</div>
                  </div>
                );
              })}
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-4xl bg-white border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-black text-slate-900">Community moderation queue</h3>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{communityRows.length} shown</span>
                </div>
                <div className="space-y-3 max-h-105 overflow-auto pr-1">
                  {communityRows.slice(0, 6).map((community) => {
                    const metricsRow = community.metrics || {};
                    const isBanned = community.status === 'banned';
                    return (
                      <div key={community.id} className={`rounded-2xl border p-4 flex items-center justify-between gap-4 ${isBanned ? 'border-red-200 bg-red-50/40' : 'border-slate-200 bg-slate-50/40'}`}>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-slate-900">{community.name}</h4>
                            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${isBanned ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{community.status || 'active'}</span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-1">Owner: {community.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-slate-500 font-medium mt-1">Resolved: {metricsRow.issues_resolved || 0} · Reviews: {metricsRow.total_reviews || 0}</p>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => toast(isBanned ? 'Unban community?' : 'Ban community?', {
                              description: isBanned ? 'This community will become active again.' : 'This community will be hidden from public pages.',
                              action: { label: isBanned ? 'Unban' : 'Ban', onClick: () => updateCommunityStatus(community, isBanned ? 'active' : 'banned') },
                              cancel: { label: 'Cancel' },
                            })}
                            className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${isBanned ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                          >
                            {isBanned ? 'Unban' : 'Ban'}
                          </button>
                          <button
                            onClick={() => toast('Delete community?', {
                              description: 'This permanently removes the community and all related records.',
                              action: { label: 'Delete', onClick: () => deleteCommunity(community) },
                              cancel: { label: 'Cancel' },
                            })}
                            className="rounded-xl px-3 py-2 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-4xl bg-white border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-black text-slate-900">User role control</h3>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Admin only</span>
                </div>
                <div className="space-y-3 max-h-105 overflow-auto pr-1">
                  {users.slice(0, 8).map((user) => {
                    const isMe = user.id === session.user.id;
                    return (
                      <div key={user.id} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 flex items-center justify-between gap-4">
                        <div>
                          <h4 className="font-black text-slate-900">{user.full_name}</h4>
                          <p className="text-xs text-slate-500 font-medium mt-1">{roleLabel[user.role] || user.role} · {user.phone || 'No phone'}</p>
                        </div>
                        <select
                          value={user.role || 'resident'}
                          disabled={isMe}
                          onChange={(e) => updateUserRole(user, e.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
                        >
                          <option value="resident">Resident</option>
                          <option value="owner">Owner</option>
                          <option value="worker">Worker</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'communities' && (
          <section className="rounded-4xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Communities</h3>
                <p className="text-slate-500 font-medium">Ban, unban, or delete any community from the platform.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search communities..." className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <select value={communityFilter} onChange={(e) => setCommunityFilter(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 outline-none">
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="banned">Banned</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-2">Community</th>
                    <th className="px-4 py-2">Owner</th>
                    <th className="px-4 py-2">Rating</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {communityRows.map((community) => {
                    const metricsRow = community.metrics || {};
                    const isBanned = community.status === 'banned';
                    return (
                      <tr key={community.id} className="bg-slate-50/60 rounded-2xl">
                        <td className="px-4 py-4 rounded-l-2xl">
                          <div className="font-black text-slate-900">{community.name}</div>
                          <div className="text-xs text-slate-500 font-medium">{metricsRow.issues_resolved || 0} issues resolved · {metricsRow.total_reviews || 0} reviews</div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600 font-medium">{community.profiles?.full_name || 'Unknown'}</td>
                        <td className="px-4 py-4 text-sm font-black text-slate-900">{Number(metricsRow.weighted_rating || 0).toFixed(1)}</td>
                        <td className="px-4 py-4">
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${isBanned ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{community.status || 'active'}</span>
                        </td>
                        <td className="px-4 py-4 rounded-r-2xl">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => toast(isBanned ? 'Unban community?' : 'Ban community?', {
                                description: isBanned ? 'This restores public access.' : 'This hides the community from public pages.',
                                action: { label: isBanned ? 'Unban' : 'Ban', onClick: () => updateCommunityStatus(community, isBanned ? 'active' : 'banned') },
                                cancel: { label: 'Cancel' },
                              })}
                              className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${isBanned ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                            >
                              {isBanned ? 'Unban' : 'Ban'}
                            </button>
                            <button
                              onClick={() => toast('Delete community?', {
                                description: 'This permanently removes the community and all dependent records.',
                                action: { label: 'Delete', onClick: () => deleteCommunity(community) },
                                cancel: { label: 'Cancel' },
                              })}
                              className="rounded-xl px-3 py-2 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'users' && (
          <section className="rounded-4xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Users</h3>
                <p className="text-slate-500 font-medium">Promote or demote platform roles.</p>
              </div>
              <UserCog className="text-slate-300" size={28} />
            </div>
            <div className="grid gap-3">
              {users.map((user) => {
                const isMe = user.id === session.user.id;
                return (
                  <div key={user.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h4 className="font-black text-slate-900">{user.full_name}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">{user.id}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">{roleLabel[user.role] || user.role}</span>
                      <select
                        value={user.role || 'resident'}
                        disabled={isMe}
                        onChange={(e) => updateUserRole(user, e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
                      >
                        <option value="resident">Resident</option>
                        <option value="owner">Owner</option>
                        <option value="worker">Worker</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'tasks' && (
          <section className="rounded-4xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Admin Tasks</h3>
                <p className="text-slate-500 font-medium mt-1">Actionable platform work pulled from live community and user data.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Communities with no reviews</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{pendingWorkCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Moderation ready</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{communities.length}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-black text-slate-900 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> Communities needing attention</h4>
                      <p className="text-sm text-slate-500 font-medium mt-1">Low review volume and low weighted ratings are sorted first.</p>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Top priorities</span>
                  </div>
                  <div className="space-y-3">
                    {adminHighlights.lowRating.length ? adminHighlights.lowRating.map((community) => (
                      <div key={community.id} className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-black text-slate-900">{community.name}</div>
                          <div className="text-xs text-slate-500 font-medium mt-1">{community.reviews} reviews · {community.resolved} resolved issues</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-slate-900">{community.rating.toFixed(1)}</div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">Weighted</div>
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500 font-medium">No communities need escalation right now.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-black text-slate-900 flex items-center gap-2"><ClipboardList size={18} className="text-slate-700" /> Review queue</h4>
                      <p className="text-sm text-slate-500 font-medium mt-1">Work through communities in a practical order.</p>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Suggested flow</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { title: 'Inspect low-rated PGs', desc: 'Check if the score is based on review volume or a real issue pattern.', icon: Star },
                      { title: 'Review inactive communities', desc: 'Look for communities with zero reviews and no resolved issues.', icon: Clock3 },
                      { title: 'Audit owner activity', desc: 'Prioritize owners with repeated complaints or weak response signals.', icon: UserRoundCog },
                      { title: 'Check issue throughput', desc: 'Spot communities with slow resolution times or high issue counts.', icon: Layers3 },
                    ].map((task) => (
                      <div key={task.title} className="rounded-2xl bg-white border border-slate-200 p-4">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3"><task.icon size={18} /></div>
                        <h5 className="font-black text-slate-900">{task.title}</h5>
                        <p className="text-sm text-slate-500 font-medium mt-1">{task.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-3xl border border-slate-200 bg-slate-950 text-white p-5 overflow-hidden relative">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.15),transparent_30%)]" />
                  <div className="relative z-10">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-slate-400">Quick actions</p>
                    <h4 className="text-xl font-black mt-2">One-click admin operations</h4>
                    <div className="mt-4 space-y-3">
                      {[
                        { label: 'Open communities board', hint: 'Ban, unban, or delete communities', icon: ArrowRight },
                        { label: 'Open user role control', hint: 'Promote or demote users', icon: ArrowRight },
                        { label: 'Refresh platform data', hint: 'Pull the latest counts and rankings', icon: RefreshCw },
                      ].map((action) => (
                        <button
                          key={action.label}
                          onClick={() => action.label.includes('communities') ? setActiveTab('communities') : action.label.includes('user') ? setActiveTab('users') : fetchData()}
                          className="w-full flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10 transition-colors"
                        >
                          <div>
                            <div className="font-bold">{action.label}</div>
                            <div className="text-sm text-slate-300 font-medium mt-0.5">{action.hint}</div>
                          </div>
                          <action.icon size={16} className="text-slate-300" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <h4 className="font-black text-slate-900 flex items-center gap-2"><Sparkles size={18} className="text-violet-500" /> High-signal communities</h4>
                  <div className="mt-4 space-y-3">
                    {adminHighlights.highResolved.length ? adminHighlights.highResolved.map((community) => (
                      <div key={community.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-black text-slate-900">{community.name}</div>
                          <div className="text-xs text-slate-500 font-medium mt-1">{community.resolved} resolved issues · {community.reviews} reviews</div>
                        </div>
                        <button onClick={() => setActiveTab('communities')} className="text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-full px-3 py-2 hover:bg-slate-50 transition-colors">
                          Review
                        </button>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 font-medium">No resolved issue data yet.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <h4 className="font-black text-slate-900 flex items-center gap-2"><Target size={18} className="text-emerald-600" /> Owner watchlist</h4>
                  <div className="mt-4 space-y-3">
                    {adminHighlights.topOwners.length ? adminHighlights.topOwners.map((owner) => (
                      <div key={owner.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-black text-slate-900">{owner.full_name}</div>
                          <div className="text-xs text-slate-500 font-medium mt-1">{owner.phone || 'No phone'} · {roleLabel[owner.role] || owner.role}</div>
                        </div>
                        <button onClick={() => setActiveTab('users')} className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-2 hover:bg-emerald-100 transition-colors">
                          View user
                        </button>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 font-medium">No owner entries available.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-4xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.08),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.08),transparent_30%)]" />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-slate-400 mb-2">Admin profile</p>
                    <h3 className="text-3xl font-black text-slate-900">{profileDraft.full_name || profile?.full_name || 'Admin'}</h3>
                    <p className="text-slate-500 font-medium mt-2 max-w-md">Manage the admin account used to moderate the platform and review communities.</p>
                  </div>
                  <div className="w-16 h-16 rounded-3xl bg-slate-950 text-white flex items-center justify-center text-2xl font-black shadow-xl">
                    {(profileDraft.full_name || profile?.full_name || 'A').charAt(0).toUpperCase()}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 mb-6">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Role</p>
                    <p className="text-lg font-black text-slate-900 mt-1">{roleLabel[profile?.role] || profile?.role || 'Admin'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Access</p>
                    <p className="text-lg font-black text-slate-900 mt-1">Full moderation</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700"><Mail size={18} /></div>
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Email</p>
                      <p className="font-bold text-slate-900">{session.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700"><Shield size={18} /></div>
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Account ID</p>
                      <p className="font-mono text-xs text-slate-700 break-all">{session.user.id}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-4xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Edit admin profile</h3>
                  <p className="text-slate-500 font-medium mt-1">Keep the account details used for moderation up to date.</p>
                </div>
                <Camera className="text-slate-300" size={24} />
              </div>

              {profileMessage && (
                <div className={`mb-5 rounded-2xl px-4 py-3 text-sm font-medium border ${profileMessage.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                  {profileMessage.text}
                </div>
              )}

              <form onSubmit={handleAdminProfileSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Full name</label>
                  <input
                    value={profileDraft.full_name}
                    onChange={(e) => setProfileDraft((current) => ({ ...current, full_name: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Admin name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Phone</label>
                  <input
                    value={profileDraft.phone}
                    onChange={(e) => setProfileDraft((current) => ({ ...current, phone: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Bio</label>
                  <textarea
                    rows={5}
                    value={profileDraft.bio}
                    onChange={(e) => setProfileDraft((current) => ({ ...current, bio: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 resize-none"
                    placeholder="Short admin bio or moderation note"
                  />
                </div>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 text-white px-5 py-3.5 font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  {profileSaving ? 'Saving...' : 'Save profile'}
                </button>
              </form>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}