import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PIPELINE_STAGES, QUOTATION_STATUSES, type Prospect } from "@/lib/types";
import { mockClients, mockContacts, mockQuotations } from "@/lib/mockData";
import { FileText, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: Prospect | null;
  onDelete?: (id: string) => void;
}

const ProspectDialog = ({ open, onOpenChange, prospect, onDelete }: Props) => {
  const isEdit = !!prospect;
  const navigate = useNavigate();

  const handleGenerateQuotation = () => {
    if (!prospect) return;
    const params = new URLSearchParams();
    params.set("prospectId", prospect.id);
    if (prospect.contactId) params.set("contactId", prospect.contactId);
    if (prospect.clientId) params.set("clientId", prospect.clientId);
    params.set("subject", prospect.projectName);
    params.set("customer", prospect.directCustomer);
    onOpenChange(false);
    navigate(`/cotizaciones?${params.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Oportunidad" : "Nueva Oportunidad"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="col-span-2">
            <Label>Nombre del Proyecto</Label>
            <Input defaultValue={prospect?.projectName ?? ""} placeholder="Ej: Transformadores ABB" />
          </div>
          <div>
            <Label>Cliente Directo</Label>
            <Select defaultValue={prospect?.directCustomer ?? "none"}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {mockClients.length > 0 && (
                  <>
                    <SelectItem value="__clients_header" disabled className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Clientes</SelectItem>
                    {mockClients.map((cl) => (
                      <SelectItem key={`cl-${cl.id}`} value={`client:${cl.id}`}>{cl.name}</SelectItem>
                    ))}
                  </>
                )}
                {mockContacts.length > 0 && (
                  <>
                    <SelectItem value="__contacts_header" disabled className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Contactos</SelectItem>
                    {mockContacts.map((ct) => (
                      <SelectItem key={`ct-${ct.id}`} value={`contact:${ct.id}`}>{ct.firstName} {ct.lastName}{ct.clientId ? ` (${mockClients.find(c => c.id === ct.clientId)?.name ?? ''})` : ''}</SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cliente Final</Label>
            <Select defaultValue={prospect?.endCustomer ?? "none"}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {mockClients.length > 0 && (
                  <>
                    <SelectItem value="__clients_header" disabled className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Clientes</SelectItem>
                    {mockClients.map((cl) => (
                      <SelectItem key={`cl-${cl.id}`} value={`client:${cl.id}`}>{cl.name}</SelectItem>
                    ))}
                  </>
                )}
                {mockContacts.length > 0 && (
                  <>
                    <SelectItem value="__contacts_header" disabled className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Contactos</SelectItem>
                    {mockContacts.map((ct) => (
                      <SelectItem key={`ct-${ct.id}`} value={`contact:${ct.id}`}>{ct.firstName} {ct.lastName}{ct.clientId ? ` (${mockClients.find(c => c.id === ct.clientId)?.name ?? ''})` : ''}</SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
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

        {/* Cotizaciones vinculadas */}
        {isEdit && (() => {
          const linked = mockQuotations.filter((q) => q.prospectId === prospect.id);
          if (linked.length === 0) return null;
          return (
            <div className="mt-4 border rounded-lg">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Cotizaciones Vinculadas</span>
                <span className="text-xs text-muted-foreground">({linked.length})</span>
              </div>
              <div className="divide-y">
                {linked.map((q) => {
                  const sCfg = QUOTATION_STATUSES.find((s) => s.key === q.status);
                  return (
                    <div key={q.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{q.code}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-primary-foreground ${sCfg?.color ?? "bg-muted"}`}>
                            {sCfg?.label ?? q.status}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate mt-0.5">{q.subject}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className="text-sm font-semibold text-primary">${q.totalUSD.toLocaleString()}</span>
                        <Link to={`/oferta/${q.id}`} target="_blank" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-2">
            {isEdit && (
              <Button variant="outline" onClick={handleGenerateQuotation} className="text-primary border-primary/30 hover:bg-primary/5">
                <Plus className="h-4 w-4 mr-1" /> Generar Cotización
              </Button>
            )}
            {isEdit && onDelete && (
              <Button
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={() => {
                  if (confirm(`¿Eliminar la oportunidad "${prospect.projectName}"? Esta acción no se puede deshacer.`)) {
                    onDelete(prospect.id);
                    onOpenChange(false);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Eliminar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => onOpenChange(false)}>
              {isEdit ? "Guardar Cambios" : "Crear Oportunidad"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProspectDialog;
