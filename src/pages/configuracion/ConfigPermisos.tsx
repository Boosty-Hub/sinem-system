import { useState, useEffect } from "react";
import { KeyRound, Check, X, Loader2, Users, RotateCcw, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

const MODULES = ["Dashboard", "CRM", "Cotizaciones", "Clientes", "Contactos", "Proyectos", "Tareas", "Analítica", "Proveedores", "Config: General", "Config: Propuestas", "Config: Campos Obligatorios", "Config: Usuarios", "Config: Roles", "Config: Permisos"];
const ACTION_KEYS = ["can_view", "can_create", "can_edit", "can_delete"] as const;
const ACTION_LABELS = ["Ver", "Crear", "Editar", "Eliminar"];

interface Role { id: string; name: string; }
interface PermRow { id: string; role_id: string; module: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean; }
interface UserRow { id: string; name: string; email: string; }
interface UserPermRow { id?: string; app_user_id: string; module: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean; }

type ViewMode = "role" | "user";

const ConfigPermisos = () => {
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  const canEditConfig = canEdit("Config: Permisos");

  const [viewMode, setViewMode] = useState<ViewMode>("role");
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [rolePerms, setRolePerms] = useState<PermRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // User mode state
  const [usersInRole, setUsersInRole] = useState<UserRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userOverrides, setUserOverrides] = useState<UserPermRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingUserPerms, setLoadingUserPerms] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("roles").select("id, name").order("name");
      setRoles(data ?? []);
      if (data && data.length > 0) setSelectedRoleId(data[0].id);
      setLoading(false);
    };
    load();
  }, []);

  // Load role permissions whenever role changes
  useEffect(() => {
    if (!selectedRoleId) return;
    const loadPerms = async () => {
      const { data } = await supabase.from("permissions").select("*").eq("role_id", selectedRoleId);
      const existing = data ?? [];
      const missingModules = MODULES.filter((m) => !existing.find((p) => p.module === m));
      if (missingModules.length > 0) {
        const inserts = missingModules.map((m) => ({ role_id: selectedRoleId, module: m, can_view: false, can_create: false, can_edit: false, can_delete: false }));
        const { data: inserted } = await supabase.from("permissions").insert(inserts).select("*");
        setRolePerms([...existing, ...(inserted ?? [])]);
      } else {
        setRolePerms(existing);
      }
    };
    loadPerms();
    // Reset user selection when role changes
    setSelectedUserId(null);
    setUserOverrides([]);
  }, [selectedRoleId]);

  // Load users in role when switching to user mode or role changes
  useEffect(() => {
    if (!selectedRoleId) return;
    const loadUsers = async () => {
      setLoadingUsers(true);
      const { data } = await supabase
        .from("app_users")
        .select("id, name, email")
        .eq("role_id", selectedRoleId)
        .eq("status", "activo")
        .order("name");
      setUsersInRole(data ?? []);
      setLoadingUsers(false);
    };
    loadUsers();
  }, [selectedRoleId]);

  // Load user overrides when a user is selected
  useEffect(() => {
    if (!selectedUserId) { setUserOverrides([]); return; }
    const loadUserPerms = async () => {
      setLoadingUserPerms(true);
      const { data } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("app_user_id", selectedUserId);
      setUserOverrides(data ?? []);
      setLoadingUserPerms(false);
    };
    loadUserPerms();
  }, [selectedUserId]);

  // Toggle permission for role mode
  const toggleRolePerm = async (module: string, action: typeof ACTION_KEYS[number]) => {
    const perm = rolePerms.find((p) => p.module === module);
    if (!perm) return;
    const newValue = !perm[action];
    setSaving(true);
    setRolePerms((prev) => prev.map((p) => p.id === perm.id ? { ...p, [action]: newValue } : p));
    const { error } = await supabase.from("permissions").update({ [action]: newValue }).eq("id", perm.id);
    setSaving(false);
    if (error) {
      setRolePerms((prev) => prev.map((p) => p.id === perm.id ? { ...p, [action]: !newValue } : p));
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Toggle permission override for user mode
  const toggleUserPerm = async (module: string, action: typeof ACTION_KEYS[number]) => {
    if (!selectedUserId) return;
    const rolePerm = rolePerms.find((p) => p.module === module);
    const existingOverride = userOverrides.find((p) => p.module === module);
    const currentValue = existingOverride ? existingOverride[action] : (rolePerm ? rolePerm[action] : false);
    const newValue = !currentValue;

    const upsertData: UserPermRow = existingOverride
      ? { ...existingOverride, [action]: newValue }
      : {
          app_user_id: selectedUserId,
          module,
          can_view: rolePerm?.can_view ?? false,
          can_create: rolePerm?.can_create ?? false,
          can_edit: rolePerm?.can_edit ?? false,
          can_delete: rolePerm?.can_delete ?? false,
          [action]: newValue,
        };

    // Optimistic
    setSaving(true);
    if (existingOverride) {
      setUserOverrides((prev) => prev.map((p) => p.module === module ? upsertData : p));
    } else {
      setUserOverrides((prev) => [...prev, upsertData]);
    }

    const { error } = await supabase
      .from("user_permissions")
      .upsert({ ...upsertData }, { onConflict: "app_user_id,module" });

    setSaving(false);
    if (error) {
      // Revert
      if (existingOverride) {
        setUserOverrides((prev) => prev.map((p) => p.module === module ? existingOverride : p));
      } else {
        setUserOverrides((prev) => prev.filter((p) => p.module !== module));
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Reset user overrides for a single module
  const resetUserModule = async (module: string) => {
    if (!selectedUserId) return;
    setSaving(true);
    setUserOverrides((prev) => prev.filter((p) => p.module !== module));
    const { error } = await supabase
      .from("user_permissions")
      .delete()
      .eq("app_user_id", selectedUserId)
      .eq("module", module);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
  };

  // Reset all user overrides
  const resetAllUserOverrides = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    setUserOverrides([]);
    const { error } = await supabase
      .from("user_permissions")
      .delete()
      .eq("app_user_id", selectedUserId);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Permisos restablecidos al rol" });
    }
  };

  const selectedRoleName = roles.find((r) => r.id === selectedRoleId)?.name ?? "";
  const selectedUser = usersInRole.find((u) => u.id === selectedUserId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Build effective permissions for display
  const getEffective = (module: string, action: typeof ACTION_KEYS[number]): boolean => {
    if (viewMode === "user") {
      const override = userOverrides.find((p) => p.module === module);
      if (override) return override[action];
      const rolePerm = rolePerms.find((p) => p.module === module);
      return rolePerm ? rolePerm[action] : false;
    }
    const perm = rolePerms.find((p) => p.module === module);
    return perm ? perm[action] : false;
  };

  const hasOverride = (module: string) => viewMode === "user" && userOverrides.some((p) => p.module === module);
  const totalOverrides = userOverrides.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Gestión de Permisos</h1>
        <p className="text-muted-foreground text-sm mt-1">Configura permisos por rol o personaliza los de cada usuario individualmente</p>
      </div>

      {/* View mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setViewMode("role"); setSelectedUserId(null); }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
            viewMode === "role"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary/40"
          }`}
        >
          <KeyRound className="h-3.5 w-3.5" /> Vista por Rol
        </button>
        <button
          onClick={() => setViewMode("user")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
            viewMode === "user"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary/40"
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Vista por Usuario
        </button>
      </div>

      {/* Role selector */}
      <div className="flex gap-2 flex-wrap">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => { setSelectedRoleId(role.id); setSelectedUserId(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors border ${
              selectedRoleId === role.id
                ? "bg-primary/10 text-primary border-primary/40 font-medium"
                : "bg-background text-muted-foreground border-border hover:border-primary/30"
            }`}
          >
            <KeyRound className="h-3 w-3" />
            {role.name}
          </button>
        ))}
      </div>

      {/* User selector — only in user mode */}
      {viewMode === "user" && (
        <div className="stat-card p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Usuarios en el rol <span className="text-foreground font-semibold">{selectedRoleName}</span>
          </p>
          {loadingUsers ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : usersInRole.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No hay usuarios activos en este rol</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {usersInRole.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUserId(selectedUserId === u.id ? null : u.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border ${
                    selectedUserId === u.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/40"
                  }`}
                >
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span>{u.name}</span>
                  {selectedUserId !== u.id && userOverrides.length === 0 && (
                    <span className="text-[10px] text-muted-foreground/60">{u.email}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User mode banner when user is selected */}
      {viewMode === "user" && selectedUser && (
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              Permisos individuales de <strong>{selectedUser.name}</strong>
            </span>
            {totalOverrides > 0 && (
              <span className="text-[11px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                {totalOverrides} módulo{totalOverrides !== 1 ? "s" : ""} personalizado{totalOverrides !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {totalOverrides > 0 && canEditConfig && (
            <button
              onClick={resetAllUserOverrides}
              disabled={saving}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> Restablecer todos al rol
            </button>
          )}
        </div>
      )}

      {/* Permission matrix */}
      {(viewMode === "role" || (viewMode === "user" && selectedUser)) && (
        <div className="stat-card overflow-hidden">
          {loadingUserPerms ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Módulo</th>
                  {ACTION_LABELS.map((a) => (
                    <th key={a} className="text-center py-3 px-4 font-medium text-muted-foreground">{a}</th>
                  ))}
                  {viewMode === "user" && <th className="w-8" />}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((mod) => {
                  const isOverridden = hasOverride(mod);
                  return (
                    <tr
                      key={mod}
                      className={`border-b border-border/30 transition-colors ${
                        isOverridden ? "bg-primary/5 hover:bg-primary/8" : "hover:bg-muted/20"
                      }`}
                    >
                      <td className="py-3 px-4 font-medium">
                        <div className="flex items-center gap-2">
                          {mod}
                          {isOverridden && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                              Personalizado
                            </span>
                          )}
                        </div>
                      </td>
                      {ACTION_KEYS.map((action) => {
                        const allowed = getEffective(mod, action);
                        const canToggle = canEditConfig && (viewMode === "role" || !!selectedUser);
                        return (
                          <td key={action} className="py-3 px-4 text-center">
                            <button
                              onClick={() => {
                                if (!canToggle) return;
                                viewMode === "role" ? toggleRolePerm(mod, action) : toggleUserPerm(mod, action);
                              }}
                              disabled={saving || !canToggle}
                              title={viewMode === "user" && !isOverridden ? "Heredado del rol — clic para personalizar" : undefined}
                              className={`transition-transform ${canToggle ? "hover:scale-110" : "opacity-50 cursor-not-allowed"}`}
                            >
                              {allowed ? (
                                <span className={`inline-flex w-7 h-7 rounded-full items-center justify-center cursor-pointer transition-colors ${
                                  isOverridden ? "bg-primary/20 hover:bg-primary/30" : "bg-sinem-success/20 hover:bg-sinem-success/30"
                                }`}>
                                  <Check className={`h-3.5 w-3.5 ${isOverridden ? "text-primary" : "text-sinem-success"}`} />
                                </span>
                              ) : (
                                <span className={`inline-flex w-7 h-7 rounded-full items-center justify-center cursor-pointer transition-colors ${
                                  isOverridden ? "bg-destructive/20 hover:bg-destructive/30" : "bg-destructive/10 hover:bg-destructive/20"
                                }`}>
                                  <X className="h-3.5 w-3.5 text-destructive/60" />
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                      {/* Reset button per row — user mode only */}
                      {viewMode === "user" && (
                        <td className="py-3 pr-3 text-center">
                          {isOverridden && canEditConfig && (
                            <button
                              onClick={() => resetUserModule(mod)}
                              disabled={saving}
                              title="Restablecer al rol"
                              className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Placeholder when user mode but no user selected */}
      {viewMode === "user" && !selectedUser && !loadingUsers && usersInRole.length > 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <User className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">Selecciona un usuario para ver y editar sus permisos individuales</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {viewMode === "role"
          ? `Los cambios para el rol ${selectedRoleName} se aplican a todos sus usuarios. Se guardan automáticamente.`
          : selectedUser
          ? `Los permisos personalizados de ${selectedUser.name} tienen prioridad sobre los del rol ${selectedRoleName}. Los valores en azul están personalizados; los demás son heredados del rol.`
          : "Selecciona un usuario para editar sus permisos individuales."}
      </p>
    </div>
  );
};

export default ConfigPermisos;
