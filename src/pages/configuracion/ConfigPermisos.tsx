import { useState, useEffect } from "react";
import { KeyRound, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

const MODULES = ["Dashboard", "CRM", "Cotizaciones", "Clientes", "Contactos", "Proyectos", "Tareas", "Analítica", "Config: General", "Config: Propuestas", "Config: Campos Obligatorios", "Config: Usuarios", "Config: Roles", "Config: Permisos"];
const ACTION_KEYS = ["can_view", "can_create", "can_edit", "can_delete"] as const;
const ACTION_LABELS = ["Ver", "Crear", "Editar", "Eliminar"];

interface Role { id: string; name: string; }
interface PermRow { id: string; role_id: string; module: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean; }

const ConfigPermisos = () => {
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  const canEditConfig = canEdit("Config: Permisos");
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [perms, setPerms] = useState<PermRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("roles").select("id, name").order("name");
      setRoles(data ?? []);
      if (data && data.length > 0) setSelectedRoleId(data[0].id);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedRoleId) return;
    const loadPerms = async () => {
      const { data } = await supabase
        .from("permissions")
        .select("*")
        .eq("role_id", selectedRoleId);

      const existing = data ?? [];
      // Ensure all modules have a row
      const missingModules = MODULES.filter((m) => !existing.find((p) => p.module === m));
      if (missingModules.length > 0) {
        const inserts = missingModules.map((m) => ({
          role_id: selectedRoleId,
          module: m,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
        }));
        const { data: inserted } = await supabase.from("permissions").insert(inserts).select("*");
        setPerms([...existing, ...(inserted ?? [])]);
      } else {
        setPerms(existing);
      }
    };
    loadPerms();
  }, [selectedRoleId]);

  const togglePerm = async (module: string, action: typeof ACTION_KEYS[number]) => {
    const perm = perms.find((p) => p.module === module);
    if (!perm) return;
    const newValue = !perm[action];
    setSaving(true);

    // Optimistic update
    setPerms((prev) => prev.map((p) => p.id === perm.id ? { ...p, [action]: newValue } : p));

    const { error } = await supabase
      .from("permissions")
      .update({ [action]: newValue })
      .eq("id", perm.id);

    setSaving(false);
    if (error) {
      // Revert
      setPerms((prev) => prev.map((p) => p.id === perm.id ? { ...p, [action]: !newValue } : p));
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const selectedRoleName = roles.find((r) => r.id === selectedRoleId)?.name ?? "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Gestión de Permisos</h1>
        <p className="text-muted-foreground text-sm mt-1">Configura los permisos por módulo para cada rol</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => setSelectedRoleId(role.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors border ${
              selectedRoleId === role.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            <KeyRound className="h-3 w-3" />
            {role.name}
          </button>
        ))}
      </div>

      <div className="stat-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Módulo</th>
              {ACTION_LABELS.map((a) => (
                <th key={a} className="text-center py-3 px-4 font-medium text-muted-foreground">{a}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((mod) => {
              const perm = perms.find((p) => p.module === mod);
              return (
                <tr key={mod} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4 font-medium">{mod}</td>
                  {ACTION_KEYS.map((action) => {
                    const allowed = perm ? perm[action] : false;
                    return (
                      <td key={action} className="py-3 px-4 text-center">
                        <button
                          onClick={() => canEditConfig && togglePerm(mod, action)}
                          disabled={saving || !canEditConfig}
                          className={`transition-transform ${canEditConfig ? "hover:scale-110" : "opacity-50 cursor-not-allowed"}`}
                        >
                          {allowed ? (
                            <span className="inline-flex w-7 h-7 rounded-full bg-sinem-success/20 items-center justify-center cursor-pointer hover:bg-sinem-success/30">
                              <Check className="h-3.5 w-3.5 text-sinem-success" />
                            </span>
                          ) : (
                            <span className="inline-flex w-7 h-7 rounded-full bg-destructive/10 items-center justify-center cursor-pointer hover:bg-destructive/20">
                              <X className="h-3.5 w-3.5 text-destructive/60" />
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Haz clic en los íconos para activar o desactivar permisos. Los cambios para <strong>{selectedRoleName}</strong> se guardan automáticamente.
      </p>
    </div>
  );
};

export default ConfigPermisos;
