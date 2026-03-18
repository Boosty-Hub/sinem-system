import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, X, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Contact } from "@/lib/types";
import { dbToContact } from "@/lib/supabaseMappers";

interface ClientForm {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  industry: string;
  address: string;
  status: "activo" | "inactivo";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId: string | null;
  initialForm: ClientForm;
  /** IDs of contacts already assigned to this client (edit mode) */
  initialContactIds?: string[];
  initialPrimaryContactId?: string;
  onSave: (form: ClientForm, selectedContactIds: string[], primaryContactId: string | null) => void;
}

const ClientDialog = ({ open, onOpenChange, editId, initialForm, initialContactIds, initialPrimaryContactId, onSave }: Props) => {
  const [form, setForm] = useState<ClientForm>(initialForm);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [primaryContactId, setPrimaryContactId] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState("");

  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setSelectedContactIds(initialContactIds ?? []);
      setPrimaryContactId(initialPrimaryContactId ?? null);
      setContactSearch("");
      fetchContacts();
    }
  }, [open]);

  const fetchContacts = async () => {
    // Get contacts that are free (no client) OR belong to the current client being edited
    let query = supabase.from("contacts").select("*").eq("status", "activo");
    const { data } = await query;
    if (!data) return;
    const all = data.map(dbToContact);
    // Filter: show only free contacts + contacts already on this client
    const filtered = all.filter(
      (c) => !c.clientId || c.clientId === editId
    );
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

  const makePrimary = (id: string) => {
    setPrimaryContactId(id);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave(form, selectedContactIds, primaryContactId);
  };

  const filteredContacts = availableContacts.filter((c) => {
    if (!contactSearch.trim()) return true;
    const q = contactSearch.toLowerCase();
    return (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
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

        {/* Contact selection */}
        <div className="mt-4 space-y-3">
          <Label className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Contactos del Cliente
          </Label>

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
                    <button
                      type="button"
                      onClick={() => toggleContact(c.id)}
                      className="hover:text-destructive"
                    >
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
          <Button onClick={handleSave} disabled={!form.name.trim()}>
            {editId ? "Guardar Cambios" : "Crear Cliente"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientDialog;
