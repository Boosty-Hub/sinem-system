import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { mockClients, mockClientOffers, mockProjects, mockContacts } from "@/lib/mockData";
import { OFFER_STATUSES, type ClientOffer, type Client, type Contact } from "@/lib/types";
import { ArrowLeft, Building2, Mail, Phone, MapPin, Plus, FileText, Eye, FolderKanban, UserCircle, Pencil, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import OfferDialog from "@/components/clientes/OfferDialog";

const ClienteDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [clients, setClients] = useLocalStorage<Client[]>("sinem:clients", mockClients);
  const client = clients.find((c) => c.id === id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<ClientOffer | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", contactName: "", contactEmail: "", contactPhone: "", industry: "", address: "", status: "activo" as "activo" | "inactivo",
  });

  // Contacts state
  const [allContacts, setAllContacts] = useLocalStorage<Contact[]>("sinem:contacts", mockContacts);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const emptyContactForm = { firstName: "", lastName: "", position: "", email: "", phone: "", mobile: "", notes: "" };
  const [contactForm, setContactForm] = useState(emptyContactForm);

  const openEditClient = () => {
    if (!client) return;
    setEditForm({
      name: client.name, contactName: client.contactName, contactEmail: client.contactEmail,
      contactPhone: client.contactPhone, industry: client.industry, address: client.address, status: client.status,
    });
    setEditOpen(true);
  };

  const handleSaveClient = () => {
    if (!client || !editForm.name.trim()) return;
    setClients((prev) =>
      prev.map((c) => c.id === client.id ? { ...c, ...editForm, name: editForm.name.trim() } : c)
    );
    setEditOpen(false);
    toast({ title: "Cliente actualizado" });
  };

  const uf = (key: keyof typeof editForm, value: string) => setEditForm((f) => ({ ...f, [key]: value }));

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <p className="text-muted-foreground mb-4">Cliente no encontrado</p>
        <Link to="/clientes">
          <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Volver a Clientes</Button>
        </Link>
      </div>
    );
  }

  const offers = mockClientOffers.filter((o) => o.clientId === client.id);
  const projects = mockProjects.filter((p) => p.client === client.name);
  const contacts = allContacts.filter((ct) => ct.clientId === client.id);
  const unlinkedContacts = allContacts.filter((ct) => !ct.clientId);

  const handleSaveContact = () => {
    if (!contactForm.firstName.trim() || !contactForm.lastName.trim()) return;
    const newContact: Contact = {
      id: `ct-${Date.now()}`,
      clientId: client.id,
      firstName: contactForm.firstName.trim(),
      lastName: contactForm.lastName.trim(),
      position: contactForm.position.trim(),
      email: contactForm.email.trim(),
      phone: contactForm.phone.trim(),
      mobile: contactForm.mobile?.trim() || undefined,
      notes: contactForm.notes.trim(),
      createdAt: new Date().toISOString().split("T")[0],
      status: "activo",
    };
    setAllContacts((prev) => [...prev, newContact]);
    setContactDialogOpen(false);
    setContactForm(emptyContactForm);
    toast({ title: "Contacto creado y vinculado" });
  };

  const handleLinkContact = (contactId: string) => {
    setAllContacts((prev) => prev.map((c) => c.id === contactId ? { ...c, clientId: client.id } : c));
    setLinkDialogOpen(false);
    toast({ title: "Contacto vinculado" });
  };

  const handleUnlinkContact = (contactId: string) => {
    setAllContacts((prev) => prev.map((c) => c.id === contactId ? { ...c, clientId: undefined } : c));
    toast({ title: "Contacto desvinculado" });
  };

  const totalOffersValue = offers.reduce((sum, o) => sum + o.priceUSD, 0);
  const activeOffers = offers.filter((o) => !["ganada", "perdida"].includes(o.status));

  const getStatusConfig = (status: string) => {
    return OFFER_STATUSES.find((s) => s.key === status) ?? { label: status, color: "bg-muted" };
  };

  const handleEditOffer = (offer: ClientOffer) => {
    setSelectedOffer(offer);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/clientes">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={openEditClient}>
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">{client.industry} · Cliente desde {client.createdAt}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info del cliente */}
        <div className="stat-card">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Información del Cliente
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Contacto</p>
              <p className="text-sm font-medium">{client.contactName}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{client.contactEmail}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{client.contactPhone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{client.address}</span>
            </div>
          </div>
        </div>

        {/* Contactos del cliente */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <UserCircle className="h-4 w-4" /> Contactos <span className="text-xs text-muted-foreground font-normal">({contacts.length})</span>
            </h2>
            <div className="flex items-center gap-1">
              {unlinkedContacts.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setLinkDialogOpen(true)}>
                  <Link2 className="h-3 w-3 mr-1" /> Vincular
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setContactForm(emptyContactForm); setContactDialogOpen(true); }}>
                <Plus className="h-3 w-3 mr-1" /> Nuevo
              </Button>
            </div>
          </div>
          {contacts.length > 0 ? (
            <div className="space-y-3">
              {contacts.map((ct) => (
                <div key={ct.id} className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0 group">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                    {ct.firstName[0]}{ct.lastName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{ct.firstName} {ct.lastName}</p>
                    <p className="text-xs text-muted-foreground">{ct.position}</p>
                    <p className="text-xs text-muted-foreground">{ct.email}</p>
                    {ct.phone && <p className="text-xs text-muted-foreground">{ct.phone}</p>}
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => handleUnlinkContact(ct.id)} title="Desvincular">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Sin contactos registrados</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proyectos vinculados */}
        <div className="stat-card">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <FolderKanban className="h-4 w-4" /> Proyectos
          </h2>
          {projects.length > 0 ? (
            <div className="space-y-3">
              {projects.map((proj) => (
                <Link key={proj.id} to={`/projects/${proj.id}`} className="block group">
                  <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{proj.name}</p>
                      <p className="text-xs text-muted-foreground">Paso {proj.currentStep}/11</p>
                    </div>
                    <span className="text-xs font-semibold text-primary">${proj.value.toLocaleString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Sin proyectos aún</p>
          )}
        </div>

        {/* Stats */}
        <div className="stat-card">
          <h2 className="font-semibold mb-4">Resumen</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-primary">${client.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Revenue Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{projects.length}</p>
              <p className="text-xs text-muted-foreground">Proyectos</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{offers.length}</p>
              <p className="text-xs text-muted-foreground">Ofertas Totales</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-sinem-warning">{activeOffers.length}</p>
              <p className="text-xs text-muted-foreground">Ofertas Activas</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{contacts.length}</p>
              <p className="text-xs text-muted-foreground">Contactos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ofertas del cliente */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">Ofertas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {offers.length} ofertas · Total: ${totalOffersValue.toLocaleString()}
            </p>
          </div>
          <Button onClick={() => { setSelectedOffer(null); setDialogOpen(true); }} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Nueva Oferta
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Código</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Proyecto</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ítems</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Costo</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Precio</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Margen</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Estado</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fecha</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => {
                const statusCfg = getStatusConfig(offer.status);
                return (
                  <tr key={offer.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-xs">{offer.code}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium">{offer.projectName}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs max-w-[200px] truncate">{offer.items}</td>
                    <td className="py-3 px-4 text-right">${offer.costUSD.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-semibold text-primary">${offer.priceUSD.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sinem-success font-medium">{offer.marginPercent}%</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex text-[10px] px-2 py-0.5 rounded-full text-primary-foreground ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{offer.createdAt}</td>
                    <td className="py-3 px-4 text-center">
                      <Button variant="ghost" size="sm" onClick={() => handleEditOffer(offer)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {offers.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    No hay ofertas para este cliente
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OfferDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        offer={selectedOffer}
        clientName={client.name}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="col-span-2">
              <Label>Nombre / Empresa</Label>
              <Input value={editForm.name} onChange={(e) => uf("name", e.target.value)} />
            </div>
            <div>
              <Label>Persona de Contacto</Label>
              <Input value={editForm.contactName} onChange={(e) => uf("contactName", e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={editForm.contactEmail} onChange={(e) => uf("contactEmail", e.target.value)} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={editForm.contactPhone} onChange={(e) => uf("contactPhone", e.target.value)} />
            </div>
            <div>
              <Label>Industria</Label>
              <Input value={editForm.industry} onChange={(e) => uf("industry", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Dirección</Label>
              <Input value={editForm.address} onChange={(e) => uf("address", e.target.value)} />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={editForm.status} onValueChange={(v) => uf("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveClient} disabled={!editForm.name.trim()}>Guardar Cambios</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Contacto</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <Label>Nombre</Label>
              <Input value={contactForm.firstName} onChange={(e) => setContactForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="Nombre" />
            </div>
            <div>
              <Label>Apellido</Label>
              <Input value={contactForm.lastName} onChange={(e) => setContactForm((f) => ({ ...f, lastName: e.target.value }))} placeholder="Apellido" />
            </div>
            <div>
              <Label>Cargo</Label>
              <Input value={contactForm.position} onChange={(e) => setContactForm((f) => ({ ...f, position: e.target.value }))} placeholder="Ej: Gerente de Compras" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={contactForm.email} onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))} placeholder="correo@empresa.com" />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={contactForm.phone} onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))} placeholder="809-555-0000" />
            </div>
            <div>
              <Label>Celular</Label>
              <Input value={contactForm.mobile} onChange={(e) => setContactForm((f) => ({ ...f, mobile: e.target.value }))} placeholder="809-555-0000" />
            </div>
            <div className="col-span-2">
              <Label>Notas</Label>
              <Input value={contactForm.notes} onChange={(e) => setContactForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notas adicionales" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveContact} disabled={!contactForm.firstName.trim() || !contactForm.lastName.trim()}>Crear Contacto</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Existing Contact Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Contacto Existente</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2 max-h-[350px] overflow-y-auto">
            {unlinkedContacts.length > 0 ? unlinkedContacts.map((ct) => (
              <div key={ct.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                  {ct.firstName[0]}{ct.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{ct.firstName} {ct.lastName}</p>
                  <p className="text-xs text-muted-foreground">{ct.position} · {ct.email}</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleLinkContact(ct.id)}>
                  <Link2 className="h-3 w-3 mr-1" /> Vincular
                </Button>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-6">No hay contactos sin vincular</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClienteDetail;
