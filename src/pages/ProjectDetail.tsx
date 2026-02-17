import { useParams, Link } from "react-router-dom";
import { mockProjects } from "@/lib/mockData";
import { PROJECT_STEPS } from "@/lib/types";
import { ArrowLeft, CheckCircle2, Circle, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const ProjectDetail = () => {
  const { id } = useParams();
  const project = mockProjects.find((p) => p.id === id);
  const [activeStep, setActiveStep] = useState(project?.currentStep ?? 1);

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Proyecto no encontrado</p>
        <Link to="/projects" className="text-primary hover:underline text-sm mt-2 inline-block">← Volver</Link>
      </div>
    );
  }

  const currentStepInfo = PROJECT_STEPS[activeStep - 1];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/projects">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground text-sm">
            {project.client} · ${project.value.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Steps sidebar */}
        <div className="stat-card p-4 h-fit">
          <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Pasos del Proyecto</h3>
          <div className="space-y-1">
            {PROJECT_STEPS.map((step) => {
              const isComplete = step.number < project.currentStep;
              const isCurrent = step.number === project.currentStep;
              const isActive = step.number === activeStep;

              return (
                <button
                  key={step.number}
                  onClick={() => setActiveStep(step.number)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-sm ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className={`step-badge flex-shrink-0 ${
                    isComplete ? "step-complete" : isCurrent ? "step-active" : "step-pending"
                  }`}>
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span className={isComplete ? "text-muted-foreground" : ""}>
                    {step.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="step-badge step-active text-xs">{currentStepInfo.number}</span>
                <h2 className="text-lg font-semibold">{currentStepInfo.name}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{currentStepInfo.description}</p>
            </div>
            <Button size="sm" variant="outline">
              <Upload className="h-4 w-4 mr-1" /> Subir Archivo
            </Button>
          </div>

          <div className="border border-dashed border-border rounded-xl p-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              No hay documentos en este paso todavía
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Sube archivos arrastrándolos aquí o usando el botón de subir
            </p>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={activeStep <= 1}
              onClick={() => setActiveStep((s) => Math.max(1, s - 1))}
            >
              ← Anterior
            </Button>
            <Button
              size="sm"
              disabled={activeStep >= 11}
              onClick={() => setActiveStep((s) => Math.min(11, s + 1))}
            >
              Siguiente →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
