import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PipelineStage } from "@/lib/types";
import { Plus, Trash2, GripVertical, Pencil, Check, X } from "lucide-react";

const STAGE_COLORS = [
  { value: "bg-sinem-info", label: "Azul" },
  { value: "bg-sinem-teal", label: "Teal" },
  { value: "bg-sinem-warning", label: "Amarillo" },
  { value: "bg-sinem-orange", label: "Naranja" },
  { value: "bg-sinem-success", label: "Verde" },
  { value: "bg-destructive", label: "Rojo" },
  { value: "bg-purple-500", label: "Morado" },
  { value: "bg-pink-500", label: "Rosa" },
  { value: "bg-slate-500", label: "Gris" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  setStages: React.Dispatch<React.SetStateAction<PipelineStage[]>>;
}

const StagesDialog = ({ open, onOpenChange, stages, setStages }: Props) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState("");

  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("bg-sinem-info");

  const startEdit = (stage: PipelineStage) => {
    setEditingKey(stage.key);
    setEditLabel(stage.label);
    setEditColor(stage.color);
  };

  const saveEdit = () => {
    if (!editingKey || !editLabel.trim()) return;
    setStages((prev) =>
      prev.map((s) => (s.key === editingKey ? { ...s, label: editLabel.trim(), color: editColor } : s))
    );
    setEditingKey(null);
  };

  const cancelEdit = () => setEditingKey(null);

  const addStage = () => {
    if (!newLabel.trim()) return;
    const key = newLabel.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (stages.some((s) => s.key === key)) return;
    setStages((prev) => [...prev, { key, label: newLabel.trim(), color: newColor }]);
    setNewLabel("");
    setNewColor("bg-sinem-info");
  };

  const removeStage = (key: string) => {
    setStages((prev) => prev.filter((s) => s.key !== key));
  };

  const moveStage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;
    setStages((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar Etapas del Pipeline</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 mt-2">
          {stages.map((stage, i) => (
            <div key={stage.key} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/30 transition-colors group">
              {editingKey === stage.key ? (
                <>
                  <div className={`w-3 h-3 rounded-full shrink-0 ${editColor}`} />
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="h-7 text-sm flex-1"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                  />
                  <select
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="h-7 rounded border text-xs px-1 bg-background"
                  >
                    {STAGE_COLORS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={saveEdit}>
                    <Check className="h-3.5 w-3.5 text-sinem-success" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={cancelEdit}>
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-60 transition-opacity">
                    <button
                      type="button"
                      onClick={() => moveStage(i, -1)}
                      disabled={i === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 leading-none text-[10px]"
                    >▲</button>
                    <button
                      type="button"
                      onClick={() => moveStage(i, 1)}
                      disabled={i === stages.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 leading-none text-[10px]"
                    >▼</button>
                  </div>
                  <div className={`w-3 h-3 rounded-full shrink-0 ${stage.color}`} />
                  <span className="text-sm font-medium flex-1">{stage.label}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{stage.key}</span>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100" onClick={() => startEdit(stage)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive" onClick={() => removeStage(stage.key)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="border-t pt-4 mt-2">
          <Label className="text-xs text-muted-foreground mb-2 block">Agregar nueva etapa</Label>
          <div className="flex items-center gap-2">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Nombre de la etapa"
              className="h-8 text-sm flex-1"
              onKeyDown={(e) => { if (e.key === "Enter") addStage(); }}
            />
            <select
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-8 rounded border text-xs px-1 bg-background"
            >
              {STAGE_COLORS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <Button size="sm" className="h-8" onClick={addStage} disabled={!newLabel.trim()}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StagesDialog;
