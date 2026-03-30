import { useParams, Link } from "react-router-dom";
import { PROJECT_STEPS, CURRENCIES, type Project, type Quotation } from "@/lib/types";
import { ArrowLeft, CheckCircle2, FileText, Upload, Trash2, File, FileImage, FileSpreadsheet, ExternalLink, Receipt, MessageSquareText, Loader2, Download, FolderOpen } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ActivitySidebar from "@/components/crm/ActivitySidebar";

interface ProjectDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  stepNumber: number;
  storagePath?: string;
  uploadedBy?: string;
  subfolder?: string;
}

const STEP_SUBFOLDERS: Record<number, { key: string; label: string }[]> = {
  2: [
    { key: "cliente", label: "Oferta de Cliente" },
    { key: "proveedor", label: "Oferta de Suplidor (Proveedor)" },
  ],
  10: [
    { key: "cliente", label: "Gantt para Cliente" },
    { key: "interno", label: "Gantt para uso interno (CEN)" },
    { key: "atrasos", label: "Información de atrasos" },
  ],
};

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
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentAppUserId, setCurrentAppUserId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(1);
  const [documents, setDocuments] = useLocalStorage<ProjectDocument[]>(`sinem:project-docs:${id}`, []);
  const [dragging, setDragging] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectDocument | null>(null);
  const [activeSubfolder, setActiveSubfolder] = useState("");

  // Auto-select first subfolder when switching to a step with subfolders
  useEffect(() => {
    const subs = STEP_SUBFOLDERS[activeStep];
    if (subs && subs.length > 0) {
      setActiveSubfolder(subs[0].key);
    }
  }, [activeStep]);

  useEffect(() => {
    if (!user) return;
    supabase.from("app_users").select("id").eq("auth_user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setCurrentAppUserId(data.id); });
  }, [user]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase.from("projects").select("*").eq("id", id).single();
      if (data) {
        setProject({
          id: data.id,
          name: data.name,
          client: data.client,
          value: Number(data.value),
          currentStep: data.current_step,
          createdAt: data.start_date ?? "",
          status: data.status as any,
          prospectId: data.origin_prospect_id ?? undefined,
        });
        setActiveStep(data.current_step);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const updateProjectStep = async (newStep: number) => {
    if (!id) return;
    await supabase.from("projects").update({ current_step: newStep }).eq("id", id);
    setProject((p) => p ? { ...p, currentStep: newStep } : p);
  };

  const computeCurrentStep = (docs: ProjectDocument[]) => {
    const filled = new Set(docs.map((d) => d.stepNumber));
    let highest = 0;
    for (let i = 1; i <= 11; i++) {
      if (filled.has(i)) highest = i;
    }
    return Math.min(highest + 1, 11);
  };

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newDocs: ProjectDocument[] = [];

    for (const file of fileArray) {
      const docId = crypto.randomUUID();
      const hasSubfolders = !!STEP_SUBFOLDERS[activeStep];
      const subPath = hasSubfolders ? `${activeSubfolder}/` : "";
      const storagePath = `${id}/step-${activeStep}/${subPath}${docId}-${file.name}`;
      const { error } = await supabase.storage.from("project-files").upload(storagePath, file);
      if (error) {
        toast({ title: `Error al subir ${file.name}`, description: error.message, variant: "destructive" });
        continue;
      }
      newDocs.push({
        id: docId,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        uploadedAt: new Date().toISOString(),
        stepNumber: activeStep,
        storagePath,
        uploadedBy: currentAppUserId ?? undefined,
        ...(hasSubfolders ? { subfolder: activeSubfolder } : {}),
      });
    }

    if (newDocs.length > 0) {
      setDocuments((prev) => {
        const updated = [...prev, ...newDocs];
        const newCurrentStep = computeCurrentStep(updated);
        updateProjectStep(newCurrentStep);
        return updated;
      });
      toast({ title: `${newDocs.length} archivo${newDocs.length > 1 ? "s" : ""} subido${newDocs.length > 1 ? "s" : ""}` });
    }
  }, [activeStep, id, setDocuments, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Proyecto no encontrado</p>
        <Link to="/projects" className="text-primary hover:underline text-sm mt-2 inline-block">← Volver</Link>
      </div>
    );
  }

  const stepDocsAll = documents.filter((d) => d.stepNumber === activeStep);
  const currentSubfolders = STEP_SUBFOLDERS[activeStep];
  const stepDocs = currentSubfolders
    ? stepDocsAll.filter((d) => d.subfolder === activeSubfolder)
    : stepDocsAll;
  const currentStepInfo = PROJECT_STEPS[activeStep - 1];
  const stepsWithDocs = new Set(documents.map((d) => d.stepNumber));

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.storagePath) {
      await supabase.storage.from("project-files").remove([deleteTarget.storagePath]);
    }
    setDocuments((prev) => {
      const updated = prev.filter((d) => d.id !== deleteTarget.id);
      const newCurrentStep = computeCurrentStep(updated);
      updateProjectStep(newCurrentStep);
      return updated;
    });
    toast({ title: "Documento eliminado" });
    setDeleteTarget(null);
  };

  const handleDownload = async (doc: ProjectDocument) => {
    if (!doc.storagePath) {
      toast({ title: "Archivo no disponible para descarga", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.storage.from("project-files").download(doc.storagePath);
    if (error || !data) {
      toast({ title: "Error al descargar", description: error?.message, variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.name;
    a.click();
    URL.revokeObjectURL(url);
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

          {currentSubfolders && (
            <div className="flex gap-1 mb-4 border-b">
              {currentSubfolders.map((sf) => {
                const count = stepDocsAll.filter((d) => d.subfolder === sf.key).length;
                return (
                  <button
                    key={sf.key}
                    onClick={() => setActiveSubfolder(sf.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                      activeSubfolder === sf.key
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    {sf.label}
                    <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                      count > 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    }`}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {stepDocs.length > 0 ? (
            <div className="space-y-2">
              {stepDocs.map((doc) => {
                const Icon = getFileIcon(doc.type);
                return (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => handleDownload(doc)}>
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.size)} · {new Date(doc.uploadedAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    {doc.uploadedBy && <UserAvatar userId={doc.uploadedBy} size="xs" />}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                      title="Descargar"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(doc); }}
                      title="Eliminar"
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
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Eliminar Documento"
        description={`¿Estás seguro de eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default ProjectDetail;
