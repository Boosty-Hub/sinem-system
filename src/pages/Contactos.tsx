import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Contact, Client } from "@/lib/types";
import { dbToContact, dbToClient } from "@/lib/supabaseMappers";
import { Search, Plus, UserCircle, Building2, Mail, Phone, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ContactDialog from "@/components/contactos/ContactDialog";
import { usePermissions } from "@/hooks/usePermissions";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";

const Contactos = () => {
  const { toast } = useToast();
  const { canCreate: canCreateFn, canDelete: canDeleteFn } = usePermissions();
  const canCreateCtc = canCreateFn("Contactos");
  const canDeleteCtc = canDeleteFn("Contactos");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [filterClient, setFilterClient] = useState<string>("all");

  const fetchData = async () => {
    setLoading(true);
    const [{ data: contactsData }, { data: clientsData }] = await Promise.all([
      supabase.from("contacts").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("name"),
    ]);
    setContacts((contactsData ?? []).map(dbToContact));
    setClients((clientsData ?? []).map(dbToClient));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = contacts.filter((c) => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || c.position.toLowerCase().includes(search.toLowerCase());
    const matchesClient = filterClient === "all" ? true : filterClient === "none" ? !c.clientId : c.clientId === filterClient;
    return matchesSearch && matchesClient;
  });

  const getClientName = (clientId?: string) => {
    if (!clientId) return null;
    return clients.find((cl) => cl.id === clientId)?.name ?? null;
  };

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setDialogOpen(true);
  };

  const handleDelete = (contact: Contact) => setDeleteTarget(contact);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("contacts").delete().eq("id", deleteTarget.id);
    toast({ title: "Contacto eliminado" });
    setDeleteTarget(null);
    fetchData();
  };

  const handleSave = async (saved: Contact) => {
    const dbData = {
      first_name: saved.firstName,
      last_name: saved.lastName,
      position: saved.position,
      client_id: saved.clientId ?? null,
      email: saved.email,
      phone: saved.phone,
      mobile: saved.mobile ?? null,
      notes: saved.notes,
      status: saved.status,
    };

    const exists = contacts.find((c) => c.id === saved.id);
    if (exists) {
      await supabase.from("contacts").update(dbData).eq("id", saved.id);
    } else {
      await supabase.from("contacts").insert(dbData);
    }
    fetchData();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contactos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length} contacto{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canCreateCtc && (
          <Button onClick={() => { setSelectedContact(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nuevo Contacto
          </Button>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, email o cargo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">Todos los clientes</option>
          <option value="none">Sin cliente asignado</option>
          {clients.map((cl) => (
            <option key={cl.id} value={cl.id}>{cl.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((contact) => {
          const clientName = getClientName(contact.clientId);
          return (
            <div key={contact.id} className="stat-card group hover:border-primary/30 transition-colors cursor-pointer" onClick={() => handleEdit(contact)}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {contact.firstName[0]}{contact.lastName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm truncate">{contact.firstName} {contact.lastName}</h3>
                  <p className="text-xs text-muted-foreground truncate">{contact.position}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${contact.status === "activo" ? "bg-sinem-success/20 text-sinem-success" : "bg-muted text-muted-foreground"}`}>
                    {contact.status === "activo" ? "Activo" : "Inactivo"}
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(contact); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                {clientName ? (
                  <div className="flex items-center gap-2 text-xs">
                    <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-primary font-medium truncate">{clientName}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span className="italic">Sin cliente asignado</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span>{contact.phone}</span>
                </div>
              </div>

              {contact.notes && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2 border-t border-border/40 pt-2">{contact.notes}</p>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">No se encontraron contactos</div>
        )}
      </div>

      <ContactDialog open={dialogOpen} onOpenChange={setDialogOpen} contact={selectedContact} onSave={handleSave} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Eliminar Contacto"
        description={`¿Estás seguro de eliminar "${deleteTarget?.firstName} ${deleteTarget?.lastName}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default Contactos;
