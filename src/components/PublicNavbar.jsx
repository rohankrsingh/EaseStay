import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Command, LayoutDashboard, LogOut, Home, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PublicNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Auto-detect auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile when session changes
  useEffect(() => {
    if (!session) { setProfile(null); return; }
    supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [session]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const links = [
    { label: 'Home', path: '/' },
    { label: 'Explore PGs', path: '/communities' },
  ];

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : session?.user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-5 py-3.5 flex items-center justify-between gap-4">

        {/* Brand */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-inner group-hover:bg-violet-700 transition-colors">
            <Command size={18} className="text-white" />
          </div>
          <span className="font-bold text-slate-900 text-lg tracking-tight hidden sm:block">EaseStay</span>
        </button>

        {/* Centre links */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-full px-2 py-1.5">
          {links.map(({ label, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`px-4 py-1.5 text-sm font-bold rounded-full transition-all ${
                location.pathname === path ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          {session ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="w-10 h-10 rounded-full bg-violet-600 text-white font-black text-sm flex items-center justify-center shadow-md hover:bg-violet-700 hover:scale-105 transition-all border-2 border-white"
              >
                {initials}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 w-52 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-4 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900 truncate">{profile?.full_name || 'User'}</p>
                    <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
                  </div>
                  <div className="p-2">
                    <button onClick={() => { setMenuOpen(false); navigate('/dashboard'); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
                      <LayoutDashboard size={16} className="text-slate-400" /> Dashboard
                    </button>
                    <button onClick={() => { setMenuOpen(false); navigate('/'); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
                      <Home size={16} className="text-slate-400" /> Home
                    </button>
                    <button onClick={() => { setMenuOpen(false); navigate('/communities'); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
                      <Building2 size={16} className="text-slate-400" /> Explore PGs
                    </button>
                    <div className="h-px bg-slate-100 my-1" />
                    <button onClick={() => { supabase.auth.signOut(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-red-600 rounded-xl hover:bg-red-50 transition-colors">
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <button onClick={() => navigate('/auth')}
                className="hidden sm:block text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors px-3 py-2 rounded-full">
                Sign In
              </button>
              <button onClick={() => navigate('/auth')}
                className="text-sm font-bold bg-slate-900 hover:bg-violet-700 text-white px-5 py-2.5 rounded-full transition-all hover:scale-105 active:scale-95 shadow-sm">
                Get Started
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
