import { useParams, Link } from "react-router-dom";
import { mockProjects, mockQuotations } from "@/lib/mockData";
import { PROJECT_STEPS, CURRENCIES, type Project, type Quotation } from "@/lib/types";
import { ArrowLeft, CheckCircle2, FileText, Upload, Trash2, File, FileImage, FileSpreadsheet, ExternalLink, Receipt, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/use-toast";
import ActivitySidebar from "@/components/crm/ActivitySidebar";

interface ProjectDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  stepNumber: number;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return FileImage;
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv")) return FileSpreadsheet;
  return File;
};

const ProjectDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useLocalStorage<Project[]>("sinem:projects", mockProjects);
  const [quotations] = useLocalStorage<Quotation[]>("sinem:quotations", mockQuotations);
  const project = projects.find((p) => p.id === id);
  const linkedQuotation = project?.quotationId ? quotations.find((q) => q.id === project.quotationId) : undefined;
  const [activeStep, setActiveStep] = useState(project?.currentStep ?? 1);
  const [documents, setDocuments] = useLocalStorage<ProjectDocument[]>(`sinem:project-docs:${id}`, []);
  const [dragging, setDragging] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Proyecto no encontrado</p>
        <Link to="/projects" className="text-primary hover:underline text-sm mt-2 inline-block">← Volver</Link>
      </div>
    );
  }

  const stepDocs = documents.filter((d) => d.stepNumber === activeStep);
  const currentStepInfo = PROJECT_STEPS[activeStep - 1];

  const stepsWithDocs = new Set(documents.map((d) => d.stepNumber));

  const computeCurrentStep = (docs: ProjectDocument[]) => {
    const filled = new Set(docs.map((d) => d.stepNumber));
    let highest = 0;
    for (let i = 1; i <= 11; i++) {
      if (filled.has(i)) highest = i;
    }
    return Math.min(highest + 1, 11);
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const newDocs: ProjectDocument[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
      stepNumber: activeStep,
    }));

    setDocuments((prev) => {
      const updated = [...prev, ...newDocs];
      const newCurrentStep = computeCurrentStep(updated);
      setProjects((pp) => pp.map((p) => p.id === id ? { ...p, currentStep: newCurrentStep } : p));
      return updated;
    });

    toast({ title: `${newDocs.length} archivo${newDocs.length > 1 ? "s" : ""} subido${newDocs.length > 1 ? "s" : ""}` });
  }, [activeStep, id, setDocuments, setProjects, toast]);

  const handleDelete = (docId: string) => {
    if (!confirm("¿Eliminar este documento?")) return;
    setDocuments((prev) => {
      const updated = prev.filter((d) => d.id !== docId);
      const newCurrentStep = computeCurrentStep(updated);
      setProjects((pp) => pp.map((p) => p.id === id ? { ...p, currentStep: newCurrentStep } : p));
      return updated;
    });
    toast({ title: "Documento eliminado" });
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/projects">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground text-sm">
            {project.client} · ${project.value.toLocaleString()}
          </p>
        </div>
        {project.prospectId && (
          <Button variant="outline" size="sm" onClick={() => setActivityOpen(true)}>
            <MessageSquareText className="h-4 w-4 mr-1" /> Actividad
          </Button>
        )}
      </div>

      {/* Linked Quotation Card */}
      {linkedQuotation && (
        <div className="stat-card flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Cotización Ganada</p>
              <p className="font-semibold text-sm">{linkedQuotation.code} — {linkedQuotation.subject}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {linkedQuotation.client.company} · Total: <strong className="text-foreground">
                  {linkedQuotation.currency !== "USD"
                    ? `${CURRENCIES.find((c) => c.key === linkedQuotation.currency)?.symbol}${(linkedQuotation.totalUSD * linkedQuotation.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${linkedQuotation.currency}`
                    : `$${linkedQuotation.totalUSD.toLocaleString()}`
                  }
                </strong>
                {linkedQuotation.currency !== "USD" && (
                  <span className="text-muted-foreground"> (${linkedQuotation.totalUSD.toLocaleString()} USD)</span>
                )}
              </p>
            </div>
          </div>
          <Link to={`/oferta/${linkedQuotation.id}`} target="_blank">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1" /> Ver Oferta
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Steps sidebar */}
        <div className="stat-card p-4 h-fit">
          <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Pasos del Proyecto</h3>
          <div className="space-y-1">
            {PROJECT_STEPS.map((step) => {
              const isComplete = stepsWithDocs.has(step.number);
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
                    isComplete ? "step-complete" : isActive ? "step-active" : "step-pending"
                  }`}>
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span className={isComplete && !isActive ? "text-muted-foreground" : ""}>
                    {step.name}
                  </span>
                  <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                    documents.filter((d) => d.stepNumber === step.number).length > 0
                      ? "bg-primary/15 text-primary font-medium"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {documents.filter((d) => d.stepNumber === step.number).length}
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
                <span className={`step-badge text-xs ${stepsWithDocs.has(activeStep) ? "step-complete" : "step-active"}`}>
                  {stepsWithDocs.has(activeStep) ? <CheckCircle2 className="h-4 w-4" /> : currentStepInfo.number}
                </span>
                <h2 className="text-lg font-semibold">{currentStepInfo.name}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{currentStepInfo.description}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Subir Archivo
            </Button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInput} />
          </div>

          {stepDocs.length > 0 ? (
            <div className="space-y-2">
              {stepDocs.map((doc) => {
                const Icon = getFileIcon(doc.type);
                return (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors group">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.size)} · {new Date(doc.uploadedAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mt-4 ${
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            }`}
          >
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {stepDocs.length === 0 ? "No hay documentos en este paso todavía" : "Arrastra más archivos aquí"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Sube archivos arrastrándolos aquí o haciendo clic
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

      {project.prospectId && (
        <ActivitySidebar
          prospectId={project.prospectId}
          prospectName={project.name}
          open={activityOpen}
          onClose={() => setActivityOpen(false)}
        />
      )}
    </div>
  );
};

export default ProjectDetail;
