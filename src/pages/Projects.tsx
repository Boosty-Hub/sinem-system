import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { PROJECT_STEPS } from "@/lib/types";
import { Search, Plus, FolderOpen, CheckCircle2, PauseCircle, Trash2, Pencil, Loader2, Check, ChevronsUpDown, Target, User, Filter, X, ChevronUp, ChevronDown, ChevronsUpDown as SortIcon } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/lib/AuthContext";
import ConfirmDialog from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { useRequiredFields } from "@/hooks/useRequiredFields";
import { computeTimeProgress, parseFlexibleDate, type ProjectProgress } from "@/lib/projectProgress";

interface ProjectRow {
  id: string;
  name: string;
  client: string;
  value: number;
  current_step: number;
  status: string;
  start_date: string | null;
  origin_prospect_id: string | null;
  assigned_to: string | null;
  code?: string;
}

interface WonProspect {
  id: string;
  code: string;
  project_name: string;
  direct_customer: string;
  price_usd: number;
  client_id: string | null;
}

const formatDuration = (days: number): string => {
  if (days <= 0) return "0 días";
  if (days < 14) return `${days} día${days === 1 ? "" : "s"}`;
  if (days < 60) {
    const w = Math.round(days / 7);
    return `${w} semana${w === 1 ? "" : "s"}`;
  }
  const m = Math.round(days / 30);
  return `${m} mes${m === 1 ? "" : "es"}`;
};

const formatDateLabel = (s: string | null | undefined): string => {
  const d = parseFlexibleDate(s);
  if (!d) return s ?? "—";
  return d.toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
};

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  activo: { label: "Activo", icon: FolderOpen, className: "text-sinem-teal bg-accent" },
  completado: { label: "Completado", icon: CheckCircle2, className: "text-sinem-success bg-sinem-success/10" },
  pausado: { label: "Pausado", icon: PauseCircle, className: "text-sinem-warning bg-sinem-warning/10" },
};

const emptyForm = {
  name: "",
  client: "",
  value: "",
  currentStep: "1",
  status: "activo",
  startDate: "",
  prospectId: "",
  assignedTo: "",
};

const TOTAL_STEPS = 11;

const Projects = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fields: reqFields } = useRequiredFields("proyecto");
  const { user } = useAuth();
  const { canCreate: canCreateFn, canEdit: canEditFn, canDelete: canDeleteFn, roleName } = usePermissions();
  const canCreateProj = canCreateFn("Proyectos");
  const canEditProj = canEditFn("Proyectos");
  const canDeleteProj = canDeleteFn("Proyectos");
  const canChangeProjectStatus = roleName === "Administrador" || user?.email === "isaias.infante@sinem.energy";
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [allProjects, setAllProjects] = useState<ProjectRow[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ProjectProgress>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ProjectRow | null>(null);
  const [wonProspects, setWonProspects] = useState<WonProspect[]>([]);
  const [prospectPopoverOpen, setProspectPopoverOpen] = useState(false);
  const [appUsers, setAppUsers] = useState<{ id: string; name: string; avatarUrl: string }[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useLocalStorage("sinem:projects:filterStatus", "all");
  const [filterClient, setFilterClient] = useLocalStorage("sinem:projects:filterClient", "all");
  const [filterResponsible, setFilterResponsible] = useLocalStorage("sinem:projects:filterResponsible", "all");
  const [filterStep, setFilterStep] = useLocalStorage("sinem:projects:filterStep", "all");
  const [sortKey, setSortKey] = useState<"code" | "name" | "client" | "value" | "current_step" | "progress" | "status" | "start_date">("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const fetchProjects = async () => {
    setLoading(true);
    const { data: projectsData } = await supabase.from("projects").select("id, name, client, value, current_step, status, start_date, origin_prospect_id, assigned_to").order("created_at", { ascending: false });

    // Fetch prospect data (code + dates) for projects with origin_prospect_id
    const prospectIds = (projectsData ?? []).map(p => p.origin_prospect_id).filter(Boolean);
    let prospectMap: Record<string, { code: string; estimated_oe: string | null; revenue: string | null }> = {};
    if (prospectIds.length > 0) {
      const { data: prospects } = await supabase
        .from("prospects")
        .select("id, code, estimated_oe, revenue")
        .in("id", prospectIds);
      prospectMap = (prospects ?? []).reduce((acc, p: any) => ({
        ...acc,
        [p.id]: { code: p.code, estimated_oe: p.estimated_oe ?? null, revenue: p.revenue ?? null },
      }), {});
    }

    setAllProjects((projectsData ?? []).map(p => ({
      ...p,
      code: p.origin_prospect_id ? prospectMap[p.origin_prospect_id]?.code : undefined,
    })) as ProjectRow[]);

    // Build progress map from prospect dates (Order Entry → Revenue)
    const map: Record<string, ProjectProgress> = {};
    for (const p of projectsData ?? []) {
      const pr = p.origin_prospect_id ? prospectMap[p.origin_prospect_id] : null;
      map[p.id] = computeTimeProgress(pr?.estimated_oe, pr?.revenue, p.start_date, p.current_step);
    }
    setProgressMap(map);

    setLoading(false);
  };

  const fetchAppUsers = async () => {
    const { data } = await supabase.from("app_users").select("id, name, avatar_url").eq("status", "activo");
    setAppUsers((data ?? []).map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatar_url })));
  };

  const fetchWonProspects = async () => {
    // Get won prospects that don't already have a project linked
    const { data: prospects } = await supabase
      .from("prospects")
      .select("id, code, project_name, direct_customer, price_usd, client_id")
      .in("status", ["ganado", "facturada"])
      .order("code");

    // Filter out prospects that already have a project
    const { data: linkedIds } = await supabase
      .from("projects")
      .select("origin_prospect_id")
      .not("origin_prospect_id", "is", null);

    const linkedSet = new Set((linkedIds ?? []).map(r => r.origin_prospect_id));
    setWonProspects((prospects ?? []).filter(p => !linkedSet.has(p.id)));
  };

  useEffect(() => { fetchProjects(); fetchAppUsers(); }, []);

  // Unique values for filters
  const uniqueClients = useMemo(() => [...new Set(allProjects.map((p) => p.client).filter(Boolean))].sort(), [allProjects]);

  const activeFilterCount = [filterStatus !== "all", filterClient !== "all", filterResponsible !== "all", filterStep !== "all"].filter(Boolean).length;

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterClient("all");
    setFilterResponsible("all");
    setFilterStep("all");
  };

  const projects = allProjects.filter((p) => {
    const s = search.toLowerCase();
    const matchSearch = !search ||
      p.name.toLowerCase().includes(s) ||
      p.client.toLowerCase().includes(s) ||
      (p.code?.toLowerCase().includes(s) ?? false);
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    const matchClient = filterClient === "all" || p.client === filterClient;
    const matchResponsible = filterResponsible === "all" || p.assigned_to === filterResponsible;
    const matchStep = filterStep === "all" || String(p.current_step) === filterStep;
    return matchSearch && matchStatus && matchClient && matchResponsible && matchStep;
  }).sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    const codeNum = (p: typeof a) => parseInt(p.code?.slice(0, 3) ?? "0", 10) || 0;
    switch (sortKey) {
      case "code":    return dir * (codeNum(a) - codeNum(b));
      case "name":    return dir * a.name.localeCompare(b.name);
      case "client":  return dir * a.client.localeCompare(b.client);
      case "value":   return dir * (a.value - b.value);
      case "current_step": return dir * (a.current_step - b.current_step);
      case "progress": return dir * ((progressMap[a.id]?.pct ?? 0) - (progressMap[b.id]?.pct ?? 0));
      case "status":  return dir * a.status.localeCompare(b.status);
      case "start_date": return dir * ((a.start_date ?? "").localeCompare(b.start_date ?? ""));
      default: return 0;
    }
  });

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortHeader = ({ col, label, align = "left" }: { col: typeof sortKey; label: string; align?: string }) => (
    <th
      className={`py-3 px-4 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors text-${align}`}
      onClick={() => handleSort(col)}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""} ${align === "center" ? "justify-center w-full" : ""}`}>
        {label}
        {sortKey === col
          ? sortDir === "asc"
            ? <ChevronUp className="h-3.5 w-3.5 text-primary" />
            : <ChevronDown className="h-3.5 w-3.5 text-primary" />
          : <SortIcon className="h-3.5 w-3.5 opacity-30" />
        }
      </span>
    </th>
  );

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    fetchWonProspects();
    fetchAppUsers();
    setDialogOpen(true);
  };

  const openEdit = (project: ProjectRow) => {
    setEditId(project.id);
    setForm({
      name: project.name,
      client: project.client,
      value: String(project.value),
      currentStep: String(project.current_step),
      status: project.status,
      startDate: project.start_date ?? "",
      prospectId: project.origin_prospect_id ?? "",
      assignedTo: project.assigned_to ?? "",
    });
    fetchAppUsers();
    setDialogOpen(true);
  };

  const selectProspect = (prospect: WonProspect) => {
    setForm(f => ({
      ...f,
      prospectId: prospect.id,
      name: prospect.project_name,
      client: prospect.direct_customer,
      value: String(prospect.price_usd),
    }));
    setProspectPopoverOpen(false);
  };

  const handleSave = async () => {
    const valMap: Record<string, any> = {
      name: form.name, client: form.client, value: form.value,
      status: form.status, startDate: form.startDate,
    };
    const missingFields = reqFields.filter((f) => f.isRequired && !valMap[f.fieldKey]?.toString().trim());
    if (missingFields.length > 0) {
      toast({ title: "Campos obligatorios", description: missingFields.map((f) => f.fieldLabel).join(", "), variant: "destructive" });
      return;
    }
    if (!form.name.trim()) return;
    if (!editId && !form.prospectId) {
      toast({ title: "Selecciona una oportunidad ganada", variant: "destructive" });
      return;
    }
    const selectedWonProspect = wonProspects.find(p => p.id === form.prospectId);
    const payload = {
      name: form.name.trim(),
      client: form.client.trim(),
      value: Number(form.value) || 0,
      current_step: Number(form.currentStep) || 1,
      status: form.status,
      start_date: form.startDate || null,
      origin_prospect_id: form.prospectId || null,
      client_id: selectedWonProspect?.client_id || null,
      assigned_to: form.assignedTo || null,
    } as any;
    if (editId) {
      await supabase.from("projects").update(payload).eq("id", editId);
      toast({ title: "Proyecto actualizado" });
    } else {
      await supabase.from("projects").insert(payload);
      toast({ title: "Proyecto creado" });
    }
    setDialogOpen(false);
    fetchProjects();
  };

  const handleDelete = (project: ProjectRow) => setDeleteTarget(project);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("projects").delete().eq("id", deleteTarget.id);
    toast({ title: "Proyecto eliminado" });
    setDeleteTarget(null);
    fetchProjects();
  };

  const u = (key: keyof typeof emptyForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const selectedProspect = wonProspects.find(p => p.id === form.prospectId);

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
          <h1 className="text-2xl font-bold tracking-tight">Proyectos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {projects.length} proyectos · {projects.filter((p) => p.status === "activo").length} activos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar proyecto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-[240px]" />
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
          {canCreateProj && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo Proyecto
            </Button>
          )}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      {filtersOpen && (
        <div className="stat-card p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtros</h3>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs text-muted-foreground">
                <X className="h-3 w-3 mr-1" /> Limpiar filtros
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Estado</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Cliente</label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueClients.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div>
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Paso Actual</label>
              <Select value={filterStep} onValueChange={setFilterStep}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {PROJECT_STEPS.map((s) => (
                    <SelectItem key={s.number} value={String(s.number)}>{s.number}. {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <SortHeader col="code" label="Proyecto" />
              <SortHeader col="client" label="Cliente" />
              <SortHeader col="value" label="Valor USD" align="right" />
              <SortHeader col="current_step" label="Paso Actual" />
              <SortHeader col="progress" label="Progreso" align="center" />
              <SortHeader col="status" label="Estado" align="center" />
              <SortHeader col="start_date" label="Inicio" />
              <th className="text-center py-3 px-4 font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const cfg = statusConfig[project.status] ?? statusConfig.activo;
              const StatusIcon = cfg.icon;
              const prog = progressMap[project.id] ?? { pct: 0, oeDate: null, revenueDate: null, totalDays: 0, elapsedDays: 0, remainingDays: 0, reason: "missing-dates" as const };
              const progress = prog.pct;
              const currentStepName = PROJECT_STEPS[project.current_step - 1]?.name ?? "";
              const barColor =
                prog.reason === "completed" ? "bg-emerald-500" :
                prog.reason === "missing-dates" || prog.reason === "invalid-range" ? "bg-muted-foreground/40" :
                progress >= 90 ? "bg-amber-500" :
                "bg-primary";

              return (
                <tr key={project.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group" onClick={() => navigate(`/projects/${project.id}`)}>
                  <td className="py-3 px-4">
                    <Link to={`/projects/${project.id}`} className="hover:text-primary transition-colors">
                      {project.code && (
                        <span className="text-xs text-muted-foreground font-mono mr-2">{project.code}</span>
                      )}
                      <span className="font-medium">{project.name}</span>
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{project.client}</td>
                  <td className="py-3 px-4 text-right font-semibold text-primary">${project.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs text-muted-foreground">Paso {project.current_step}:</span>{" "}
                    <span className="text-xs font-medium">{currentStepName}</span>
                  </td>
                  <td className="py-3 px-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 justify-center cursor-help">
                          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[11px] text-muted-foreground w-8">{progress}%</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[280px] p-3 text-xs leading-relaxed">
                        <p className="font-semibold text-sm mb-1.5">Progreso por tiempo</p>
                        {prog.reason === "missing-dates" ? (
                          <p className="text-muted-foreground">
                            Faltan fechas en la oportunidad vinculada.
                            {!prog.oeDate && <span className="block">• Falta <strong>Order Entry</strong></span>}
                            {!prog.revenueDate && <span className="block">• Falta <strong>Revenue</strong></span>}
                          </p>
                        ) : prog.reason === "invalid-range" ? (
                          <p className="text-destructive">
                            La fecha de Revenue ({formatDateLabel(prog.revenueDate)}) es anterior o igual a la de Order Entry ({formatDateLabel(prog.oeDate)}).
                          </p>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Order Entry:</span>
                              <span className="font-medium">{formatDateLabel(prog.oeDate)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Revenue esperado:</span>
                              <span className="font-medium">{formatDateLabel(prog.revenueDate)}</span>
                            </div>
                            <div className="flex justify-between gap-4 border-t pt-1 mt-1">
                              <span className="text-muted-foreground">Duración total:</span>
                              <span className="font-medium">{formatDuration(prog.totalDays)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Transcurrido:</span>
                              <span className="font-medium">{formatDuration(prog.elapsedDays)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">
                                {prog.reason === "completed" ? "Estado:" : "Restante:"}
                              </span>
                              <span className="font-medium">
                                {prog.reason === "completed" ? "Período cumplido" :
                                 prog.reason === "future" ? "Aún no inicia" :
                                 formatDuration(prog.remainingDays)}
                              </span>
                            </div>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-2 pt-1 border-t">
                          Calculado como (hoy − Order Entry) / (Revenue − Order Entry).
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg.className}`}>
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">{project.start_date ?? "—"}</td>
                  <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-0.5">
                      {canEditProj && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                          onClick={() => openEdit(project)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canDeleteProj && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(project)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {projects.length === 0 && (
              <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">No se encontraron proyectos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Proyecto" : "Nuevo Proyecto"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            {/* Opportunity selector — only for creation */}
            {!editId && (
              <div className="col-span-2">
                <Label className="flex items-center gap-1.5">
                  <Target className="h-4 w-4" /> Oportunidad Ganada <span className="text-destructive">*</span>
                </Label>
                <Popover open={prospectPopoverOpen} onOpenChange={setProspectPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-10 mt-1">
                      {selectedProspect
                        ? `${selectedProspect.code} – ${selectedProspect.project_name}`
                        : "Seleccionar oportunidad ganada..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[460px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar oportunidad..." />
                      <CommandList>
                        <CommandEmpty>No hay oportunidades ganadas disponibles.</CommandEmpty>
                        <CommandGroup>
                          {wonProspects.map((p) => (
                            <CommandItem key={p.id} value={`${p.code} ${p.project_name} ${p.direct_customer}`} onSelect={() => selectProspect(p)}>
                              <Check className={cn("mr-2 h-4 w-4", form.prospectId === p.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span className="font-medium">{p.code} – {p.project_name}</span>
                                <span className="text-xs text-muted-foreground">{p.direct_customer} · ${p.price_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {wonProspects.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No hay oportunidades ganadas sin proyecto vinculado.</p>
                )}
              </div>
            )}
            <div className="col-span-2">
              <Label>Nombre del Proyecto</Label>
              <Input value={form.name} onChange={(e) => u("name", e.target.value)} placeholder="Ej: Subestación Compacta CEMEX" />
            </div>
            <div>
              <Label>Cliente</Label>
              <Input value={form.client} onChange={(e) => u("client", e.target.value)} placeholder="Nombre del cliente" />
            </div>
            <div>
              <Label>Valor USD</Label>
              <Input type="number" value={form.value} onChange={(e) => u("value", e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Paso Actual</Label>
              <Select value={form.currentStep} onValueChange={(v) => u("currentStep", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_STEPS.map((s) => (
                    <SelectItem key={s.number} value={String(s.number)}>{s.number}. {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => u("status", v)} disabled={!canChangeProjectStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                </SelectContent>
              </Select>
              {!canChangeProjectStatus && (
                <p className="text-xs text-muted-foreground mt-1">Solo administradores y el Gerente de Operaciones pueden cambiar el estado.</p>
              )}
            </div>
            <div>
              <Label>Fecha de Inicio</Label>
              <Input type="date" value={form.startDate} onChange={(e) => u("startDate", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className="flex items-center gap-1.5">
                <User className="h-4 w-4" /> Responsable de Ejecución
              </Label>
              <Select value={form.assignedTo || "__none__"} onValueChange={(v) => u("assignedTo", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar responsable" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin asignar</SelectItem>
                  {appUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || (!editId && !form.prospectId)}>
              {editId ? "Guardar Cambios" : "Crear Proyecto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Eliminar Proyecto"
        description={`¿Estás seguro de eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default Projects;
