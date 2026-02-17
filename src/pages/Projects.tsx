import { useState } from "react";
import { mockProjects } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { PROJECT_STEPS, type Project } from "@/lib/types";
import { Search, Plus, FolderOpen, CheckCircle2, PauseCircle, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const statusConfig = {
  activo: { label: "Activo", icon: FolderOpen, className: "text-sinem-teal bg-accent" },
  completado: { label: "Completado", icon: CheckCircle2, className: "text-sinem-success bg-sinem-success/10" },
  pausado: { label: "Pausado", icon: PauseCircle, className: "text-sinem-warning bg-sinem-warning/10" },
};

const emptyForm = {
  name: "",
  client: "",
  value: "",
  currentStep: "1",
  status: "activo" as Project["status"],
};

const Projects = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [allProjects, setAllProjects] = useLocalStorage<Project[]>("sinem:projects", mockProjects);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const projects = allProjects.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditId(project.id);
    setForm({
      name: project.name,
      client: project.client,
      value: String(project.value),
      currentStep: String(project.currentStep),
      status: project.status,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editId) {
      setAllProjects((prev) =>
        prev.map((p) =>
          p.id === editId
            ? { ...p, name: form.name.trim(), client: form.client.trim(), value: Number(form.value) || 0, currentStep: Number(form.currentStep) || 1, status: form.status }
            : p
        )
      );
      toast({ title: "Proyecto actualizado" });
    } else {
      const newProject: Project = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        client: form.client.trim(),
        value: Number(form.value) || 0,
        currentStep: Number(form.currentStep) || 1,
        status: form.status,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setAllProjects((prev) => [newProject, ...prev]);
      toast({ title: "Proyecto creado" });
    }
    setDialogOpen(false);
  };

  const handleDelete = (project: Project) => {
    if (!confirm(`¿Eliminar el proyecto "${project.name}"? Esta acción no se puede deshacer.`)) return;
    setAllProjects((prev) => prev.filter((p) => p.id !== project.id));
    toast({ title: "Proyecto eliminado" });
  };

  const u = (key: keyof typeof emptyForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

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
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo Proyecto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((project) => {
          const cfg = statusConfig[project.status];
          const StatusIcon = cfg.icon;
          const progress = (project.currentStep / 11) * 100;
          const currentStepName = PROJECT_STEPS[project.currentStep - 1]?.name ?? "";

          return (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="stat-card group block"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">{project.name}</h3>
                  <p className="text-sm text-muted-foreground">{project.client}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${cfg.className}`}>
                    <StatusIcon className="h-3 w-3" />
                    {cfg.label}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(project); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(project); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  Paso {project.currentStep}: <span className="text-foreground font-medium">{currentStepName}</span>
                </span>
                <span className="font-semibold text-primary">${project.value.toLocaleString()}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[11px] text-muted-foreground">{Math.round(progress)}%</span>
              </div>

              <div className="flex gap-1 mt-3">
                {PROJECT_STEPS.map((step) => (
                  <div
                    key={step.number}
                    className={`h-1 flex-1 rounded-full ${
                      step.number <= project.currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </Link>
          );
        })}
        {projects.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">No se encontraron proyectos</div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Proyecto" : "Nuevo Proyecto"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
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
                    <SelectItem key={s.number} value={String(s.number)}>
                      {s.number}. {s.name}
                    </SelectItem>
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
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>
              {editId ? "Guardar Cambios" : "Crear Proyecto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Projects;
