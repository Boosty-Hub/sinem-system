import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { mockClients } from "@/lib/mockData";
import type { Contact } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
}

const ContactDialog = ({ open, onOpenChange, contact }: Props) => {
  const isEdit = !!contact;

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
            <Input defaultValue={contact?.firstName ?? ""} placeholder="Ej: Carlos" />
          </div>
          <div>
            <Label>Apellido</Label>
            <Input defaultValue={contact?.lastName ?? ""} placeholder="Ej: Méndez" />
          </div>
          <div>
            <Label>Cargo / Posición</Label>
            <Input defaultValue={contact?.position ?? ""} placeholder="Ej: Gerente de Planta" />
          </div>
          <div>
            <Label>Cliente Asociado</Label>
            <Select defaultValue={contact?.clientId ?? "none"}>
              <SelectTrigger><SelectValue placeholder="Sin cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin cliente asignado</SelectItem>
                {mockClients.map((cl) => (
                  <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" defaultValue={contact?.email ?? ""} placeholder="email@empresa.com" />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input defaultValue={contact?.phone ?? ""} placeholder="809-555-0000" />
          </div>
          <div>
            <Label>Celular</Label>
            <Input defaultValue={contact?.mobile ?? ""} placeholder="809-555-0000" />
          </div>
          <div>
            <Label>Estado</Label>
            <Select defaultValue={contact?.status ?? "activo"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Notas</Label>
            <Textarea defaultValue={contact?.notes ?? ""} rows={3} placeholder="Notas sobre este contacto..." />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onOpenChange(false)}>
            {isEdit ? "Guardar Cambios" : "Crear Contacto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactDialog;
