import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical, Save, X } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

export interface TaskStage {
  id: string;
  name: string;
  color: string;
  position: number;
}

const STAGE_COLORS = [
  { value: "bg-gray-500", label: "Gris", preview: "bg-gray-500" },
  { value: "bg-sinem-warning", label: "Amarillo", preview: "bg-yellow-500" },
  { value: "bg-sinem-info", label: "Azul", preview: "bg-blue-500" },
  { value: "bg-sinem-success", label: "Verde", preview: "bg-green-500" },
  { value: "bg-red-500", label: "Rojo", preview: "bg-red-500" },
  { value: "bg-purple-500", label: "Morado", preview: "bg-purple-500" },
  { value: "bg-orange-500", label: "Naranja", preview: "bg-orange-500" },
  { value: "bg-pink-500", label: "Rosa", preview: "bg-pink-500" },
  { value: "bg-teal-500", label: "Turquesa", preview: "bg-teal-500" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStagesUpdated: () => void;
}

export default function TaskStagesDialog({ open, onOpenChange, onStagesUpdated }: Props) {
  const { toast } = useToast();
  const [stages, setStages] = useState<TaskStage[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", color: "bg-gray-500" });
  const [newStage, setNewStage] = useState({ name: "", color: "bg-gray-500" });
  const [showNewForm, setShowNewForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TaskStage | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const fetchStages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("task_stages")
      .select("*")
      .order("position");
    setStages((data ?? []) as TaskStage[]);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchStages();
  }, [open]);

  const handleCreate = async () => {
    if (!newStage.name.trim()) {
      toast({ title: "El nombre es requerido", variant: "destructive" });
      return;
    }
    const maxPosition = stages.length > 0 ? Math.max(...stages.map(s => s.position)) + 1 : 0;
    await supabase.from("task_stages").insert({
      name: newStage.name.trim(),
      color: newStage.color,
      position: maxPosition,
    });
    toast({ title: "Etapa creada" });
    setNewStage({ name: "", color: "bg-gray-500" });
    setShowNewForm(false);
    fetchStages();
    onStagesUpdated();
  };

  const handleEdit = (stage: TaskStage) => {
    setEditingId(stage.id);
    setEditForm({ name: stage.name, color: stage.color });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.name.trim()) return;
    await supabase.from("task_stages").update({
      name: editForm.name.trim(),
      color: editForm.color,
    }).eq("id", editingId);
    toast({ title: "Etapa actualizada" });
    setEditingId(null);
    fetchStages();
    onStagesUpdated();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    // Check if there are tasks using this stage
    const { count } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("stage_id", deleteTarget.id);
    
    if (count && count > 0) {
      toast({ 
        title: "No se puede eliminar", 
        description: `Hay ${count} tarea(s) usando esta etapa. Muévelas primero.`,
        variant: "destructive" 
      });
      setDeleteTarget(null);
      return;
    }

    await supabase.from("task_stages").delete().eq("id", deleteTarget.id);
    toast({ title: "Etapa eliminada" });
    setDeleteTarget(null);
    fetchStages();
    onStagesUpdated();
  };

  const handleDragStart = (e: React.DragEvent, stageId: string) => {
    setDraggedId(stageId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const draggedIndex = stages.findIndex(s => s.id === draggedId);
    const targetIndex = stages.findIndex(s => s.id === targetId);
    
    const newStages = [...stages];
    const [removed] = newStages.splice(draggedIndex, 1);
    newStages.splice(targetIndex, 0, removed);

    // Update positions
    const updates = newStages.map((stage, index) => ({
      id: stage.id,
      position: index,
    }));

    setStages(newStages.map((s, i) => ({ ...s, position: i })));

    // Update in database
    for (const update of updates) {
      await supabase.from("task_stages").update({ position: update.position }).eq("id", update.id);
    }

    setDraggedId(null);
    toast({ title: "Orden actualizado" });
    onStagesUpdated();
  };

  const moveStage = async (stageId: string, direction: "up" | "down") => {
    const index = stages.findIndex(s => s.id === stageId);
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === stages.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newStages = [...stages];
    [newStages[index], newStages[newIndex]] = [newStages[newIndex], newStages[index]];

    // Update positions
    setStages(newStages.map((s, i) => ({ ...s, position: i })));

    await supabase.from("task_stages").update({ position: newIndex }).eq("id", stageId);
    await supabase.from("task_stages").update({ position: index }).eq("id", stages[newIndex].id);

    toast({ title: "Orden actualizado" });
    onStagesUpdated();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gestionar Etapas de Tareas</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
            ) : (
              <div className="space-y-2">
                {stages.map((stage, index) => (
                  <div
                    key={stage.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, stage.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border bg-card transition-all ${
                      draggedId === stage.id ? "opacity-50" : ""
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                    
                    {editingId === stage.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <Select value={editForm.color} onValueChange={(v) => setEditForm(f => ({ ...f, color: v }))}>
                          <SelectTrigger className="w-24 h-8">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${editForm.color}`} />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {STAGE_COLORS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${c.preview}`} />
                                  {c.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleSaveEdit}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium">{stage.name}</span>
                        <span className="text-xs text-muted-foreground">#{index + 1}</span>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEdit(stage)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(stage)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}

                {stages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay etapas configuradas
                  </p>
                )}
              </div>
            )}

            {showNewForm ? (
              <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                <div className="space-y-2">
                  <Label>Nombre de la etapa</Label>
                  <Input
                    value={newStage.name}
                    onChange={(e) => setNewStage(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ej: En Revisión"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select value={newStage.color} onValueChange={(v) => setNewStage(f => ({ ...f, color: v }))}>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${newStage.color}`} />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_COLORS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${c.preview}`} />
                            {c.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreate} size="sm">Crear Etapa</Button>
                  <Button variant="outline" size="sm" onClick={() => setShowNewForm(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => setShowNewForm(true)}>
                <Plus className="h-4 w-4 mr-2" /> Agregar Nueva Etapa
              </Button>
            )}

            <p className="text-xs text-muted-foreground">
              Arrastra las etapas para cambiar su orden en el Kanban.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Eliminar Etapa"
        description={`¿Estás seguro de eliminar la etapa "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
      />
    </>
  );
}
