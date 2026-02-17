import { useState } from "react";
import { mockClients, mockClientOffers, mockProjects } from "@/lib/mockData";
import type { Client } from "@/lib/types";
import { Search, Plus, Building2, Mail, Phone, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";
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
  const [search, setSearch] = useState("");
  const [clients, setClients] = useLocalStorage<Client[]>("sinem:clients", mockClients);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contactName.toLowerCase().includes(search.toLowerCase()) ||
      c.industry.toLowerCase().includes(search.toLowerCase())
  );

  const getClientStats = (clientId: string) => {
    const offers = mockClientOffers.filter((o) => o.clientId === clientId);
    const activeOffers = offers.filter((o) => !["ganada", "perdida"].includes(o.status));
    const projects = mockProjects.filter((p) => {
      const client = clients.find((c) => c.id === clientId);
      return client && p.client === client.name;
    });
    return { totalOffers: offers.length, activeOffers: activeOffers.length, projects: projects.length };
  };

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

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editId) {
      setClients((prev) =>
        prev.map((c) =>
          c.id === editId
            ? { ...c, ...form, name: form.name.trim(), contactName: form.contactName.trim() }
            : c
        )
      );
      toast({ title: "Cliente actualizado" });
    } else {
      const newClient: Client = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        industry: form.industry.trim(),
        address: form.address.trim(),
        status: form.status,
        createdAt: new Date().toISOString().split("T")[0],
        totalProjects: 0,
        totalRevenue: 0,
      };
      setClients((prev) => [newClient, ...prev]);
      toast({ title: "Cliente creado" });
    }
    setDialogOpen(false);
  };

  const handleDelete = (client: Client) => {
    if (!confirm(`¿Eliminar el cliente "${client.name}"? Esta acción no se puede deshacer.`)) return;
    setClients((prev) => prev.filter((c) => c.id !== client.id));
    toast({ title: "Cliente eliminado" });
  };

  const u = (key: keyof typeof emptyForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

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
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-[240px]"
            />
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo Cliente
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((client) => {
          const stats = getClientStats(client.id);
          return (
            <Link
              key={client.id}
              to={`/clientes/${client.id}`}
              className="stat-card group block"
            >
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(client); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(client); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
                    <span className="font-semibold">{stats.projects}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ofertas: </span>
                    <span className="font-semibold">{stats.totalOffers}</span>
                    {stats.activeOffers > 0 && (
                      <span className="text-sinem-warning ml-1">({stats.activeOffers} activas)</span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-semibold text-primary">
                  ${client.totalRevenue.toLocaleString()}
                </span>
              </div>
            </Link>
          );
        })}
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
    </div>
  );
};

export default Clientes;
