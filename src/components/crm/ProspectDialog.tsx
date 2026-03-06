import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PIPELINE_STAGES, QUOTATION_STATUSES, DEFAULT_PARTNERS, type Prospect, type Product, type PipelineStage } from "@/lib/types";
import { mockClients, mockContacts, mockQuotations } from "@/lib/mockData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Client, Contact, Quotation } from "@/lib/types";
import { FileText, ExternalLink, Plus, Trash2, Lock, History, ChevronDown, ChevronUp } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { Link, useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: Prospect | null;
  onSave?: (prospect: Prospect) => void;
  onDelete?: (id: string) => void;
  products: Product[];
  stages?: PipelineStage[];
  onOpenProducts?: () => void;
}

/** Add weeks to a date string (YYYY-MM-DD) and return YYYY-MM-DD */
const addWeeksToDate = (dateStr: string, weeks: number): string => {
  if (!dateStr || weeks <= 0) return "";
  const date = new Date(dateStr + "T00:00:00");
  if (isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + weeks * 7);
  return date.toISOString().split("T")[0];
};

const ProspectDialog = ({ open, onOpenChange, prospect, onSave, onDelete, products, stages: stagesProp, onOpenProducts }: Props) => {
  const stageList = stagesProp ?? PIPELINE_STAGES;
  const isEdit = !!prospect;
  const navigate = useNavigate();
  const [clients] = useLocalStorage<Client[]>("sinem:clients", mockClients);
  const [contacts] = useLocalStorage<Contact[]>("sinem:contacts", mockContacts);
  const [partners] = useLocalStorage<string[]>("sinem:partners", DEFAULT_PARTNERS);
  const [allQuotations] = useLocalStorage<Quotation[]>("sinem:quotations", mockQuotations);

  // ── Controlled fields ──
  const [projectName, setProjectName] = useState("");
  const [directCustomer, setDirectCustomer] = useState("none");
  const [endCustomer, setEndCustomer] = useState("none");
  const [proveedor, setProveedor] = useState("Siemens");
  const [bu, setBu] = useState("");
  const [product, setProduct] = useState("");
  const [status, setStatus] = useState("prospecto");
  const [scope, setScope] = useState("");
  const [costUSD, setCostUSD] = useState(0);
  const [priceUSD, setPriceUSD] = useState(0);
  const [go, setGo] = useState(0);
  const [get_, setGet] = useState(0);
  const [estimatedOE, setEstimatedOE] = useState("");
  const [comments, setComments] = useState("");
  const [quotationHistoryOpen, setQuotationHistoryOpen] = useState<string | null>(null);
  const [expandedSnapVersion, setExpandedSnapVersion] = useState<number | null>(null);

  // Reverse-map a stored name + optional IDs back to the select value format
  const nameToSelectValue = (name: string | undefined, cId?: string, ctId?: string): string => {
    if (!name || name === "none" || name === "") return "none";
    if (cId) return `client:${cId}`;
    if (ctId) return `contact:${ctId}`;
    // Try matching by name to clients then contacts
    const cl = clients.find((c) => c.name === name);
    if (cl) return `client:${cl.id}`;
    const ct = contacts.find((c) => `${c.firstName} ${c.lastName}` === name);
    if (ct) return `contact:${ct.id}`;
    return "none";
  };

  // Reset form when prospect changes or dialog opens
  useEffect(() => {
    if (open) {
      setProjectName(prospect?.projectName ?? "");
      setDirectCustomer(nameToSelectValue(prospect?.directCustomer, prospect?.clientId, prospect?.contactId));
      setEndCustomer(nameToSelectValue(prospect?.endCustomer));
      setProveedor(prospect?.proveedor ?? "Siemens");
      setBu(prospect?.bu ?? "");
      setProduct(prospect?.product ?? "");
      setStatus(prospect?.status ?? "prospecto");
      setScope(prospect?.scope ?? "");
      setCostUSD(prospect?.costUSD ?? 0);
      setPriceUSD(prospect?.priceUSD ?? 0);
      setGo(prospect?.go ?? 0);
      setGet(prospect?.get ?? 0);
      setEstimatedOE(prospect?.estimatedOE ?? "");
      setComments(prospect?.comments ?? "");
      setQuotationHistoryOpen(null);
      setExpandedSnapVersion(null);
    }
  }, [open, prospect]);

  // ── Linked quotations ──
  const linkedQuotations = useMemo(
    () => (prospect ? allQuotations.filter((q) => q.prospectId === prospect.id) : []),
    [prospect, allQuotations]
  );

  // ── Calculated fields ──
  const probability = Math.round((go * get_) / 100);
  const weighted = Math.round(priceUSD * probability / 100);
  const marginPercent = priceUSD > 0 ? Math.round((1 - costUSD / priceUSD) * 10000) / 100 : 0;
  const marginUSD = Math.round(weighted * marginPercent / 100);

  // Revenue: estimatedOE + deliveryWeeksMax from the linked quotation
  const revenue = useMemo(() => {
    if (!estimatedOE) return "";
    if (linkedQuotations.length === 0) return "";
    const weeks = linkedQuotations[0].deliveryWeeksMax;
    return addWeeksToDate(estimatedOE, weeks);
  }, [estimatedOE, linkedQuotations]);

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

  const resolveCustomerName = (val: string): string => {
    if (val === "none") return "";
    if (val.startsWith("client:")) {
      const cl = clients.find((c) => c.id === val.replace("client:", ""));
      return cl?.name ?? "";
    }
    if (val.startsWith("contact:")) {
      const ct = contacts.find((c) => c.id === val.replace("contact:", ""));
      return ct ? `${ct.firstName} ${ct.lastName}` : "";
    }
    return val;
  };

  const resolveIds = (val: string): { clientId?: string; contactId?: string } => {
    if (val.startsWith("client:")) return { clientId: val.replace("client:", "") };
    if (val.startsWith("contact:")) return { contactId: val.replace("contact:", "") };
    return {};
  };

  const handleSave = () => {
    if (!projectName.trim()) return;
    const directIds = resolveIds(directCustomer);
    const saved: Prospect = {
      id: prospect?.id ?? crypto.randomUUID(),
      cotorta: prospect?.cotorta ?? 0,
      projectName: projectName.trim(),
      clientId: directIds.clientId ?? prospect?.clientId,
      contactId: directIds.contactId ?? prospect?.contactId,
      directCustomer: resolveCustomerName(directCustomer),
      endCustomer: resolveCustomerName(endCustomer),
      proveedor: proveedor.trim(),
      bu,
      product,
      scope: scope.trim(),
      costUSD,
      priceUSD,
      go,
      get: get_,
      probability,
      weighted,
      marginPercent,
      marginUSD,
      estimatedOE,
      revenue,
      comments: comments.trim(),
      status,
    };
    onSave?.(saved);
    onOpenChange(false);
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
            <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Ej: Transformadores ABB" />
          </div>
          <div>
            <Label>Cliente Directo</Label>
            <Select value={directCustomer} onValueChange={setDirectCustomer}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {clients.length > 0 && (
                  <>
                    <SelectItem value="__clients_header" disabled className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Clientes</SelectItem>
                    {clients.map((cl) => (
                      <SelectItem key={`cl-${cl.id}`} value={`client:${cl.id}`}>{cl.name}</SelectItem>
                    ))}
                  </>
                )}
                {contacts.length > 0 && (
                  <>
                    <SelectItem value="__contacts_header" disabled className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Contactos</SelectItem>
                    {contacts.map((ct) => (
                      <SelectItem key={`ct-${ct.id}`} value={`contact:${ct.id}`}>{ct.firstName} {ct.lastName}{ct.clientId ? ` (${clients.find(c => c.id === ct.clientId)?.name ?? ''})` : ''}</SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cliente Final</Label>
            <Select value={endCustomer} onValueChange={setEndCustomer}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {clients.length > 0 && (
                  <>
                    <SelectItem value="__clients_header" disabled className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Clientes</SelectItem>
                    {clients.map((cl) => (
                      <SelectItem key={`cl-${cl.id}`} value={`client:${cl.id}`}>{cl.name}</SelectItem>
                    ))}
                  </>
                )}
                {contacts.length > 0 && (
                  <>
                    <SelectItem value="__contacts_header" disabled className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Contactos</SelectItem>
                    {contacts.map((ct) => (
                      <SelectItem key={`ct-${ct.id}`} value={`contact:${ct.id}`}>{ct.firstName} {ct.lastName}{ct.clientId ? ` (${clients.find(c => c.id === ct.clientId)?.name ?? ''})` : ''}</SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Proveedor</Label>
            <Select value={proveedor} onValueChange={setProveedor}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {partners.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unidad de Negocio</Label>
            <Select value={bu} onValueChange={setBu}>
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
            <Select value={product} onValueChange={setProduct}>
              <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.name}>{p.name} <span className="text-muted-foreground text-[10px] ml-1">({p.category})</span></SelectItem>
                ))}
                {onOpenProducts && (
                  <div className="border-t border-border/60 mt-1 pt-1 px-2 pb-1">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenProducts(); }}
                      className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-primary hover:bg-primary/5 rounded transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Crear nuevo producto
                    </button>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {stageList.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Alcance</Label>
            <Textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={2} />
          </div>

          {/* ── Manual numeric fields ── */}
          <div>
            <Label>Costo USD</Label>
            <Input
              type="number"
              value={costUSD || ""}
              onChange={(e) => setCostUSD(Number(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Precio USD</Label>
            <Input
              type="number"
              value={priceUSD || ""}
              onChange={(e) => setPriceUSD(Number(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Go %</Label>
            <Input
              type="number"
              value={go || ""}
              onChange={(e) => setGo(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              placeholder="0"
              min={0}
              max={100}
            />
          </div>
          <div>
            <Label>Get %</Label>
            <Input
              type="number"
              value={get_ || ""}
              onChange={(e) => setGet(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              placeholder="0"
              min={0}
              max={100}
            />
          </div>

          {/* ── Calculated fields (read-only) ── */}
          <div>
            <Label className="flex items-center gap-1.5">Probabilidad % <Lock className="h-3 w-3 text-muted-foreground" /></Label>
            <Input
              type="text"
              value={`${probability}%`}
              readOnly
              disabled
              className="bg-muted/50 font-medium"
            />
          </div>
          <div>
            <Label className="flex items-center gap-1.5">Peso USD <Lock className="h-3 w-3 text-muted-foreground" /></Label>
            <Input
              type="text"
              value={`$${weighted.toLocaleString()}`}
              readOnly
              disabled
              className="bg-muted/50 font-medium"
            />
          </div>
          <div>
            <Label className="flex items-center gap-1.5">Margen % <Lock className="h-3 w-3 text-muted-foreground" /></Label>
            <Input
              type="text"
              value={`${marginPercent}%`}
              readOnly
              disabled
              className="bg-muted/50 font-medium"
            />
          </div>
          <div>
            <Label className="flex items-center gap-1.5">Margen USD <Lock className="h-3 w-3 text-muted-foreground" /></Label>
            <Input
              type="text"
              value={`$${marginUSD.toLocaleString()}`}
              readOnly
              disabled
              className="bg-muted/50 font-medium"
            />
          </div>

          {/* ── Date fields ── */}
          <div>
            <Label>Estimated OE</Label>
            <Input
              type="date"
              value={estimatedOE}
              onChange={(e) => setEstimatedOE(e.target.value)}
            />
          </div>
          <div>
            <Label className="flex items-center gap-1.5">Revenue <Lock className="h-3 w-3 text-muted-foreground" /></Label>
            <Input
              type="date"
              value={revenue}
              readOnly
              disabled
              className="bg-muted/50 font-medium"
            />
            {!revenue && estimatedOE && (
              <p className="text-[10px] text-muted-foreground mt-1">Se calcula al vincular una cotización</p>
            )}
          </div>

          <div className="col-span-2">
            <Label>Comentarios</Label>
            <Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} />
          </div>
        </div>

        {/* Cotizaciones vinculadas */}
        {isEdit && (() => {
          if (linkedQuotations.length === 0) return null;
          return (
            <div className="mt-4 border rounded-lg">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Cotización Vinculada</span>
              </div>
              <div className="divide-y">
                {linkedQuotations.map((q) => {
                  const sCfg = QUOTATION_STATUSES.find((s) => s.key === q.status);
                  const isHistOpen = quotationHistoryOpen === q.id;
                  return (
                    <div key={q.id}>
                      <div className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{q.code}</span>
                            <span className="text-xs font-mono text-muted-foreground">v{q.version}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-primary-foreground ${sCfg?.color ?? "bg-muted"}`}>
                              {sCfg?.label ?? q.status}
                            </span>
                          </div>
                          <p className="text-sm font-medium truncate mt-0.5">{q.subject}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Entrega: {q.deliveryWeeksMin}-{q.deliveryWeeksMax} sem. · ${q.totalUSD.toLocaleString()} USD
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {q.history.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => {
                                setQuotationHistoryOpen(isHistOpen ? null : q.id);
                                setExpandedSnapVersion(null);
                              }}
                            >
                              <History className="h-3 w-3" />
                              {q.history.length}
                              {isHistOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </Button>
                          )}
                          <span className="text-sm font-semibold text-primary">${q.totalUSD.toLocaleString()}</span>
                          <Link to={`/oferta/${q.id}`} target="_blank" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                      {/* Inline version history for this quotation */}
                      {isHistOpen && q.history.length > 0 && (
                        <div className="border-t bg-muted/5">
                          <div className="px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                            Historial de versiones
                          </div>
                          <div className="divide-y">
                            {[...q.history].reverse().map((snap) => (
                              <div key={snap.version}>
                                <button
                                  type="button"
                                  onClick={() => setExpandedSnapVersion(expandedSnapVersion === snap.version ? null : snap.version)}
                                  className="flex items-center justify-between w-full px-4 py-2 hover:bg-muted/20 transition-colors text-left"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">v{snap.version}</span>
                                    <UserAvatar userId={snap.modifiedBy} size="xs" />
                                    <span className="text-xs">{snap.subject}</span>
                                    <span className={`text-[9px] px-1 py-0.5 rounded-full text-primary-foreground ${QUOTATION_STATUSES.find((s) => s.key === snap.status)?.color ?? "bg-muted"}`}>
                                      {QUOTATION_STATUSES.find((s) => s.key === snap.status)?.label ?? snap.status}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] text-muted-foreground">{snap.savedAt}</span>
                                    <span className="text-xs font-medium">${snap.totalUSD.toLocaleString()}</span>
                                    {expandedSnapVersion === snap.version ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  </div>
                                </button>
                                {expandedSnapVersion === snap.version && (
                                  <div className="px-4 pb-3 bg-muted/10 border-t space-y-2">
                                    <div className="grid grid-cols-3 gap-2 pt-2 text-[10px]">
                                      <div><span className="text-muted-foreground">Total:</span> <strong>${snap.totalUSD.toLocaleString()}</strong></div>
                                      <div><span className="text-muted-foreground">Costo:</span> <strong>${snap.costUSD.toLocaleString()}</strong></div>
                                      <div><span className="text-muted-foreground">Margen:</span> <strong>{snap.marginPercent}%</strong></div>
                                      <div><span className="text-muted-foreground">Entrega:</span> <strong>{snap.deliveryWeeksMin}-{snap.deliveryWeeksMax} sem.</strong></div>
                                      <div><span className="text-muted-foreground">Validez:</span> <strong>{snap.validityDays} días</strong></div>
                                      <div><span className="text-muted-foreground">Pago:</span> <strong>{snap.paymentTerms || "—"}</strong></div>
                                    </div>
                                    {snap.lineItems.length > 0 && (
                                      <table className="w-full text-[10px] border rounded">
                                        <thead>
                                          <tr className="bg-muted/50 border-b">
                                            <th className="text-left py-0.5 px-1.5">Ítem</th>
                                            <th className="text-center py-0.5 px-1.5 w-8">Qty</th>
                                            <th className="text-right py-0.5 px-1.5 w-16">P.U.</th>
                                            <th className="text-right py-0.5 px-1.5 w-16">Total</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {snap.lineItems.map((li, idx) => (
                                            <tr key={idx} className="border-b last:border-0">
                                              <td className="py-0.5 px-1.5">{li.description}</td>
                                              <td className="py-0.5 px-1.5 text-center">{li.quantity}</td>
                                              <td className="py-0.5 px-1.5 text-right">${li.unitPriceUSD.toLocaleString()}</td>
                                              <td className="py-0.5 px-1.5 text-right">${li.totalUSD.toLocaleString()}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
            <Button onClick={handleSave} disabled={!projectName.trim()}>
              {isEdit ? "Guardar Cambios" : "Crear Oportunidad"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProspectDialog;
