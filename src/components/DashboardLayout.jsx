import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

/**
 * DashboardLayout — shared shell for Owner, Resident and Worker dashboards.
 *
 * @param {object} profile      – Supabase user profile
 * @param {string} role         – "owner" | "resident" | "worker"
 * @param {string} title        – header label shown in the top bar
 * @param {string} activeTab    – currently selected tab id (controlled by parent)
 * @param {fn}     setActiveTab – setter to change the active tab
 * @param {ReactNode} children  – dashboard page content
 */
export default function DashboardLayout({
  profile,
  role,
  title,
  activeTab,
  setActiveTab,
  children,
}) {
  return (
    <SidebarProvider>
      <AppSidebar
        variant="inset"
        profile={profile}
        role={role}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <SidebarInset>
        <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
          <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            <h1 className="text-base font-medium capitalize">{title}</h1>
          </div>
        </header>

        <div className="flex flex-1 flex-col">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
