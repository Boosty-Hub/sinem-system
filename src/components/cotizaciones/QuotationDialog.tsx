import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { QUOTATION_STATUSES, DELIVERY_TERMS, CURRENCIES, DEFAULT_PARTNERS, type Quotation, type QuotationSnapshot, type QuotationLineItem, type DeliveryTerm, type QuotationCurrency, type QuotationPartner, type GeneralSettings, type Prospect, type Client, type Contact } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { dbToProspect, dbToClient, dbToContact } from "@/lib/supabaseMappers";
import { Plus, Trash2, History, ChevronDown, ChevronUp, ShieldCheck, XCircle, CheckCircle2, Clock, Download, Upload } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import UserAvatar from "@/components/UserAvatar";
import * as XLSX from "xlsx";

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
  onSave?: (updated: Quotation) => void;
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

const DEFAULT_GENERAL_SETTINGS: GeneralSettings = { managerApprovalLimit: 300000 };

const QuotationDialog = ({ open, onOpenChange, quotation, prefill, onSave }: Props) => {
  const isEdit = !!quotation;
  const [generalSettings] = useLocalStorage<GeneralSettings>("sinem:general-settings", DEFAULT_GENERAL_SETTINGS);
  const [prospects] = useLocalStorage<Prospect[]>("sinem:crm:prospects", mockProspects);
  const [clients] = useLocalStorage<Client[]>("sinem:clients", mockClients);
  const [contacts] = useLocalStorage<Contact[]>("sinem:contacts", mockContacts);
  const [partners] = useLocalStorage<string[]>("sinem:partners", DEFAULT_PARTNERS);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<string>("none");
  const [clientData, setClientData] = useState<ClientData>(emptyClientData);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Controlled fields for save logic ──
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Quotation["status"]>("borrador");
  const [createdAt, setCreatedAt] = useState("");
  const [subject, setSubject] = useState("");
  const [costUSD, setCostUSD] = useState(0);
  const [marginPercent, setMarginPercent] = useState(0);
  const [marginUSD, setMarginUSD] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState<DeliveryTerm>("CIF");
  const [deliveryWeeksMin, setDeliveryWeeksMin] = useState(0);
  const [deliveryWeeksMax, setDeliveryWeeksMax] = useState(0);
  const [validityDays, setValidityDays] = useState(30);
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [applyItbis, setApplyItbis] = useState(true);
  const [itbisPercent, setItbisPercent] = useState(18);
  const [currency, setCurrency] = useState<QuotationCurrency>("USD");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [partner, setPartner] = useState<QuotationPartner>("Siemens");
  const [selectedClientId, setSelectedClientId] = useState("none");
  const [selectedContactId, setSelectedContactId] = useState("none");

  useEffect(() => {
    if (open) {
      setLineItems(quotation?.lineItems ?? []);
      setSelectedProspectId(quotation?.prospectId ?? prefill?.prospectId ?? "none");
      setSelectedClientId(quotation?.clientId ?? prefill?.clientId ?? "none");
      setSelectedContactId(quotation?.contactId ?? prefill?.contactId ?? "none");
      setClientData(quotation?.client ?? emptyClientData);
      setHistoryOpen(false);
      setExpandedVersion(null);
      if (quotation) {
        setCode(quotation.code);
      } else {
        // Auto-generate next code: COT-YYYY-NNN
        const year = new Date().getFullYear();
        const prefix = `COT-${year}-`;
        try {
          const stored = JSON.parse(localStorage.getItem("sinem:quotations") || "[]") as { code?: string }[];
          const nums = stored
            .map((q) => q.code ?? "")
            .filter((c) => c.startsWith(prefix))
            .map((c) => parseInt(c.replace(prefix, ""), 10))
            .filter((n) => !isNaN(n));
          const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
          setCode(`${prefix}${String(next).padStart(3, "0")}`);
        } catch {
          setCode(`${prefix}001`);
        }
      }
      setStatus(quotation?.status ?? "borrador");
      setCreatedAt(quotation?.createdAt ?? "");
      setSubject(quotation?.subject ?? prefill?.subject ?? "");
      setCostUSD(quotation?.costUSD ?? 0);
      setMarginPercent(quotation?.marginPercent ?? 0);
      setMarginUSD(quotation?.marginUSD ?? 0);
      setPaymentTerms(quotation?.paymentTerms ?? "");
      setDeliveryTerms(quotation?.deliveryTerms ?? "CIF");
      setDeliveryWeeksMin(quotation?.deliveryWeeksMin ?? 0);
      setDeliveryWeeksMax(quotation?.deliveryWeeksMax ?? 0);
      setValidityDays(quotation?.validityDays ?? 30);
      setDeliveryLocation(quotation?.deliveryLocation ?? "");
      setNotes(quotation?.notes ?? "");
      setApplyItbis(quotation?.applyItbis ?? true);
      setItbisPercent(quotation?.itbisPercent ?? 18);
      setCurrency(quotation?.currency ?? "USD");
      setExchangeRate(quotation?.exchangeRate ?? 1);
      setPartner(quotation?.partner ?? "Siemens");

      // Auto-fill from prefill prospect
      if (!quotation && prefill?.prospectId) {
        fillFromProspect(prefill.prospectId);
      }
    }
  }, [open, quotation, prefill, prospects]);

  const fillFromProspect = (prospectId: string) => {
    const prospect = prospects.find((p) => p.id === prospectId);
    if (!prospect) return;

    // Try to resolve client data from directCustomer field or clientId
    let data: ClientData = { ...emptyClientData };

    // If prospect has a linked client, use that
    let resolvedClientId = "none";
    if (prospect.clientId) {
      const client = clients.find((c) => c.id === prospect.clientId);
      if (client) {
        resolvedClientId = client.id;
        data.company = client.name;
        data.address = client.address;
        data.phone = client.contactPhone;
        data.email = client.contactEmail;
        data.attention = client.contactName;
      }
    } else if (prospect.directCustomer) {
      // Try matching directCustomer string to a client name
      const client = clients.find((c) => c.name === prospect.directCustomer);
      if (client) {
        resolvedClientId = client.id;
        data.company = client.name;
        data.address = client.address;
        data.phone = client.contactPhone;
        data.email = client.contactEmail;
        data.attention = client.contactName;
      } else {
        data.company = prospect.directCustomer;
      }
    }
    setSelectedClientId(resolvedClientId);

    // If prospect has a linked contact, use for attention/phone/email
    let resolvedContactId = "none";
    if (prospect.contactId) {
      const contact = contacts.find((ct) => ct.id === prospect.contactId);
      if (contact) {
        resolvedContactId = contact.id;
        data.attention = `${contact.firstName} ${contact.lastName}`;
        data.phone = contact.phone;
        data.email = contact.email;
      }
    }
    setSelectedContactId(resolvedContactId);

    setClientData(data);
  };

  const handleProspectChange = (value: string) => {
    setSelectedProspectId(value);
    if (value !== "none") {
      fillFromProspect(value);
    } else {
      setSelectedClientId("none");
      setSelectedContactId("none");
    }
  };

  const handleClientChange = (value: string) => {
    setSelectedClientId(value);
    if (value !== "none") {
      const client = clients.find((c) => c.id === value);
      if (client) {
        setClientData((d) => ({
          ...d,
          company: client.name,
          address: client.address,
          phone: client.contactPhone,
          email: client.contactEmail,
          attention: client.contactName,
        }));
      }
    }
  };

  const handleContactChange = (value: string) => {
    setSelectedContactId(value);
    if (value !== "none") {
      const contact = contacts.find((ct) => ct.id === value);
      if (contact) {
        setClientData((d) => ({
          ...d,
          attention: `${contact.firstName} ${contact.lastName}`,
          phone: contact.phone,
          email: contact.email,
        }));
      }
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
  const itbisUSD = applyItbis ? Math.round(subtotal * itbisPercent / 100) : 0;
  const totalUSD = subtotal + itbisUSD;

  const handleSave = () => {
    if (!onSave) { onOpenChange(false); return; }

    const currentLineItems: QuotationLineItem[] = lineItems.map((li) => ({
      id: li.id, description: li.description, quantity: li.quantity,
      unitPriceUSD: li.unitPriceUSD, totalUSD: li.totalUSD,
    }));

    if (isEdit && quotation) {
      // Create snapshot of the PREVIOUS version before saving
      const snapshot: QuotationSnapshot = {
        version: quotation.version,
        savedAt: new Date().toISOString().split("T")[0],
        code: quotation.code,
        subject: quotation.subject,
        lineItems: quotation.lineItems,
        subtotalUSD: quotation.subtotalUSD,
        totalUSD: quotation.totalUSD,
        costUSD: quotation.costUSD,
        marginPercent: quotation.marginPercent,
        marginUSD: quotation.marginUSD,
        paymentTerms: quotation.paymentTerms,
        deliveryTerms: quotation.deliveryTerms,
        deliveryWeeksMin: quotation.deliveryWeeksMin,
        deliveryWeeksMax: quotation.deliveryWeeksMax,
        validityDays: quotation.validityDays,
        deliveryLocation: quotation.deliveryLocation,
        notes: quotation.notes,
        status: quotation.status,
      };

      const updated: Quotation = {
        ...quotation,
        code, status, createdAt, subject,
        client: { ...clientData },
        prospectId: selectedProspectId === "none" ? undefined : selectedProspectId,
        clientId: selectedClientId === "none" ? undefined : selectedClientId,
        contactId: selectedContactId === "none" ? undefined : selectedContactId,
        lineItems: currentLineItems,
        subtotalUSD: subtotal, applyItbis, itbisPercent, itbisUSD, totalUSD,
        currency, exchangeRate, partner,
        costUSD, marginPercent, marginUSD,
        paymentTerms, deliveryTerms, deliveryWeeksMin, deliveryWeeksMax, validityDays, deliveryLocation, notes,
        version: quotation.version + 1,
        history: [...quotation.history, snapshot],
      };
      onSave(updated);
    } else {
      // New quotation
      const newQuotation: Quotation = {
        id: `q-${Date.now()}`,
        code, status, createdAt: createdAt || new Date().toISOString().split("T")[0],
        subject,
        client: { ...clientData },
        prospectId: selectedProspectId === "none" ? undefined : selectedProspectId,
        clientId: selectedClientId === "none" ? undefined : selectedClientId,
        contactId: selectedContactId === "none" ? undefined : selectedContactId,
        lineItems: currentLineItems,
        subtotalUSD: subtotal, applyItbis, itbisPercent, itbisUSD, totalUSD,
        currency, exchangeRate, partner,
        costUSD, marginPercent, marginUSD,
        paymentTerms, deliveryTerms, deliveryWeeksMin, deliveryWeeksMax, validityDays, deliveryLocation, notes,
        version: 1,
        history: [],
        approvalStatus: "pending",
      };
      onSave(newQuotation);
    }
    onOpenChange(false);
  };

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
              <Input value={code} readOnly disabled className="bg-muted/50 font-mono" />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Quotation["status"])}>
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
              <Input type="date" value={createdAt} onChange={(e) => setCreatedAt(e.target.value)} />
            </div>
            <div>
              <Label>Partner</Label>
              <Select value={partner} onValueChange={(v) => setPartner(v as QuotationPartner)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {partners.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="col-span-3">
            <Label>Asunto</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ej: Suministro de Transformadores de Distribución" />
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
                    {prospects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.projectName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cliente</Label>
                <Select value={selectedClientId} onValueChange={handleClientChange}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin cliente</SelectItem>
                    {clients.map((cl) => (
                      <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contacto</Label>
                <Select value={selectedContactId} onValueChange={handleContactChange}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar contacto" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin contacto</SelectItem>
                    {contacts.map((ct) => (
                      <SelectItem key={ct.id} value={ct.id}>{ct.firstName} {ct.lastName}{ct.clientId ? ` (${clients.find(c => c.id === ct.clientId)?.name ?? ''})` : ''}</SelectItem>
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
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => {
                    const ws = XLSX.utils.aoa_to_sheet([
                      ["Descripcion", "Cantidad", "Precio Unitario USD"],
                      ["Transformador 500kVA", 3, 18500],
                      ["Accesorios de conexi\u00f3n", 3, 1550],
                    ]);
                    ws["!cols"] = [{ wch: 35 }, { wch: 10 }, { wch: 20 }];
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Items");
                    XLSX.writeFile(wb, "plantilla_items.xlsx");
                  }}
                >
                  <Download className="h-3 w-3 mr-1" /> Plantilla
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3 w-3 mr-1" /> Importar
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
                      const wb = XLSX.read(data, { type: "array" });
                      const ws = wb.Sheets[wb.SheetNames[0]];
                      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
                      // skip header if first row is text
                      const dataRows = rows.length > 1 && isNaN(Number(rows[0][1])) ? rows.slice(1) : rows;
                      const imported: LineItem[] = dataRows
                        .filter((r) => r.length >= 1 && String(r[0] ?? "").trim())
                        .map((r) => {
                          const desc = String(r[0] ?? "").trim();
                          const qty = Number(r[1]) || 1;
                          const price = Number(r[2]) || 0;
                          return { id: crypto.randomUUID(), description: desc, quantity: qty, unitPriceUSD: price, totalUSD: qty * price };
                        });
                      if (imported.length > 0) setLineItems((prev) => [...prev, ...imported]);
                    };
                    reader.readAsArrayBuffer(file);
                    e.target.value = "";
                  }}
                />
                <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Agregar Ítem</Button>
              </div>
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

          {/* Moneda y Totales */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="itbis" checked={applyItbis} onCheckedChange={(v) => setApplyItbis(!!v)} />
                <Label htmlFor="itbis" className="text-sm">Aplicar ITBIS</Label>
                <Input type="number" value={itbisPercent} onChange={(e) => setItbisPercent(Number(e.target.value) || 0)} className="w-20 h-8 text-xs" />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <div>
                <Label className="text-xs">Moneda de la Cotización</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Select value={currency} onValueChange={(v) => { setCurrency(v as QuotationCurrency); if (v === "USD") setExchangeRate(1); }}>
                    <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.key} value={c.key}>
                          <span className="font-semibold">{c.symbol}</span>
                          <span className="text-muted-foreground ml-1.5 text-xs">— {c.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {currency !== "USD" && (
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Tasa:</Label>
                      <Input
                        type="number"
                        value={exchangeRate || ""}
                        onChange={(e) => setExchangeRate(Number(e.target.value) || 0)}
                        className="w-24 h-8 text-xs"
                        min={0}
                        step={0.01}
                        placeholder="Ej: 58.50"
                      />
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        1 USD = {exchangeRate} {currency}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium">${subtotal.toLocaleString()}</span></div>
              {applyItbis && <div className="flex justify-between"><span className="text-muted-foreground">ITBIS ({itbisPercent}%):</span><span className="font-medium">${itbisUSD.toLocaleString()}</span></div>}
              <div className="flex justify-between font-semibold text-base border-t pt-1"><span>Total USD:</span><span className="text-primary">${totalUSD.toLocaleString()}</span></div>
              {currency !== "USD" && exchangeRate > 0 && (
                <div className="flex justify-between font-semibold text-sm text-muted-foreground">
                  <span>Total {currency}:</span>
                  <span>{CURRENCIES.find((c) => c.key === currency)?.symbol}{(totalUSD * exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Costos internos */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Costos Internos</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Costo USD</Label>
                <Input type="number" value={costUSD || ""} onChange={(e) => setCostUSD(Number(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Margen %</Label>
                <Input type="number" value={marginPercent || ""} onChange={(e) => setMarginPercent(Number(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Margen USD</Label>
                <Input type="number" value={marginUSD || ""} onChange={(e) => setMarginUSD(Number(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          {/* Condiciones Comerciales */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Condiciones Comerciales</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Forma de Pago</Label>
                <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Ej: 50% anticipo, 50% contra entrega" />
              </div>
              <div>
                <Label>Condiciones de Entrega (Incoterm)</Label>
                <Select value={deliveryTerms} onValueChange={(v) => setDeliveryTerms(v as DeliveryTerm)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DELIVERY_TERMS.map((dt) => (
                      <SelectItem key={dt.key} value={dt.key}>
                        <span className="font-semibold">{dt.label}</span>
                        <span className="text-muted-foreground ml-1.5 text-xs">— {dt.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tiempo de Entrega (semanas)</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" value={deliveryWeeksMin || ""} onChange={(e) => setDeliveryWeeksMin(Number(e.target.value) || 0)} placeholder="Min" min={1} className="w-20" />
                  <span className="text-muted-foreground text-sm">a</span>
                  <Input type="number" value={deliveryWeeksMax || ""} onChange={(e) => setDeliveryWeeksMax(Number(e.target.value) || 0)} placeholder="Max" min={1} className="w-20" />
                  <span className="text-muted-foreground text-xs">semanas</span>
                </div>
              </div>
              <div>
                <Label>Validez (días)</Label>
                <Input type="number" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value) || 30)} />
              </div>
              <div>
                <Label>Lugar de Entrega</Label>
                <Input value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} placeholder="Ej: Santo Domingo, RD" />
              </div>
            </div>
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {/* Version info */}
          {isEdit && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground border-t pt-3">
              <span>Versión actual: <strong className="text-foreground">v{quotation.version}</strong></span>
              {quotation.history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistoryOpen(!historyOpen)}
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <History className="h-3 w-3" />
                  {historyOpen ? "Ocultar" : "Ver"} historial ({quotation.history.length} {quotation.history.length === 1 ? "versión" : "versiones"})
                  {historyOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              )}
            </div>
          )}

          {/* Version history panel */}
          {isEdit && historyOpen && quotation.history.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
                <History className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Historial de Versiones</span>
              </div>
              <div className="divide-y">
                {[...quotation.history].reverse().map((snap) => (
                  <div key={snap.version}>
                    <button
                      type="button"
                      onClick={() => setExpandedVersion(expandedVersion === snap.version ? null : snap.version)}
                      className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-muted/20 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">v{snap.version}</span>
                        <UserAvatar userId={snap.modifiedBy} size="xs" />
                        <span className="text-sm">{snap.subject}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-primary-foreground ${QUOTATION_STATUSES.find((s) => s.key === snap.status)?.color ?? "bg-muted"}`}>
                          {QUOTATION_STATUSES.find((s) => s.key === snap.status)?.label ?? snap.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{snap.savedAt}</span>
                        {expandedVersion === snap.version ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </div>
                    </button>
                    {expandedVersion === snap.version && (
                      <div className="px-4 pb-4 bg-muted/10 border-t space-y-3">
                        <div className="grid grid-cols-3 gap-3 pt-3 text-xs">
                          <div><span className="text-muted-foreground">Total USD:</span> <strong>${snap.totalUSD.toLocaleString()}</strong></div>
                          <div><span className="text-muted-foreground">Costo USD:</span> <strong>${snap.costUSD.toLocaleString()}</strong></div>
                          <div><span className="text-muted-foreground">Margen:</span> <strong>{snap.marginPercent}% (${snap.marginUSD.toLocaleString()})</strong></div>
                          <div><span className="text-muted-foreground">Entrega:</span> <strong>{snap.deliveryWeeksMin}-{snap.deliveryWeeksMax} sem.</strong></div>
                          <div><span className="text-muted-foreground">Validez:</span> <strong>{snap.validityDays} días</strong></div>
                          <div><span className="text-muted-foreground">Lugar:</span> <strong>{snap.deliveryLocation || "—"}</strong></div>
                        </div>
                        {snap.lineItems.length > 0 && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Ítems</p>
                            <table className="w-full text-xs border rounded">
                              <thead>
                                <tr className="bg-muted/50 border-b">
                                  <th className="text-left py-1 px-2">Descripción</th>
                                  <th className="text-center py-1 px-2 w-12">Cant.</th>
                                  <th className="text-right py-1 px-2 w-20">P. Unit.</th>
                                  <th className="text-right py-1 px-2 w-20">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {snap.lineItems.map((li, idx) => (
                                  <tr key={idx} className="border-b last:border-0">
                                    <td className="py-1 px-2">{li.description}</td>
                                    <td className="py-1 px-2 text-center">{li.quantity}</td>
                                    <td className="py-1 px-2 text-right">${li.unitPriceUSD.toLocaleString()}</td>
                                    <td className="py-1 px-2 text-right">${li.totalUSD.toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {snap.notes && (
                          <p className="text-xs text-muted-foreground"><strong>Notas:</strong> {snap.notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Approval Section */}
        {isEdit && quotation && (
          <div className="border rounded-lg p-4 mt-2">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Aprobación de Cotización</span>
            </div>
            {quotation.approvalStatus === "approved" && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                <CheckCircle2 className="h-5 w-5 text-sinem-success shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">Aprobada</p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Aprobada por <strong>{mockAppUsers.find((u) => u.id === quotation.approvedBy)?.name ?? quotation.approvedBy}</strong>
                    {quotation.approvedAt && ` el ${quotation.approvedAt}`}
                  </p>
                </div>
              </div>
            )}
            {quotation.approvalStatus === "rejected" && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                <XCircle className="h-5 w-5 text-destructive shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Rechazada</p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Rechazada por <strong>{mockAppUsers.find((u) => u.id === quotation.approvedBy)?.name ?? quotation.approvedBy}</strong>
                    {quotation.approvedAt && ` el ${quotation.approvedAt}`}
                  </p>
                  {quotation.approvalNote && <p className="text-xs text-red-600 dark:text-red-400 mt-1">Motivo: {quotation.approvalNote}</p>}
                </div>
              </div>
            )}
            {quotation.approvalStatus === "pending" && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                  <Clock className="h-5 w-5 text-amber-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Pendiente de Aprobación</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {quotation.totalUSD > generalSettings.managerApprovalLimit
                        ? `Monto (${quotation.totalUSD.toLocaleString()} USD) excede el límite del Gerente Comercial ($${generalSettings.managerApprovalLimit.toLocaleString()}). Requiere aprobación de Administrador.`
                        : `Puede ser aprobada por Gerente Comercial o Administrador.`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-sinem-success hover:bg-sinem-success/90"
                    onClick={() => {
                      if (!onSave) return;
                      onSave({
                        ...quotation,
                        approvalStatus: "approved",
                        approvedBy: "u1",
                        approvedAt: new Date().toISOString().split("T")[0],
                      });
                      onOpenChange(false);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Aprobar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      const note = prompt("Motivo del rechazo (opcional):");
                      if (note === null) return;
                      if (!onSave) return;
                      onSave({
                        ...quotation,
                        approvalStatus: "rejected",
                        approvedBy: "u1",
                        approvedAt: new Date().toISOString().split("T")[0],
                        approvalNote: note || undefined,
                      });
                      onOpenChange(false);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Rechazar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>
            {isEdit ? "Guardar Cambios" : "Crear Cotización"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuotationDialog;
