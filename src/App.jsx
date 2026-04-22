import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Auth from './pages/Auth';
import LandingPage from './pages/LandingPage';
import ResidentDashboard from './pages/ResidentDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import CommunitiesPage from './pages/CommunitiesPage';
import CommunityDetailPage from './pages/CommunityDetailPage';
import { Toaster } from './components/ui/sonner';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500 bg-slate-50 font-medium tracking-wide">Loading EaseStay...</div>;
  }

  return (
    <div className="min-h-screen text-slate-900 bg-slate-50 font-sans selection:bg-primary/20">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage session={session} />} />
          <Route path="/communities" element={<CommunitiesPage />} />
          <Route path="/communities/:id" element={<CommunityDetailPage />} />
          <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={session ? <RoleBasedRouter session={session} /> : <Navigate to="/auth" />} />
          <Route path="/admin" element={session ? <RoleBasedRouter session={session} /> : <Navigate to="/auth" />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  );
}

// ── Co-Owner wrapper: resident who's a co-owner can switch between both views ──
function CoOwnerDashboard({ session }) {
  const [mode, setMode] = useState('resident');
  return (
    <div>
      {/* Floating mode badge */}
      <div className="fixed top-4 right-4 z-80 flex items-center gap-1 bg-white border border-slate-200 shadow-xl rounded-2xl p-1">
        <button
          onClick={() => setMode('resident')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'resident' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
        >
          🏠 Resident
        </button>
        <button
          onClick={() => setMode('owner')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'owner' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
        >
          🏢 Owner View
        </button>
      </div>
      {mode === 'resident'
        ? <ResidentDashboard session={session} />
        : <OwnerDashboard session={session} coOwnerMode />
      }
    </div>
  );
}

// ── Role-based router: checks profile role + co-owner status ──
function RoleBasedRouter({ session }) {
  const [role, setRole] = useState(null);
  const [isCoOwner, setIsCoOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      // 1. Get base role from profiles
      const { data } = await supabase
        .from('profiles').select('role').eq('id', session.user.id).maybeSingle();

      let resolvedRole = 'resident';
      if (data) {
        resolvedRole = data.role;
      } else {
        await supabase.from('profiles').insert([
          { id: session.user.id, full_name: 'Resident User', role: 'resident' }
        ]);
      }
      setRole(resolvedRole);

      // 2. Only residents may also be co-owners
      if (resolvedRole === 'resident') {
        const { data: memberData } = await supabase
          .from('members')
          .select('community_role')
          .eq('user_id', session.user.id)
          .eq('community_role', 'co_owner')
          .maybeSingle();
        if (memberData) setIsCoOwner(true);
      }

      setLoading(false);
    }
    fetchRole();
  }, [session]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500 bg-slate-50 font-medium">Loading profile...</div>;
  }

  if (role === 'admin') return <AdminDashboard session={session} />;
  if (role === 'owner') return <OwnerDashboard session={session} />;
  if (role === 'worker') return <WorkerDashboard session={session} />;
  if (isCoOwner) return <CoOwnerDashboard session={session} />;
  return <ResidentDashboard session={session} />;
}

export default App;
