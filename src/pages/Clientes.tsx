import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Client } from "@/lib/types";
import { dbToClient, clientToDb } from "@/lib/supabaseMappers";
import { Search, Plus, Building2, Mail, Phone, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Link } from "react-router-dom";

const emptyForm = {
  name: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  industry: "",
  address: "",
  status: "activo" as "activo" | "inactivo",
};

const Clientes = () => {
  const { toast } = useToast();
  const { canCreate: canCreateFn, canEdit: canEditFn, canDelete: canDeleteFn } = usePermissions();
  const canCreateCli = canCreateFn("Clientes");
  const canEditCli = canEditFn("Clientes");
  const canDeleteCli = canDeleteFn("Clientes");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    setClients((data ?? []).map(dbToClient));
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contactName.toLowerCase().includes(search.toLowerCase()) ||
      c.industry.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditId(client.id);
    setForm({
      name: client.name,
      contactName: client.contactName,
      contactEmail: client.contactEmail,
      contactPhone: client.contactPhone,
      industry: client.industry,
      address: client.address,
      status: client.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editId) {
      const { error } = await supabase.from("clients").update({
        name: form.name.trim(),
        contact_name: form.contactName.trim(),
        contact_email: form.contactEmail.trim(),
        contact_phone: form.contactPhone.trim(),
        industry: form.industry.trim(),
        address: form.address.trim(),
        status: form.status,
      }).eq("id", editId);
      if (!error) toast({ title: "Cliente actualizado" });
    } else {
      const { error } = await supabase.from("clients").insert({
        name: form.name.trim(),
        contact_name: form.contactName.trim(),
        contact_email: form.contactEmail.trim(),
        contact_phone: form.contactPhone.trim(),
        industry: form.industry.trim(),
        address: form.address.trim(),
        status: form.status,
      });
      if (!error) toast({ title: "Cliente creado" });
    }
    setDialogOpen(false);
    fetchClients();
  };

  const handleDelete = (client: Client) => setDeleteTarget(client);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("clients").delete().eq("id", deleteTarget.id);
    toast({ title: "Cliente eliminado" });
    setDeleteTarget(null);
    fetchClients();
  };

  const u = (key: keyof typeof emptyForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length} clientes · {filtered.filter((c) => c.status === "activo").length} activos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-[240px]" />
          </div>
          {canCreateCli && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo Cliente
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((client) => (
          <Link key={client.id} to={`/clientes/${client.id}`} className="stat-card group block">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">{client.name}</h3>
                  <p className="text-xs text-muted-foreground">{client.industry}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  client.status === "activo" ? "bg-sinem-success text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {client.status === "activo" ? "Activo" : "Inactivo"}
                </span>
                {canEditCli && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(client); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canDeleteCli && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(client); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5 mb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span>{client.contactEmail}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{client.contactPhone}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/40">
              <div className="flex gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Proyectos: </span>
                  <span className="font-semibold">{client.totalProjects}</span>
                </div>
              </div>
              <span className="text-xs font-semibold text-primary">
                ${client.totalRevenue.toLocaleString()}
              </span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No se encontraron clientes
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="col-span-2">
              <Label>Nombre / Empresa</Label>
              <Input value={form.name} onChange={(e) => u("name", e.target.value)} placeholder="Ej: AES Dominicana" />
            </div>
            <div>
              <Label>Persona de Contacto</Label>
              <Input value={form.contactName} onChange={(e) => u("contactName", e.target.value)} placeholder="Nombre completo" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.contactEmail} onChange={(e) => u("contactEmail", e.target.value)} placeholder="email@empresa.com" />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.contactPhone} onChange={(e) => u("contactPhone", e.target.value)} placeholder="+1 809 000-0000" />
            </div>
            <div>
              <Label>Industria</Label>
              <Input value={form.industry} onChange={(e) => u("industry", e.target.value)} placeholder="Ej: Energía" />
            </div>
            <div className="col-span-2">
              <Label>Dirección</Label>
              <Input value={form.address} onChange={(e) => u("address", e.target.value)} placeholder="Dirección completa" />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => u("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>
              {editId ? "Guardar Cambios" : "Crear Cliente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Eliminar Cliente"
        description={`¿Estás seguro de eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default Clientes;
