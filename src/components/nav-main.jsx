import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

/**
 * NavMain — renders the primary nav items.
 * Each item with an `id` calls `onSelect(id)` when clicked.
 */
export function NavMain({ items, activeTab, onSelect }) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1 px-0">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                size="lg"
                tooltip={item.title}
                isActive={activeTab === item.id}
                onClick={() => item.id && onSelect?.(item.id)}
                className="cursor-pointer"
              >
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
