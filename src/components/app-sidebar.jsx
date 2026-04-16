import {
  LayoutDashboardIcon,
  AlertCircleIcon,
  UsersIcon,
  WrenchIcon,
  BellIcon,
  SettingsIcon,
  HelpCircleIcon,
  Building2Icon,
  ClipboardListIcon,
  Command,
  UserIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

/* ── Per-role nav items (id maps to activeTab value in each dashboard) ── */
const navByRole = {
  admin: [
    { title: "Overview",    id: "overview",    icon: LayoutDashboardIcon },
    { title: "Communities", id: "communities", icon: Building2Icon },
    { title: "Users",       id: "users",       icon: UsersIcon },
    { title: "Tasks",       id: "tasks",       icon: ClipboardListIcon },
    { title: "My Profile",  id: "profile",     icon: UserIcon },
  ],
  owner: [
    { title: "Communities",        id: "communities_overview", icon: Building2Icon },
    { title: "Issue Management",   id: "issues",               icon: AlertCircleIcon },
    { title: "Resident Profiles",  id: "residents",            icon: UsersIcon },
    { title: "Technicians",        id: "workers",              icon: WrenchIcon },
    { title: "Members",            id: "community",            icon: UserIcon },
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

const navSecondary = [
  { title: "Notifications", url: "#", icon: BellIcon },
  { title: "Settings",      url: "#", icon: SettingsIcon },
  { title: "Get Help",      url: "#", icon: HelpCircleIcon },
];

/**
 * AppSidebar
 * @param {object} profile   – user profile from Supabase
 * @param {string} role      – "admin" | "owner" | "resident" | "worker"
 * @param {string} activeTab – currently active tab id
 * @param {fn}     onTabChange – callback(tabId) to switch tabs
 */
export function AppSidebar({ profile, role, activeTab, onTabChange, ...props }) {
  const user = {
    name: profile?.full_name || "User",
    email: profile?.email || "",
    avatar: "",
  };

  const navItems = navByRole[role] ?? navByRole.resident;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      {/* ── Logo ── */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <a href="/">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background">
                  <Command className="h-3.5 w-3.5" />
                </div>
                <span className="text-base font-bold tracking-tight">EaseStay</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Main nav ── */}
      <SidebarContent>
        <NavMain items={navItems} activeTab={activeTab} onSelect={onTabChange} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>

      {/* ── User footer ── */}
      <SidebarFooter>
        <NavUser user={user} onSignOut={handleSignOut} />
      </SidebarFooter>
    </Sidebar>
  );
}
