import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { PROJECT_STEPS } from "@/lib/types";
import { Search, Plus, FolderOpen, CheckCircle2, PauseCircle, Trash2, Pencil, Loader2, Check, ChevronsUpDown, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import ConfirmDialog from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";

interface ProjectRow {
  id: string;
  name: string;
  client: string;
  value: number;
  current_step: number;
  status: string;
  start_date: string | null;
  origin_prospect_id: string | null;
}

interface WonProspect {
  id: string;
  code: string;
  project_name: string;
  direct_customer: string;
  price_usd: number;
  client_id: string | null;
}

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
};

const Projects = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canCreate: canCreateFn, canEdit: canEditFn, canDelete: canDeleteFn } = usePermissions();
  const canCreateProj = canCreateFn("Proyectos");
  const canEditProj = canEditFn("Proyectos");
  const canDeleteProj = canDeleteFn("Proyectos");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [allProjects, setAllProjects] = useState<ProjectRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ProjectRow | null>(null);
  const [wonProspects, setWonProspects] = useState<WonProspect[]>([]);
  const [prospectPopoverOpen, setProspectPopoverOpen] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    const { data } = await supabase.from("projects").select("id, name, client, value, current_step, status, start_date, origin_prospect_id").order("created_at", { ascending: false });
    setAllProjects(data ?? []);
    setLoading(false);
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

  useEffect(() => { fetchProjects(); }, []);

  const projects = allProjects.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    fetchWonProspects();
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
    });
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
          {canCreateProj && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo Proyecto
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Proyecto</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cliente</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Valor USD</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Paso Actual</th>
              <th className="text-center py-3 px-4 font-medium text-muted-foreground">Progreso</th>
              <th className="text-center py-3 px-4 font-medium text-muted-foreground">Estado</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Inicio</th>
              <th className="text-center py-3 px-4 font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const cfg = statusConfig[project.status] ?? statusConfig.activo;
              const StatusIcon = cfg.icon;
              const progress = Math.round((project.current_step / 11) * 100);
              const currentStepName = PROJECT_STEPS[project.current_step - 1]?.name ?? "";

              return (
                <tr key={project.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group" onClick={() => navigate(`/projects/${project.id}`)}>
                  <td className="py-3 px-4">
                    <Link to={`/projects/${project.id}`} className="font-medium hover:text-primary transition-colors">
                      {project.name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{project.client}</td>
                  <td className="py-3 px-4 text-right font-semibold text-primary">${project.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs text-muted-foreground">Paso {project.current_step}:</span>{" "}
                    <span className="text-xs font-medium">{currentStepName}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground w-8">{progress}%</span>
                    </div>
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
                                <span className="text-xs text-muted-foreground">{p.direct_customer} · ${p.price_usd.toLocaleString()}</span>
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
              <Select value={form.status} onValueChange={(v) => u("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha de Inicio</Label>
              <Input type="date" value={form.startDate} onChange={(e) => u("startDate", e.target.value)} />
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
