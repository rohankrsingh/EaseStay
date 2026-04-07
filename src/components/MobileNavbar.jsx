import { useState } from 'react';
import { Menu, X, Bell, Home, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function MobileNavbar({ role, activeTab, setActiveTab, notificationCount = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const navItems = role === 'resident' ? [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'overview', label: 'Overview' },
    { id: 'profile', label: 'My Profile' },
  ] : role === 'worker' ? [
    { id: 'tasks', label: 'My Tasks' },
    { id: 'profile', label: 'My Profile' },
  ] : [
    { id: 'communities_overview', label: 'Communities' },
    { id: 'issues', label: 'Issue Management' },
    { id: 'residents', label: 'Resident Profiles' },
    { id: 'workers', label: 'Technicians' },
    { id: 'community', label: 'Members' },
    { id: 'pg_info', label: 'PG Settings' },
    { id: 'profile', label: 'My Profile' },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setIsOpen(false);
  };

  return (
    <div className="md:hidden sticky top-0 z-[60] bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 tracking-tight">
          EaseStay
        </h2>
        <div className="flex items-center gap-4">
          {notificationCount > 0 && (
            <div className="relative">
              <Bell size={20} className="text-slate-400" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            </div>
          )}
          <button onClick={() => setIsOpen(!isOpen)} className="text-slate-600 p-1">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg p-5 flex flex-col gap-2 animate-in slide-in-from-top-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`text-left px-4 py-3 rounded-xl font-bold transition-all ${
                activeTab === item.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="h-px bg-slate-100 my-2" />
          <button onClick={() => { navigate('/'); setIsOpen(false); }}
            className="text-left px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 border border-transparent transition-all flex items-center gap-2">
            <Home size={16} /> Home
          </button>
          <button onClick={() => { navigate('/communities'); setIsOpen(false); }}
            className="text-left px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 border border-transparent transition-all flex items-center gap-2">
            <Building2 size={16} /> Explore PGs
          </button>
          <div className="h-px bg-slate-100 my-2" />
          <button
            onClick={handleSignOut}
            className="text-left px-4 py-3 rounded-xl font-bold text-red-600 hover:bg-red-50 transition-all border border-transparent"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
