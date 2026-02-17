import { useState } from "react";
import { mockProjects } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { PROJECT_STEPS, type Project } from "@/lib/types";
import { Search, Plus, FolderOpen, CheckCircle2, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const statusConfig = {
  activo: { label: "Activo", icon: FolderOpen, className: "text-sinem-teal bg-accent" },
  completado: { label: "Completado", icon: CheckCircle2, className: "text-sinem-success bg-sinem-success/10" },
  pausado: { label: "Pausado", icon: PauseCircle, className: "text-sinem-warning bg-sinem-warning/10" },
};

const Projects = () => {
  const [search, setSearch] = useState("");
  const projects = mockProjects.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase())
  );

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
          <Button size="sm">
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
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${cfg.className}`}>
                  <StatusIcon className="h-3 w-3" />
                  {cfg.label}
                </span>
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
      </div>
    </div>
  );
};

export default Projects;
