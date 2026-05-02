import { useParams, Link } from "react-router-dom";
import { PROJECT_STEPS, CURRENCIES, type Project, type Quotation } from "@/lib/types";
import { ArrowLeft, CheckCircle2, FileText, Upload, Trash2, File, FileImage, FileSpreadsheet, ExternalLink, Receipt, MessageSquareText, Loader2, Download, FolderOpen, FolderPlus, X } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ActivitySidebar from "@/components/crm/ActivitySidebar";
import * as tus from "tus-js-client";

const SUPABASE_URL = "https://fxsshhrxzjyjvfszaorq.supabase.co";
const TUS_ENDPOINT = `${SUPABASE_URL}/storage/v1/upload/resumable`;
const LARGE_FILE_THRESHOLD = 6 * 1024 * 1024; // 6MB

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

interface UploadingFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  stepNumber: number;
}

interface Subfolder {
  key: string;
  label: string;
  builtIn?: boolean;
  id?: string;
}

const STEP_SUBFOLDERS: Record<number, Subfolder[]> = {
  2: [
    { key: "cliente", label: "Oferta de Cliente", builtIn: true },
    { key: "proveedor", label: "Oferta de Suplidor (Proveedor)", builtIn: true },
  ],
  10: [
    { key: "cliente", label: "Gantt para Cliente", builtIn: true },
    { key: "interno", label: "Gantt para uso interno (CEN)", builtIn: true },
    { key: "atrasos", label: "Información de atrasos", builtIn: true },
  ],
};

const slugifySubfolder = (label: string): string => {
  const stripDiacritics = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return stripDiacritics(label.trim().toLowerCase())
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "subcarpeta";
};

/**
 * Sanitize a filename so it is safe for Supabase Storage paths.
 * Removes accents, replaces % and other unsafe chars, collapses spaces.
 * The original display name is stored separately and is untouched.
 */
const sanitizeStorageName = (name: string): string => {
  const lastDot = name.lastIndexOf(".");
  const ext = lastDot >= 0 ? name.slice(lastDot) : "";
  const base = lastDot >= 0 ? name.slice(0, lastDot) : name;

  const stripDiacritics = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "");

  const safePart = stripDiacritics(base)
    .replace(/%/g, "pct")
    .replace(/[^a-zA-Z0-9._\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const safeExt = stripDiacritics(ext).replace(/[^a-zA-Z0-9.]/g, "_");

  return (safePart || "archivo") + safeExt;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return FileImage;
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv")) return FileSpreadsheet;
  return File;
};

const uploadWithTUS = (
  file: File,
  storagePath: string,
  accessToken: string,
  onProgress: (pct: number) => void,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: TUS_ENDPOINT,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-upsert": "false",
      },
      metadata: {
        bucketName: "project-files",
        objectName: storagePath,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024,
      onError: reject,
      onProgress: (uploaded, total) => {
        onProgress(total > 0 ? Math.round((uploaded / total) * 100) : 0);
      },
      onSuccess: () => resolve(),
    });
    upload.start();
  });

const ProjectDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentAppUserId, setCurrentAppUserId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(1);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectDocument | null>(null);
  const [activeSubfolder, setActiveSubfolder] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [customSubfolders, setCustomSubfolders] = useState<Record<number, Subfolder[]>>({});
  const [newSubfolderOpen, setNewSubfolderOpen] = useState(false);
  const [newSubfolderLabel, setNewSubfolderLabel] = useState("");
  const [savingSubfolder, setSavingSubfolder] = useState(false);
  const [subfolderToDelete, setSubfolderToDelete] = useState<Subfolder | null>(null);

  const getSubfolders = useCallback(
    (step: number): Subfolder[] => [
      ...(STEP_SUBFOLDERS[step] ?? []),
      ...(customSubfolders[step] ?? []),
    ],
    [customSubfolders],
  );

  // Auto-select first subfolder when switching to a step with subfolders
  useEffect(() => {
    const subs = getSubfolders(activeStep);
    if (subs.length > 0) {
      const exists = subs.some((s) => s.key === activeSubfolder);
      if (!exists) setActiveSubfolder(subs[0].key);
    } else {
      setActiveSubfolder("");
    }
  }, [activeStep, getSubfolders, activeSubfolder]);

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

  useEffect(() => {
    if (!id) return;
    const loadDocs = async () => {
      setDocsLoading(true);
      const { data } = await supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", id)
        .order("uploaded_at", { ascending: true });

      if (data && data.length > 0) {
        setDocuments(data.map((r) => ({
          id: r.id,
          name: r.name,
          size: r.size,
          type: r.type,
          uploadedAt: r.uploaded_at,
          stepNumber: r.step_number,
          storagePath: r.storage_path ?? undefined,
          uploadedBy: r.uploaded_by ?? undefined,
          subfolder: r.subfolder ?? undefined,
        })));
      } else {
        // Migrate from localStorage if data exists there
        const localKey = `sinem:project-docs:${id}`;
        try {
          const raw = localStorage.getItem(localKey);
          if (raw) {
            const localDocs: ProjectDocument[] = JSON.parse(raw);
            if (localDocs.length > 0) {
              const inserts = localDocs.map((d) => ({
                id: d.id,
                project_id: id,
                name: d.name,
                size: d.size,
                type: d.type,
                uploaded_at: d.uploadedAt,
                step_number: d.stepNumber,
                storage_path: d.storagePath ?? null,
                uploaded_by: d.uploadedBy ?? null,
                subfolder: d.subfolder ?? null,
              }));
              const { data: migrated } = await supabase.from("project_documents").insert(inserts).select();
              if (migrated) {
                setDocuments(localDocs);
                localStorage.removeItem(localKey);
              }
            }
          }
        } catch (_) { /* ignore migration errors */ }
      }
      setDocsLoading(false);
    };
    loadDocs();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const loadSubfolders = async () => {
      const { data } = await supabase
        .from("project_subfolders")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: true });
      const grouped: Record<number, Subfolder[]> = {};
      for (const r of data ?? []) {
        if (!grouped[r.step_number]) grouped[r.step_number] = [];
        grouped[r.step_number].push({ id: r.id, key: r.key, label: r.label });
      }
      setCustomSubfolders(grouped);
    };
    loadSubfolders();
  }, [id]);

  const createSubfolder = async () => {
    const label = newSubfolderLabel.trim();
    if (!label || !id) return;
    const baseKey = slugifySubfolder(label);
    const existing = new Set(getSubfolders(activeStep).map((s) => s.key));
    let key = baseKey;
    let n = 1;
    while (existing.has(key)) {
      n += 1;
      key = `${baseKey}-${n}`;
    }
    setSavingSubfolder(true);
    const { data, error } = await supabase
      .from("project_subfolders")
      .insert({
        project_id: id,
        step_number: activeStep,
        key,
        label,
        created_by: currentAppUserId,
      })
      .select()
      .single();
    setSavingSubfolder(false);
    if (error || !data) {
      toast({ title: "Error al crear subcarpeta", description: error?.message, variant: "destructive" });
      return;
    }
    setCustomSubfolders((prev) => {
      const list = prev[activeStep] ?? [];
      return { ...prev, [activeStep]: [...list, { id: data.id, key: data.key, label: data.label }] };
    });
    setActiveSubfolder(data.key);
    setNewSubfolderLabel("");
    setNewSubfolderOpen(false);
    toast({ title: "Subcarpeta creada" });
  };

  const confirmDeleteSubfolder = async () => {
    if (!subfolderToDelete?.id || !id) return;
    const docsInside = documents.filter(
      (d) => d.stepNumber === activeStep && d.subfolder === subfolderToDelete.key,
    );
    if (docsInside.length > 0) {
      const paths = docsInside.map((d) => d.storagePath).filter(Boolean) as string[];
      if (paths.length > 0) {
        await supabase.storage.from("project-files").remove(paths);
      }
      await supabase.from("project_documents").delete().in("id", docsInside.map((d) => d.id));
    }
    await supabase.from("project_subfolders").delete().eq("id", subfolderToDelete.id);
    setCustomSubfolders((prev) => {
      const list = (prev[activeStep] ?? []).filter((s) => s.id !== subfolderToDelete.id);
      return { ...prev, [activeStep]: list };
    });
    setDocuments((prev) => {
      const updated = prev.filter(
        (d) => !(d.stepNumber === activeStep && d.subfolder === subfolderToDelete.key),
      );
      updateProjectStep(computeCurrentStep(updated));
      return updated;
    });
    toast({ title: "Subcarpeta eliminada" });
    setSubfolderToDelete(null);
  };

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

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Sin sesión activa", description: "Recargá la página e intentá de nuevo.", variant: "destructive" });
      return;
    }

    const slots: UploadingFile[] = fileArray.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      progress: 0,
      stepNumber: activeStep,
    }));
    setUploadingFiles((prev) => [...prev, ...slots]);

    const newDocs: ProjectDocument[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const slot = slots[i];
      const subs = getSubfolders(activeStep);
      const hasSubfolders = subs.length > 0;
      const subPath = hasSubfolders && activeSubfolder ? `${activeSubfolder}/` : "";
      const safeName = sanitizeStorageName(file.name);
      const storagePath = `${id}/step-${activeStep}/${subPath}${slot.id}-${safeName}`;

      try {
        if (file.size >= LARGE_FILE_THRESHOLD) {
          await uploadWithTUS(file, storagePath, session.access_token, (pct) => {
            setUploadingFiles((prev) =>
              prev.map((u) => u.id === slot.id ? { ...u, progress: pct } : u)
            );
          });
        } else {
          const { error } = await supabase.storage.from("project-files").upload(storagePath, file);
          if (error) throw error;
          setUploadingFiles((prev) =>
            prev.map((u) => u.id === slot.id ? { ...u, progress: 100 } : u)
          );
        }

        newDocs.push({
          id: slot.id,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          uploadedAt: new Date().toISOString(),
          stepNumber: activeStep,
          storagePath,
          uploadedBy: currentAppUserId ?? undefined,
          ...(hasSubfolders ? { subfolder: activeSubfolder } : {}),
        });
      } catch (err: any) {
        toast({
          title: `Error al subir ${file.name}`,
          description: err?.message ?? "Error desconocido",
          variant: "destructive",
        });
      } finally {
        setUploadingFiles((prev) => prev.filter((u) => u.id !== slot.id));
      }
    }

    if (newDocs.length > 0) {
      const inserts = newDocs.map((d) => ({
        id: d.id,
        project_id: id,
        name: d.name,
        size: d.size,
        type: d.type,
        uploaded_at: d.uploadedAt,
        step_number: d.stepNumber,
        storage_path: d.storagePath ?? null,
        uploaded_by: d.uploadedBy ?? null,
        subfolder: d.subfolder ?? null,
      }));
      await supabase.from("project_documents").insert(inserts);
      setDocuments((prev) => {
        const updated = [...prev, ...newDocs];
        updateProjectStep(computeCurrentStep(updated));
        return updated;
      });
      toast({ title: `${newDocs.length} archivo${newDocs.length > 1 ? "s" : ""} subido${newDocs.length > 1 ? "s" : ""}` });
    }
  }, [activeStep, activeSubfolder, id, currentAppUserId, toast, getSubfolders]);

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
  const currentSubfolders = getSubfolders(activeStep);
  const hasSubfolders = currentSubfolders.length > 0;
  const stepDocs = hasSubfolders
    ? stepDocsAll.filter((d) => d.subfolder === activeSubfolder)
    : stepDocsAll;
  const currentStepInfo = PROJECT_STEPS[activeStep - 1];
  const stepsWithDocs = new Set(documents.map((d) => d.stepNumber));

  const activeUploads = uploadingFiles.filter((u) => u.stepNumber === activeStep);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.storagePath) {
      await supabase.storage.from("project-files").remove([deleteTarget.storagePath]);
    }
    await supabase.from("project_documents").delete().eq("id", deleteTarget.id);
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
            {project.client} · ${project.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              const isUploading = uploadingFiles.some((u) => u.stepNumber === step.number);

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
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isComplete ? (
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

          <div className="flex flex-wrap items-center gap-1 mb-4 border-b">
            {currentSubfolders.map((sf) => {
              const count = stepDocsAll.filter((d) => d.subfolder === sf.key).length;
              const isActive = activeSubfolder === sf.key;
              return (
                <div
                  key={sf.key}
                  className={`group flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <button
                    onClick={() => setActiveSubfolder(sf.key)}
                    className="flex items-center gap-1.5"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    {sf.label}
                    <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                      count > 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    }`}>{count}</span>
                  </button>
                  {!sf.builtIn && (
                    <button
                      onClick={() => setSubfolderToDelete(sf)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      title="Eliminar subcarpeta"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
            <button
              onClick={() => setNewSubfolderOpen(true)}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors -mb-px border-b-2 border-transparent"
              title="Nueva subcarpeta"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              Nueva subcarpeta
            </button>
          </div>

          {docsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
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

              {/* Upload progress cards */}
              {activeUploads.map((uf) => (
                <div key={uf.id} className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uf.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-primary/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${uf.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-primary font-medium tabular-nums w-9 text-right">{uf.progress}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatFileSize(uf.size)} · Subiendo...</p>
                  </div>
                </div>
              ))}
            </div>
          )}

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
              {stepDocs.length === 0 && activeUploads.length === 0
                ? "No hay documentos en este paso todavía"
                : "Arrastra más archivos aquí"}
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

      <ConfirmDialog
        open={!!subfolderToDelete}
        onOpenChange={(open) => { if (!open) setSubfolderToDelete(null); }}
        title="Eliminar Subcarpeta"
        description={(() => {
          if (!subfolderToDelete) return "";
          const count = documents.filter(
            (d) => d.stepNumber === activeStep && d.subfolder === subfolderToDelete.key,
          ).length;
          return count > 0
            ? `La subcarpeta "${subfolderToDelete.label}" contiene ${count} archivo${count > 1 ? "s" : ""}. Se eliminarán también. ¿Continuar?`
            : `¿Eliminar la subcarpeta "${subfolderToDelete.label}"?`;
        })()}
        onConfirm={confirmDeleteSubfolder}
      />

      <Dialog open={newSubfolderOpen} onOpenChange={setNewSubfolderOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva Subcarpeta</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <Label className="text-xs">Nombre</Label>
            <Input
              value={newSubfolderLabel}
              onChange={(e) => setNewSubfolderLabel(e.target.value)}
              placeholder="Ej: Planos finales"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && newSubfolderLabel.trim()) {
                  e.preventDefault();
                  createSubfolder();
                }
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              Se creará en el paso {activeStep}: {PROJECT_STEPS[activeStep - 1]?.name}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setNewSubfolderOpen(false); setNewSubfolderLabel(""); }}>
              Cancelar
            </Button>
            <Button size="sm" onClick={createSubfolder} disabled={!newSubfolderLabel.trim() || savingSubfolder}>
              {savingSubfolder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetail;
