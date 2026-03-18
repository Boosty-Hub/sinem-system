import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Client, Contact } from "@/lib/types";
import { dbToClient, dbToContact } from "@/lib/supabaseMappers";
import { Search, Plus, Building2, Mail, Phone, Pencil, Trash2, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Link } from "react-router-dom";
import ClientImportDialog from "@/components/clientes/ClientImportDialog";
import ClientDialog from "@/components/clientes/ClientDialog";

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
  const [importOpen, setImportOpen] = useState(false);
  const [editContactIds, setEditContactIds] = useState<string[]>([]);
  const [editPrimaryContactId, setEditPrimaryContactId] = useState<string | undefined>(undefined);

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
    setEditContactIds([]);
    setEditPrimaryContactId(undefined);
    setDialogOpen(true);
  };

  const openEdit = async (client: Client) => {
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
    // Fetch contacts assigned to this client
    const { data } = await supabase.from("contacts").select("id").eq("client_id", client.id);
    setEditContactIds((data ?? []).map((r) => r.id));
    setEditPrimaryContactId(client.primaryContactId);
    setDialogOpen(true);
  };

  const handleSave = async (
    formData: typeof emptyForm,
    selectedContactIds: string[],
    primaryContactId: string | null
  ) => {
    if (!formData.name.trim()) return;
    let clientId = editId;

    if (editId) {
      const { error } = await supabase.from("clients").update({
        name: formData.name.trim(),
        contact_name: formData.contactName.trim(),
        contact_email: formData.contactEmail.trim(),
        contact_phone: formData.contactPhone.trim(),
        industry: formData.industry.trim(),
        address: formData.address.trim(),
        status: formData.status,
        primary_contact_id: primaryContactId,
      } as any).eq("id", editId);
      if (!error) toast({ title: "Cliente actualizado" });
    } else {
      const { data, error } = await supabase.from("clients").insert({
        name: formData.name.trim(),
        contact_name: formData.contactName.trim(),
        contact_email: formData.contactEmail.trim(),
        contact_phone: formData.contactPhone.trim(),
        industry: formData.industry.trim(),
        address: formData.address.trim(),
        status: formData.status,
        primary_contact_id: primaryContactId,
      } as any).select("id").single();
      if (!error && data) {
        clientId = data.id;
        toast({ title: "Cliente creado" });
      }
    }

    if (clientId) {
      // Unassign contacts that were removed
      const previousIds = editContactIds;
      const removedIds = previousIds.filter((id) => !selectedContactIds.includes(id));
      if (removedIds.length > 0) {
        await supabase.from("contacts").update({ client_id: null }).in("id", removedIds);
      }
      // Assign selected contacts to this client
      if (selectedContactIds.length > 0) {
        await supabase.from("contacts").update({ client_id: clientId }).in("id", selectedContactIds);
      }
    }

    setDialogOpen(false);
    fetchClients();
  };

  const handleDelete = (client: Client) => setDeleteTarget(client);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    // Unlink contacts before deleting
    await supabase.from("contacts").update({ client_id: null }).eq("client_id", deleteTarget.id);
    await supabase.from("clients").delete().eq("id", deleteTarget.id);
    toast({ title: "Cliente eliminado" });
    setDeleteTarget(null);
    fetchClients();
  };

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
            <>
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-1" /> Importar
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> Nuevo Cliente
              </Button>
            </>
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

      <ClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editId={editId}
        initialForm={form}
        initialContactIds={editContactIds}
        initialPrimaryContactId={editPrimaryContactId}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Eliminar Cliente"
        description={`¿Estás seguro de eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDelete}
      />

      <ClientImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={fetchClients}
      />
    </div>
  );
};

export default Clientes;
