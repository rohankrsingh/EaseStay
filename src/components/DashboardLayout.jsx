import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard as LayoutDashboardIcon,
  AlertCircle as AlertCircleIcon,
  Users as UsersIcon,
  Wrench as WrenchIcon,
  Bell as BellIcon,
  Settings as SettingsIcon,
  HelpCircle as HelpCircleIcon,
  Building2 as Building2Icon,
  ClipboardList as ClipboardListIcon,
  Menu,
  LogOut,
  User as UserIcon,
  Home,
  Sliders as SlidersIcon,
  ExternalLink as ExternalLinkIcon,
  Compass as CompassIcon
} from "lucide-react";

const navByRole = {
  owner: [
    { title: "Communities",        id: "communities_overview", icon: Building2Icon },
    { title: "Issue Management",   id: "issues",               icon: AlertCircleIcon },
    { title: "Resident Profiles",  id: "residents",            icon: UsersIcon },
    { title: "Technicians",        id: "workers",              icon: WrenchIcon },
    { title: "Members",            id: "community",            icon: UserIcon },
    { title: "PG Settings",        id: "pg_info",              icon: SlidersIcon },
    { title: "My Profile",         id: "profile",              icon: UserIcon },
  ],
  resident: [
    { title: "Dashboard", id: "dashboard", icon: LayoutDashboardIcon },
    { title: "Overview",  id: "overview",  icon: ClipboardListIcon },
    { title: "My Profile",id: "profile",   icon: UserIcon },
  ],
  worker: [
    { title: "My Tasks",   id: "tasks",    icon: LayoutDashboardIcon },
    { title: "My Profile", id: "profile",  icon: UserIcon },
  ],
};

export default function DashboardLayout({
  profile,
  role,
  title,
  activeTab,
  setActiveTab,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const navItems = navByRole[role] || navByRole.resident;

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-900 font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} flex flex-col`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 font-bold text-lg text-slate-900 hover:text-violet-700 transition-colors">
            <Home className="text-primary h-5 w-5" />
            <span>EaseStay</span>
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    activeTab === item.id 
                      ? "bg-slate-900 text-white" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${activeTab === item.id ? "text-slate-300" : "text-slate-400"}`} />
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Quick External Links */}
        <div className="px-3 pb-2 border-b border-slate-100">
          <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 px-3 mb-1">Explore</p>
          <button onClick={() => { navigate('/'); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
            <Home className="h-4 w-4 text-slate-400" /> Home
          </button>
          <button onClick={() => { navigate('/communities'); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
            <Building2Icon className="h-4 w-4 text-slate-400" /> Explore PGs
          </button>
        </div>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              {profile?.full_name?.charAt(0) || "U"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold truncate text-slate-900">{profile?.full_name || "User"}</span>
              <span className="text-xs text-slate-500 uppercase font-semibold">{role}</span>
            </div>
          </div>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-h-screen">
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-900 capitalize">{title}</h1>
          </div>
        </header>

        <main className="flex-1 bg-slate-50 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
