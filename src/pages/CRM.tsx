import { useState, useMemo, useEffect, useCallback } from "react";
import { DEFAULT_PIPELINE_STAGES, type Prospect, type Product, type PipelineStage, type Project } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Search, LayoutGrid, Table as TableIcon, Plus, Package, Settings2, Filter, X, Loader2, Upload, Trash2, ArrowRightLeft, XCircle } from "lucide-react";
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
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { dbToProspect, prospectToDb, dbToProduct, dbToStage } from "@/lib/supabaseMappers";

const CRM = () => {
  const { toast } = useToast();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const canCreateCRM = canCreate("CRM");
  const canEditCRM = canEdit("CRM");
  const canDeleteCRM = canDelete("CRM");
  const [view, setView] = useLocalStorage<"kanban" | "table">("sinem:crm:view", "kanban");
  const [search, setSearch] = useState("");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [appUsers, setAppUsers] = useState<{ id: string; name: string }[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>(DEFAULT_PIPELINE_STAGES);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productsDialogOpen, setProductsDialogOpen] = useState(false);
  const [stagesDialogOpen, setStagesDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [activityProspect, setActivityProspect] = useState<Prospect | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStage, setFilterStage] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterCustomer, setFilterCustomer] = useState("all");
  const [filterBU, setFilterBU] = useState("all");
  const [filterProbMin, setFilterProbMin] = useState("");
  const [filterProbMax, setFilterProbMax] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [filterResponsible, setFilterResponsible] = useState("all");

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    const [{ data: dbProspects }, { data: dbProducts }, { data: dbStages }, { data: dbUsers }] = await Promise.all([
      supabase.from("prospects").select("*").order("cotorta", { ascending: true }),
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
    const matchStage = filterStage === "all" || p.status === filterStage;
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

  const totalPipeline = filtered.reduce((sum, p) => sum + p.priceUSD, 0);
  const totalWeighted = filtered.reduce((sum, p) => sum + p.weighted, 0);

  const handleEdit = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setDialogOpen(true);
  };

  const handleStageChange = async (prospectId: string, newStage: string) => {
    const oldProspect = prospects.find((p) => p.id === prospectId);
    setProspects((prev) =>
      prev.map((p) => (p.id === prospectId ? { ...p, status: newStage } : p))
    );
    const { error } = await supabase.from("prospects").update({ status: newStage }).eq("id", prospectId);
    if (error) {
      // Revert optimistic update
      setProspects((prev) =>
        prev.map((p) => (p.id === prospectId ? { ...p, status: oldProspect?.status ?? p.status } : p))
      );
      toast({ title: "Error al mover oportunidad", description: `No se pudo cambiar la etapa: ${error.message}`, variant: "destructive" });
      return;
    }

    // Auto-create project when opportunity is won
    if (newStage === "ganado") {
      const prospect = prospects.find((p) => p.id === prospectId);
      if (!prospect) return;
      // Check if project already exists
      const { data: existingProj } = await supabase.from("projects").select("id").eq("origin_prospect_id", prospectId).maybeSingle();
      if (existingProj) return;

      await supabase.from("projects").insert({
        name: prospect.projectName,
        client: prospect.directCustomer,
        value: prospect.priceUSD,
        current_step: 1,
        status: "activo",
        origin_prospect_id: prospectId,
        client_id: prospect.clientId ?? null,
      });
      toast({ title: "Proyecto creado", description: `Se creó el proyecto "${prospect.projectName}" automáticamente.` });
    }
  };

  const handleDelete = async (id: string) => {
    setProspects((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("prospects").delete().eq("id", id);
  };

  // ── Bulk actions ──
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkStageTarget, setBulkStageTarget] = useState<string | null>(null);

  const handleBulkDelete = async () => {
    const ids = selectedIds;
    setProspects(prev => prev.filter(p => !ids.includes(p.id)));
    setSelectedIds([]);
    for (const id of ids) {
      await supabase.from("prospects").delete().eq("id", id);
    }
    toast({ title: "Eliminados", description: `${ids.length} oportunidad(es) eliminada(s).` });
  };

  const handleBulkStageChange = async (newStage: string) => {
    const ids = selectedIds;
    setProspects(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: newStage } : p));
    setSelectedIds([]);
    for (const id of ids) {
      await supabase.from("prospects").update({ status: newStage }).eq("id", id);
    }
    const stageLabel = stages.find(s => s.key === newStage)?.label ?? newStage;
    toast({ title: "Status actualizado", description: `${ids.length} oportunidad(es) movida(s) a "${stageLabel}".` });
    setBulkStageTarget(null);
  };

  const handleSaveProspect = async (saved: Prospect) => {
    const exists = prospects.find((p) => p.id === saved.id);
    if (exists) {
      setProspects((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
      const { id, ...rest } = prospectToDb(saved);
      await supabase.from("prospects").update(rest).eq("id", saved.id);
    } else {
      setProspects((prev) => [saved, ...prev]);
      await supabase.from("prospects").insert(prospectToDb(saved));
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
    // Replace all stages
    await supabase.from("pipeline_stages").delete().neq("id", 0); // delete all
    const inserts = newStages.map((s, i) => ({ key: s.key, label: s.label, color: s.color, sort_order: i }));
    if (inserts.length > 0) await supabase.from("pipeline_stages").insert(inserts);
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
          <h1 className="text-2xl font-bold tracking-tight">CRM Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length} oportunidades · Pipeline: <span className="font-semibold text-foreground">${totalPipeline.toLocaleString()}</span>
            {" · "}Ponderado: <span className="font-semibold text-foreground">${totalWeighted.toLocaleString()}</span>
          </p>
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
        <CRMKanban prospects={filtered} onEdit={handleEdit} onStageChange={handleStageChange} onActivity={setActivityProspect} stages={stages} />
      ) : (
        <CRMTable prospects={filtered} onEdit={handleEdit} onActivity={setActivityProspect} onStageChange={handleStageChange} stages={stages} selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
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

      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title="Eliminar oportunidades"
        description={`¿Estás seguro que deseas eliminar ${selectedIds.length} oportunidad(es)? Esta acción no se puede deshacer.`}
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
