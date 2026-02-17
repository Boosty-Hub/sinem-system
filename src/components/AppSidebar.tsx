import { LayoutDashboard, Users, FolderKanban } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "CRM", url: "/crm", icon: Users },
  { title: "Proyectos", url: "/projects", icon: FolderKanban },
];

const AppSidebar = () => {
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-lg">
            S
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h1 className="font-bold text-sidebar-foreground text-lg tracking-tight">SINEM</h1>
            <p className="text-[11px] text-sidebar-foreground/50">Siemens Partner RD</p>
          </div>
        </div>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-wider">
            Navegación
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url || (item.url !== "/" && location.pathname.startsWith(item.url))}
                  >
                    <NavLink to={item.url} end={item.url === "/"} activeClassName="bg-sidebar-accent text-sidebar-primary">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
