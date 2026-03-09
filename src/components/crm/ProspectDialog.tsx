import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PIPELINE_STAGES, QUOTATION_STATUSES, DEFAULT_PARTNERS, type Prospect, type Product, type PipelineStage, type Client, type Contact, type Quotation } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { dbToClient, dbToContact } from "@/lib/supabaseMappers";
import { useLocalStorage } from "@/hooks/useLocalStorage";
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
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [partners] = useLocalStorage<string[]>("sinem:partners", DEFAULT_PARTNERS);
  const [linkedQuotations, setLinkedQuotations] = useState<any[]>([]);

  // Fetch clients & contacts from Supabase
  useEffect(() => {
    if (!open) return;
    const fetch = async () => {
      const [{ data: dbClients }, { data: dbContacts }] = await Promise.all([
        supabase.from("clients").select("*").order("name"),
        supabase.from("contacts").select("*").order("first_name"),
      ]);
      if (dbClients) setClients(dbClients.map(dbToClient));
      if (dbContacts) setContacts(dbContacts.map(dbToContact));
    };
    fetch();
  }, [open]);

  // Fetch linked quotations
  useEffect(() => {
    if (!open || !prospect) { setLinkedQuotations([]); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from("quotations")
        .select("id, code, subject, total_usd, status, delivery_weeks_max, version, created_at")
        .eq("prospect_id", prospect.id)
        .order("created_at", { ascending: false });
      setLinkedQuotations(data ?? []);
    };
    fetch();
  }, [open, prospect]);

  // ── Controlled fields ──
  const [code, setCode] = useState("");
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
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

  /** Generate code: SINEM-{BU}-{Client}-{consecutive} */
  const generateCode = async (buVal: string, clientName: string) => {
    const buPart = buVal || "XX";
    const clientPart = clientName
      ? clientName.replace(/\s+/g, "").substring(0, 15)
      : "SinCliente";
    const prefix = `SINEM-${buPart}-${clientPart}-`;

    const { data: existing } = await supabase
      .from("prospects")
      .select("code")
      .ilike("code", `${prefix}%`);

    const nums = (existing ?? [])
      .map((p) => {
        const match = p.code.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)`));
        return match ? parseInt(match[1], 10) : NaN;
      })
      .filter((n) => !isNaN(n));

    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `${prefix}${next}`;
  };

  const nameToSelectValue = (name: string | undefined, cId?: string, ctId?: string): string => {
    if (!name || name === "none" || name === "") return "none";
    if (cId) return `client:${cId}`;
    if (ctId) return `contact:${ctId}`;
    const cl = clients.find((c) => c.name === name);
    if (cl) return `client:${cl.id}`;
    const ct = contacts.find((c) => `${c.firstName} ${c.lastName}` === name);
    if (ct) return `contact:${ct.id}`;
    return "none";
  };

  useEffect(() => {
    if (open) {
      setCode(prospect?.code ?? "");
      setCodeManuallyEdited(!!prospect?.code);
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

  // Auto-generate code when BU or client changes (only if not manually edited)
  useEffect(() => {
    if (!open || codeManuallyEdited) return;
    const clientName = resolveCustomerName(directCustomer);
    if (bu && clientName) {
      generateCode(bu, clientName).then(setCode);
    }
  }, [bu, directCustomer, open, codeManuallyEdited]);

  const probability = Math.round((go * get_) / 100);
  const weighted = Math.round(priceUSD * probability / 100);
  const marginPercent = priceUSD > 0 ? Math.round((1 - costUSD / priceUSD) * 10000) / 100 : 0;
  const marginUSD = Math.round(weighted * marginPercent / 100);

  const revenue = useMemo(() => {
    if (!estimatedOE) return "";
    if (linkedQuotations.length === 0) return "";
    const weeks = linkedQuotations[0].delivery_weeks_max ?? 0;
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
      code,
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
            <Label>Código</Label>
            <Input value={code} onChange={(e) => { setCode(e.target.value); setCodeManuallyEdited(true); }} className="font-mono" placeholder="SINEM-BU-Cliente-1" />
            <p className="text-[10px] text-muted-foreground mt-0.5">Formato: SINEM-BU-Cliente-Consecutivo (se genera automáticamente)</p>
          </div>
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
                <SelectItem value="TR">TR - Trench</SelectItem>
                <SelectItem value="IN">IN - Innomotics</SelectItem>
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

          <div>
            <Label>Costo USD</Label>
            <Input type="number" value={costUSD || ""} onChange={(e) => setCostUSD(Number(e.target.value) || 0)} placeholder="0" />
          </div>
          <div>
            <Label>Precio USD</Label>
            <Input type="number" value={priceUSD || ""} onChange={(e) => setPriceUSD(Number(e.target.value) || 0)} placeholder="0" />
          </div>
          <div>
            <Label>Go %</Label>
            <Input type="number" value={go || ""} onChange={(e) => setGo(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} placeholder="0" min={0} max={100} />
          </div>
          <div>
            <Label>Get %</Label>
            <Input type="number" value={get_ || ""} onChange={(e) => setGet(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} placeholder="0" min={0} max={100} />
          </div>

          <div>
            <Label className="flex items-center gap-1.5">Probabilidad % <Lock className="h-3 w-3 text-muted-foreground" /></Label>
            <Input type="text" value={`${probability}%`} readOnly disabled className="bg-muted/50 font-medium" />
          </div>
          <div>
            <Label className="flex items-center gap-1.5">Peso USD <Lock className="h-3 w-3 text-muted-foreground" /></Label>
            <Input type="text" value={`$${weighted.toLocaleString()}`} readOnly disabled className="bg-muted/50 font-medium" />
          </div>
          <div>
            <Label className="flex items-center gap-1.5">Margen % <Lock className="h-3 w-3 text-muted-foreground" /></Label>
            <Input type="text" value={`${marginPercent}%`} readOnly disabled className="bg-muted/50 font-medium" />
          </div>
          <div>
            <Label className="flex items-center gap-1.5">Margen USD <Lock className="h-3 w-3 text-muted-foreground" /></Label>
            <Input type="text" value={`$${marginUSD.toLocaleString()}`} readOnly disabled className="bg-muted/50 font-medium" />
          </div>

          <div>
            <Label>Estimated OE</Label>
            <Input type="date" value={estimatedOE} onChange={(e) => setEstimatedOE(e.target.value)} />
          </div>
          <div>
            <Label className="flex items-center gap-1.5">Revenue <Lock className="h-3 w-3 text-muted-foreground" /></Label>
            <Input type="date" value={revenue} readOnly disabled className="bg-muted/50 font-medium" />
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
        {isEdit && linkedQuotations.length > 0 && (
          <div className="mt-4 border rounded-lg">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Cotización Vinculada</span>
            </div>
            <div className="divide-y">
              {linkedQuotations.map((q: any) => {
                const statusCfg = QUOTATION_STATUSES.find((s) => s.key === q.status);
                return (
                  <div key={q.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{q.subject || q.code}</p>
                        <p className="text-xs text-muted-foreground">{q.code} · v{q.version}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full text-primary-foreground ${statusCfg?.color ?? "bg-muted"}`}>
                          {statusCfg?.label ?? q.status}
                        </span>
                        <span className="text-sm font-semibold">${Number(q.total_usd).toLocaleString()}</span>
                        <Link to={`/oferta/${q.id}`} target="_blank">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-2">
            {isEdit && onDelete && (
              <Button variant="destructive" size="sm" onClick={() => { onDelete(prospect.id); onOpenChange(false); }}>
                <Trash2 className="h-4 w-4 mr-1" /> Eliminar
              </Button>
            )}
            {isEdit && (
              <Button variant="outline" size="sm" onClick={handleGenerateQuotation}>
                <FileText className="h-4 w-4 mr-1" /> Generar Cotización
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
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
