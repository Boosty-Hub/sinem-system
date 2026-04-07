import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QUOTATION_STATUSES, CURRENCIES, type Quotation } from "@/lib/types";
import { Search, Plus, FileText, ExternalLink, ShieldCheck, Clock, XCircle, Trash2, Loader2, Download } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import QuotationDialog from "@/components/cotizaciones/QuotationDialog";
import UserAvatar from "@/components/UserAvatar";
import { usePermissions } from "@/hooks/usePermissions";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/AuthContext";

export interface QuotationPrefill {
  prospectId?: string;
  clientId?: string;
  contactId?: string;
  subject?: string;
  customer?: string;
}

const Cotizaciones = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { canCreate: canCreateFn, canDelete: canDeleteFn } = usePermissions();
  const canCreateCot = canCreateFn("Cotizaciones");
  const canDeleteCot = canDeleteFn("Cotizaciones");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const [search, setSearch] = useState("");
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [prefill, setPrefill] = useState<QuotationPrefill | undefined>();
  const [searchParams, setSearchParams] = useSearchParams();

  const fetchQuotations = async () => {
    setLoading(true);
    const [{ data }, { data: lineItems }, { data: snapshots }] = await Promise.all([
      supabase.from("quotations").select("*").order("created_at", { ascending: false }),
      supabase.from("quotation_line_items").select("*"),
      supabase.from("quotation_snapshots").select("*").order("version", { ascending: true }),
    ]);

    const itemsByQuotation = new Map<string, any[]>();
    (lineItems ?? []).forEach((li) => {
      const list = itemsByQuotation.get(li.quotation_id) ?? [];
      list.push({
        id: li.id,
        description: li.description,
        quantity: li.quantity,
        unitPriceUSD: Number(li.unit_price_usd),
        totalUSD: Number(li.total_usd),
      });
      itemsByQuotation.set(li.quotation_id, list);
    });

    const historyByQuotation = new Map<string, any[]>();
    (snapshots ?? []).forEach((s: any) => {
      const list = historyByQuotation.get(s.quotation_id) ?? [];
      list.push({
        version: s.version,
        savedAt: s.saved_at?.split("T")[0] ?? "",
        modifiedBy: s.modified_by ?? undefined,
        code: s.code,
        subject: s.subject,
        lineItems: (s.line_items ?? []).map((li: any) => ({
          id: li.id ?? crypto.randomUUID(),
          description: li.description,
          quantity: li.quantity,
          unitPriceUSD: Number(li.unitPriceUSD ?? li.unit_price_usd ?? 0),
          totalUSD: Number(li.totalUSD ?? li.total_usd ?? 0),
        })),
        subtotalUSD: Number(s.subtotal_usd),
        totalUSD: Number(s.total_usd),
        costUSD: Number(s.cost_usd),
        marginPercent: Number(s.margin_percent),
        marginUSD: Number(s.margin_usd),
        paymentTerms: s.payment_terms,
        deliveryTerms: s.delivery_terms as any,
        deliveryWeeksMin: s.delivery_weeks_min,
        deliveryWeeksMax: s.delivery_weeks_max,
        validityDays: s.validity_days,
        deliveryLocation: s.delivery_location,
        notes: s.notes,
        status: s.status,
      });
      historyByQuotation.set(s.quotation_id, list);
    });

    setQuotations((data ?? []).map((q): Quotation => ({
      id: q.id,
      code: q.code,
      prospectId: q.prospect_id ?? undefined,
      clientId: q.client_id ?? undefined,
      contactId: q.contact_id ?? undefined,
      subject: q.subject,
      client: {
        company: q.client_company,
        attention: q.client_attention,
        address: q.client_address,
        phone: q.client_phone,
        email: q.client_email,
        rnc: q.client_rnc,
      },
      lineItems: (itemsByQuotation.get(q.id) ?? []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      subtotalUSD: Number(q.subtotal_usd),
      applyItbis: q.apply_itbis,
      itbisPercent: Number(q.itbis_percent),
      itbisUSD: Number(q.itbis_usd),
      totalUSD: Number(q.total_usd),
      costUSD: Number(q.cost_usd),
      marginPercent: Number(q.margin_percent),
      marginUSD: Number(q.margin_usd),
      paymentTerms: q.payment_terms,
      deliveryWeeksMin: q.delivery_weeks_min,
      deliveryWeeksMax: q.delivery_weeks_max,
      deliveryLocation: q.delivery_location,
      deliveryTerms: q.delivery_terms as any,
      validityDays: q.validity_days,
      notes: q.notes,
      status: q.status as any,
      createdAt: q.created_at?.split("T")[0] ?? "",
      createdBy: q.created_by ?? undefined,
      version: q.version,
      history: historyByQuotation.get(q.id) ?? [],
      approvalStatus: q.approval_status as any,
      approvalNote: q.approval_note ?? undefined,
      approvedBy: q.approved_by ?? undefined,
      approvedAt: q.approved_at ?? undefined,
      currency: q.currency as any,
      exchangeRate: Number(q.exchange_rate),
      isOriginalCurrency: (q as any).is_original_currency ?? false,
      partner: (q as any).partner ?? "Siemens",
    })));
    setLoading(false);
  };

  useEffect(() => { fetchQuotations(); }, []);

  useEffect(() => {
    const prospectId = searchParams.get("prospectId");
    if (prospectId) {
      const pf: QuotationPrefill = { prospectId };
      const clientId = searchParams.get("clientId");
      const contactId = searchParams.get("contactId");
      const subject = searchParams.get("subject");
      const customer = searchParams.get("customer");
      if (clientId) pf.clientId = clientId;
      if (contactId) pf.contactId = contactId;
      if (subject) pf.subject = subject;
      if (customer) pf.customer = customer;
      setPrefill(pf);
      setSelectedQuotation(null);
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = quotations.filter((q) => {
    const matchesSearch =
      q.subject.toLowerCase().includes(search.toLowerCase()) ||
      q.client.company.toLowerCase().includes(search.toLowerCase()) ||
      q.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || q.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalValue = filtered.reduce((sum, q) => sum + q.totalUSD, 0);

  const handleEdit = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setDialogOpen(true);
  };

  const handleSave = async (updated: Quotation) => {
    // Resolve app_users.id from the auth user id
    let appUserId: string | null = null;
    if (user) {
      const { data: appUser } = await supabase
        .from("app_users")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      appUserId = appUser?.id ?? null;
    }

    // Persist to Supabase
    const quotationRow = {
      id: updated.id,
      code: updated.code,
      subject: updated.subject,
      status: updated.status,
      prospect_id: updated.prospectId ?? null,
      client_id: updated.clientId ?? null,
      contact_id: updated.contactId ?? null,
      client_company: updated.client.company,
      client_attention: updated.client.attention,
      client_address: updated.client.address,
      client_phone: updated.client.phone,
      client_email: updated.client.email,
      client_rnc: updated.client.rnc,
      subtotal_usd: updated.subtotalUSD,
      apply_itbis: updated.applyItbis,
      itbis_percent: updated.itbisPercent,
      itbis_usd: updated.itbisUSD,
      total_usd: updated.totalUSD,
      cost_usd: updated.costUSD,
      margin_percent: updated.marginPercent,
      margin_usd: updated.marginUSD,
      payment_terms: updated.paymentTerms,
      delivery_terms: updated.deliveryTerms,
      delivery_weeks_min: updated.deliveryWeeksMin,
      delivery_weeks_max: updated.deliveryWeeksMax,
      delivery_location: updated.deliveryLocation,
      validity_days: updated.validityDays,
      notes: updated.notes,
      version: updated.version,
      approval_status: updated.approvalStatus ?? "pending",
      approval_note: updated.approvalNote ?? null,
      approved_by: updated.approvedBy ?? null,
      approved_at: updated.approvedAt 
        ? (updated.approvedAt.includes("T") ? updated.approvedAt : `${updated.approvedAt}T00:00:00Z`) 
        : null,
      currency: updated.currency ?? "USD",
      exchange_rate: updated.exchangeRate ?? 1,
      is_original_currency: updated.isOriginalCurrency ?? false,
      partner: updated.partner ?? "Siemens",
      created_by: appUserId,
    };

    const exists = quotations.find((q) => q.id === updated.id);
    if (exists) {
      const { error } = await supabase.from("quotations").update(quotationRow).eq("id", updated.id);
      if (error) {
        toast({ title: "Error al actualizar cotización", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      // For new quotations, generate a proper UUID
      quotationRow.id = crypto.randomUUID();
      updated = { ...updated, id: quotationRow.id };
      const { error } = await supabase.from("quotations").insert(quotationRow);
      if (error) {
        toast({ title: "Error al crear cotización", description: error.message, variant: "destructive" });
        return;
      }
    }

    // Sync line items: delete old, insert new
    await supabase.from("quotation_line_items").delete().eq("quotation_id", quotationRow.id);
    if (updated.lineItems.length > 0) {
      const { error: liError } = await supabase.from("quotation_line_items").insert(
        updated.lineItems.map((li, idx) => ({
          id: crypto.randomUUID(),
          quotation_id: quotationRow.id,
          description: li.description,
          quantity: li.quantity,
          unit_price_usd: li.unitPriceUSD,
          total_usd: li.totalUSD,
          sort_order: idx,
        }))
      );
      if (liError) {
        toast({ title: "Error al guardar partidas", description: liError.message, variant: "destructive" });
      }
    }

    // Sync snapshots: delete old, insert current history
    await supabase.from("quotation_snapshots").delete().eq("quotation_id", quotationRow.id);
    if (updated.history.length > 0) {
      await supabase.from("quotation_snapshots").insert(
        updated.history.map((snap) => ({
          id: crypto.randomUUID(),
          quotation_id: quotationRow.id,
          version: snap.version,
          saved_at: snap.savedAt ? `${snap.savedAt}T00:00:00Z` : new Date().toISOString(),
          modified_by: snap.modifiedBy ?? null,
          code: snap.code,
          subject: snap.subject,
          line_items: snap.lineItems as any,
          subtotal_usd: snap.subtotalUSD,
          total_usd: snap.totalUSD,
          cost_usd: snap.costUSD,
          margin_percent: snap.marginPercent,
          margin_usd: snap.marginUSD,
          payment_terms: snap.paymentTerms,
          delivery_terms: snap.deliveryTerms,
          delivery_weeks_min: snap.deliveryWeeksMin,
          delivery_weeks_max: snap.deliveryWeeksMax,
          validity_days: snap.validityDays,
          delivery_location: snap.deliveryLocation,
          notes: snap.notes,
          status: snap.status,
        }))
      );
    }

    // Update local state
    setQuotations((prev) => {
      const idx = prev.findIndex((q) => q.id === updated.id);
      if (idx >= 0) return prev.map((q) => (q.id === updated.id ? updated : q));
      return [updated, ...prev];
    });
    setSelectedQuotation(updated);
  };

  const handleStatusChange = async (quotationId: string, newStatus: string) => {
    await supabase.from("quotations").update({ status: newStatus }).eq("id", quotationId);
    setQuotations((prev) => prev.map((q) => (q.id === quotationId ? { ...q, status: newStatus as Quotation["status"] } : q)));
  };

  const handleDelete = (quotation: Quotation) => setDeleteTarget(quotation);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("quotation_line_items").delete().eq("quotation_id", deleteTarget.id);
    await supabase.from("quotations").delete().eq("id", deleteTarget.id);
    toast({ title: "Cotización eliminada" });
    setDeleteTarget(null);
    fetchQuotations();
  };

  const getStatusConfig = (status: string) => {
    return QUOTATION_STATUSES.find((s) => s.key === status) ?? { label: status, color: "bg-muted" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cotizaciones</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length} cotizaciones · Total:{" "}
            <span className="font-semibold text-foreground">${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar cotización..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-[240px]" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">Todos los estados</option>
            {QUOTATION_STATUSES.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
          </select>
          {canCreateCot && (
            <Button onClick={() => { setSelectedQuotation(null); setDialogOpen(true); }} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Nueva Cotización
            </Button>
          )}
        </div>
      </div>

      <div className="stat-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-center py-3 px-4 font-medium text-muted-foreground w-10"></th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Código</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Asunto</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cliente</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Subtotal</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Margen</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Estado</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Aprobación</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fecha</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => {
                const statusCfg = getStatusConfig(q.status);
                return (
                  <tr key={q.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleEdit(q)}>
                    <td className="py-3 px-4 text-center">
                      <UserAvatar userId={q.createdBy} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-xs">{q.code}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium max-w-[250px] truncate">{q.subject}</td>
                    <td className="py-3 px-4 text-muted-foreground">{q.client.company}</td>
                    <td className="py-3 px-4 text-right">{q.isOriginalCurrency ? (CURRENCIES.find((c) => c.key === q.currency)?.symbol ?? "$") : "$"}{q.subtotalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right font-semibold text-primary">
                      {q.isOriginalCurrency ? (CURRENCIES.find((c) => c.key === q.currency)?.symbol ?? "$") : "$"}{q.totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {q.currency && q.currency !== "USD" && !q.isOriginalCurrency && (
                        <span className="block text-[10px] font-normal text-muted-foreground">
                          {CURRENCIES.find((c) => c.key === q.currency)?.symbol}{(q.totalUSD * q.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {q.currency}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sinem-success font-medium">{q.marginPercent}%</span>
                      <span className="text-muted-foreground text-xs ml-1">(${q.marginUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                    </td>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <select value={q.status} onChange={(e) => handleStatusChange(q.id, e.target.value)}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer appearance-none text-center text-white ${statusCfg.color}`}
                        style={{ backgroundImage: "none", paddingRight: "10px" }}>
                        {QUOTATION_STATUSES.map((s) => (<option key={s.key} value={s.key} className="text-foreground bg-background">{s.label}</option>))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {q.approvalStatus === "approved" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <ShieldCheck className="h-3 w-3" /> Aprobada
                        </span>
                      )}
                      {q.approvalStatus === "rejected" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <XCircle className="h-3 w-3" /> Rechazada
                        </span>
                      )}
                      {(q.approvalStatus === "pending" || !q.approvalStatus) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          <Clock className="h-3 w-3" /> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{q.createdAt}</td>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-0.5">
                        <Link to={`/oferta/${q.id}`} target="_blank">
                          <Button variant="ghost" size="sm" title="Ver oferta"><ExternalLink className="h-4 w-4" /></Button>
                        </Link>
                        <Link to={`/oferta/${q.id}?download=true`} target="_blank">
                          <Button variant="ghost" size="sm" title="Descargar PDF"><Download className="h-4 w-4" /></Button>
                        </Link>
                        {canDeleteCot && (
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(q)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="py-12 text-center text-muted-foreground">No se encontraron cotizaciones</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <QuotationDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setPrefill(undefined); }}
        quotation={selectedQuotation}
        prefill={prefill}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Eliminar Cotización"
        description={`¿Estás seguro de eliminar la cotización "${deleteTarget?.code}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default Cotizaciones;
