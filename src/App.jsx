import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Auth from './pages/Auth';
import LandingPage from './pages/LandingPage';
import ResidentDashboard from './pages/ResidentDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import WorkerDashboard from './pages/WorkerDashboard';

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
    return <div className="flex h-screen items-center justify-center min-h-screen text-slate-500 bg-slate-50 font-medium tracking-wide">Loading EaseStay...</div>;
  }

  return (
    <div className="min-h-screen text-slate-900 bg-slate-50 font-sans selection:bg-primary/20">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage session={session} />} />
          <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={session ? <RoleBasedRouter session={session} /> : <Navigate to="/auth" />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

function RoleBasedRouter({ session }) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      const { data } = await supabase
        .from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      if (data) {
        setRole(data.role);
      } else {
        await supabase.from('profiles').insert([
          { id: session.user.id, full_name: 'Resident User', role: 'resident' }
        ]);
        setRole('resident');
      }
      setLoading(false);
    }
    fetchRole();
  }, [session]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center min-h-screen text-slate-500 bg-slate-50 font-medium">Loading profile...</div>;
  }

  if (role === 'owner') return <OwnerDashboard session={session} />;
  if (role === 'worker') return <WorkerDashboard session={session} />;
  return <ResidentDashboard session={session} />;
}

export default App;
