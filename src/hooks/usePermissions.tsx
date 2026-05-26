import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

interface ModulePerms {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const DEFAULT_PERMS: ModulePerms = { can_view: false, can_create: false, can_edit: false, can_delete: false };

interface PermissionsContextType {
  /** Map of module name → permissions */
  perms: Record<string, ModulePerms>;
  /** True while loading from DB */
  loading: boolean;
  /** Current user's role name */
  roleName: string | null;
  /** Shorthand helpers */
  canView: (module: string) => boolean;
  canCreate: (module: string) => boolean;
  canEdit: (module: string) => boolean;
  canDelete: (module: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextType>({
  perms: {},
  loading: true,
  roleName: null,
  canView: () => true,
  canCreate: () => true,
  canEdit: () => true,
  canDelete: () => true,
});

export const usePermissions = () => useContext(PermissionsContext);

export const PermissionsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [perms, setPerms] = useState<Record<string, ModulePerms>>({});
  const [roleName, setRoleName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPerms({});
      setRoleName(null);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);

      // 1. Get the app_user row to find role_id
      const { data: appUser } = await supabase
        .from("app_users")
        .select("role_id, roles(name)")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!appUser?.role_id) {
        // No role assigned — grant nothing (or fallback to full access for admins)
        setPerms({});
        setRoleName(null);
        setLoading(false);
        return;
      }

      setRoleName((appUser.roles as any)?.name ?? null);

      // 2. Fetch role-level permissions
      const { data: permRows } = await supabase
        .from("permissions")
        .select("module, can_view, can_create, can_edit, can_delete")
        .eq("role_id", appUser.role_id);

      const map: Record<string, ModulePerms> = {};
      (permRows ?? []).forEach((p: any) => {
        map[p.module] = {
          can_view: p.can_view,
          can_create: p.can_create,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
        };
      });

      // 3. Fetch user-level overrides and merge (user overrides take precedence)
      const { data: userPermRows } = await supabase
        .from("user_permissions")
        .select("module, can_view, can_create, can_edit, can_delete")
        .eq("app_user_id", appUser.id);

      (userPermRows ?? []).forEach((p: any) => {
        map[p.module] = {
          can_view: p.can_view,
          can_create: p.can_create,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
        };
      });

      setPerms(map);
      setLoading(false);
    };

    load();
  }, [user?.id]);

  const get = (module: string): ModulePerms => perms[module] ?? DEFAULT_PERMS;

  // If no permissions are loaded at all (no role, or DB empty), default to ALLOW everything
  // This prevents locking out users when permissions haven't been configured yet
  const hasAnyPerms = Object.keys(perms).length > 0;

  const canView = (module: string) => !hasAnyPerms || (get(module).can_view);
  const canCreate = (module: string) => !hasAnyPerms || (get(module).can_create);
  const canEdit = (module: string) => !hasAnyPerms || (get(module).can_edit);
  const canDelete = (module: string) => !hasAnyPerms || (get(module).can_delete);

  return (
    <PermissionsContext.Provider value={{ perms, loading, roleName, canView, canCreate, canEdit, canDelete }}>
      {children}
    </PermissionsContext.Provider>
  );
};
