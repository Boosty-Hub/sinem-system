import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Crown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PIPELINE_STAGES, QUOTATION_STATUSES, type Prospect, type Product, type PipelineStage, type Client, type Contact, type Quotation } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { dbToClient, dbToContact } from "@/lib/supabaseMappers";
import { usePartners } from "@/hooks/usePartners";
import { useBusinessUnits } from "@/hooks/useBusinessUnits";
import { FileText, ExternalLink, Plus, Trash2, Lock, History, ChevronDown, ChevronUp, X, Search } from "lucide-react";
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
  const [appUsers, setAppUsers] = useState<{ id: string; name: string; avatarUrl: string }[]>([]);
  const { partners } = usePartners();
  const { businessUnits } = useBusinessUnits();
  const [linkedQuotations, setLinkedQuotations] = useState<any[]>([]);

  // Fetch clients & contacts from Supabase
  useEffect(() => {
    if (!open) return;
    const fetch = async () => {
      const [{ data: dbClients }, { data: dbContacts }, { data: dbUsers }] = await Promise.all([
        supabase.from("clients").select("*").order("name"),
        supabase.from("contacts").select("*").order("first_name"),
        supabase.from("app_users").select("id, name, avatar_url").eq("status", "activo").order("name"),
      ]);
      if (dbClients) setClients(dbClients.map(dbToClient));
      if (dbContacts) setContacts(dbContacts.map(dbToContact));
      if (dbUsers) setAppUsers(dbUsers.map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatar_url })));
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
  const [endCustomer, setEndCustomer] = useState("none");
  const [proveedor, setProveedor] = useState("Siemens");
  const [bu, setBu] = useState("");
  const [product, setProduct] = useState("");
  const [status, setStatus] = useState("prospecto");
  const [scope, setScope] = useState("");
  const [costUSD, setCostUSD] = useState(0);
  const [priceUSD, setPriceUSD] = useState(0);
  const [costUSDText, setCostUSDText] = useState("");
  const [priceUSDText, setPriceUSDText] = useState("");
  const [go, setGo] = useState(0);
  const [get_, setGet] = useState(0);
  const [estimatedOE, setEstimatedOE] = useState("");
  const [comments, setComments] = useState("");
  const [quotationHistoryOpen, setQuotationHistoryOpen] = useState<string | null>(null);
  const [expandedSnapVersion, setExpandedSnapVersion] = useState<number | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [assignedTo, setAssignedTo] = useState("none");
  const [revenue, setRevenue] = useState("");
  const [revenueManuallyEdited, setRevenueManuallyEdited] = useState(false);
  const initialValuesRef = useRef<string>("");

  // ── Multi-client direct ──
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [primaryClientId, setPrimaryClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

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

  // Load prospect_clients for this prospect
  useEffect(() => {
    if (!open) return;
    if (!prospect) {
      setSelectedClientIds([]);
      setPrimaryClientId(null);
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from("prospect_clients" as any)
        .select("client_id, is_primary")
        .eq("prospect_id", prospect.id);
      if (data && (data as any[]).length > 0) {
        setSelectedClientIds((data as any[]).map((r: any) => r.client_id));
        const primary = (data as any[]).find((r: any) => r.is_primary);
        setPrimaryClientId(primary?.client_id ?? (data as any[])[0]?.client_id ?? null);
      } else if (prospect.clientId) {
        // Fallback: use legacy single client_id
        setSelectedClientIds([prospect.clientId]);
        setPrimaryClientId(prospect.clientId);
      } else {
        setSelectedClientIds([]);
        setPrimaryClientId(null);
      }
    };
    load();
  }, [open, prospect]);

  useEffect(() => {
    if (open) {
      setCode(prospect?.code ?? "");
      setCodeManuallyEdited(!!prospect?.code);
      setProjectName(prospect?.projectName ?? "");
      setEndCustomer((() => {
        if (!prospect?.endCustomer || prospect.endCustomer === "none" || prospect.endCustomer === "") return "none";
        const cl = clients.find((c) => c.name === prospect.endCustomer);
        if (cl) return `client:${cl.id}`;
        const ct = contacts.find((c) => `${c.firstName} ${c.lastName}` === prospect.endCustomer);
        if (ct) return `contact:${ct.id}`;
        return "none";
      })());
      setProveedor(prospect?.proveedor ?? "Siemens");
      setBu(prospect?.bu ?? "");
      setProduct(prospect?.product ?? "");
      setStatus(prospect?.status ?? "prospecto");
      setScope(prospect?.scope ?? "");
      const costVal = prospect?.costUSD ?? 0;
      const priceVal = prospect?.priceUSD ?? 0;
      setCostUSD(costVal);
      setPriceUSD(priceVal);
      setCostUSDText(costVal > 0 ? costVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
      setPriceUSDText(priceVal > 0 ? priceVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
      setGo(prospect?.go ?? 0);
      setGet(prospect?.get ?? 0);
      setEstimatedOE(prospect?.estimatedOE ?? "");
      setComments(prospect?.comments ?? "");
      setQuotationHistoryOpen(null);
      setExpandedSnapVersion(null);
      setAssignedTo(prospect?.assignedTo ?? "none");
      setRevenue(prospect?.revenue ?? "");
      setRevenueManuallyEdited(!!prospect?.revenue);
      setShowUnsavedWarning(false);
      setClientSearch("");
      setTimeout(() => { initialValuesRef.current = ""; }, 0);
    }
  }, [open, prospect]);

  // Re-resolve endCustomer once clients/contacts finish loading
  useEffect(() => {
    if (!open || !prospect?.endCustomer || prospect.endCustomer === "" || clients.length === 0) return;
    const val = prospect.endCustomer;
    const cl = clients.find((c) => c.name === val);
    if (cl) { setEndCustomer(`client:${cl.id}`); return; }
    const ct = contacts.find((c) => `${c.firstName} ${c.lastName}` === val);
    if (ct) { setEndCustomer(`contact:${ct.id}`); return; }
  }, [clients, contacts]);

  // Capture initial snapshot once fields are set
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      initialValuesRef.current = JSON.stringify({
        code, projectName, selectedClientIds, primaryClientId, endCustomer, proveedor, bu, product, status, scope, costUSD, priceUSD, go, get_, estimatedOE, comments, assignedTo,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [open, prospect?.id]);

  const getCurrentValues = useCallback(() => JSON.stringify({
    code, projectName, selectedClientIds, primaryClientId, endCustomer, proveedor, bu, product, status, scope, costUSD, priceUSD, go, get_, estimatedOE, comments, assignedTo,
  }), [code, projectName, selectedClientIds, primaryClientId, endCustomer, proveedor, bu, product, status, scope, costUSD, priceUSD, go, get_, estimatedOE, comments, assignedTo]);

  const isDirty = useMemo(() => {
    if (!initialValuesRef.current || !isEdit) return false;
    return getCurrentValues() !== initialValuesRef.current;
  }, [getCurrentValues, isEdit]);

  const handleClose = (openState: boolean) => {
    if (!openState && isDirty && !showUnsavedWarning) {
      setShowUnsavedWarning(true);
      return;
    }
    setShowUnsavedWarning(false);
    onOpenChange(openState);
  };

  // Auto-generate code when BU or primary client changes
  const primaryClient = clients.find((c) => c.id === primaryClientId);

  useEffect(() => {
    if (!open || codeManuallyEdited) return;
    const clientName = primaryClient?.name ?? "";
    if (bu && clientName) {
      generateCode(bu, clientName).then(setCode);
    }
  }, [bu, primaryClientId, open, codeManuallyEdited, clients]);

  const probability = Math.round((go * get_) / 100 * 100) / 100;
  const weighted = Math.round(priceUSD * probability / 100 * 100) / 100;
  const marginPercent = priceUSD > 0 ? Math.round((1 - costUSD / priceUSD) * 10000) / 100 : 0;
  const marginUSD = Math.round(weighted * marginPercent / 100 * 100) / 100;

  useEffect(() => {
    if (revenueManuallyEdited) return;
    if (!estimatedOE || linkedQuotations.length === 0) { setRevenue(""); return; }
    const weeks = linkedQuotations[0].delivery_weeks_max ?? 0;
    setRevenue(addWeeksToDate(estimatedOE, weeks));
  }, [estimatedOE, linkedQuotations, revenueManuallyEdited]);

  const handleGenerateQuotation = () => {
    if (!prospect) return;
    const params = new URLSearchParams();
    params.set("prospectId", prospect.id);
    const cId = primaryClientId ?? prospect.clientId;
    if (cId) params.set("clientId", cId);
    if (prospect.contactId) params.set("contactId", prospect.contactId);
    params.set("subject", projectName || prospect.projectName);
    const primaryCl = clients.find((c) => c.id === cId);
    params.set("customer", primaryCl?.name ?? prospect.directCustomer);
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

  // Save prospect_clients junction
  const saveProspectClients = async (prospectId: string) => {
    // Delete existing
    await supabase.from("prospect_clients" as any).delete().eq("prospect_id", prospectId);
    // Insert new
    if (selectedClientIds.length > 0) {
      const rows = selectedClientIds.map((cid) => ({
        prospect_id: prospectId,
        client_id: cid,
        is_primary: cid === primaryClientId,
      }));
      await supabase.from("prospect_clients" as any).insert(rows);
    }
  };

  const handleSave = async () => {
    if (!projectName.trim()) return;
    const directCustomerName = primaryClient?.name ?? "";
    const saved: Prospect = {
      id: prospect?.id ?? crypto.randomUUID(),
      code,
      cotorta: prospect?.cotorta ?? 0,
      projectName: projectName.trim(),
      clientId: primaryClientId ?? undefined,
      contactId: prospect?.contactId,
      directCustomer: directCustomerName,
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
      createdBy: prospect?.createdBy,
      assignedTo: assignedTo === "none" ? undefined : assignedTo,
    };
    onSave?.(saved);
    // Save junction table after prospect is saved
    await saveProspectClients(saved.id);
    onOpenChange(false);
  };

  const handleSaveAndClose = () => {
    handleSave();
    setShowUnsavedWarning(false);
  };

  // Client multi-select helpers
  const toggleClient = (id: string) => {
    setSelectedClientIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        if (primaryClientId === id) setPrimaryClientId(next[0] ?? null);
        return next;
      }
      const next = [...prev, id];
      if (!primaryClientId) setPrimaryClientId(id);
      return next;
    });
  };

  const filteredClients = clients.filter((c) => {
    if (!clientSearch.trim()) return true;
    return c.name.toLowerCase().includes(clientSearch.toLowerCase());
  });

  const unselectedClients = filteredClients.filter((c) => !selectedClientIds.includes(c.id));
  const selectedClients = clients.filter((c) => selectedClientIds.includes(c.id));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Oportunidad" : "Nueva Oportunidad"}</DialogTitle>
        </DialogHeader>

        {showUnsavedWarning && (
          <Alert variant="destructive" className="mt-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 !text-amber-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">Tienes cambios sin guardar. ¿Qué deseas hacer?</span>
              <div className="flex items-center gap-2 ml-4">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowUnsavedWarning(false); onOpenChange(false); }}>
                  Descartar
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={handleSaveAndClose}>
                  Guardar
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

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

          {/* ── Multi-client direct ── */}
          <div className="col-span-2 space-y-2">
            <Label>Cliente Directo</Label>

            {/* Selected clients as badges */}
            {selectedClients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedClients.map((c) => {
                  const isPrimary = primaryClientId === c.id;
                  return (
                    <Badge
                      key={c.id}
                      variant={isPrimary ? "default" : "secondary"}
                      className="flex items-center gap-1.5 py-1 px-2 cursor-pointer"
                    >
                      <button
                        type="button"
                        onClick={() => setPrimaryClientId(c.id)}
                        title={isPrimary ? "Cliente principal" : "Marcar como principal"}
                        className="hover:scale-110 transition-transform"
                      >
                        <Crown className={`h-3.5 w-3.5 ${isPrimary ? "text-yellow-300 fill-yellow-300" : "text-muted-foreground/50"}`} />
                      </button>
                      <span className="text-xs">{c.name}</span>
                      <button type="button" onClick={() => toggleClient(c.id)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Search & add */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente para agregar..."
                value={clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setClientDropdownOpen(true); }}
                onFocus={() => setClientDropdownOpen(true)}
                onBlur={() => setTimeout(() => setClientDropdownOpen(false), 150)}
                className="text-sm pl-8 h-8"
              />
            </div>

            {clientDropdownOpen && clientSearch.trim() && (
              unselectedClients.length > 0 ? (
                <div className="max-h-[120px] overflow-y-auto border rounded-md divide-y">
                  {unselectedClients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { toggleClient(c.id); setClientSearch(""); setClientDropdownOpen(false); }}
                      className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm flex justify-between items-center"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground">{c.industry}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">Sin resultados</p>
              )
            )}
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
                {businessUnits.map((u) => (
                  <SelectItem key={u.key} value={u.key}>{u.label}</SelectItem>
                ))}
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
          <div>
            <Label>Responsable</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger><SelectValue placeholder="Seleccionar responsable" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {appUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    <div className="flex items-center gap-2">
                      <UserAvatar userId={u.id} size="xs" />
                      {u.name}
                    </div>
                  </SelectItem>
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
            <Input
              type="text"
              inputMode="decimal"
              value={costUSDText}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.,]/g, "");
                setCostUSDText(val);
                const num = parseFloat(val.replace(/,/g, ""));
                setCostUSD(isNaN(num) ? 0 : num);
              }}
              onBlur={() => {
                const formatted = costUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                setCostUSDText(formatted);
              }}
              onFocus={() => {
                if (costUSD === 0) setCostUSDText("");
              }}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label>Precio USD</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={priceUSDText}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.,]/g, "");
                setPriceUSDText(val);
                const num = parseFloat(val.replace(/,/g, ""));
                setPriceUSD(isNaN(num) ? 0 : num);
              }}
              onBlur={() => {
                const formatted = priceUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                setPriceUSDText(formatted);
              }}
              onFocus={() => {
                if (priceUSD === 0) setPriceUSDText("");
              }}
              placeholder="0.00"
            />
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
            <Input type="text" value={`$${weighted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} readOnly disabled className="bg-muted/50 font-medium" />
          </div>
          <div>
            <Label className="flex items-center gap-1.5">Margen % <Lock className="h-3 w-3 text-muted-foreground" /></Label>
            <Input type="text" value={`${marginPercent}%`} readOnly disabled className="bg-muted/50 font-medium" />
          </div>
          <div>
            <Label className="flex items-center gap-1.5">Margen USD <Lock className="h-3 w-3 text-muted-foreground" /></Label>
            <Input type="text" value={`$${marginUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} readOnly disabled className="bg-muted/50 font-medium" />
          </div>

          <div>
            <Label>Estimated OE</Label>
            <Input type="date" value={estimatedOE} onChange={(e) => setEstimatedOE(e.target.value)} />
          </div>
          <div>
            <Label className="flex items-center gap-1.5">Revenue {!revenueManuallyEdited && <Lock className="h-3 w-3 text-muted-foreground" />}</Label>
            <Input type="date" value={revenue} onChange={(e) => { setRevenue(e.target.value); setRevenueManuallyEdited(true); }} className={revenueManuallyEdited ? "" : "bg-muted/50"} />
            {!revenue && !revenueManuallyEdited && (
              <p className="text-[10px] text-muted-foreground mt-1">Se calcula automáticamente o editar manualmente</p>
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
                        <span className="text-sm font-semibold">${Number(q.total_usd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
            <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
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
