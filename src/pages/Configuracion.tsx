import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { FileText, Users, Shield, KeyRound, Settings, ArrowLeft, SlidersHorizontal, CheckSquare } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

const configNav = [
  { title: "General", url: "/configuracion/general", icon: SlidersHorizontal, module: "Config: General" },
  { title: "Propuestas / Ofertas", url: "/configuracion/propuestas", icon: FileText, module: "Config: Propuestas" },
  { title: "Campos Obligatorios", url: "/configuracion/campos", icon: CheckSquare, module: "Config: Campos Obligatorios" },
  { title: "Usuarios", url: "/configuracion/usuarios", icon: Users, module: "Config: Usuarios" },
  { title: "Roles", url: "/configuracion/roles", icon: Shield, module: "Config: Roles" },
  { title: "Permisos", url: "/configuracion/permisos", icon: KeyRound, module: "Config: Permisos" },
];

const Configuracion = () => {
  const location = useLocation();
  const { canView } = usePermissions();

  return (
    <div className="flex min-h-screen">
      {/* Sub-sidebar */}
      <aside className="w-56 shrink-0 border-r border-border/60 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground text-xs mb-3 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al sistema
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Configuración</h2>
          </div>
          <p className="text-[11px] text-sidebar-foreground/50 mt-1">Ajustes del sistema</p>
        </div>
        <nav className="p-2 space-y-0.5 flex-1">
          {configNav.filter((item) => canView(item.module)).map((item) => {
            const isActive = location.pathname === item.url ||
              (item.url === "/configuracion/propuestas" && location.pathname === "/configuracion");
            return (
              <NavLink
                key={item.url}
                to={item.url}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 p-6 overflow-y-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
};

export default Configuracion;
