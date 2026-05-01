import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
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
  prospectCountByStage?: Record<string, number>;
  onMigrateStage?: (fromKey: string, toKey: string | null) => Promise<void>;
}

const StagesDialog = ({ open, onOpenChange, stages, setStages, prospectCountByStage = {}, onMigrateStage }: Props) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("bg-sinem-info");

  // Migration confirmation state
  const [pendingDelete, setPendingDelete] = useState<{ key: string; label: string } | null>(null);
  const [migrateTo, setMigrateTo] = useState<string>("__none__");
  const [migrating, setMigrating] = useState(false);

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

  const requestDelete = (key: string, label: string) => {
    const count = prospectCountByStage[key] ?? 0;
    if (count > 0) {
      setPendingDelete({ key, label });
      setMigrateTo("__none__");
    } else {
      setStages((prev) => prev.filter((s) => s.key !== key));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setMigrating(true);
    const toKey = migrateTo === "__none__" ? null : migrateTo;
    await onMigrateStage?.(pendingDelete.key, toKey);
    setStages((prev) => prev.filter((s) => s.key !== pendingDelete.key));
    setPendingDelete(null);
    setMigrating(false);
  };

  const cancelDelete = () => {
    setPendingDelete(null);
    setMigrateTo("__none__");
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

  const affectedCount = pendingDelete ? (prospectCountByStage[pendingDelete.key] ?? 0) : 0;
  const otherStages = stages.filter((s) => s.key !== pendingDelete?.key);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar Etapas del Pipeline</DialogTitle>
        </DialogHeader>

        {/* Migration confirmation */}
        {pendingDelete && (
          <div className="border border-amber-300 rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Eliminar etapa "{pendingDelete.label}"
                </p>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-0.5">
                  {affectedCount} oportunidad{affectedCount !== 1 ? "es" : ""} usa{affectedCount === 1 ? "" : "n"} esta etapa.
                  ¿A dónde deseas moverlas?
                </p>
              </div>
            </div>
            <Select value={migrateTo} onValueChange={setMigrateTo}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Seleccionar etapa destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin categoría</SelectItem>
                {otherStages.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                      {s.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={cancelDelete} disabled={migrating}>
                Cancelar
              </Button>
              <Button variant="destructive" size="sm" onClick={confirmDelete} disabled={migrating}>
                {migrating ? "Migrando..." : "Confirmar y eliminar"}
              </Button>
            </div>
          </div>
        )}

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
                  {(prospectCountByStage[stage.key] ?? 0) > 0 && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                      {prospectCountByStage[stage.key]}
                    </span>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100" onClick={() => startEdit(stage)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive"
                    onClick={() => requestDelete(stage.key, stage.label)}
                    disabled={!!pendingDelete}
                  >
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
