import { useState, useMemo, useEffect, useCallback } from "react";
import { DEFAULT_PIPELINE_STAGES, type Prospect, type Product, type PipelineStage, type Project } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Search, LayoutGrid, Table as TableIcon, Plus, Package, Settings2, Filter, X, Loader2, Upload, Trash2, ArrowRightLeft, XCircle, Download, AlertTriangle, ArrowUpDown } from "lucide-react";
import ProspectTrash from "@/components/crm/ProspectTrash";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CRMKanban from "@/components/crm/CRMKanban";
import CRMTable from "@/components/crm/CRMTable";
import ProspectDialog from "@/components/crm/ProspectDialog";
import ProductsDialog from "@/components/crm/ProductsDialog";
import StagesDialog from "@/components/crm/StagesDialog";
import ActivitySidebar from "@/components/crm/ActivitySidebar";
import ProspectImportDialog from "@/components/crm/ProspectImportDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import InvoiceDateDialog from "@/components/crm/InvoiceDateDialog";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { dbToProspect, prospectToDb, dbToProduct, dbToStage } from "@/lib/supabaseMappers";
import { useAuth } from "@/lib/AuthContext";
import { notifyAllExcept, createNotification } from "@/lib/notifications";

const CRM = () => {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const canCreateCRM = canCreate("CRM");
  const canEditCRM = canEdit("CRM");
  const canDeleteCRM = canDelete("CRM");
  const [view, setView] = useLocalStorage<"kanban" | "table">("sinem:crm:view", "kanban");
  const [search, setSearch] = useLocalStorage("sinem:crm:search", "");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [appUsers, setAppUsers] = useState<{ id: string; name: string }[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>(DEFAULT_PIPELINE_STAGES);
  const [loading, setLoading] = useState(true);
  const [currentAppUserId, setCurrentAppUserId] = useState<string | null>(null);

  // Resolve current auth user to app_users id
  useEffect(() => {
    if (!authUser) return;
    supabase.from("app_users").select("id").eq("auth_user_id", authUser.id).single()
      .then(({ data }) => setCurrentAppUserId(data?.id ?? null));
  }, [authUser]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productsDialogOpen, setProductsDialogOpen] = useState(false);
  const [stagesDialogOpen, setStagesDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [activityProspect, setActivityProspect] = useState<Prospect | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStage, setFilterStage] = useLocalStorage("sinem:crm:filterStage", "all");
  const [filterProduct, setFilterProduct] = useLocalStorage("sinem:crm:filterProduct", "all");
  const [filterCustomer, setFilterCustomer] = useLocalStorage("sinem:crm:filterCustomer", "all");
  const [filterBU, setFilterBU] = useLocalStorage("sinem:crm:filterBU", "all");
  const [filterProbMin, setFilterProbMin] = useLocalStorage("sinem:crm:filterProbMin", "");
  const [filterProbMax, setFilterProbMax] = useLocalStorage("sinem:crm:filterProbMax", "");
  const [filterPriceMin, setFilterPriceMin] = useLocalStorage("sinem:crm:filterPriceMin", "");
  const [filterPriceMax, setFilterPriceMax] = useLocalStorage("sinem:crm:filterPriceMax", "");
  const [filterResponsible, setFilterResponsible] = useLocalStorage("sinem:crm:filterResponsible", "all");
  const [kanbanSort, setKanbanSort] = useLocalStorage<"default" | "amount_desc" | "number_asc" | "number_desc" | "code_desc" | "code_asc">("sinem:crm:kanbanSort", "default");

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    const [{ data: dbProspects }, { data: dbProducts }, { data: dbStages }, { data: dbUsers }] = await Promise.all([
      supabase.from("prospects").select("*").is("deleted_at", null).order("cotorta", { ascending: true }),
      supabase.from("products").select("*").order("name"),
      supabase.from("pipeline_stages").select("*").order("sort_order"),
      supabase.from("app_users").select("id, name").eq("status", "activo").order("name"),
    ]);
    if (dbProspects) setProspects(dbProspects.map(dbToProspect));
    if (dbProducts) setProducts(dbProducts.map(dbToProduct));
    if (dbStages && dbStages.length > 0) setStages(dbStages.map(dbToStage));
    if (dbUsers) setAppUsers(dbUsers);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Unique values for selects
  const uniqueProducts = useMemo(() => [...new Set(prospects.map((p) => p.product).filter(Boolean))].sort(), [prospects]);
  const uniqueCustomers = useMemo(() => [...new Set(prospects.map((p) => p.directCustomer).filter(Boolean))].sort(), [prospects]);
  const uniqueBUs = useMemo(() => [...new Set(prospects.map((p) => p.bu).filter(Boolean))].sort(), [prospects]);

  const activeFilterCount = [filterStage !== "all", filterProduct !== "all", filterCustomer !== "all", filterBU !== "all", filterProbMin !== "", filterProbMax !== "", filterPriceMin !== "", filterPriceMax !== "", filterResponsible !== "all"].filter(Boolean).length;

  const clearFilters = () => {
    setFilterStage("all"); setFilterProduct("all"); setFilterCustomer("all"); setFilterBU("all");
    setFilterProbMin(""); setFilterProbMax(""); setFilterPriceMin(""); setFilterPriceMax(""); setFilterResponsible("all");
  };

  const filtered = prospects.filter((p) => {
    const s = search.toLowerCase();
    const matchSearch = !search ||
      p.projectName.toLowerCase().includes(s) ||
      p.directCustomer.toLowerCase().includes(s) ||
      p.endCustomer.toLowerCase().includes(s) ||
      p.product.toLowerCase().includes(s) ||
      p.code.toLowerCase().includes(s) ||
      String(p.cotorta).includes(s) ||
      p.bu.toLowerCase().includes(s) ||
      p.scope.toLowerCase().includes(s) ||
      p.proveedor.toLowerCase().includes(s);
    // "ganado" filter includes "facturada" too (matches Kanban grouping where the Ganado column shows both)
    const matchStage =
      filterStage === "all" ||
      p.status === filterStage ||
      (filterStage === "ganado" && p.status === "facturada");
    const matchProduct = filterProduct === "all" || p.product === filterProduct;
    const matchCustomer = filterCustomer === "all" || p.directCustomer === filterCustomer;
    const matchBU = filterBU === "all" || p.bu === filterBU;
    const matchProbMin = !filterProbMin || p.probability >= Number(filterProbMin);
    const matchProbMax = !filterProbMax || p.probability <= Number(filterProbMax);
    const matchPriceMin = !filterPriceMin || p.priceUSD >= Number(filterPriceMin);
    const matchPriceMax = !filterPriceMax || p.priceUSD <= Number(filterPriceMax);
    const matchResponsible = filterResponsible === "all" || p.assignedTo === filterResponsible;
    return matchSearch && matchStage && matchProduct && matchCustomer && matchBU && matchProbMin && matchProbMax && matchPriceMin && matchPriceMax && matchResponsible;
  });

  const sorted = useMemo(() => {
    if (kanbanSort === "default") return filtered;
    const copy = [...filtered];
    if (kanbanSort === "amount_desc") copy.sort((a, b) => b.priceUSD - a.priceUSD);
    else if (kanbanSort === "number_asc") copy.sort((a, b) => a.cotorta - b.cotorta);
    else if (kanbanSort === "number_desc") copy.sort((a, b) => b.cotorta - a.cotorta);
    else if (kanbanSort === "code_desc") copy.sort((a, b) => b.code.localeCompare(a.code));
    else if (kanbanSort === "code_asc") copy.sort((a, b) => a.code.localeCompare(b.code));
    return copy;
  }, [filtered, kanbanSort]);

  const totalPipeline = filtered.reduce((sum, p) => sum + p.priceUSD, 0);
  const totalWeighted = filtered.reduce((sum, p) => sum + p.weighted, 0);

  const missingClientProspects = prospects.filter((p) => !p.directCustomer && !p.endCustomer);

  const handleEdit = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setDialogOpen(true);
  };

  const handleExport = () => {
    const rows = filtered.map((p) => ({
      Código: p.code,
      "Nombre del Proyecto": p.projectName,
      "Cliente Directo": p.directCustomer,
      "Cliente Final": p.endCustomer,
      Proveedor: p.proveedor,
      BU: p.bu,
      Producto: p.product,
      Alcance: p.scope,
      "Costo USD": p.costUSD,
      "Precio USD": p.priceUSD,
      "GO%": p.go,
      "GET%": p.get,
      "Probabilidad%": p.probability,
      "Ponderado USD": p.weighted,
      "Margen%": p.marginPercent,
      "Margen USD": p.marginUSD,
      "OE Estimado": p.estimatedOE,
      Revenue: p.revenue,
      Estado: p.status,
      Comentarios: p.comments,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Oportunidades");
    XLSX.writeFile(wb, `CRM_Oportunidades_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast({ title: "Exportación completada", description: `${rows.length} oportunidades exportadas.` });
  };

  // ── Invoice date dialog state ──
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceProspectId, setInvoiceProspectId] = useState<string | null>(null);
  const invoiceProspect = prospects.find((p) => p.id === invoiceProspectId);

  const handleStageChange = async (prospectId: string, newStage: string) => {
    // Intercept facturada transition — show date picker
    if (newStage === "facturada") {
      const prospect = prospects.find((p) => p.id === prospectId);
      if (prospect?.status === "ganado") {
        setInvoiceProspectId(prospectId);
        setInvoiceDialogOpen(true);
        return;
      }
    }

    await executeStageChange(prospectId, newStage);
  };

  const handleInvoiceConfirm = async (dateStr: string) => {
    if (!invoiceProspectId) return;
    const oldProspect = prospects.find((p) => p.id === invoiceProspectId);
    setProspects((prev) =>
      prev.map((p) => (p.id === invoiceProspectId ? { ...p, status: "facturada", invoicedAt: dateStr, revenue: dateStr } : p))
    );
    const { error } = await supabase
      .from("prospects")
      .update({ status: "facturada", invoiced_at: dateStr, revenue: dateStr } as any)
      .eq("id", invoiceProspectId);
    if (error) {
      setProspects((prev) =>
        prev.map((p) => (p.id === invoiceProspectId ? { ...p, status: oldProspect?.status ?? p.status, revenue: oldProspect?.revenue ?? p.revenue } : p))
      );
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setInvoiceProspectId(null);
  };

  // Crea el proyecto asociado a una oportunidad ganada si aún no existe.
  // Reutilizable: lo llaman el cambio de etapa (kanban), el guardado por diálogo
  // y el cambio masivo de estado, para que ninguna ruta deje proyectos sin crear.
  const ensureProjectForProspect = async (prospect: Prospect): Promise<boolean> => {
    const { data: existingProj } = await supabase
      .from("projects")
      .select("id")
      .eq("origin_prospect_id", prospect.id)
      .maybeSingle();
    if (existingProj) return false;

    const { error: projError } = await supabase.from("projects").insert({
      name: prospect.projectName,
      client: prospect.directCustomer,
      value: prospect.priceUSD,
      current_step: 1,
      status: "activo",
      origin_prospect_id: prospect.id,
      client_id: prospect.clientId ?? null,
      start_date: new Date().toISOString().split("T")[0],
    } as any);
    if (projError) {
      console.error("Error creating project:", projError);
      return false;
    }
    return true;
  };

  const executeStageChange = async (prospectId: string, newStage: string) => {
    const oldProspect = prospects.find((p) => p.id === prospectId);
    if (!oldProspect) return;

    setProspects((prev) =>
      prev.map((p) => (p.id === prospectId ? { ...p, status: newStage } : p))
    );
    const { error } = await supabase.from("prospects").update({ status: newStage }).eq("id", prospectId);
    if (error) {
      setProspects((prev) =>
        prev.map((p) => (p.id === prospectId ? { ...p, status: oldProspect.status } : p))
      );
      toast({ title: "Error al mover oportunidad", description: `No se pudo cambiar la etapa: ${error.message}`, variant: "destructive" });
      return;
    }

    // Auto-update Revenue date when opportunity is won — use approved quotation's delivery time
    if (newStage === "ganado") {
      const { data: prospectRow } = await supabase
        .from("prospects")
        .select("estimated_oe, revenue")
        .eq("id", prospectId)
        .maybeSingle();

      const { data: linkedQuot } = await supabase
        .from("quotations")
        .select("delivery_weeks_max, delivery_weeks_min, approval_status, approved_at, updated_at")
        .eq("prospect_id", prospectId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (linkedQuot) {
        const weeks = (linkedQuot as any).delivery_weeks_max || (linkedQuot as any).delivery_weeks_min || 0;
        if (weeks > 0) {
          const estOE = (prospectRow as any)?.estimated_oe as string | null | undefined;
          let baseDate: Date;
          if (estOE) {
            baseDate = new Date(`${estOE}T00:00:00Z`);
          } else if ((linkedQuot as any).approved_at) {
            baseDate = new Date((linkedQuot as any).approved_at);
          } else {
            baseDate = new Date();
          }
          baseDate.setUTCDate(baseDate.getUTCDate() + weeks * 7);
          const projectedRevenue = baseDate.toISOString().split("T")[0];
          await supabase.from("prospects").update({ revenue: projectedRevenue }).eq("id", prospectId);
          setProspects((prev) => prev.map((p) => (p.id === prospectId ? { ...p, revenue: projectedRevenue } : p)));
        }
      }

      // Auto-create project
      const created = await ensureProjectForProspect(oldProspect);
      if (created) {
        toast({ title: "Proyecto creado", description: `Se creó el proyecto "${oldProspect.projectName}" automáticamente.` });
      }
    }
  };

  const handleDelete = async (id: string) => {
    setProspects((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("prospects").update({
      deleted_at: new Date().toISOString(),
      deleted_by: authUser?.id ?? null,
    }).eq("id", id);
  };

  // ── Bulk actions ──
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkStageTarget, setBulkStageTarget] = useState<string | null>(null);

  const handleBulkDelete = async () => {
    const ids = selectedIds;
    setProspects(prev => prev.filter(p => !ids.includes(p.id)));
    setSelectedIds([]);
    const now = new Date().toISOString();
    for (const id of ids) {
      await supabase.from("prospects").update({
        deleted_at: now,
        deleted_by: authUser?.id ?? null,
      }).eq("id", id);
    }
    toast({ title: "Enviadas a papelera", description: `${ids.length} oportunidad(es) movida(s) a la papelera.` });
  };

  const handleBulkStageChange = async (newStage: string) => {
    const ids = selectedIds;
    const affected = prospects.filter(p => ids.includes(p.id));
    setProspects(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: newStage } : p));
    setSelectedIds([]);
    let projectsCreated = 0;
    for (const id of ids) {
      await supabase.from("prospects").update({ status: newStage }).eq("id", id);
    }
    // Si se mueven masivamente a "ganado", crear sus proyectos como en las otras rutas.
    if (newStage === "ganado") {
      for (const prospect of affected) {
        const created = await ensureProjectForProspect(prospect);
        if (created) projectsCreated++;
      }
    }
    const stageLabel = stages.find(s => s.key === newStage)?.label ?? newStage;
    const projectsNote = projectsCreated > 0 ? ` Se crearon ${projectsCreated} proyecto(s).` : "";
    toast({ title: "Status actualizado", description: `${ids.length} oportunidad(es) movida(s) a "${stageLabel}".${projectsNote}` });
    setBulkStageTarget(null);
  };

  const handleSaveProspect = async (saved: Prospect) => {
    const exists = prospects.find((p) => p.id === saved.id);
    if (exists) {
      setProspects((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
      const { id, ...rest } = prospectToDb(saved);
      const { error: updateError } = await supabase.from("prospects").update(rest).eq("id", saved.id);
      if (updateError) {
        setProspects((prev) => prev.map((p) => (p.id === saved.id ? exists : p)));
        toast({ title: "Error al guardar", description: updateError.message, variant: "destructive" });
        return;
      }

      // Auto-create project when status changed to "ganado" via dialog
      if (exists.status !== saved.status && saved.status === "ganado") {
        const created = await ensureProjectForProspect(saved);
        if (created) {
          toast({ title: "Proyecto creado", description: `Se creó el proyecto "${saved.projectName}" automáticamente.` });
        }
      }

      // Notify if status changed to "ganado"
      if (exists.status !== saved.status && saved.status === "ganado" && currentAppUserId) {
        notifyAllExcept(currentAppUserId, {
          type: "crm",
          title: "🎉 Oportunidad ganada",
          message: `La oportunidad ${saved.code} – ${saved.projectName} ha sido marcada como ganada.`,
          link: "/crm",
          referenceId: saved.id,
          referenceType: "prospect",
          triggeredBy: currentAppUserId,
        });
      }

      // Notify assigned user if assignment changed
      if (exists.assignedTo !== saved.assignedTo && saved.assignedTo && saved.assignedTo !== currentAppUserId) {
        createNotification({
          userId: saved.assignedTo,
          type: "crm",
          title: "Oportunidad asignada",
          message: `Se te ha asignado la oportunidad ${saved.code} – ${saved.projectName}.`,
          link: "/crm",
          referenceId: saved.id,
          referenceType: "prospect",
          triggeredBy: currentAppUserId ?? undefined,
        });
      }
    } else {
      setProspects((prev) => [saved, ...prev]);
      await supabase.from("prospects").insert(prospectToDb(saved));

      // Si la oportunidad se crea directamente en "ganado", crear su proyecto.
      if (saved.status === "ganado") {
        const created = await ensureProjectForProspect(saved);
        if (created) {
          toast({ title: "Proyecto creado", description: `Se creó el proyecto "${saved.projectName}" automáticamente.` });
        }
      }

      // Notify all users about new opportunity
      if (currentAppUserId) {
        notifyAllExcept(currentAppUserId, {
          type: "crm",
          title: "Nueva oportunidad",
          message: `Se ha creado la oportunidad ${saved.code} – ${saved.projectName}.`,
          link: "/crm",
          referenceId: saved.id,
          referenceType: "prospect",
          triggeredBy: currentAppUserId,
        });
      }
    }
  };

  // ── Products CRUD ──
  const handleSetProducts = async (fn: (prev: Product[]) => Product[]) => {
    const newProducts = fn(products);
    setProducts(newProducts);
    // Sync with Supabase - find diff
    const oldIds = new Set(products.map((p) => p.id));
    const newIds = new Set(newProducts.map((p) => p.id));
    // Deleted
    for (const old of products) {
      if (!newIds.has(old.id)) await supabase.from("products").delete().eq("id", old.id);
    }
    // Upserted
    for (const p of newProducts) {
      if (!oldIds.has(p.id)) {
        await supabase.from("products").insert({ id: p.id, name: p.name, category: p.category });
      } else {
        const old = products.find((o) => o.id === p.id);
        if (old && (old.name !== p.name || old.category !== p.category)) {
          await supabase.from("products").update({ name: p.name, category: p.category }).eq("id", p.id);
        }
      }
    }
  };

  // ── Stages CRUD ──
  const handleSetStages: React.Dispatch<React.SetStateAction<PipelineStage[]>> = async (action) => {
    const newStages = typeof action === "function" ? action(stages) : action;
    setStages(newStages);
    await supabase.from("pipeline_stages").delete().neq("id", 0);
    const inserts = newStages.map((s, i) => ({ key: s.key, label: s.label, color: s.color, sort_order: i }));
    if (inserts.length > 0) await supabase.from("pipeline_stages").insert(inserts);
  };

  const prospectCountByStage = useMemo(() =>
    prospects.reduce((acc, p) => { acc[p.status] = (acc[p.status] ?? 0) + 1; return acc; }, {} as Record<string, number>),
    [prospects]
  );

  const handleMigrateStage = async (fromKey: string, toKey: string | null) => {
    const affected = prospects.filter((p) => p.status === fromKey);
    if (affected.length === 0) return;
    const newStatus = toKey ?? "";
    setProspects((prev) => prev.map((p) => p.status === fromKey ? { ...p, status: newStatus } : p));
    if (toKey !== null) {
      await supabase.from("prospects").update({ status: toKey }).eq("status", fromKey);
    } else {
      await supabase.from("prospects").update({ status: "" }).eq("status", fromKey);
    }
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
      {missingClientProspects.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {missingClientProspects.length} oportunidad{missingClientProspects.length > 1 ? "es" : ""} sin cliente asignado
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-0.5 truncate">
              {missingClientProspects.slice(0, 5).map((p) => p.projectName).join(", ")}
              {missingClientProspects.length > 5 ? ` y ${missingClientProspects.length - 5} más...` : ""}
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM Pipeline</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-xs text-muted-foreground">{filtered.length} oportunidades</span>
            <span className="text-muted-foreground/40 text-xs">·</span>
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              Pipeline: ${totalPipeline.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium">
              Ponderado: ${totalWeighted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar oportunidad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-[240px]"
            />
          </div>
          <Button
            variant={filtersOpen || activeFilterCount > 0 ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-1" /> Filtros
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-white text-primary rounded-full w-4 h-4 text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Select value={kanbanSort} onValueChange={(v) => setKanbanSort(v as any)}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Orden por defecto</SelectItem>
              <SelectItem value="amount_desc">Monto: Mayor a menor</SelectItem>
              <SelectItem value="number_desc">N° Oportunidad: Recientes</SelectItem>
              <SelectItem value="number_asc">N° Oportunidad: Antiguas</SelectItem>
              <SelectItem value="code_desc">Código: Z → A</SelectItem>
              <SelectItem value="code_asc">Código: A → Z</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className={`p-2 transition-colors ${view === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("table")}
              className={`p-2 transition-colors ${view === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              <TableIcon className="h-4 w-4" />
            </button>
          </div>
          {canDeleteCRM && (
            <Button variant="outline" size="sm" onClick={() => setTrashOpen(true)} className="text-muted-foreground hover:text-destructive hover:border-destructive/50">
              <Trash2 className="h-4 w-4 mr-1" /> Papelera
            </Button>
          )}
          {canEditCRM && (
            <Button variant="outline" size="sm" onClick={() => setStagesDialogOpen(true)}>
              <Settings2 className="h-4 w-4 mr-1" /> Etapas
            </Button>
          )}
          {canEditCRM && (
            <Button variant="outline" size="sm" onClick={() => setProductsDialogOpen(true)}>
              <Package className="h-4 w-4 mr-1" /> Productos
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Exportar
          </Button>
          {canCreateCRM && (
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1" /> Importar
            </Button>
          )}
          {canCreateCRM && (
            <Button onClick={() => { setSelectedProspect(null); setDialogOpen(true); }} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Nueva Oportunidad
            </Button>
          )}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      {filtersOpen && (
        <div className="stat-card p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtros Avanzados</h3>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs text-muted-foreground">
                <X className="h-3 w-3 mr-1" /> Limpiar filtros
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Etapa</label>
              <Select value={filterStage} onValueChange={setFilterStage}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {stages.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${s.color}`} />
                        {s.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Producto</label>
              <Select value={filterProduct} onValueChange={setFilterProduct}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueProducts.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Cliente</label>
              <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueCustomers.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">BU</label>
              <Select value={filterBU} onValueChange={setFilterBU}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueBUs.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Probabilidad %</label>
              <div className="flex items-center gap-1">
                <Input type="number" placeholder="Min" value={filterProbMin} onChange={(e) => setFilterProbMin(e.target.value)} className="h-8 text-xs" min={0} max={100} />
                <span className="text-muted-foreground text-xs">-</span>
                <Input type="number" placeholder="Max" value={filterProbMax} onChange={(e) => setFilterProbMax(e.target.value)} className="h-8 text-xs" min={0} max={100} />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Precio USD</label>
              <div className="flex items-center gap-1">
                <Input type="number" placeholder="Min" value={filterPriceMin} onChange={(e) => setFilterPriceMin(e.target.value)} className="h-8 text-xs" min={0} />
                <span className="text-muted-foreground text-xs">-</span>
                <Input type="number" placeholder="Max" value={filterPriceMax} onChange={(e) => setFilterPriceMax(e.target.value)} className="h-8 text-xs" min={0} />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Responsable</label>
              <Select value={filterResponsible} onValueChange={setFilterResponsible}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {appUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {view === "kanban" ? (
        <CRMKanban prospects={sorted} onEdit={handleEdit} onStageChange={handleStageChange} onActivity={setActivityProspect} stages={stages} />
      ) : (
        <CRMTable prospects={sorted} onEdit={handleEdit} onActivity={setActivityProspect} onStageChange={handleStageChange} stages={stages} selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
      )}

      <ProspectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        prospect={selectedProspect}
        onSave={handleSaveProspect}
        onDelete={handleDelete}
        products={products}
        stages={stages}
        onOpenProducts={() => { setDialogOpen(false); setProductsDialogOpen(true); }}
      />

      <ProductsDialog
        open={productsDialogOpen}
        onOpenChange={setProductsDialogOpen}
        products={products}
        setProducts={handleSetProducts}
      />

      <StagesDialog
        open={stagesDialogOpen}
        onOpenChange={setStagesDialogOpen}
        stages={stages}
        setStages={handleSetStages}
        prospectCountByStage={prospectCountByStage}
        onMigrateStage={handleMigrateStage}
      />

      <ActivitySidebar
        prospectId={activityProspect?.id ?? ""}
        prospectName={activityProspect?.projectName ?? ""}
        open={!!activityProspect}
        onClose={() => setActivityProspect(null)}
      />

      <ProspectImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={fetchData}
      />

      <InvoiceDateDialog
        open={invoiceDialogOpen}
        onOpenChange={(open) => { setInvoiceDialogOpen(open); if (!open) setInvoiceProspectId(null); }}
        prospectName={invoiceProspect?.projectName ?? ""}
        onConfirm={handleInvoiceConfirm}
      />

      {/* Floating bulk actions bar */}
      {selectedIds.length > 0 && view === "table" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="flex items-center gap-3 bg-foreground text-background rounded-xl px-5 py-3 shadow-2xl">
            <span className="text-sm font-medium">{selectedIds.length} seleccionado(s)</span>
            <div className="h-5 w-px bg-background/20" />

            {/* Change stage */}
            <Select value="" onValueChange={(v) => { setBulkStageTarget(v); }}>
              <SelectTrigger className="h-8 w-[160px] bg-background/10 border-background/20 text-background text-xs">
                <div className="flex items-center gap-1.5">
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Cambiar status</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {stages.map(s => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Delete */}
            {canDeleteCRM && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setBulkConfirmOpen(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
              </Button>
            )}

            <div className="h-5 w-px bg-background/20" />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-background hover:bg-background/10" onClick={() => setSelectedIds([])}>
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ProspectTrash
        open={trashOpen}
        onOpenChange={setTrashOpen}
        authUserId={authUser?.id}
        onRecovered={fetchData}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title="Mover a papelera"
        description={`¿Mover ${selectedIds.length} oportunidad(es) a la papelera? Podrás recuperarlas en los próximos 30 días.`}
        onConfirm={handleBulkDelete}
      />

      {bulkStageTarget && (
        <ConfirmDialog
          open={!!bulkStageTarget}
          onOpenChange={(open) => { if (!open) setBulkStageTarget(null); }}
          title="Cambiar status"
          description={`¿Mover ${selectedIds.length} oportunidad(es) a "${stages.find(s => s.key === bulkStageTarget)?.label ?? bulkStageTarget}"?`}
          confirmLabel="Confirmar"
          onConfirm={() => handleBulkStageChange(bulkStageTarget)}
        />
      )}
    </div>
  );
};

export default CRM;
