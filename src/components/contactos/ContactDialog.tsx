import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Search, X, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { dbToClient } from "@/lib/supabaseMappers";
import type { Contact, Client } from "@/lib/types";
import { useRequiredFields } from "@/hooks/useRequiredFields";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onSave?: (contact: Contact) => void;
}

const emptyForm = {
  firstName: "",
  lastName: "",
  position: "",
  clientId: "none",
  email: "",
  phone: "",
  mobile: "",
  status: "activo" as "activo" | "inactivo",
  notes: "",
};

const ContactDialog = ({ open, onOpenChange, contact, onSave }: Props) => {
  const isEdit = !!contact;
  const { toast } = useToast();
  const { fields: reqFields } = useRequiredFields("contacto");
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from("clients").select("*").order("name").then(({ data }) => {
        setClients((data ?? []).map(dbToClient));
      });
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (contact) {
        setForm({
          firstName: contact.firstName,
          lastName: contact.lastName,
          position: contact.position,
          clientId: contact.clientId ?? "none",
          email: contact.email,
          phone: contact.phone,
          mobile: contact.mobile ?? "",
          status: contact.status,
          notes: contact.notes,
        });
      } else {
        setForm(emptyForm);
      }
      setClientSearch("");
      setClientDropdownOpen(false);
    }
  }, [open, contact]);

  const u = (key: keyof typeof emptyForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const selectedClient = useMemo(() => {
    if (form.clientId === "none") return null;
    return clients.find((c) => c.id === form.clientId) ?? null;
  }, [form.clientId, clients]);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()));
  }, [clients, clientSearch]);

  const handleSelectClient = (clientId: string) => {
    u("clientId", clientId);
    setClientSearch("");
    setClientDropdownOpen(false);
  };

  const handleSave = () => {
    const valMap: Record<string, any> = {
      firstName: form.firstName, lastName: form.lastName, email: form.email,
      phone: form.phone, position: form.position,
      clientId: form.clientId === "none" ? "" : form.clientId,
    };
    const missing = reqFields.filter((f) => f.isRequired && !valMap[f.fieldKey]?.toString().trim());
    if (missing.length > 0) {
      toast({ title: "Campos obligatorios", description: missing.map((f) => f.fieldLabel).join(", "), variant: "destructive" });
      return;
    }
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) return;
    const saved: Contact = {
      id: contact?.id ?? crypto.randomUUID(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      position: form.position.trim(),
      clientId: form.clientId === "none" ? undefined : form.clientId,
      email: form.email.trim(),
      phone: form.phone.trim(),
      mobile: form.mobile.trim() || undefined,
      status: form.status,
      notes: form.notes.trim(),
      createdAt: contact?.createdAt ?? new Date().toISOString().split("T")[0],
    };
    onSave?.(saved);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `${contact.firstName} ${contact.lastName}` : "Nuevo Contacto"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Label>Nombre</Label>
            <Input value={form.firstName} onChange={(e) => u("firstName", e.target.value)} placeholder="Ej: Carlos" />
          </div>
          <div>
            <Label>Apellido</Label>
            <Input value={form.lastName} onChange={(e) => u("lastName", e.target.value)} placeholder="Ej: Méndez" />
          </div>
          <div>
            <Label>Cargo / Posición</Label>
            <Input value={form.position} onChange={(e) => u("position", e.target.value)} placeholder="Ej: Gerente de Planta" />
          </div>
          <div>
            <Label>Cliente Asociado</Label>
            {selectedClient ? (
              <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted/30">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium flex-1 truncate">{selectedClient.name}</span>
                <button type="button" onClick={() => u("clientId", "none")} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente..."
                    value={clientSearch}
                    onChange={(e) => { setClientSearch(e.target.value); setClientDropdownOpen(true); }}
                    onFocus={() => setClientDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setClientDropdownOpen(false), 150)}
                    className="text-sm pl-8 h-9"
                  />
                </div>
                {clientDropdownOpen && (
                  <div className="max-h-[140px] overflow-y-auto border rounded-md divide-y">
                    <button
                      type="button"
                      onClick={() => handleSelectClient("none")}
                      className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm text-muted-foreground"
                    >
                      Sin cliente asignado
                    </button>
                    {filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectClient(c.id)}
                        className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm flex justify-between items-center"
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground">{c.industry}</span>
                      </button>
                    ))}
                    {filteredClients.length === 0 && clientSearch.trim() && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <Label>Email <span className="text-destructive">*</span></Label>
            <Input type="email" value={form.email} onChange={(e) => u("email", e.target.value)} placeholder="email@empresa.com" />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input value={form.phone} onChange={(e) => u("phone", e.target.value)} placeholder="809-555-0000" />
          </div>
          <div>
            <Label>Celular</Label>
            <Input value={form.mobile} onChange={(e) => u("mobile", e.target.value)} placeholder="809-555-0000" />
          </div>
          <div>
            <Label>Estado</Label>
            <div className="flex items-center gap-2 h-9">
              <Button
                type="button"
                variant={form.status === "activo" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => u("status", "activo")}
              >
                Activo
              </Button>
              <Button
                type="button"
                variant={form.status === "inactivo" ? "destructive" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => u("status", "inactivo")}
              >
                Inactivo
              </Button>
            </div>
          </div>
          <div className="col-span-2">
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={(e) => u("notes", e.target.value)} rows={3} placeholder="Notas sobre este contacto..." />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()}>
            {isEdit ? "Guardar Cambios" : "Crear Contacto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactDialog;
