import { LogOut,Building, LayoutDashboard, Settings, User, Users, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';



export default function Sidebar({ role, activeTab, setActiveTab, notificationCount = 0 }) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const residentNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'overview', label: 'Overview', icon: LayoutDashboard }, // Overview tab for resolved issues
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  const ownerNav = [
    { id: 'communities_overview', label: 'Communities', icon: Building },
    { id: 'issues', label: 'Issue Management', icon: LayoutDashboard },
    { id: 'residents', label: 'Resident Profiles', icon: Users },
    { id: 'workers', label: 'Technicians', icon: Settings },
    { id: 'community', label: 'Members', icon: User },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  const workerNav = [
    { id: 'tasks', label: 'My Tasks', icon: LayoutDashboard },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  const navItems = role === 'resident' ? residentNav : role === 'worker' ? workerNav : ownerNav;

  return (
    <div className="w-64 h-screen border-r border-slate-200 bg-white flex flex-col justify-between hidden md:flex sticky top-0 shrink-0 shadow-sm z-50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 tracking-tight">
            EaseStay
          </h2>
          {notificationCount > 0 && (
            <div className="relative">
              <Bell size={20} className="text-slate-400" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            </div>
          )}
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium ${
                activeTab === item.id
                  ? 'bg-primary/5 text-primary border border-primary/10 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-primary' : 'text-slate-400'} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="p-6">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-600 hover:bg-red-50 hover:border-red-100 border border-transparent transition-all font-medium"
        >
          <LogOut size={20} className="text-red-500" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
