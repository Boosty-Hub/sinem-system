import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { OFFER_STATUSES, type ClientOffer } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: ClientOffer | null;
  clientName: string;
}

const OfferDialog = ({ open, onOpenChange, offer, clientName }: Props) => {
  const isEdit = !!offer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Oferta ${offer.code}` : `Nueva Oferta — ${clientName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Label>Código</Label>
            <Input defaultValue={offer?.code ?? ""} placeholder="OFR-2026-XXX" />
          </div>
          <div>
            <Label>Estado</Label>
            <Select defaultValue={offer?.status ?? "borrador"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OFFER_STATUSES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Nombre del Proyecto</Label>
            <Input defaultValue={offer?.projectName ?? ""} placeholder="Ej: Ampliación Subestación" />
          </div>
          <div>
            <Label>Válida Hasta</Label>
            <Input type="date" defaultValue={offer?.validUntil ?? ""} />
          </div>
          <div>
            <Label>Cliente</Label>
            <Input defaultValue={clientName} disabled />
          </div>
          <div className="col-span-2">
            <Label>Ítems / Alcance</Label>
            <Textarea defaultValue={offer?.items ?? ""} rows={2} />
          </div>
          <div>
            <Label>Costo USD</Label>
            <Input type="number" defaultValue={offer?.costUSD ?? ""} />
          </div>
          <div>
            <Label>Precio USD</Label>
            <Input type="number" defaultValue={offer?.priceUSD ?? ""} />
          </div>
          <div>
            <Label>Margen %</Label>
            <Input type="number" defaultValue={offer?.marginPercent ?? ""} />
          </div>
          <div>
            <Label>Margen USD</Label>
            <Input type="number" defaultValue={offer?.marginUSD ?? ""} />
          </div>
          <div className="col-span-2">
            <Label>Notas</Label>
            <Textarea defaultValue={offer?.notes ?? ""} rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onOpenChange(false)}>
            {isEdit ? "Guardar Cambios" : "Crear Oferta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OfferDialog;
