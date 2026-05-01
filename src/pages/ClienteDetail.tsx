import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { dbToClient, dbToContact } from "@/lib/supabaseMappers";
import { OFFER_STATUSES, type ClientOffer, type Client, type Contact } from "@/lib/types";
import { ArrowLeft, Building2, Mail, Phone, MapPin, Plus, FileText, Eye, FolderKanban, UserCircle, Pencil, Trash2, Link2, Loader2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import OfferDialog from "@/components/clientes/OfferDialog";

const ClienteDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [unlinkedContacts, setUnlinkedContacts] = useState<Contact[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<ClientOffer | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", contactName: "", contactEmail: "", contactPhone: "", phone: "", industry: "", address: "", rnc: "", status: "activo" as "activo" | "inactivo",
  });

  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const emptyContactForm = { firstName: "", lastName: "", position: "", email: "", phone: "", mobile: "", notes: "" };
  const [contactForm, setContactForm] = useState(emptyContactForm);

  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);
    const [clientRes, contactsRes, unlinkedRes, offersRes, projectsRes] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase.from("contacts").select("*").eq("client_id", id),
      supabase.from("contacts").select("*").is("client_id", null),
      supabase.from("client_offers").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("projects").select("*").eq("client_id", id),
    ]);
    if (clientRes.data) setClient(dbToClient(clientRes.data));
    setContacts((contactsRes.data ?? []).map(dbToContact));
    setUnlinkedContacts((unlinkedRes.data ?? []).map(dbToContact));
    setOffers(offersRes.data ?? []);
    setProjects(projectsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);

  const openEditClient = () => {
    if (!client) return;
    setEditForm({
      name: client.name, contactName: client.contactName, contactEmail: client.contactEmail,
      contactPhone: client.contactPhone, phone: client.phone ?? "", industry: client.industry, address: client.address, rnc: client.rnc, status: client.status,
    });
    setEditOpen(true);
  };

  const handleSaveClient = async () => {
    if (!client || !editForm.name.trim()) return;
    const { error } = await supabase.from("clients").update({
      name: editForm.name.trim(),
      contact_name: editForm.contactName.trim(),
      contact_email: editForm.contactEmail.trim(),
      contact_phone: editForm.contactPhone.trim(),
      phone: editForm.phone.trim() || null,
      industry: editForm.industry.trim(),
      address: editForm.address.trim(),
      rnc: editForm.rnc.trim(),
      status: editForm.status,
    } as any).eq("id", client.id);
    if (!error) {
      toast({ title: "Cliente actualizado" });
      setEditOpen(false);
      fetchAll();
    }
  };

  const uf = (key: keyof typeof editForm, value: string) => setEditForm((f) => ({ ...f, [key]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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

  const handleSaveContact = async () => {
    if (!contactForm.firstName.trim() || !contactForm.lastName.trim()) return;
    const { error } = await supabase.from("contacts").insert({
      client_id: client.id,
      first_name: contactForm.firstName.trim(),
      last_name: contactForm.lastName.trim(),
      position: contactForm.position.trim(),
      email: contactForm.email.trim(),
      phone: contactForm.phone.trim(),
      mobile: contactForm.mobile?.trim() || null,
      notes: contactForm.notes.trim(),
    });
    if (!error) {
      setContactDialogOpen(false);
      setContactForm(emptyContactForm);
      toast({ title: "Contacto creado y vinculado" });
      fetchAll();
    }
  };

  const handleLinkContact = async (contactId: string) => {
    await supabase.from("contacts").update({ client_id: client.id }).eq("id", contactId);
    setLinkDialogOpen(false);
    toast({ title: "Contacto vinculado" });
    fetchAll();
  };

  const handleUnlinkContact = async (contactId: string) => {
    await supabase.from("contacts").update({ client_id: null }).eq("id", contactId);
    if (client?.primaryContactId === contactId) {
      await supabase.from("clients").update({ primary_contact_id: null } as any).eq("id", client.id);
    }
    toast({ title: "Contacto desvinculado" });
    fetchAll();
  };

  const handleSetPrimary = async (contactId: string) => {
    if (!client) return;
    await supabase.from("clients").update({ primary_contact_id: contactId } as any).eq("id", client.id);
    toast({ title: "Contacto principal actualizado" });
    fetchAll();
  };

  const totalOffersValue = offers.reduce((sum: number, o: any) => sum + Number(o.price_usd), 0);
  const activeOffers = offers.filter((o: any) => !["ganada", "perdida"].includes(o.status));

  const getStatusConfig = (status: string) => {
    return OFFER_STATUSES.find((s) => s.key === status) ?? { label: status, color: "bg-muted" };
  };

  const handleEditOffer = (offer: any) => {
    setSelectedOffer({
      id: offer.id,
      clientId: offer.client_id,
      code: offer.code,
      projectName: offer.project_name,
      items: offer.items,
      costUSD: Number(offer.cost_usd),
      priceUSD: Number(offer.price_usd),
      marginPercent: Number(offer.margin_percent),
      marginUSD: Number(offer.margin_usd),
      status: offer.status,
      validUntil: offer.valid_until,
      notes: offer.notes,
      createdAt: offer.created_at,
    });
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
          <p className="text-muted-foreground text-sm">{client.industry} · Cliente desde {client.createdAt?.split("T")[0]}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="stat-card">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Información del Cliente
          </h2>
          <div className="space-y-3">
            {client.industry && (
              <div>
                <p className="text-xs text-muted-foreground">Industria</p>
                <p className="text-sm font-medium">{client.industry}</p>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{client.address}</span>
              </div>
            )}
            {client.rnc && (
              <div>
                <p className="text-xs text-muted-foreground">RNC</p>
                <p className="text-sm font-medium">{client.rnc}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Estado</p>
              <span className={`inline-flex text-xs px-2 py-0.5 rounded-full ${client.status === "activo" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                {client.status === "activo" ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <UserCircle className="h-4 w-4" /> Contactos <span className="text-xs text-muted-foreground font-normal">({contacts.length})</span>
            </h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setLinkDialogOpen(true)} disabled={unlinkedContacts.length === 0} title={unlinkedContacts.length === 0 ? "No hay contactos sin vincular" : ""}>
                <Link2 className="h-3 w-3 mr-1" /> Vincular
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setContactForm(emptyContactForm); setContactDialogOpen(true); }}>
                <Plus className="h-3 w-3 mr-1" /> Crear
              </Button>
            </div>
          </div>
          {contacts.length > 0 ? (
            <div className="space-y-3">
              {contacts.map((ct) => {
                const isPrimary = ct.id === client.primaryContactId;
                return (
                  <div key={ct.id} className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0 group">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${isPrimary ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                      {ct.firstName[0]}{ct.lastName[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium">{ct.firstName} {ct.lastName}</p>
                        {isPrimary && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 px-1.5 py-0.5 rounded-full leading-none">
                            <Crown className="h-2.5 w-2.5 fill-current" /> Principal
                          </span>
                        )}
                      </div>
                      {ct.position && <p className="text-xs text-muted-foreground">{ct.position}</p>}
                      {ct.email && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Mail className="h-3 w-3 shrink-0" />{ct.email}
                        </div>
                      )}
                      {(ct.phone || ct.mobile) && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />{ct.phone || ct.mobile}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {!isPrimary && (
                        <button
                          onClick={() => handleSetPrimary(ct.id)}
                          title="Marcar como principal"
                          className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-yellow-500 transition-colors"
                        >
                          <Crown className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleUnlinkContact(ct.id)} title="Desvincular">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Sin contactos registrados</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="stat-card">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <FolderKanban className="h-4 w-4" /> Proyectos
          </h2>
          {projects.length > 0 ? (
            <div className="space-y-3">
              {projects.map((proj: any) => (
                <Link key={proj.id} to={`/projects/${proj.id}`} className="block group">
                  <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{proj.name}</p>
                      <p className="text-xs text-muted-foreground">Paso {proj.current_step}/11</p>
                    </div>
                    <span className="text-xs font-semibold text-primary">${Number(proj.value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Sin proyectos aún</p>
          )}
        </div>

        <div className="stat-card">
          <h2 className="font-semibold mb-4">Resumen</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-primary">${client.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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

      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">Ofertas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {offers.length} ofertas · Total: ${totalOffersValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              {offers.map((offer: any) => {
                const statusCfg = getStatusConfig(offer.status);
                return (
                  <tr key={offer.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-xs">{offer.code}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium">{offer.project_name}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs max-w-[200px] truncate">{offer.items}</td>
                    <td className="py-3 px-4 text-right">${Number(offer.cost_usd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right font-semibold text-primary">${Number(offer.price_usd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sinem-success font-medium">{Number(offer.margin_percent)}%</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex text-[10px] px-2 py-0.5 rounded-full text-primary-foreground ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{offer.created_at?.split("T")[0]}</td>
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
            <div>
              <Label>Teléfono</Label>
              <Input value={editForm.phone} onChange={(e) => uf("phone", e.target.value)} placeholder="809-555-0000" />
            </div>
            <div className="col-span-2">
              <Label>Dirección</Label>
              <Input value={editForm.address} onChange={(e) => uf("address", e.target.value)} />
            </div>
            <div>
              <Label>RNC</Label>
              <Input value={editForm.rnc} onChange={(e) => uf("rnc", e.target.value)} placeholder="Ej: 101-12345-6" />
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
