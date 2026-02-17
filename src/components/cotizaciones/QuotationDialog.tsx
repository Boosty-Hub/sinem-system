import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { QUOTATION_STATUSES, type Quotation } from "@/lib/types";
import { mockClients, mockContacts, mockProspects } from "@/lib/mockData";
import { Plus, Trash2 } from "lucide-react";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceUSD: number;
  totalUSD: number;
}

interface QuotationPrefill {
  prospectId?: string;
  clientId?: string;
  contactId?: string;
  subject?: string;
  customer?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: Quotation | null;
  prefill?: QuotationPrefill;
}

interface ClientData {
  company: string;
  attention: string;
  address: string;
  rnc: string;
  phone: string;
  email: string;
}

const emptyClientData: ClientData = { company: "", attention: "", address: "", rnc: "", phone: "", email: "" };

const QuotationDialog = ({ open, onOpenChange, quotation, prefill }: Props) => {
  const isEdit = !!quotation;
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<string>("none");
  const [clientData, setClientData] = useState<ClientData>(emptyClientData);

  useEffect(() => {
    if (open) {
      setLineItems(quotation?.lineItems ?? []);
      setSelectedProspectId(quotation?.prospectId ?? prefill?.prospectId ?? "none");
      setClientData(quotation?.client ?? emptyClientData);

      // Auto-fill from prefill prospect
      if (!quotation && prefill?.prospectId) {
        fillFromProspect(prefill.prospectId);
      }
    }
  }, [open, quotation, prefill]);

  const fillFromProspect = (prospectId: string) => {
    const prospect = mockProspects.find((p) => p.id === prospectId);
    if (!prospect) return;

    // Try to resolve client data from directCustomer field or clientId
    let data: ClientData = { ...emptyClientData };

    // If prospect has a linked client, use that
    if (prospect.clientId) {
      const client = mockClients.find((c) => c.id === prospect.clientId);
      if (client) {
        data.company = client.name;
        data.address = client.address;
        data.phone = client.contactPhone;
        data.email = client.contactEmail;
        data.attention = client.contactName;
      }
    } else if (prospect.directCustomer) {
      // Try matching directCustomer string to a client name
      const client = mockClients.find((c) => c.name === prospect.directCustomer);
      if (client) {
        data.company = client.name;
        data.address = client.address;
        data.phone = client.contactPhone;
        data.email = client.contactEmail;
        data.attention = client.contactName;
      } else {
        data.company = prospect.directCustomer;
      }
    }

    // If prospect has a linked contact, use for attention/phone/email
    if (prospect.contactId) {
      const contact = mockContacts.find((ct) => ct.id === prospect.contactId);
      if (contact) {
        data.attention = `${contact.firstName} ${contact.lastName}`;
        data.phone = contact.phone;
        data.email = contact.email;
      }
    }

    setClientData(data);
  };

  const handleProspectChange = (value: string) => {
    setSelectedProspectId(value);
    if (value !== "none") {
      fillFromProspect(value);
    }
  };

  const addItem = () => {
    setLineItems((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, description: "", quantity: 1, unitPriceUSD: 0, totalUSD: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unitPriceUSD") {
          updated.totalUSD = updated.quantity * updated.unitPriceUSD;
        }
        return updated;
      })
    );
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.totalUSD, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Cotización ${quotation.code}` : "Nueva Cotización"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Encabezado */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Código</Label>
              <Input defaultValue={quotation?.code ?? ""} placeholder="COT-2026-XXX" />
            </div>
            <div>
              <Label>Estado</Label>
              <Select defaultValue={quotation?.status ?? "borrador"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUOTATION_STATUSES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" defaultValue={quotation?.createdAt ?? ""} />
            </div>
          </div>

          <div className="col-span-3">
            <Label>Asunto</Label>
            <Input defaultValue={quotation?.subject ?? prefill?.subject ?? ""} placeholder="Ej: Suministro de Transformadores de Distribución" />
          </div>

          {/* Vinculación Cliente / Contacto */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Vinculación</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Oportunidad CRM</Label>
                <Select value={selectedProspectId} onValueChange={handleProspectChange}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar oportunidad" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin oportunidad</SelectItem>
                    {mockProspects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.projectName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cliente</Label>
                <Select defaultValue={quotation?.clientId ?? prefill?.clientId ?? "none"}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin cliente</SelectItem>
                    {mockClients.map((cl) => (
                      <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contacto</Label>
                <Select defaultValue={quotation?.contactId ?? prefill?.contactId ?? "none"}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar contacto" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin contacto</SelectItem>
                    {mockContacts.map((ct) => (
                      <SelectItem key={ct.id} value={ct.id}>{ct.firstName} {ct.lastName}{ct.clientId ? ` (${mockClients.find(c => c.id === ct.clientId)?.name ?? ''})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Datos del Cliente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Empresa</Label>
                <Input value={clientData.company} onChange={(e) => setClientData((prev) => ({ ...prev, company: e.target.value }))} />
              </div>
              <div>
                <Label>Atención</Label>
                <Input value={clientData.attention} onChange={(e) => setClientData((prev) => ({ ...prev, attention: e.target.value }))} />
              </div>
              <div>
                <Label>Dirección</Label>
                <Input value={clientData.address} onChange={(e) => setClientData((prev) => ({ ...prev, address: e.target.value }))} />
              </div>
              <div>
                <Label>RNC</Label>
                <Input value={clientData.rnc} onChange={(e) => setClientData((prev) => ({ ...prev, rnc: e.target.value }))} />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={clientData.phone} onChange={(e) => setClientData((prev) => ({ ...prev, phone: e.target.value }))} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={clientData.email} onChange={(e) => setClientData((prev) => ({ ...prev, email: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Líneas de Ítems */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ítems</h3>
              <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Agregar Ítem</Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Descripción</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs w-20">Cant.</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs w-28">P. Unit. USD</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs w-28">Total USD</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 px-3">
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, "description", e.target.value)}
                          className="h-8 text-xs"
                          placeholder="Descripción del ítem"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                          className="h-8 text-xs text-center"
                          min={1}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          value={item.unitPriceUSD}
                          onChange={(e) => updateItem(item.id, "unitPriceUSD", Number(e.target.value))}
                          className="h-8 text-xs text-right"
                          min={0}
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-xs">${item.totalUSD.toLocaleString()}</td>
                      <td className="py-2 px-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {lineItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground text-xs">
                        Sin ítems. Haz clic en "Agregar Ítem" para comenzar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales e ITBIS */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="itbis" defaultChecked={quotation?.applyItbis ?? true} />
                <Label htmlFor="itbis" className="text-sm">Aplicar ITBIS</Label>
                <Input type="number" defaultValue={quotation?.itbisPercent ?? 18} className="w-20 h-8 text-xs" />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium">${subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between font-semibold text-base border-t pt-1"><span>Total:</span><span className="text-primary">${subtotal.toLocaleString()}</span></div>
            </div>
          </div>

          {/* Costos internos */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Costos Internos</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Costo USD</Label>
                <Input type="number" defaultValue={quotation?.costUSD ?? ""} />
              </div>
              <div>
                <Label>Margen %</Label>
                <Input type="number" defaultValue={quotation?.marginPercent ?? ""} />
              </div>
              <div>
                <Label>Margen USD</Label>
                <Input type="number" defaultValue={quotation?.marginUSD ?? ""} />
              </div>
            </div>
          </div>

          {/* Condiciones Comerciales */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Condiciones Comerciales</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Forma de Pago</Label>
                <Input defaultValue={quotation?.paymentTerms ?? ""} placeholder="Ej: 50% anticipo, 50% contra entrega" />
              </div>
              <div>
                <Label>Tiempo de Entrega</Label>
                <Input defaultValue={quotation?.deliveryTime ?? ""} placeholder="Ej: 8-10 semanas" />
              </div>
              <div>
                <Label>Validez (días)</Label>
                <Input type="number" defaultValue={quotation?.validityDays ?? 30} />
              </div>
              <div>
                <Label>Lugar de Entrega</Label>
                <Input defaultValue={quotation?.deliveryLocation ?? ""} placeholder="Ej: Santo Domingo, RD" />
              </div>
            </div>
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea defaultValue={quotation?.notes ?? ""} rows={2} />
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

export default QuotationDialog;
