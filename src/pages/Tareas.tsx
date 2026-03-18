import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TASK_STATUSES, TASK_PRIORITIES, type Task, type TaskStatus, type TaskComment } from "@/lib/types";
import {
  Search, Plus, ListTodo, LayoutGrid, Calendar, AlertCircle, Clock, CheckCircle2,
  MessageSquare, Trash2, Send, User2, Building2, FolderKanban, Loader2, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAuth } from "@/lib/AuthContext";
import ConfirmDialog from "@/components/ConfirmDialog";

const priorityIcon = { alta: AlertCircle, media: Clock, baja: CheckCircle2 };
const priorityColor = { alta: "text-destructive", media: "text-sinem-warning", baja: "text-muted-foreground" };
const statusColor = { pendiente: "bg-sinem-warning", en_progreso: "bg-sinem-info", completada: "bg-sinem-success" };

const emptyForm = {
  title: "",
  description: "",
  priority: "media" as Task["priority"],
  assignee: "",
  clientId: "",
  projectId: "",
  dueDate: "",
};

interface SystemUser { id: string; name: string; email: string; status: string; }
interface ClientRow { id: string; name: string; }
interface ProjectRow { id: string; name: string; }

const Tareas = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useLocalStorage<"board" | "list">("sinem:tasks:view", "board");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: tasksData }, { data: commentsData }, { data: clientsData }, { data: projectsData }, { data: usersData }] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("task_comments").select("*").order("created_at"),
      supabase.from("clients").select("id, name").order("name"),
      supabase.from("projects").select("id, name").order("name"),
      supabase.from("app_users").select("id, name, email, status").eq("status", "activo").order("name"),
    ]);

    const commentsByTask = new Map<string, TaskComment[]>();
    (commentsData ?? []).forEach((c) => {
      const list = commentsByTask.get(c.task_id) ?? [];
      list.push({ id: c.id, author: c.author, text: c.text, createdAt: c.created_at });
      commentsByTask.set(c.task_id, list);
    });

    setTasks((tasksData ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status as TaskStatus,
      priority: t.priority as Task["priority"],
      assignee: t.assignee,
      clientId: t.client_id ?? undefined,
      projectId: t.project_id ?? undefined,
      dueDate: t.due_date ?? "",
      createdAt: t.created_at,
      comments: commentsByTask.get(t.id) ?? [],
    })));
    setClients(clientsData ?? []);
    setProjects(projectsData ?? []);
    setSystemUsers(usersData ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const currentUserName = systemUsers.find((u) => u.id === (user as any)?.id)?.name ?? systemUsers[0]?.name ?? "Usuario";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState("");
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    const matchAssignee = filterAssignee === "all" || t.assignee === filterAssignee;
    const matchClient = filterClient === "all" || t.clientId === filterClient;
    const matchPriority = filterPriority === "all" || t.priority === filterPriority;
    return matchSearch && matchAssignee && matchClient && matchPriority;
  });

  const u = (key: keyof typeof emptyForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (task: Task) => {
    setEditId(task.id);
    setForm({ title: task.title, description: task.description, priority: task.priority, assignee: task.assignee, clientId: task.clientId || "", projectId: task.projectId || "", dueDate: task.dueDate });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      assignee: form.assignee,
      client_id: form.clientId || null,
      project_id: form.projectId || null,
      due_date: form.dueDate || null,
    };
    if (editId) {
      await supabase.from("tasks").update(payload).eq("id", editId);
      toast({ title: "Tarea actualizada" });
    } else {
      await supabase.from("tasks").insert(payload);
      toast({ title: "Tarea creada" });
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = (task: Task) => setDeleteTarget(task);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("task_comments").delete().eq("task_id", deleteTarget.id);
    await supabase.from("tasks").delete().eq("id", deleteTarget.id);
    if (detailTask?.id === deleteTarget.id) setDetailTask(null);
    toast({ title: "Tarea eliminada" });
    setDeleteTarget(null);
    fetchData();
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    await supabase.from("tasks").update({ status }).eq("id", taskId);
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status } : t));
    if (detailTask?.id === taskId) setDetailTask((d) => d ? { ...d, status } : null);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !detailTask) return;
    const { data } = await supabase.from("task_comments").insert({
      task_id: detailTask.id, author: currentUserName, text: newComment.trim(),
    }).select().single();
    if (data) {
      const comment: TaskComment = { id: data.id, author: data.author, text: data.text, createdAt: data.created_at };
      setTasks((prev) => prev.map((t) => t.id === detailTask.id ? { ...t, comments: [...t.comments, comment] } : t));
      setDetailTask((d) => d ? { ...d, comments: [...d.comments, comment] } : null);
    }
    setNewComment("");
    toast({ title: "Comentario agregado" });
  };

  const getClientName = (clientId?: string) => clientId ? clients.find((c) => c.id === clientId)?.name : undefined;
  const getProjectName = (projectId?: string) => projectId ? projects.find((p) => p.id === projectId)?.name : undefined;
  const isOverdue = (task: Task) => task.status !== "completada" && task.dueDate && new Date(task.dueDate) < new Date();

  const pendingCount = tasks.filter((t) => t.status === "pendiente").length;
  const inProgressCount = tasks.filter((t) => t.status === "en_progreso").length;
  const completedCount = tasks.filter((t) => t.status === "completada").length;

  const TaskCard = ({ task }: { task: Task }) => {
    const PriorityIcon = priorityIcon[task.priority];
    const clientName = getClientName(task.clientId);
    const overdue = isOverdue(task);
    return (
      <div className="stat-card p-3 group cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailTask(task)}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-sm font-medium leading-tight flex-1">{task.title}</h4>
          <div className="flex items-center gap-1 flex-shrink-0">
            <PriorityIcon className={`h-3.5 w-3.5 ${priorityColor[task.priority]}`} />
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); handleDelete(task); }}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {clientName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
            <Building2 className="h-3 w-3" /> {clientName}
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
              <User2 className="h-3 w-3 text-primary" />
            </div>
            <span className="text-[11px] text-muted-foreground">{task.assignee.split(" ")[0]}</span>
          </div>
          <div className="flex items-center gap-2">
            {task.comments.length > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <MessageSquare className="h-3 w-3" /> {task.comments.length}
              </span>
            )}
            {task.dueDate && (
              <span className={`text-[11px] ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {new Date(task.dueDate).toLocaleDateString("es-DO", { day: "2-digit", month: "short" })}
              </span>
            )}
          </div>
        </div>
      </div>
    );
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
          <h1 className="text-2xl font-bold tracking-tight">Tareas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {pendingCount} pendientes · {inProgressCount} en progreso · {completedCount} completadas
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar tarea..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-[200px]" />
          </div>
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <User2 className="h-3 w-3 mr-1" /><SelectValue placeholder="Responsable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {systemUsers.map((u) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <Building2 className="h-3 w-3 mr-1" /><SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex border rounded-lg overflow-hidden">
            <Button variant={view === "board" ? "default" : "ghost"} size="sm" className="rounded-none h-9" onClick={() => setView("board")}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={view === "list" ? "default" : "ghost"} size="sm" className="rounded-none h-9" onClick={() => setView("list")}>
              <ListTodo className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Nueva Tarea
          </Button>
        </div>
      </div>

      {view === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TASK_STATUSES.map((col) => {
            const colTasks = filtered.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <h3 className="text-sm font-semibold">{col.label}</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {colTasks.map((task) => <TaskCard key={task.id} task={task} />)}
                  {colTasks.length === 0 && (
                    <div className="border border-dashed border-border rounded-xl p-6 text-center">
                      <p className="text-xs text-muted-foreground">Sin tareas</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "list" && (
        <div className="stat-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tarea</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Prioridad</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Responsable</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Vencimiento</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const PriorityIcon = priorityIcon[task.priority];
                const overdue = isOverdue(task);
                const clientName = getClientName(task.clientId);
                const priorityCfg = TASK_PRIORITIES.find((p) => p.key === task.priority)!;
                return (
                  <tr key={task.id} className="border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setDetailTask(task)}>
                    <td className="py-3 px-4">
                      <p className="font-medium">{task.title}</p>
                      {task.description && <p className="text-xs text-muted-foreground truncate max-w-[300px]">{task.description}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <select value={task.status} onChange={(e) => { e.stopPropagation(); handleStatusChange(task.id, e.target.value as TaskStatus); }} onClick={(e) => e.stopPropagation()}
                        className={`text-[11px] px-2 py-1 rounded-full text-primary-foreground border-0 cursor-pointer ${statusColor[task.status]}`}>
                        {TASK_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`flex items-center gap-1 text-xs ${priorityCfg.color}`}>
                        <PriorityIcon className="h-3.5 w-3.5" /> {priorityCfg.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">{task.assignee}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{clientName || "—"}</td>
                    <td className="py-3 px-4">
                      {task.dueDate ? (
                        <span className={`text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          {new Date(task.dueDate).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(task); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No se encontraron tareas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Tarea" : "Nueva Tarea"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => u("title", e.target.value)} placeholder="¿Qué hay que hacer?" />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={(e) => u("description", e.target.value)} placeholder="Detalles de la tarea..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prioridad</Label>
                <Select value={form.priority} onValueChange={(v) => u("priority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Responsable</Label>
                <Select value={form.assignee} onValueChange={(v) => u("assignee", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {systemUsers.map((u) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cliente</Label>
                <Select value={form.clientId || "none"} onValueChange={(v) => u("clientId", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin cliente</SelectItem>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha límite</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => u("dueDate", e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.title.trim()}>
              {editId ? "Guardar Cambios" : "Crear Tarea"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Detail / Comments Panel */}
      <Dialog open={!!detailTask} onOpenChange={(open) => { if (!open) setDetailTask(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailTask && (() => {
            const PriorityIcon = priorityIcon[detailTask.priority];
            const priorityCfg = TASK_PRIORITIES.find((p) => p.key === detailTask.priority)!;
            const clientName = getClientName(detailTask.clientId);
            const projectName = getProjectName(detailTask.projectId);
            const overdue = isOverdue(detailTask);
            const freshTask = tasks.find((t) => t.id === detailTask.id) || detailTask;

            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg leading-tight">{freshTask.title}</DialogTitle>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => { openEdit(freshTask); setDetailTask(null); }}>Editar</Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(freshTask)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  {freshTask.description && <p className="text-sm text-muted-foreground">{freshTask.description}</p>}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Estado</p>
                      <select value={freshTask.status} onChange={(e) => handleStatusChange(freshTask.id, e.target.value as TaskStatus)}
                        className={`text-xs px-2.5 py-1.5 rounded-full text-primary-foreground border-0 cursor-pointer ${statusColor[freshTask.status]}`}>
                        {TASK_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Prioridad</p>
                      <span className={`flex items-center gap-1 text-xs font-medium ${priorityCfg.color}`}>
                        <PriorityIcon className="h-3.5 w-3.5" /> {priorityCfg.label}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Responsable</p>
                      <span className="flex items-center gap-1 text-xs"><User2 className="h-3 w-3" /> {freshTask.assignee}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Vencimiento</p>
                      <span className={`flex items-center gap-1 text-xs ${overdue ? "text-destructive font-medium" : ""}`}>
                        <Calendar className="h-3 w-3" />
                        {freshTask.dueDate ? new Date(freshTask.dueDate).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" }) : "Sin fecha"}
                      </span>
                    </div>
                  </div>

                  {(clientName || projectName) && (
                    <div className="flex gap-4 text-xs">
                      {clientName && <span className="flex items-center gap-1 text-muted-foreground"><Building2 className="h-3 w-3" /> {clientName}</span>}
                      {projectName && <span className="flex items-center gap-1 text-muted-foreground"><FolderKanban className="h-3 w-3" /> {projectName}</span>}
                    </div>
                  )}

                  <div className="border-t border-border/60 pt-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" /> Comentarios ({freshTask.comments.length})
                    </h3>
                    {freshTask.comments.length > 0 ? (
                      <div className="space-y-3 mb-4">
                        {freshTask.comments.map((c) => (
                          <div key={c.id} className="flex gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-[10px] font-semibold text-primary">{c.author.split(" ").map((n) => n[0]).join("")}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">{c.author}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(c.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short" })} {new Date(c.createdAt).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5">{c.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mb-4">Sin comentarios aún</p>
                    )}
                    <div className="flex gap-2">
                      <Textarea ref={commentInputRef} value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escribe un comentario..." rows={2} className="flex-1 text-sm"
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }} />
                      <Button size="sm" className="self-end" onClick={handleAddComment} disabled={!newComment.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Eliminar Tarea"
        description={`¿Estás seguro de eliminar "${deleteTarget?.title}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default Tareas;
