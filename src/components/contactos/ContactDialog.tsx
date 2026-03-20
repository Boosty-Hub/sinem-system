import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { mockClients } from "@/lib/mockData";
import type { Contact } from "@/lib/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Client } from "@/lib/types";

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
  const [clients] = useLocalStorage<Client[]>("sinem:clients", mockClients);
  const [form, setForm] = useState(emptyForm);

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
    }
  }, [open, contact]);

  const u = (key: keyof typeof emptyForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
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
            <Select value={form.clientId} onValueChange={(v) => u("clientId", v)}>
              <SelectTrigger><SelectValue placeholder="Sin cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin cliente asignado</SelectItem>
                {clients.map((cl) => (
                  <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Select value={form.status} onValueChange={(v) => u("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
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
