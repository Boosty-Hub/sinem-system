import { LayoutDashboard, Users, FolderKanban, FileText, Building2, UserCircle, Settings, LogOut, ListTodo, BarChart3, User2 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";
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
  { title: "Dashboard", url: "/", icon: LayoutDashboard, module: "Dashboard" },
  { title: "Contactos", url: "/contactos", icon: UserCircle, module: "Contactos" },
  { title: "Tareas", url: "/tareas", icon: ListTodo, module: "Tareas" },
  { title: "CRM", url: "/crm", icon: Users, module: "CRM" },
  { title: "Cotizaciones", url: "/cotizaciones", icon: FileText, module: "Cotizaciones" },
  { title: "Clientes", url: "/clientes", icon: Building2, module: "Clientes" },
  { title: "Proyectos", url: "/projects", icon: FolderKanban, module: "Proyectos" },
  { title: "Analítica", url: "/analitica", icon: BarChart3, module: "Analítica" },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { canView } = usePermissions();
  const companyLogo = useCompanyLogo();

  const visibleItems = navItems.filter((item) => !item.module || canView(item.module));

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon">
      <div className="p-4 border-b border-sidebar-border flex items-center justify-center">
        {companyLogo ? (
          <img src={companyLogo} alt="Logo" className="h-10 object-contain group-data-[collapsible=icon]:h-8" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-xl">
            S
          </div>
        )}
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-wider">
            Navegación
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
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
              isActive={location.pathname === "/perfil"}
            >
              <NavLink to="/perfil" activeClassName="bg-sidebar-accent text-sidebar-primary">
                <User2 className="h-4 w-4" />
                <span>Mi Perfil</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {["Config: General", "Config: Propuestas", "Config: Campos Obligatorios", "Config: Usuarios", "Config: Roles", "Config: Permisos", "Proveedores"].some(m => canView(m)) && (
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
          )}
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
