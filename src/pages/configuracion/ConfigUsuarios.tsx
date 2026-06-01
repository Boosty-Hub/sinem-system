import { useState, useEffect } from "react";
import { Search, Plus, Mail, Shield, Loader2, Eye, EyeOff, Pencil, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/lib/AuthContext";
import ConfirmDialog from "@/components/ConfirmDialog";

const SUPABASE_URL = "https://fxsshhrxzjyjvfszaorq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4c3NoaHJ4emp5anZmc3phb3JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyOTEwODQsImV4cCI6MjA4Njg2NzA4NH0.qJl7Dle-5iqFnNXir4mDPKR2c3-s8Og4e_6h6ZgquIE";

interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  cargo: string;
  status: string;
  last_login: string | null;
  created_at: string;
  role_id: string | null;
  roles: { name: string } | null;
  pin_code: string | null;
}

interface Role {
  id: string;
  name: string;
}

interface UserForm {
  name: string;
  email: string;
  password: string;
  role_id: string;
  status: string;
  phone: string;
  cargo: string;
  pin_code: string;
}

const emptyForm: UserForm = { name: "", email: "", password: "", role_id: "none", status: "activo", phone: "", cargo: "", pin_code: "" };

const ConfigUsuarios = () => {
  const { user: authUser } = useAuth();
  const { canCreate, canEdit, roleName } = usePermissions();
  const canCreateConfig = canCreate("Config: Usuarios");
  const canEditConfig = canEdit("Config: Usuarios");
  const isAdmin = roleName === "Administrador";
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<UserForm>({ ...emptyForm });

  const isEditing = !!editingUser;

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("app_users")
      .select("id, name, email, phone, cargo, status, last_login, created_at, role_id, pin_code, roles(name)")
      .order("created_at", { ascending: false });
    setUsers((data as unknown as AppUser[]) ?? []);
    setLoading(false);
  };

  const fetchRoles = async () => {
    const { data } = await supabase.from("roles").select("id, name").order("name");
    setRoles(data ?? []);
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm({ ...emptyForm });
    setError("");
    setShowPassword(false);
    setDialogOpen(true);
  };

  const openEdit = (user: AppUser) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role_id: user.role_id ?? "none",
      status: user.status,
      phone: user.phone ?? "",
      cargo: (user as any).cargo ?? "",
      pin_code: user.pin_code ?? "",
    });
    setError("");
    setShowPassword(false);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ app_user_id: deleteTarget.id }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Error al eliminar usuario");
      } else {
        toast.success(`Usuario "${deleteTarget.name}" eliminado`);
        fetchUsers();
      }
    } catch {
      toast.error("Error de conexión");
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.name || !form.email) {
      setError("Nombre y email son requeridos");
      return;
    }
    if (!isEditing && !form.password) {
      setError("La contraseña es requerida");
      return;
    }
    if (form.password && form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (form.pin_code && !/^\d{4}$/.test(form.pin_code)) {
      setError("El PIN debe ser exactamente 4 dígitos numéricos");
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const endpoint = isEditing ? "update-user" : "create-user";
      const body = isEditing
        ? {
            app_user_id: editingUser!.id,
            name: form.name,
            email: form.email,
            password: form.password || undefined,
            role_id: form.role_id === "none" ? null : form.role_id,
            status: form.status,
            phone: form.phone,
            cargo: form.cargo,
            pin_code: form.pin_code || "",
          }
        : {
            name: form.name,
            email: form.email,
            password: form.password,
            role_id: form.role_id === "none" ? null : form.role_id,
            phone: form.phone,
            cargo: form.cargo,
            pin_code: form.pin_code || null,
          };

      const res = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Error al guardar");
        setSaving(false);
        return;
      }
      setDialogOpen(false);
      setForm({ ...emptyForm });
      setEditingUser(null);
      toast.success(isEditing ? "Usuario actualizado" : "Usuario creado");
      fetchUsers();
    } catch {
      setError("Error de conexión");
    }
    setSaving(false);
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.roles?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground text-sm mt-1">{users.length} usuarios registrados</p>
        </div>
        {canCreateConfig && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo Usuario
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar usuario..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="stat-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Usuario</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cargo</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">PIN</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Rol</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Estado</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Creado</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                        {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{user.email}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{(user as any).cargo || "—"}</td>
                  <td className="py-3 px-4 text-center">
                    {user.pin_code ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        <KeyRound className="h-2.5 w-2.5" /> PIN
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3 text-primary" />
                      <span>{user.roles?.name ?? "Sin rol"}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      user.status === "activo"
                        ? "bg-sinem-success/20 text-sinem-success"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {user.status === "activo" ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">
                    {new Date(user.created_at).toLocaleDateString("es-DO")}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {canEditConfig && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(user)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {isAdmin && user.email !== authUser?.email && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(user)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">
                    No se encontraron usuarios
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Eliminar Usuario"
        description={`¿Estás seguro de eliminar a "${deleteTarget?.name}"? Esta acción no se puede deshacer y el usuario perderá acceso inmediatamente.`}
        onConfirm={handleDelete}
        confirmLabel={deleting ? "Eliminando..." : "Eliminar"}
      />

      {/* Create / Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nombre completo</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Omar Laredo"
              />
            </div>
            <div>
              <Label>Correo electrónico</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="usuario@email.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cargo / Puesto</Label>
                <Input
                  value={form.cargo}
                  onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
                  placeholder="Ej: Gerente de Ventas"
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Ej: +1 809 000 0000"
                />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                PIN de acceso rápido <span className="text-muted-foreground font-normal">(4 dígitos, opcional)</span>
              </Label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={form.pin_code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setForm((f) => ({ ...f, pin_code: val }));
                }}
                placeholder="Ej: 1234"
                className="tracking-[0.4em] text-center font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Permite al usuario iniciar sesión desde la pantalla de login ingresando solo su PIN de 4 dígitos.
                {isEditing && " Dejar vacío para eliminar el PIN actual."}
              </p>
            </div>
            <div>
              <Label>{isEditing ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={isEditing ? "••••••••" : "Mínimo 6 caracteres"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label>Rol</Label>
              <Select value={form.role_id} onValueChange={(v) => setForm((f) => ({ ...f, role_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin rol</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isEditing && (
              <div>
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm px-3 py-2 rounded-lg border border-destructive/20">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Guardando...</> : isEditing ? "Guardar Cambios" : "Crear Usuario"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConfigUsuarios;
