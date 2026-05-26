import { usePermissions } from "@/hooks/usePermissions";
import { ShieldX } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  module: string | string[];
  children: React.ReactNode;
}

const ProtectedModule = ({ module, children }: Props) => {
  const { canView, loading } = usePermissions();

  if (loading) return null;

  const allowed = Array.isArray(module) ? module.some(m => canView(m)) : canView(module);
  const label = Array.isArray(module) ? module.join(", ") : module;

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <ShieldX className="h-12 w-12 text-destructive/40 mb-4" />
        <h2 className="text-lg font-semibold mb-1">Acceso denegado</h2>
        <p className="text-sm text-muted-foreground mb-4">No tienes permiso para acceder al módulo <strong>{label}</strong>.</p>
        <Link to="/">
          <Button variant="outline">Volver al Dashboard</Button>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedModule;
