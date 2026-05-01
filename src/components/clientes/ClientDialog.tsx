import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, X, UserPlus, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Contact } from "@/lib/types";
import { dbToContact } from "@/lib/supabaseMappers";
import { useToast } from "@/hooks/use-toast";
import { useRequiredFields } from "@/hooks/useRequiredFields";

interface ClientForm {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  phone: string;
  industry: string;
  address: string;
  rnc: string;
  status: "activo" | "inactivo";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId: string | null;
  initialForm: ClientForm;
  initialContactIds?: string[];
  initialPrimaryContactId?: string;
  onSave: (form: ClientForm, selectedContactIds: string[], primaryContactId: string | null) => void;
}

const emptyNewContact = { firstName: "", lastName: "", email: "", phone: "", position: "" };

const ClientDialog = ({ open, onOpenChange, editId, initialForm, initialContactIds, initialPrimaryContactId, onSave }: Props) => {
  const { toast } = useToast();
  const { fields: reqFields } = useRequiredFields("cliente");
  const [form, setForm] = useState<ClientForm>(initialForm);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [primaryContactId, setPrimaryContactId] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState("");

  // Inline create contact
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContact, setNewContact] = useState(emptyNewContact);
  const [creatingContact, setCreatingContact] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setSelectedContactIds(initialContactIds ?? []);
      setPrimaryContactId(initialPrimaryContactId ?? null);
      setContactSearch("");
      setShowNewContact(false);
      setNewContact(emptyNewContact);
      fetchContacts();
    }
  }, [open]);

  const fetchContacts = async () => {
    let query = supabase.from("contacts").select("*").eq("status", "activo");
    const { data } = await query;
    if (!data) return;
    const all = data.map(dbToContact);
    const filtered = all.filter((c) => !c.clientId || c.clientId === editId);
    setAvailableContacts(filtered);
  };

  const u = (key: keyof ClientForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        if (primaryContactId === id) setPrimaryContactId(next[0] ?? null);
        return next;
      }
      return [...prev, id];
    });
  };

  const makePrimary = (id: string) => setPrimaryContactId(id);

  const handleSave = () => {
    const valMap: Record<string, any> = {
      name: form.name, industry: form.industry, status: form.status,
      address: form.address, rnc: form.rnc, contacts: selectedContactIds.length > 0 ? "ok" : "",
    };
    const missing = reqFields.filter((f) => f.isRequired && !valMap[f.fieldKey]?.toString().trim());
    if (missing.length > 0) {
      toast({ title: "Campos obligatorios", description: missing.map((f) => f.fieldLabel).join(", "), variant: "destructive" });
      return;
    }
    if (!form.name.trim() || selectedContactIds.length === 0) return;
    onSave(form, selectedContactIds, primaryContactId);
  };

  const handleCreateContact = async () => {
    if (!newContact.firstName.trim() || !newContact.lastName.trim()) return;
    setCreatingContact(true);
    const { data, error } = await supabase.from("contacts").insert({
      first_name: newContact.firstName.trim(),
      last_name: newContact.lastName.trim(),
      email: newContact.email.trim(),
      phone: newContact.phone.trim(),
      position: newContact.position.trim(),
    }).select("*").single();
    setCreatingContact(false);
    if (error || !data) {
      toast({ title: "Error al crear contacto", description: error?.message, variant: "destructive" });
      return;
    }
    const created = dbToContact(data);
    setAvailableContacts((prev) => [...prev, created]);
    setSelectedContactIds((prev) => [...prev, created.id]);
    if (selectedContactIds.length === 0 && !primaryContactId) {
      setPrimaryContactId(created.id);
    }
    setNewContact(emptyNewContact);
    setShowNewContact(false);
    toast({ title: "Contacto creado", description: `${created.firstName} ${created.lastName} fue creado y vinculado.` });
  };

  const filteredContacts = availableContacts.filter((c) => {
    if (!contactSearch.trim()) return true;
    const q = contactSearch.toLowerCase();
    return `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  const selectedContacts = availableContacts.filter((c) => selectedContactIds.includes(c.id));
  const unselectedContacts = filteredContacts.filter((c) => !selectedContactIds.includes(c.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="col-span-2">
            <Label>Nombre / Empresa</Label>
            <Input value={form.name} onChange={(e) => u("name", e.target.value)} placeholder="Ej: AES Dominicana" />
          </div>
          <div>
            <Label>Industria</Label>
            <Input value={form.industry} onChange={(e) => u("industry", e.target.value)} placeholder="Ej: Energía" />
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
          <div className="col-span-2">
            <Label>Dirección</Label>
            <Input value={form.address} onChange={(e) => u("address", e.target.value)} placeholder="Dirección completa" />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input value={form.phone} onChange={(e) => u("phone", e.target.value)} placeholder="809-555-0000" />
          </div>
          <div>
            <Label>RNC</Label>
            <Input value={form.rnc} onChange={(e) => u("rnc", e.target.value)} placeholder="Ej: 101-12345-6" />
          </div>
        </div>

        {/* Contact selection */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Contactos del Cliente <span className="text-destructive">*</span>
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowNewContact(!showNewContact)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {showNewContact ? "Cancelar" : "Crear Contacto"}
            </Button>
          </div>

          {/* Inline create contact form */}
          {showNewContact && (
            <div className="border rounded-lg p-3 space-y-2 bg-muted/30 animate-fade-in">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nuevo Contacto</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Nombre *"
                  value={newContact.firstName}
                  onChange={(e) => setNewContact((p) => ({ ...p, firstName: e.target.value }))}
                  className="text-sm h-8"
                />
                <Input
                  placeholder="Apellido *"
                  value={newContact.lastName}
                  onChange={(e) => setNewContact((p) => ({ ...p, lastName: e.target.value }))}
                  className="text-sm h-8"
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                  className="text-sm h-8"
                />
                <Input
                  placeholder="Teléfono"
                  value={newContact.phone}
                  onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))}
                  className="text-sm h-8"
                />
                <Input
                  placeholder="Cargo / Posición"
                  value={newContact.position}
                  onChange={(e) => setNewContact((p) => ({ ...p, position: e.target.value }))}
                  className="text-sm h-8 col-span-2"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleCreateContact}
                  disabled={!newContact.firstName.trim() || !newContact.lastName.trim() || creatingContact}
                >
                  {creatingContact && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Crear y Vincular
                </Button>
              </div>
            </div>
          )}

          {/* Selected contacts */}
          {selectedContacts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedContacts.map((c) => {
                const isPrimary = primaryContactId === c.id;
                return (
                  <Badge
                    key={c.id}
                    variant={isPrimary ? "default" : "secondary"}
                    className="flex items-center gap-1.5 py-1 px-2 cursor-pointer"
                  >
                    <button
                      type="button"
                      onClick={() => makePrimary(c.id)}
                      title={isPrimary ? "Contacto principal" : "Marcar como principal"}
                      className="hover:scale-110 transition-transform"
                    >
                      <Crown className={`h-3.5 w-3.5 ${isPrimary ? "text-yellow-300 fill-yellow-300" : "text-muted-foreground/50"}`} />
                    </button>
                    <span>{c.firstName} {c.lastName}</span>
                    <button type="button" onClick={() => toggleContact(c.id)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Search & add */}
          <Input
            placeholder="Buscar contacto disponible..."
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
            className="text-sm"
          />

          {unselectedContacts.length > 0 ? (
            <div className="max-h-[160px] overflow-y-auto border rounded-md divide-y">
              {unselectedContacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    toggleContact(c.id);
                    if (selectedContactIds.length === 0 && !primaryContactId) {
                      setPrimaryContactId(c.id);
                    }
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between items-center"
                >
                  <span className="font-medium">{c.firstName} {c.lastName}</span>
                  <span className="text-xs text-muted-foreground">{c.position || c.email}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No hay contactos disponibles.</p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || selectedContactIds.length === 0}>
            {editId ? "Guardar Cambios" : "Crear Cliente"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientDialog;
