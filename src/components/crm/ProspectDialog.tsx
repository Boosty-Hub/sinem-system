import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PIPELINE_STAGES, type Prospect } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: Prospect | null;
}

const ProspectDialog = ({ open, onOpenChange, prospect }: Props) => {
  const isEdit = !!prospect;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Cotización" : "Nueva Cotización"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="col-span-2">
            <Label>Nombre del Proyecto</Label>
            <Input defaultValue={prospect?.projectName ?? ""} placeholder="Ej: Transformadores ABB" />
          </div>
          <div>
            <Label>Cliente Directo</Label>
            <Input defaultValue={prospect?.directCustomer ?? ""} />
          </div>
          <div>
            <Label>Cliente Final</Label>
            <Input defaultValue={prospect?.endCustomer ?? ""} />
          </div>
          <div>
            <Label>Proveedor</Label>
            <Input defaultValue={prospect?.proveedor ?? "SIEMENS"} />
          </div>
          <div>
            <Label>Unidad de Negocio</Label>
            <Select defaultValue={prospect?.bu ?? ""}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SE">SE - Smart Infrastructure</SelectItem>
                <SelectItem value="DI">DI - Digital Industries</SelectItem>
                <SelectItem value="MO">MO - Mobility</SelectItem>
                <SelectItem value="EP">EP - Energy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Producto</Label>
            <Input defaultValue={prospect?.product ?? ""} />
          </div>
          <div>
            <Label>Status</Label>
            <Select defaultValue={prospect?.status ?? "prospecto"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Alcance</Label>
            <Textarea defaultValue={prospect?.scope ?? ""} rows={2} />
          </div>
          <div>
            <Label>Costo USD</Label>
            <Input type="number" defaultValue={prospect?.costUSD ?? ""} />
          </div>
          <div>
            <Label>Precio USD</Label>
            <Input type="number" defaultValue={prospect?.priceUSD ?? ""} />
          </div>
          <div>
            <Label>Go %</Label>
            <Input type="number" defaultValue={prospect?.go ?? ""} />
          </div>
          <div>
            <Label>Get %</Label>
            <Input type="number" defaultValue={prospect?.get ?? ""} />
          </div>
          <div>
            <Label>Estimated OE</Label>
            <Input defaultValue={prospect?.estimatedOE ?? ""} />
          </div>
          <div>
            <Label>Margen %</Label>
            <Input type="number" defaultValue={prospect?.marginPercent ?? ""} />
          </div>
          <div className="col-span-2">
            <Label>Comentarios</Label>
            <Textarea defaultValue={prospect?.comments ?? ""} rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onOpenChange(false)}>
            {isEdit ? "Guardar Cambios" : "Crear Cotización"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProspectDialog;
