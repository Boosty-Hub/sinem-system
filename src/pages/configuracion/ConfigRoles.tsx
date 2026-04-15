import { useState, useEffect } from "react";
import { Plus, Shield, Users, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

interface RoleRow {
  id: string;
  name: string;
  description: string;
  created_at: string;
  user_count: number;
  perm_count: number;
}

const ConfigRoles = () => {
  const { toast } = useToast();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const canCreateConfig = canCreate("Configuración");
  const canEditConfig = canEdit("Configuración");
  const canDeleteConfig = canDelete("Configuración");
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const fetchRoles = async () => {
    setLoading(true);
    const { data: rolesData } = await supabase
      .from("roles")
      .select("id, name, description, created_at")
      .order("name");

    if (!rolesData) { setLoading(false); return; }

    // Get user counts per role
    const { data: userCounts } = await supabase
      .from("app_users")
      .select("role_id");

    // Get permission counts per role
    const { data: permCounts } = await supabase
      .from("permissions")
      .select("role_id, can_view, can_create, can_edit, can_delete");

    const userMap: Record<string, number> = {};
    (userCounts ?? []).forEach((u: any) => {
      if (u.role_id) userMap[u.role_id] = (userMap[u.role_id] ?? 0) + 1;
    });

    const permMap: Record<string, number> = {};
    (permCounts ?? []).forEach((p: any) => {
      const count = [p.can_view, p.can_create, p.can_edit, p.can_delete].filter(Boolean).length;
      permMap[p.role_id] = (permMap[p.role_id] ?? 0) + count;
    });

    setRoles(rolesData.map((r) => ({
      ...r,
      user_count: userMap[r.id] ?? 0,
      perm_count: permMap[r.id] ?? 0,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchRoles(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (role: RoleRow) => {
    setEditId(role.id);
    setForm({ name: role.name, description: role.description });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editId) {
      const { error } = await supabase.from("roles").update({
        name: form.name.trim(),
        description: form.description.trim(),
        updated_at: new Date().toISOString(),
      }).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Rol actualizado" }); }
    } else {
      const { error } = await supabase.from("roles").insert({
        name: form.name.trim(),
        description: form.description.trim(),
      });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Rol creado" }); }
    }
    setSaving(false);
    setDialogOpen(false);
    fetchRoles();
  };

  const handleDelete = async (role: RoleRow) => {
    if (role.user_count > 0) {
      toast({ title: "No se puede eliminar", description: `Este rol tiene ${role.user_count} usuario(s) asignado(s).`, variant: "destructive" });
      return;
    }
    if (!confirm(`¿Eliminar el rol "${role.name}"?`)) return;
    // Delete permissions first
    await supabase.from("permissions").delete().eq("role_id", role.id);
    const { error } = await supabase.from("roles").delete().eq("id", role.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Rol eliminado" }); fetchRoles(); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Gestión de Roles</h1>
          <p className="text-muted-foreground text-sm mt-1">{roles.length} roles definidos</p>
        </div>
        {canCreateConfig && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo Rol
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="stat-card hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{role.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-[280px]">{role.description}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {canEditConfig && (
                    <Button variant="ghost" size="sm" onClick={() => openEdit(role)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {canDeleteConfig && (
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(role)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/40">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{role.user_count} usuario{role.user_count !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  <span>{role.perm_count} permisos activos</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Rol" : "Nuevo Rol"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nombre del Rol</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej: Gerente de Operaciones" />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe las responsabilidades de este rol" rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Guardando...</> : editId ? "Guardar Cambios" : "Crear Rol"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConfigRoles;
