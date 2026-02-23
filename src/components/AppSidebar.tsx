import { LayoutDashboard, Users, FolderKanban, FileText, Building2, UserCircle, Settings, LogOut, ListTodo, TrendingUp, BarChart3 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Contactos", url: "/contactos", icon: UserCircle },
  { title: "Tareas", url: "/tareas", icon: ListTodo },
  { title: "CRM", url: "/crm", icon: Users },
  { title: "Cotizaciones", url: "/cotizaciones", icon: FileText },
  { title: "Clientes", url: "/clientes", icon: Building2 },
  { title: "Proyectos", url: "/projects", icon: FolderKanban },
  { title: "Forecast", url: "/forecast", icon: TrendingUp },
  { title: "Analítica", url: "/analitica", icon: BarChart3 },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

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
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname.startsWith("/configuracion")}
            >
              <NavLink to="/configuracion" activeClassName="bg-sidebar-accent text-sidebar-primary">
                <Settings className="h-4 w-4" />
                <span>Configuración</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} className="text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {user && (
          <div className="px-3 pb-1 group-data-[collapsible=icon]:hidden">
            <p className="text-[10px] text-sidebar-foreground/40 truncate">{user.email}</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
