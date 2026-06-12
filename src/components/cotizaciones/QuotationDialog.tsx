import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/AuthContext";
import { useRequiredFields } from "@/hooks/useRequiredFields";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/RichTextEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { QUOTATION_STATUSES, DELIVERY_TERMS, CURRENCIES, type Quotation, type QuotationSnapshot, type QuotationLineItem, type CostEntry, type DeliveryTerm, type QuotationCurrency, type QuotationPartner, type GeneralSettings, type Prospect, type Client, type Contact, type ProposalSettings, type QuotationProposalTexts } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { dbToProspect, dbToClient, dbToContact } from "@/lib/supabaseMappers";
import { Plus, Trash2, History, ChevronDown, ChevronUp, ShieldCheck, XCircle, CheckCircle2, Clock, Download, Upload, ChevronsUpDown, Check, Search, RotateCcw, AlertTriangle, Globe } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { usePartners } from "@/hooks/usePartners";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import UserAvatar from "@/components/UserAvatar";
import * as XLSX from "xlsx";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceUSD: number;
  totalUSD: number;
  unitCostUSD: number;
  costCurrency: string;
  itemMarginPercent: number | null;
  subtotalGroup?: string;
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
  gender: "Sr." | "Sra.";
  address: string;
  rnc: string;
  phone: string;
  email: string;
}

const emptyClientData: ClientData = { company: "", attention: "", gender: "Sra.", address: "", rnc: "", phone: "", email: "" };

const DEFAULT_GENERAL_SETTINGS: GeneralSettings = { managerApprovalLimit: 300000 };
/* ── Searchable Prospect Combobox ── */
const ProspectCombobox = ({ prospects, value, onChange }: { prospects: Prospect[]; value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  const selected = prospects.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-9 font-normal text-sm">
          <span className="truncate">
            {selected ? `${selected.code ? selected.code + " — " : ""}${selected.projectName}` : "Sin oportunidad"}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por código o nombre..." />
          <CommandList className="max-h-[240px] overflow-y-auto">
            <CommandEmpty>No se encontraron oportunidades.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="sin-oportunidad" onSelect={() => { onChange("none"); setOpen(false); }}>
                <Check className={cn("mr-2 h-3.5 w-3.5", value === "none" ? "opacity-100" : "opacity-0")} />
                Sin oportunidad
              </CommandItem>
              {prospects.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.code} ${p.projectName} ${p.directCustomer}`}
                  onSelect={() => { onChange(p.id); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", value === p.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm truncate">{p.projectName}</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {p.code && `${p.code} · `}{p.directCustomer}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const DRAFT_KEY = "sinem:quotation-draft-v2";

/** Per-unit distributed cost for a single item given a list of cost entries that may target specific items. */
const computeItemUnitDist = (item: LineItem, items: LineItem[], costs: CostEntry[]): number => {
  if (item.unitCostUSD <= 0) return 0;
  return costs.reduce((sum, cost) => {
    const applicable = cost.itemIds && cost.itemIds.length > 0
      ? items.filter(li => cost.itemIds!.includes(li.id))
      : items;
    if (!applicable.some(li => li.id === item.id)) return sum;
    const w = applicable.reduce((s, li) => s + (li.unitCostUSD > 0 ? li.unitCostUSD * li.quantity : 0), 0);
    if (w <= 0) return sum;
    return sum + cost.amountUSD * (item.unitCostUSD / w);
  }, 0);
};

const QuotationDialog = ({ open, onOpenChange, quotation, prefill, onSave }: Props) => {
  const isEdit = !!quotation;
  const { user: authUser } = useAuth();
  const [currentAppUserId, setCurrentAppUserId] = useState<string | null>(null);
  const [generalSettings] = useLocalStorage<GeneralSettings>("sinem:general-settings", DEFAULT_GENERAL_SETTINGS);
  const { toast } = useToast();
  const { isRequired: isFieldRequired, fields: reqFields } = useRequiredFields("cotizacion");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const { partners } = usePartners();
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<string>("none");
  const [clientData, setClientData] = useState<ClientData>(emptyClientData);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [showVersionPrompt, setShowVersionPrompt] = useState(false);
  const [currentUserHasSignature, setCurrentUserHasSignature] = useState<boolean | null>(null);
  const [showUndoApproval, setShowUndoApproval] = useState(false);
  const [approverDisplayName, setApproverDisplayName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Controlled fields for save logic ──
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Quotation["status"]>("borrador");
  const [createdAt, setCreatedAt] = useState("");
  const [subject, setSubject] = useState("");
  const [costUSD, setCostUSD] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState<DeliveryTerm>("CIF");
  const [deliveryWeeksMin, setDeliveryWeeksMin] = useState(0);
  const [deliveryWeeksMax, setDeliveryWeeksMax] = useState(0);
  const [deliveryTimeNote, setDeliveryTimeNote] = useState("");
  const [validityDays, setValidityDays] = useState(30);
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [specialConsiderations, setSpecialConsiderations] = useState("");
  const [notes, setNotes] = useState("");
  const [applyItbis, setApplyItbis] = useState(true);
  const [itbisPercent, setItbisPercent] = useState(18);
  const [currency, setCurrency] = useState<QuotationCurrency>("USD");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [isOriginalCurrency, setIsOriginalCurrency] = useState(false);
  const [partner, setPartner] = useState<QuotationPartner>("Siemens");
  const [partnerPopoverOpen, setPartnerPopoverOpen] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [showPartnerText, setShowPartnerText] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState("none");
  const [selectedContactId, setSelectedContactId] = useState("none");
  const [distributedCosts, setDistributedCosts] = useState<CostEntry[]>([]);
  const [otherCosts, setOtherCosts] = useState<CostEntry[]>([]);
  const [showItemSubtotals, setShowItemSubtotals] = useState(false);
  const [generalMarginInput, setGeneralMarginInput] = useState(0);
  const [proposalTexts, setProposalTexts] = useState<QuotationProposalTexts>({});
  const [textsExpanded, setTextsExpanded] = useState(false);
  const [language, setLanguage] = useState<'es' | 'en'>('es');

  // Resolve current auth user to app_users id + check if they have a signature (required to approve)
  useEffect(() => {
    if (!authUser) return;
    supabase.from("app_users")
      .select("id, signature_image_url")
      .eq("auth_user_id", authUser.id)
      .maybeSingle()
      .then(({ data }) => {
        setCurrentAppUserId(data?.id ?? null);
        setCurrentUserHasSignature(!!((data as any)?.signature_image_url));
      });
  }, [authUser]);

  // Resolve approver name for display when quotation has an approved_by UUID
  useEffect(() => {
    const approvedBy = quotation?.approvedBy;
    if (!approvedBy) { setApproverDisplayName(null); return; }
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(approvedBy);
    if (!isUUID) { setApproverDisplayName(approvedBy); return; }
    supabase.from("app_users").select("name").eq("auth_user_id", approvedBy).maybeSingle()
      .then(({ data }) => setApproverDisplayName((data as any)?.name ?? null));
  }, [quotation?.approvedBy]);

  // Fetch prospects, clients, contacts, and proposal settings from Supabase
  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      const [{ data: dbP }, { data: dbCl }, { data: dbCt }, { data: psRow }] = await Promise.all([
        supabase.from("prospects").select("*").is("deleted_at", null).order("project_name"),
        supabase.from("clients").select("*").order("name"),
        supabase.from("contacts").select("*").order("first_name"),
        supabase.from("proposal_settings").select("*").limit(1).single(),
      ]);
      if (dbP) setProspects(dbP.map(dbToProspect));
      if (dbCl) setClients(dbCl.map(dbToClient));
      if (dbCt) setContacts(dbCt.map(dbToContact));

      const defaultTexts: QuotationProposalTexts = psRow ? {
        greetingText: psRow.greeting_text ?? "",
        warrantyText: psRow.warranty_text ?? "",
        responsibilityText: psRow.responsibility_text ?? "",
        risksText: psRow.risks_text ?? "",
        installationText: psRow.installation_text ?? "",
        validityText: psRow.validity_text ?? "",
        returnsText: psRow.returns_text ?? "",
        legalClauses: psRow.legal_clauses ?? "",
        closingText: psRow.closing_text ?? "",
      } : {};

      if (quotation) {
        setProposalTexts(quotation.proposalTexts ?? defaultTexts);
      } else {
        const raw = !prefill ? sessionStorage.getItem(DRAFT_KEY) : null;
        const d = raw ? JSON.parse(raw) : null;
        setProposalTexts(d?.proposalTexts ?? defaultTexts);
      }
    };
    fetchData();
  }, [open]);

  /** Generate code: SINEM-{BU}-{Client}-{consecutive}-V{version} */
  const generateCode = async (bu: string, clientName: string, version: number) => {
    const buPart = bu || "XX";
    const clientPart = clientName
      ? clientName.replace(/\s+/g, "").substring(0, 15)
      : "SinCliente";
    const prefix = `SINEM-${buPart}-${clientPart}-`;

    // Fetch all codes with this prefix to find the current max consecutive
    const { data: existing } = await supabase
      .from("quotations")
      .select("code")
      .ilike("code", `${prefix}%`);

    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nums = (existing ?? [])
      .map((q) => {
        const match = q.code.match(new RegExp(`^${escaped}(\\d+)`));
        return match ? parseInt(match[1], 10) : NaN;
      })
      .filter((n) => !isNaN(n));

    let next = nums.length > 0 ? Math.max(...nums) + 1 : 1;

    // Confirm the generated code doesn't already exist (guards against race conditions)
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = `${prefix}${next}-V${version}`;
      const { data: conflict } = await supabase
        .from("quotations")
        .select("id")
        .eq("code", candidate)
        .maybeSingle();
      if (!conflict) return candidate;
      next++;
    }

    // Absolute fallback: timestamp suffix guarantees uniqueness
    return `${prefix}${next}-${Date.now()}-V${version}`;
  };

  // Save draft to sessionStorage when closing a new quotation (not edit)
  const saveDraft = () => {
    if (isEdit) return;
    const draft = {
      code, subject, selectedProspectId, selectedClientId, selectedContactId,
      clientData, lineItems, status, costUSD, distributedCosts, otherCosts,
      paymentTerms, deliveryTerms, deliveryWeeksMin, deliveryWeeksMax,
      validityDays, deliveryLocation, notes, applyItbis, itbisPercent,
      currency, exchangeRate, isOriginalCurrency, partner, showPartnerText, codeManuallyEdited,
      proposalTexts, showItemSubtotals, language,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  };

  const clearDraft = () => sessionStorage.removeItem(DRAFT_KEY);

  useEffect(() => {
    if (open) {
      setHistoryOpen(false);
      setExpandedVersion(null);

      if (quotation) {
        // Editing existing quotation
        setLineItems(quotation.lineItems.map((li) => ({ ...li, unitCostUSD: li.unitCostUSD ?? 0, costCurrency: li.costCurrency ?? "USD", itemMarginPercent: li.itemMarginPercent ?? null, subtotalGroup: li.subtotalGroup ?? undefined })));
        setShowItemSubtotals((quotation as any).showItemSubtotals ?? false);
        setLanguage(quotation.language ?? 'es');
        setSelectedProspectId(quotation.prospectId ?? "none");
        setSelectedClientId(quotation.clientId ?? "none");
        setSelectedContactId(quotation.contactId ?? "none");
        setClientData({ ...emptyClientData, ...quotation.client, gender: quotation.client.gender ?? "Sra." });
        setCode(quotation.code);
        setCodeManuallyEdited(false);
        setStatus(quotation.status);
        setCreatedAt(quotation.createdAt);
        setSubject(quotation.subject);
        setCostUSD(quotation.costUSD);
        setDistributedCosts(quotation.distributedCosts ?? []);
        setOtherCosts([]);
        setGeneralMarginInput(0);
        setPaymentTerms(quotation.paymentTerms);
        setDeliveryTerms(quotation.deliveryTerms);
        setDeliveryWeeksMin(quotation.deliveryWeeksMin);
        setDeliveryWeeksMax(quotation.deliveryWeeksMax);
        setDeliveryTimeNote(quotation.deliveryTimeNote ?? "");
        setValidityDays(quotation.validityDays);
        setDeliveryLocation(quotation.deliveryLocation);
        setSpecialConsiderations(quotation.specialConsiderations ?? "");
        setNotes(quotation.notes);
        setApplyItbis(quotation.applyItbis);
        setItbisPercent(quotation.itbisPercent);
        setCurrency(quotation.currency);
        setExchangeRate(quotation.exchangeRate);
        setIsOriginalCurrency(quotation.isOriginalCurrency ?? false);
        setPartner(quotation.partner ?? "Siemens");
        setShowPartnerText(quotation.showPartnerText ?? true);
      } else {
        // New quotation — try restoring draft (only if no prefill)
        const raw = !prefill ? sessionStorage.getItem(DRAFT_KEY) : null;
        const d = raw ? JSON.parse(raw) : null;
        setLineItems((d?.lineItems ?? []).map((li: any) => ({ ...li, unitCostUSD: li.unitCostUSD ?? 0, costCurrency: li.costCurrency ?? "USD", itemMarginPercent: li.itemMarginPercent ?? null, subtotalGroup: li.subtotalGroup ?? undefined })));
        setShowItemSubtotals(d?.showItemSubtotals ?? false);
        setLanguage(d?.language ?? 'es');
        setSelectedProspectId(d?.selectedProspectId ?? prefill?.prospectId ?? "none");
        setSelectedClientId(d?.selectedClientId ?? prefill?.clientId ?? "none");
        setSelectedContactId(d?.selectedContactId ?? prefill?.contactId ?? "none");
        setClientData(d?.clientData ?? emptyClientData);
        // Only restore code if the user had manually edited it; otherwise let auto-generate produce the correct version
        setCode(d?.codeManuallyEdited ? (d?.code ?? "") : "");
        setCodeManuallyEdited(d?.codeManuallyEdited ?? false);
        setStatus(d?.status ?? "borrador");
        setCreatedAt("");
        setSubject(d?.subject ?? prefill?.subject ?? "");
        setCostUSD(d?.costUSD ?? 0);
        setDistributedCosts(d?.distributedCosts ?? []);
        setOtherCosts(d?.otherCosts ?? []);
        setGeneralMarginInput(0);
        setPaymentTerms(d?.paymentTerms ?? "");
        setDeliveryTerms(d?.deliveryTerms ?? "CIF");
        setDeliveryWeeksMin(d?.deliveryWeeksMin ?? 0);
        setDeliveryWeeksMax(d?.deliveryWeeksMax ?? 0);
        setDeliveryTimeNote(d?.deliveryTimeNote ?? "");
        setValidityDays(d?.validityDays ?? 30);
        setDeliveryLocation(d?.deliveryLocation ?? "");
        setSpecialConsiderations(d?.specialConsiderations ?? "");
        setNotes(d?.notes ?? "");
        setApplyItbis(d?.applyItbis ?? true);
        setItbisPercent(d?.itbisPercent ?? 18);
        setCurrency(d?.currency ?? "USD");
        setExchangeRate(d?.exchangeRate ?? 1);
        setIsOriginalCurrency(d?.isOriginalCurrency ?? false);
        setPartner(d?.partner ?? "Siemens");
        setShowPartnerText(d?.showPartnerText ?? true);

        // Auto-fill from prefill prospect (overrides draft)
        if (prefill?.prospectId) {
          fillFromProspect(prefill.prospectId);
        }
      }
    } else if (!open && !isEdit) {
      // Dialog just closed for a new quotation — save draft
      saveDraft();
    }
  }, [open, quotation, prefill]);

  // Auto-generate code when prospects load with a prefill or selected prospect (new quotation only)
  useEffect(() => {
    if (!open || quotation || codeManuallyEdited || prospects.length === 0) return;
    const pid = selectedProspectId !== "none" ? selectedProspectId : prefill?.prospectId;
    if (!pid) return;
    const prospect = prospects.find((p) => p.id === pid);
    if (!prospect) return;

    // Fill data from prospect if not yet filled
    fillFromProspect(pid);

    // Generate code
    const clientName = prospect.directCustomer || clientData.company;
    generateCode(prospect.bu, clientName, 0).then((c) => {
      if (!codeManuallyEdited) setCode(c);
    });
  }, [prospects, open]);

  // Re-run fillFromProspect once clients/contacts finish loading (fixes race condition)
  useEffect(() => {
    if (!open || quotation || clients.length === 0) return;
    const pid = selectedProspectId !== "none" ? selectedProspectId : prefill?.prospectId;
    if (!pid) return;
    fillFromProspect(pid);
  }, [clients, contacts]);

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

    // Copy partner from prospect (supports one-time/internal providers)
    if (prospect.proveedor && prospect.proveedor.trim()) {
      setPartner(prospect.proveedor.trim());
    }
  };

  const handleProspectChange = async (value: string) => {
    setSelectedProspectId(value);
    if (value !== "none") {
      fillFromProspect(value);
      // Auto-generate code from prospect BU + client
      if (!codeManuallyEdited) {
        const prospect = prospects.find((p) => p.id === value);
        if (prospect) {
          const clientName = prospect.directCustomer || clientData.company;
          const newCode = await generateCode(prospect.bu, clientName, quotation ? quotation.version + 1 : 0);
          setCode(newCode);
        }
      }
    } else {
      setSelectedClientId("none");
      setSelectedContactId("none");
    }
  };

  const handleClientChange = async (value: string) => {
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
        // Auto-select first contact belonging to this client
        const clientContact = contacts.find((ct) => ct.clientId === value);
        if (clientContact) {
          setSelectedContactId(clientContact.id);
          setClientData((d) => ({
            ...d,
            company: client.name,
            address: client.address,
            attention: `${clientContact.firstName} ${clientContact.lastName}`,
            phone: clientContact.phone || client.contactPhone,
            email: clientContact.email || client.contactEmail,
          }));
        }
        // Auto-regenerate code with new client name
        if (!codeManuallyEdited && !quotation) {
          const prospect = selectedProspectId !== "none" ? prospects.find((p) => p.id === selectedProspectId) : null;
          const bu = prospect?.bu || "";
          const newCode = await generateCode(bu, client.name, 0);
          setCode(newCode);
        }
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
      { id: `new-${Date.now()}`, description: "", quantity: 1, unitPriceUSD: 0, totalUSD: 0, unitCostUSD: 0, costCurrency: "USD", itemMarginPercent: null },
    ]);
  };

  const removeItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const recalcPrices = (items: LineItem[], costs: CostEntry[]) => {
    return items.map((item) => {
      if (item.itemMarginPercent === null || item.unitCostUSD <= 0 || item.itemMarginPercent >= 100) return item;
      const unitDist = computeItemUnitDist(item, items, costs);
      const effectiveUnitPrice = Math.round(((item.unitCostUSD + unitDist) / (1 - item.itemMarginPercent / 100)) * 100) / 100;
      return { ...item, unitPriceUSD: effectiveUnitPrice, totalUSD: Math.round(item.quantity * effectiveUnitPrice * 100) / 100 };
    });
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number | null) => {
    setLineItems((prev) => {
      // Pass 1: apply the direct field change
      const step1 = prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };

        if (field === "quantity") {
          updated.totalUSD = Math.round(updated.quantity * updated.unitPriceUSD * 100) / 100;
        }
        if (field === "unitPriceUSD") {
          updated.totalUSD = Math.round(updated.quantity * updated.unitPriceUSD * 100) / 100;
          if (updated.unitCostUSD > 0 && updated.unitPriceUSD > 0) {
            // Back-derive margin from effective price: price = (cost + unitDist) / (1 - margin)
            const uDist = computeItemUnitDist(updated, prev, distributedCosts);
            const effCost = updated.unitCostUSD + uDist;
            if (updated.unitPriceUSD > effCost) {
              updated.itemMarginPercent = Math.round((1 - effCost / updated.unitPriceUSD) * 10000) / 100;
            } else {
              updated.itemMarginPercent = Math.round(((updated.unitPriceUSD - updated.unitCostUSD) / updated.unitPriceUSD) * 10000) / 100;
            }
          }
        }
        if (field === "unitCostUSD") {
          updated.unitCostUSD = Number(value) || 0;
        }
        if (field === "itemMarginPercent") {
          updated.itemMarginPercent = value !== null ? Number(value) : null;
        }
        return updated;
      });

      // Pass 2: recalculate effective prices for all margin-based items
      // Skip the item whose price was manually set by the user
      return step1.map((item) => {
        if (field === "unitPriceUSD" && item.id === id) return item; // user set price manually
        if (item.itemMarginPercent === null || item.unitCostUSD <= 0 || item.itemMarginPercent >= 100) return item;
        const unitDist = computeItemUnitDist(item, step1, distributedCosts);
        const effectiveUnitPrice = Math.round(((item.unitCostUSD + unitDist) / (1 - item.itemMarginPercent / 100)) * 100) / 100;
        return { ...item, unitPriceUSD: effectiveUnitPrice, totalUSD: Math.round(item.quantity * effectiveUnitPrice * 100) / 100 };
      });
    });
  };

  // Recalculate effective prices when distributed costs change
  useEffect(() => {
    setLineItems((prev) => recalcPrices(prev, distributedCosts));
  }, [distributedCosts]);

  const applyGeneralMargin = () => {
    if (generalMarginInput <= 0 || generalMarginInput >= 100) return;
    const m = generalMarginInput / 100;
    setLineItems((prev) => {
      if (!prev.some(li => li.unitCostUSD > 0)) return prev;
      return prev.map((item) => {
        if (!item.unitCostUSD) return item;
        const unitDist = computeItemUnitDist(item, prev, distributedCosts);
        const effectiveUnitPrice = Math.round(((item.unitCostUSD + unitDist) / (1 - m)) * 100) / 100;
        return { ...item, itemMarginPercent: generalMarginInput, unitPriceUSD: effectiveUnitPrice, totalUSD: Math.round(item.quantity * effectiveUnitPrice * 100) / 100 };
      });
    });
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.totalUSD, 0);

  // Cost breakdown (computed)
  const itemsCostTotal = lineItems.reduce((s, li) => s + (li.unitCostUSD > 0 ? li.unitCostUSD * li.quantity : 0), 0);
  const distributedTotal = distributedCosts.reduce((s, c) => s + c.amountUSD, 0);
  const totalWeightedCost = lineItems.reduce((s, li) => s + (li.unitCostUSD > 0 ? li.unitCostUSD * li.quantity : 0), 0);
  const hasDetailedCosts = itemsCostTotal > 0 || distributedTotal > 0;
  const effectiveCostUSD = hasDetailedCosts ? (itemsCostTotal + distributedTotal) : costUSD;

  const priceBase = Math.round(subtotal * 100) / 100;
  const itbisUSD = applyItbis ? Math.round(priceBase * itbisPercent) / 100 : 0;
  const totalUSD = Math.round((priceBase + itbisUSD) * 100) / 100;
  const marginUSD = Math.round((totalUSD - effectiveCostUSD) * 100) / 100;
  const marginPercent = totalUSD > 0 ? Math.round((totalUSD - effectiveCostUSD) / totalUSD * 10000) / 100 : 0;

  const buildCurrentData = () => {
    const currentLineItems: QuotationLineItem[] = lineItems.map((li) => ({
      id: li.id, description: li.description, quantity: li.quantity,
      unitPriceUSD: li.unitPriceUSD, totalUSD: li.totalUSD,
      unitCostUSD: li.unitCostUSD || undefined,
      costCurrency: li.costCurrency || "USD",
      itemMarginPercent: li.itemMarginPercent ?? undefined,
      subtotalGroup: li.subtotalGroup || undefined,
    }));
    return {
      code, status, createdAt, subject,
      client: { ...clientData },
      prospectId: selectedProspectId === "none" ? undefined : selectedProspectId,
      clientId: selectedClientId === "none" ? undefined : selectedClientId,
      contactId: selectedContactId === "none" ? undefined : selectedContactId,
      lineItems: currentLineItems,
      subtotalUSD: subtotal, applyItbis, itbisPercent, itbisUSD, totalUSD,
      currency, exchangeRate, isOriginalCurrency, partner, showPartnerText,
      costUSD: effectiveCostUSD, marginPercent, marginUSD,
      distributedCosts, otherCosts,
      paymentTerms, deliveryTerms, deliveryWeeksMin, deliveryWeeksMax, deliveryTimeNote, validityDays, deliveryLocation, specialConsiderations, notes,
      proposalTexts, showItemSubtotals, language,
    };
  };

  const handleSave = () => {
    if (!onSave) { onOpenChange(false); return; }

    // Validate required fields
    const valMap: Record<string, any> = {
      subject, prospectId: selectedProspectId === "none" ? "" : selectedProspectId,
      clientId: selectedClientId === "none" ? "" : selectedClientId,
      contactId: selectedContactId === "none" ? "" : selectedContactId,
      company: clientData.company, attention: clientData.attention,
      email: clientData.email, phone: clientData.phone,
      address: clientData.address, rnc: clientData.rnc,
      lineItems: lineItems.length > 0 ? "ok" : "",
      paymentTerms, deliveryTerms, deliveryWeeks: (deliveryWeeksMin || deliveryWeeksMax) ? "ok" : "",
      validityDays: validityDays > 0 ? "ok" : "", deliveryLocation, notes,
    };
    const missing = reqFields.filter((f) => f.isRequired && !valMap[f.fieldKey]?.toString().trim());
    if (missing.length > 0) {
      toast({ title: "Campos obligatorios", description: missing.map((f) => f.fieldLabel).join(", "), variant: "destructive" });
      return;
    }

    if (isEdit && quotation) {
      // Show version prompt instead of auto-creating new version
      setShowVersionPrompt(true);
      return;
    }

    // New quotation — save directly
    const data = buildCurrentData();
    if (!data.code.trim()) {
      toast({ title: "Código requerido", description: "Selecciona un prospecto o cliente para generar el código de la cotización.", variant: "destructive" });
      return;
    }
    const newQuotation: Quotation = {
      id: `q-${Date.now()}`,
      ...data,
      createdAt: data.createdAt || new Date().toISOString().split("T")[0],
      version: 0,
      history: [],
      approvalStatus: "pending",
    };
    clearDraft();
    onSave(newQuotation);
    onOpenChange(false);
  };

  /** Save overwriting current version (no new version created) */
  const saveOverwrite = () => {
    if (!onSave || !quotation) return;
    const data = buildCurrentData();
    const wasApproved = quotation.approvalStatus === "approved";
    const updated: Quotation = {
      ...quotation,
      ...data,
      version: quotation.version,
      history: quotation.history,
      ...(wasApproved && {
        status: "borrador",
        approvalStatus: "pending",
        approvedBy: undefined,
        approvedAt: undefined,
        approvalNote: undefined,
      }),
    };
    clearDraft();
    onSave(updated);
    setShowVersionPrompt(false);
    onOpenChange(false);
    if (wasApproved) {
      toast({
        title: "Cotización movida a Borrador",
        description: "La cotización fue editada después de estar aprobada. Debe ser re-aprobada por dirección.",
      });
    }
  };

  /** Save as a new version (snapshot current, bump version) */
  const saveAsNewVersion = () => {
    if (!onSave || !quotation) return;
    const data = buildCurrentData();

    // Snapshot of the PREVIOUS version
    const snapshot: QuotationSnapshot = {
      version: quotation.version,
      savedAt: new Date().toISOString().split("T")[0],
      modifiedBy: currentAppUserId ?? undefined,
      code: quotation.code,
      subject: quotation.subject,
      lineItems: quotation.lineItems,
      distributedCosts: quotation.distributedCosts ?? [],
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

    const newVersion = quotation.version + 1;
    let updatedCode = data.code;
    if (!codeManuallyEdited) {
      updatedCode = data.code.replace(/-V\d+$/, `-V${newVersion}`);
      if (updatedCode === data.code && !data.code.includes("-V")) {
        updatedCode = `${data.code}-V${newVersion}`;
      }
    }

    const wasApproved = quotation.approvalStatus === "approved";
    const updated: Quotation = {
      ...quotation,
      ...data,
      code: updatedCode,
      version: newVersion,
      history: [...quotation.history, snapshot],
      ...(wasApproved && {
        status: "borrador",
        approvalStatus: "pending",
        approvedBy: undefined,
        approvedAt: undefined,
        approvalNote: undefined,
      }),
    };
    clearDraft();
    onSave(updated);
    setShowVersionPrompt(false);
    onOpenChange(false);
    if (wasApproved) {
      toast({
        title: "Cotización movida a Borrador",
        description: "La nueva versión requiere re-aprobación de dirección.",
      });
    }
  };

  /** Restore data from a previous version snapshot */
  const restoreVersion = (snap: QuotationSnapshot) => {
    setCode(snap.code);
    setSubject(snap.subject);
    setLineItems(snap.lineItems.map((li) => ({ ...li, unitCostUSD: (li as any).unitCostUSD ?? 0, costCurrency: (li as any).costCurrency ?? "USD", itemMarginPercent: (li as any).itemMarginPercent ?? null })));
    setCostUSD(snap.costUSD);
    setDistributedCosts(snap.distributedCosts ?? []);
    setOtherCosts([]);
    setPaymentTerms(snap.paymentTerms);
    setDeliveryTerms(snap.deliveryTerms);
    setDeliveryWeeksMin(snap.deliveryWeeksMin);
    setDeliveryWeeksMax(snap.deliveryWeeksMax);
    setDeliveryTimeNote(snap.deliveryTimeNote ?? "");
    setValidityDays(snap.validityDays);
    setDeliveryLocation(snap.deliveryLocation);
    setSpecialConsiderations(snap.specialConsiderations ?? "");
    setNotes(snap.notes);
    setStatus(snap.status as Quotation["status"]);
    setExpandedVersion(null);
    setHistoryOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Cotización ${quotation.code}` : "Nueva Cotización"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Encabezado */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Código</Label>
              <Input value={code} onChange={(e) => { setCode(e.target.value); setCodeManuallyEdited(true); }} className="font-mono" placeholder="SINEM-BU-Cliente-1-V0" />
              <p className="text-[10px] text-muted-foreground mt-0.5">Formato: SINEM-BU-Cliente-Consecutivo-Versión</p>
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
              <Popover open={partnerPopoverOpen} onOpenChange={(o) => { setPartnerPopoverOpen(o); if (!o) setPartnerSearch(""); }}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-10">
                    {partner || "Seleccionar"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Buscar partner..."
                      value={partnerSearch}
                      onValueChange={setPartnerSearch}
                    />
                    <CommandList>
                      {(() => {
                        const trimmed = partnerSearch.trim();
                        const exists = partners.some((p) => p.toLowerCase() === trimmed.toLowerCase());
                        const handleUseOnce = () => {
                          if (!trimmed) return;
                          setPartner(trimmed);
                          setPartnerSearch("");
                          setPartnerPopoverOpen(false);
                        };
                        return (
                          <>
                            <CommandEmpty>
                              {trimmed ? (
                                <button
                                  type="button"
                                  onClick={handleUseOnce}
                                  className="flex items-center gap-1.5 w-full px-2 py-2 text-xs text-primary hover:bg-primary/5 rounded transition-colors"
                                >
                                  <Plus className="h-3.5 w-3.5" /> Usar "{trimmed}" solo para esta cotización
                                </button>
                              ) : (
                                <span className="text-xs text-muted-foreground px-2 py-2 block">Sin resultados</span>
                              )}
                            </CommandEmpty>
                            <CommandGroup>
                              {partners.map((p) => (
                                <CommandItem
                                  key={p}
                                  value={p}
                                  onSelect={() => {
                                    setPartner(p);
                                    setPartnerSearch("");
                                    setPartnerPopoverOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", partner === p ? "opacity-100" : "opacity-0")} />
                                  {p}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                            {trimmed && !exists && (
                              <div className="border-t border-border/60 mt-1 pt-1 px-1 pb-1">
                                <button
                                  type="button"
                                  onClick={handleUseOnce}
                                  className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-primary hover:bg-primary/5 rounded transition-colors"
                                >
                                  <Plus className="h-3.5 w-3.5" /> Usar "{trimmed}" solo para esta cotización
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {partner && !partners.some((p) => p.toLowerCase() === partner.toLowerCase()) && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Proveedor de uso interno para esta cotización.{" "}
                  <Link to="/configuracion/proveedores" className="underline hover:text-amber-700 dark:hover:text-amber-300">
                    Ir a Proveedores
                  </Link>{" "}
                  para crearlo de forma permanente.
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  id="showPartnerText"
                  checked={showPartnerText}
                  onCheckedChange={(v) => setShowPartnerText(!!v)}
                />
                <Label htmlFor="showPartnerText" className="text-xs text-muted-foreground cursor-pointer leading-tight">
                  Mostrar párrafo de "Partner oficial" en la oferta
                </Label>
              </div>
            </div>

            {/* Language toggle — solo al crear, no al editar */}
            {!quotation && (
              <div className="mt-3">
                <Label className="flex items-center gap-1.5 mb-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  Idioma de la propuesta
                </Label>
                <div className="flex rounded-md border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setLanguage('es')}
                    className={cn("flex-1 py-2 px-3 text-sm font-medium transition-colors",
                      language === 'es' ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted text-muted-foreground")}
                  >
                    🇪🇸 Español
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={cn("flex-1 py-2 px-3 text-sm font-medium transition-colors border-l",
                      language === 'en' ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted text-muted-foreground")}
                  >
                    🇺🇸 English
                  </button>
                </div>
              </div>
            )}
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
                <ProspectCombobox
                  prospects={prospects}
                  value={selectedProspectId}
                  onChange={handleProspectChange}
                />
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
                    {[...contacts].sort((a, b) => {
                      const aMatch = a.clientId === selectedClientId ? 0 : 1;
                      const bMatch = b.clientId === selectedClientId ? 0 : 1;
                      return aMatch - bMatch;
                    }).map((ct) => (
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
                <div className="flex gap-2">
                  <Select value={clientData.gender} onValueChange={(v) => setClientData((prev) => ({ ...prev, gender: v as "Sr." | "Sra." }))}>
                    <SelectTrigger className="w-[80px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sr.">Sr.</SelectItem>
                      <SelectItem value="Sra.">Sra.</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={clientData.attention} onChange={(e) => setClientData((prev) => ({ ...prev, attention: e.target.value }))} className="flex-1" />
                </div>
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
                          return { id: crypto.randomUUID(), description: desc, quantity: qty, unitPriceUSD: price, totalUSD: qty * price, unitCostUSD: 0, itemMarginPercent: null };
                        });
                      if (imported.length > 0) setLineItems((prev) => [...prev, ...imported]);
                    };
                    reader.readAsArrayBuffer(file);
                    e.target.value = "";
                  }}
                />
                <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Agregar Ítem</Button>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer select-none mt-1">
                <input
                  type="checkbox"
                  checked={showItemSubtotals}
                  onChange={(e) => setShowItemSubtotals(e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                <span className="text-xs text-muted-foreground">Subtotales por grupo</span>
              </label>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs w-8">N°</th>
                    {showItemSubtotals && <th className="text-center py-2 px-1 font-medium text-muted-foreground text-xs w-16">Grp.</th>}
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Descripción</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs w-20">Cant.</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs w-28">Costo</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs w-20">Moneda Costo</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs w-28">Costo Dist.</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs w-28">Costo Total</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs w-24">Margen %</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs w-28">P. Unit. USD</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs w-28">Total USD</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, itemIdx) => {
                    const unitDistCost = computeItemUnitDist(item, lineItems, distributedCosts);
                    const costUnitTotal = (item.unitCostUSD + unitDistCost) * item.quantity;
                    const sym = "$";
                    return (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2 px-2 text-center text-xs text-muted-foreground font-medium">{itemIdx + 1}</td>
                        {showItemSubtotals && (
                          <td className="py-2 px-1">
                            <Select value={item.subtotalGroup ?? "none"} onValueChange={(v) => updateItem(item.id, "subtotalGroup", v === "none" ? undefined : v)}>
                              <SelectTrigger className="h-8 text-xs w-14"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                <SelectItem value="A">A</SelectItem>
                                <SelectItem value="B">B</SelectItem>
                                <SelectItem value="C">C</SelectItem>
                                <SelectItem value="D">D</SelectItem>
                                <SelectItem value="E">E</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                        )}
                        <td className="py-2 px-3">
                          <RichTextEditor
                            value={item.description}
                            onChange={(val) => updateItem(item.id, "description", val)}
                            placeholder="Descripción del ítem"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                            className="h-8 text-xs text-center px-1"
                            min={1}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            value={item.unitCostUSD || ""}
                            onChange={(e) => updateItem(item.id, "unitCostUSD", Number(e.target.value))}
                            className="h-8 text-xs text-right px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            min={0}
                            placeholder="0"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <Select value={item.costCurrency ?? "USD"} onValueChange={(v) => updateItem(item.id, "costCurrency", v)}>
                            <SelectTrigger className="h-8 text-xs w-16"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="DOP">DOP</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 px-3 text-right text-xs text-muted-foreground">
                          {unitDistCost > 0 ? `$${unitDistCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="py-2 px-3 text-right text-xs font-medium">
                          {costUnitTotal > 0 ? `$${costUnitTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            value={item.itemMarginPercent ?? ""}
                            onChange={(e) => updateItem(item.id, "itemMarginPercent", e.target.value === "" ? null : Number(e.target.value))}
                            className="h-8 text-xs text-right px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            min={0}
                            max={99.99}
                            step={0.01}
                            placeholder="—"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            value={item.unitPriceUSD}
                            onChange={(e) => updateItem(item.id, "unitPriceUSD", Number(e.target.value))}
                            className="h-8 text-xs text-right px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            min={0}
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-xs">{sym}{item.totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-2 px-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {lineItems.length === 0 && (
                    <tr>
                      <td colSpan={showItemSubtotals ? 12 : 11} className="py-6 text-center text-muted-foreground text-xs">
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
                  <Select value={currency} onValueChange={(v) => { setCurrency(v as QuotationCurrency); if (v === "USD") { setExchangeRate(1); setIsOriginalCurrency(false); } }}>
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
                  {currency !== "USD" && !isOriginalCurrency && (
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
              {(() => {
                return (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium">${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    {applyItbis && <div className="flex justify-between"><span className="text-muted-foreground">ITBIS ({itbisPercent}%):</span><span className="font-medium">${itbisUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                    <div className="flex justify-between font-semibold text-base border-t pt-1"><span>Total USD:</span><span className="text-primary">${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    {currency !== "USD" && exchangeRate > 0 && (
                      <div className="flex justify-between font-semibold text-sm text-muted-foreground">
                        <span>Total {currency}:</span>
                        <span>{CURRENCIES.find((c) => c.key === currency)?.symbol}{(totalUSD * exchangeRate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Costos internos */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Costos Internos</h3>
            <div className="space-y-4">
              {/* Margen general */}
              <div className="flex items-end gap-3 p-3 rounded-lg bg-muted/30 border">
                <div className="flex-1">
                  <Label className="text-xs">Aplicar Margen General a ítems con costo</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Aplica el % a todos los ítems que tengan costo unitario definido, recalculando su precio.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={generalMarginInput || ""}
                    onChange={(e) => setGeneralMarginInput(Number(e.target.value) || 0)}
                    className="w-20 h-8 text-xs text-right"
                    min={0}
                    max={99.99}
                    step={0.01}
                    placeholder="0"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                  <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={applyGeneralMargin}>
                    Aplicar
                  </Button>
                </div>
              </div>

              {/* Costos Distribuidos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-semibold">Costos Distribuidos</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground"
                    onClick={() => setDistributedCosts((prev) => [...prev, { id: `dc-${Date.now()}`, label: "", amountUSD: 0 }])}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Agregar
                  </Button>
                </div>
                {distributedCosts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Sin costos distribuidos. Ej: transporte, flete, aduanas.</p>
                ) : (
                  <div className="space-y-2">
                    {distributedCosts.map((entry) => (
                      <div key={entry.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Input
                            value={entry.label}
                            onChange={(e) => setDistributedCosts((prev) => prev.map((c) => c.id === entry.id ? { ...c, label: e.target.value } : c))}
                            className="h-8 text-xs flex-1"
                            placeholder="Ej: Transporte marítimo"
                          />
                          <Input
                            type="number"
                            value={entry.amountUSD || ""}
                            onChange={(e) => setDistributedCosts((prev) => prev.map((c) => c.id === entry.id ? { ...c, amountUSD: Number(e.target.value) || 0 } : c))}
                            className="h-8 text-xs w-28 text-right"
                            min={0}
                            placeholder="0.00"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setDistributedCosts((prev) => prev.filter((c) => c.id !== entry.id))}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        {lineItems.length > 1 && (
                          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap pl-1">
                            <span className="text-[10px] text-muted-foreground shrink-0">Aplicar a:</span>
                            {lineItems.map((li, idx) => {
                              const included = !entry.itemIds || entry.itemIds.length === 0 || entry.itemIds.includes(li.id);
                              return (
                                <label key={li.id} className="flex items-center gap-1 text-[10px] cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={included}
                                    className="h-3 w-3"
                                    onChange={(e) => {
                                      setDistributedCosts((prev) => prev.map((c) => {
                                        if (c.id !== entry.id) return c;
                                        const current = c.itemIds && c.itemIds.length > 0 ? [...c.itemIds] : lineItems.map(l => l.id);
                                        const next = e.target.checked
                                          ? current.includes(li.id) ? current : [...current, li.id]
                                          : current.filter(id => id !== li.id);
                                        const allSelected = lineItems.every(l => next.includes(l.id));
                                        return { ...c, itemIds: allSelected ? [] : next };
                                      }));
                                    }}
                                  />
                                  <span className="text-muted-foreground">Ítem {idx + 1}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Costo manual (fallback cuando no hay costos detallados) */}
              {!hasDetailedCosts && (
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label className="text-xs">Costo Total USD (manual)</Label>
                    <Input type="number" value={costUSD || ""} onChange={(e) => setCostUSD(Number(e.target.value) || 0)} className="h-8 text-xs mt-1" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Se usa cuando no hay costos por ítem ni distribuidos.</p>
                  </div>
                </div>
              )}

              {/* Resumen de costos */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5 text-xs">
                {hasDetailedCosts && itemsCostTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground"><span>Costo ítems:</span><span>${itemsCostTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                )}
                {distributedTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground"><span>Costos distribuidos:</span><span>${distributedTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                )}
                <div className="flex justify-between font-semibold border-t pt-1.5"><span>Costo total:</span><span>${effectiveCostUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between font-semibold text-sinem-success"><span>Margen:</span><span>{marginPercent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% — ${marginUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
              </div>
            </div>
          </div>

          {/* Condiciones Comerciales */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Condiciones Comerciales</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Forma de Pago</Label>
                <Textarea value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Ej: 50% anticipo, 50% contra entrega" rows={2} className="resize-y" />
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
                <Input value={deliveryTimeNote} onChange={(e) => setDeliveryTimeNote(e.target.value)} placeholder="Nota adicional (opcional)" className="mt-2" />
              </div>
              <div>
                <Label>Validez (días)</Label>
                <Input type="number" value={validityDays} onChange={(e) => setValidityDays(e.target.value === "" ? 0 : Number(e.target.value))} min={0} />
              </div>
              <div>
                <Label>Lugar de Entrega</Label>
                <Input value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} placeholder="Ej: Santo Domingo, RD" />
              </div>
              <div className="col-span-2">
                <Label>Consideraciones Especiales</Label>
                <Textarea
                  value={specialConsiderations}
                  onChange={(e) => setSpecialConsiderations(e.target.value)}
                  placeholder="Ej: El equipo requiere instalación en sala climatizada. Se excluyen trabajos civiles."
                  rows={3}
                  className="resize-y"
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {/* Textos de la Propuesta */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setTextsExpanded(!textsExpanded)}
              className="flex items-center justify-between w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Condiciones y Garantía
              </h3>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {textsExpanded ? "Ocultar" : "Editar garantía, términos y condiciones"}
                {textsExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </span>
            </button>
            {textsExpanded && (
              <div className="p-4 space-y-4">
                {!quotation && language === 'en' && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <Globe className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                      Esta cotización está configurada en <strong>inglés</strong>. Recuerda redactar los textos personalizados (saludo, garantías, condiciones, cierre, etc.) en inglés para que aparezcan correctamente en la propuesta del cliente.
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Estos textos se pre-cargan desde la configuración global y pueden modificarse para esta cotización en particular.
                </p>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label>Saludo introductorio</Label>
                    <Textarea
                      rows={2}
                      value={proposalTexts.greetingText ?? ""}
                      onChange={(e) => setProposalTexts((p) => ({ ...p, greetingText: e.target.value }))}
                      className="resize-y"
                    />
                  </div>
                  <div>
                    <Label>Garantía</Label>
                    <Textarea
                      rows={4}
                      value={proposalTexts.warrantyText ?? ""}
                      onChange={(e) => setProposalTexts((p) => ({ ...p, warrantyText: e.target.value }))}
                      className="resize-y"
                    />
                  </div>
                  <div>
                    <Label>Responsabilidad</Label>
                    <Textarea
                      rows={3}
                      value={proposalTexts.responsibilityText ?? ""}
                      onChange={(e) => setProposalTexts((p) => ({ ...p, responsibilityText: e.target.value }))}
                      className="resize-y"
                    />
                  </div>
                  <div>
                    <Label>Riesgos</Label>
                    <Textarea
                      rows={3}
                      value={proposalTexts.risksText ?? ""}
                      onChange={(e) => setProposalTexts((p) => ({ ...p, risksText: e.target.value }))}
                      className="resize-y"
                    />
                  </div>
                  <div>
                    <Label>Instalación</Label>
                    <Textarea
                      rows={3}
                      value={proposalTexts.installationText ?? ""}
                      onChange={(e) => setProposalTexts((p) => ({ ...p, installationText: e.target.value }))}
                      className="resize-y"
                    />
                  </div>
                  <div>
                    <Label>Vigencia (texto adicional)</Label>
                    <Textarea
                      rows={2}
                      value={proposalTexts.validityText ?? ""}
                      onChange={(e) => setProposalTexts((p) => ({ ...p, validityText: e.target.value }))}
                      className="resize-y"
                    />
                  </div>
                  <div>
                    <Label>Devoluciones y/o cancelaciones</Label>
                    <Textarea
                      rows={3}
                      value={proposalTexts.returnsText ?? ""}
                      onChange={(e) => setProposalTexts((p) => ({ ...p, returnsText: e.target.value }))}
                      className="resize-y"
                    />
                  </div>
                  <div>
                    <Label>Términos y Condiciones</Label>
                    <Textarea
                      rows={6}
                      value={proposalTexts.legalClauses ?? ""}
                      onChange={(e) => setProposalTexts((p) => ({ ...p, legalClauses: e.target.value }))}
                      className="resize-y"
                    />
                  </div>
                  <div>
                    <Label>Texto de cierre</Label>
                    <Textarea
                      rows={2}
                      value={proposalTexts.closingText ?? ""}
                      onChange={(e) => setProposalTexts((p) => ({ ...p, closingText: e.target.value }))}
                      className="resize-y"
                    />
                  </div>
                </div>
              </div>
            )}
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
                          <div><span className="text-muted-foreground">Total USD:</span> <strong>${snap.totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                          <div><span className="text-muted-foreground">Costo USD:</span> <strong>${snap.costUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                          <div><span className="text-muted-foreground">Margen:</span> <strong>{snap.marginPercent}% (${snap.marginUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</strong></div>
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
                                    <td className="py-1 px-2" dangerouslySetInnerHTML={{ __html: li.description }} />
                                    <td className="py-1 px-2 text-center">{li.quantity}</td>
                                    <td className="py-1 px-2 text-right">${li.unitPriceUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="py-1 px-2 text-right">${li.totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {snap.notes && (
                          <p className="text-xs text-muted-foreground"><strong>Notas:</strong> {snap.notes}</p>
                        )}
                        <div className="flex justify-end pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => restoreVersion(snap)}
                            className="text-xs gap-1.5"
                          >
                            <RotateCcw className="h-3 w-3" /> Restaurar esta versión
                          </Button>
                        </div>
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
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                <CheckCircle2 className="h-5 w-5 text-sinem-success shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">Aprobada</p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Aprobada por <strong>{approverDisplayName ?? quotation.approvedBy ?? "—"}</strong>
                    {quotation.approvedAt && ` el ${quotation.approvedAt}`}
                  </p>
                </div>
                {currentUserHasSignature && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-xs h-7 border-green-300 text-green-800 hover:bg-green-100 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-900/30"
                    onClick={() => setShowUndoApproval(true)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" /> Deshacer
                  </Button>
                )}
              </div>
            )}
            {quotation.approvalStatus === "rejected" && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Rechazada</p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Rechazada por <strong>{approverDisplayName ?? quotation.approvedBy ?? "—"}</strong>
                    {quotation.approvedAt && ` el ${quotation.approvedAt}`}
                  </p>
                  {quotation.approvalNote && <p className="text-xs text-red-600 dark:text-red-400 mt-1">Motivo: {quotation.approvalNote}</p>}
                </div>
                {currentUserHasSignature && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-xs h-7 border-red-300 text-red-800 hover:bg-red-100 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-900/30"
                    onClick={() => setShowUndoApproval(true)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" /> Deshacer
                  </Button>
                )}
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
                        ? `Monto (${quotation.totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD) excede el límite del Gerente Comercial ($${generalSettings.managerApprovalLimit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Requiere aprobación de Administrador.`
                        : `Puede ser aprobada por Gerente Comercial o Administrador.`
                      }
                    </p>
                  </div>
                </div>
                {/* Only users with a signature configured can approve/reject */}
                {currentUserHasSignature ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-sinem-success hover:bg-sinem-success/90"
                      onClick={() => {
                        if (!onSave) return;
                        onSave({
                          ...quotation,
                          status: "aprobada",
                          approvalStatus: "approved",
                          approvedBy: authUser?.id ?? undefined,
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
                          approvedBy: authUser?.id ?? undefined,
                          approvedAt: new Date().toISOString().split("T")[0],
                          approvalNote: note || undefined,
                        });
                        onOpenChange(false);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Rechazar
                    </Button>
                  </div>
                ) : currentUserHasSignature === false ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    Solo usuarios con{" "}
                    <Link to="/perfil" className="underline hover:text-foreground">firma digital configurada</Link>
                    {" "}pueden aprobar o rechazar cotizaciones.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Version prompt — uses AlertDialog to properly layer on top of parent Dialog */}
        <AlertDialog open={showVersionPrompt} onOpenChange={setShowVersionPrompt}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <AlertDialogTitle>Guardar cambios</AlertDialogTitle>
                  <AlertDialogDescription>¿Cómo desea guardar los cambios en esta cotización?</AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>

            <div className="space-y-2">
              <button
                type="button"
                onClick={saveOverwrite}
                className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
              >
                <p className="font-medium text-sm group-hover:text-primary">Mantener versión actual (v{quotation?.version})</p>
                <p className="text-xs text-muted-foreground mt-0.5">Sobrescribe los datos de la versión actual sin crear historial.</p>
              </button>
              <button
                type="button"
                onClick={saveAsNewVersion}
                className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
              >
                <p className="font-medium text-sm group-hover:text-primary">Crear nueva versión (v{(quotation?.version ?? 0) + 1})</p>
                <p className="text-xs text-muted-foreground mt-0.5">Guarda la versión actual en el historial y crea una nueva versión con los cambios.</p>
              </button>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Undo approval confirmation */}
        <AlertDialog open={showUndoApproval} onOpenChange={setShowUndoApproval}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <AlertDialogTitle>Deshacer aprobación</AlertDialogTitle>
                  <AlertDialogDescription>
                    La cotización volverá a estado <strong>Pendiente</strong> y se eliminarán los datos del aprobador.
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => {
                  if (!onSave || !quotation) return;
                  onSave({
                    ...quotation,
                    approvalStatus: "pending",
                    approvedBy: undefined,
                    approvedAt: undefined,
                    approvalNote: undefined,
                  });
                  setShowUndoApproval(false);
                  onOpenChange(false);
                }}
              >
                Sí, deshacer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
