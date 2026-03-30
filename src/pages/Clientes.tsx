import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Client, Contact } from "@/lib/types";
import { dbToClient, dbToContact } from "@/lib/supabaseMappers";
import { Search, Plus, Building2, Mail, Phone, Pencil, Trash2, Loader2, Upload, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Link, useNavigate } from "react-router-dom";
import ClientImportDialog from "@/components/clientes/ClientImportDialog";
import ClientDialog from "@/components/clientes/ClientDialog";

type SortKey = "name" | "contactName" | "contactEmail" | "contactPhone" | "industry" | "status" | "totalProjects" | "totalRevenue" | "createdAt";
type SortDir = "asc" | "desc";

const emptyForm = {
  name: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  industry: "",
  address: "",
  rnc: "",
  status: "activo" as "activo" | "inactivo",
};

const PAGE_SIZE = 20;

const Clientes = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
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
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: any = a[sortKey];
      let bv: any = b[sortKey];
      if (typeof av === "string") { av = av.toLowerCase(); bv = (bv as string).toLowerCase(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const allOnPageSelected = paginated.length > 0 && paginated.every((c) => selectedIds.includes(c.id));
  const toggleAll = () => {
    if (allOnPageSelected) setSelectedIds((ids) => ids.filter((id) => !paginated.find((c) => c.id === id)));
    else setSelectedIds((ids) => [...new Set([...ids, ...paginated.map((c) => c.id)])]);
  };
  const toggleOne = (id: string) => {
    setSelectedIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  };

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [search]);

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
      rnc: client.rnc,
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
        rnc: formData.rnc.trim(),
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
        rnc: formData.rnc.trim(),
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

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg text-sm">
          <span className="font-medium">{selectedIds.length} seleccionado{selectedIds.length > 1 ? "s" : ""}</span>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setSelectedIds([])}>Deseleccionar</Button>
        </div>
      )}

      <div className="stat-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="py-2.5 px-3 w-10">
                <Checkbox checked={allOnPageSelected} onCheckedChange={toggleAll} />
              </th>
              {([
                ["name", "Cliente"],
                ["contactName", "Contacto"],
                ["contactEmail", "Email"],
                ["contactPhone", "Teléfono"],
                ["industry", "Industria"],
                ["totalProjects", "Proyectos"],
                ["totalRevenue", "Ingresos"],
                ["status", "Estado"],
                ["createdAt", "Creado"],
              ] as [SortKey, string][]).map(([key, label]) => (
                <th key={key} className="py-2.5 px-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(key)}>
                  <span className="inline-flex items-center">{label}<SortIcon col={key} /></span>
                </th>
              ))}
              <th className="py-2.5 px-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((client) => (
              <tr key={client.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group" onClick={() => navigate(`/clientes/${client.id}`)}>
                <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selectedIds.includes(client.id)} onCheckedChange={() => toggleOne(client.id)} />
                </td>
                <td className="py-3 px-3 font-medium">{client.name}</td>
                <td className="py-3 px-3 text-muted-foreground">{client.contactName || "—"}</td>
                <td className="py-3 px-3 text-muted-foreground">{client.contactEmail || "—"}</td>
                <td className="py-3 px-3 text-muted-foreground">{client.contactPhone || "—"}</td>
                <td className="py-3 px-3 text-muted-foreground">{client.industry || "—"}</td>
                <td className="py-3 px-3 text-center">{client.totalProjects}</td>
                <td className="py-3 px-3 text-right font-semibold text-primary">${client.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-3 px-3 text-center">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    client.status === "activo" ? "bg-sinem-success text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {client.status === "activo" ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="py-3 px-3 text-muted-foreground text-xs">{client.createdAt ? new Date(client.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-0.5">
                    {canEditCli && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(client)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDeleteCli && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(client)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={11} className="py-12 text-center text-muted-foreground">No se encontraron clientes</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => (
                <span key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1">…</span>}
                  <Button variant={p === page ? "default" : "outline"} size="sm" className="h-8 w-8 p-0" onClick={() => setPage(p)}>
                    {p}
                  </Button>
                </span>
              ))}
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
