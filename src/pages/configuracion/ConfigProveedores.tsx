import { useState } from "react";
import { Save, Plus, Pencil, X, Handshake, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { usePartners } from "@/hooks/usePartners";
import { usePermissions } from "@/hooks/usePermissions";

const ConfigProveedores = () => {
  const { canEdit, canCreate, canDelete } = usePermissions();
  const canEditPart = canEdit("Proveedores");
  const canCreatePart = canCreate("Proveedores");
  const canDeletePart = canDelete("Proveedores");
  const { toast } = useToast();
  const { partners, setPartners } = usePartners();
  const [newPartner, setNewPartner] = useState("");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const addPartner = () => {
    const trimmed = newPartner.trim();
    if (!trimmed) return;
    if (partners.includes(trimmed)) {
      toast({ title: "Error", description: "Este proveedor ya existe.", variant: "destructive" });
      return;
    }
    setPartners([...partners, trimmed]);
    setNewPartner("");
    toast({ title: "Proveedor agregado" });
  };

  const saveEdit = (idx: number) => {
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    if (partners.some((p, i) => i !== idx && p === trimmed)) {
      toast({ title: "Error", description: "Este proveedor ya existe.", variant: "destructive" });
      return;
    }
    setPartners(partners.map((p, i) => (i === idx ? trimmed : p)));
    setEditingIdx(null);
    toast({ title: "Proveedor actualizado" });
  };

  const deletePartner = (idx: number) => {
    setPartners(partners.filter((_, i) => i !== idx));
    toast({ title: "Proveedor eliminado" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Proveedores / Partners</h1>
        <p className="text-muted-foreground text-sm mt-1">Catálogo de proveedores disponibles en cotizaciones y CRM</p>
      </div>

      <div className="stat-card max-w-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Handshake className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Listado de Proveedores</h3>
            <p className="text-xs text-muted-foreground">Estos proveedores aparecen en el selector de cotizaciones y oportunidades</p>
          </div>
        </div>

        <div className="space-y-2">
          {partners.map((p, i) => (
            <div key={i} className="flex items-center gap-2 group">
              {editingIdx === i ? (
                <>
                  <Input
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    className="h-8 text-sm flex-1"
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(i)}
                    autoFocus
                  />
                  <Button size="sm" variant="default" className="h-8 px-2" onClick={() => saveEdit(i)}>
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingIdx(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm flex-1 py-1.5 px-2 rounded bg-muted/50">{p}</span>
                  {canEditPart && (
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => { setEditingIdx(i); setEditingValue(p); }}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                  {canDeletePart && (
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={() => deletePartner(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}
          {canCreatePart && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Input
                value={newPartner}
                onChange={(e) => setNewPartner(e.target.value)}
                placeholder="Nuevo proveedor..."
                className="h-8 text-sm flex-1"
                onKeyDown={(e) => e.key === "Enter" && addPartner()}
              />
              <Button size="sm" variant="outline" className="h-8" onClick={addPartner} disabled={!newPartner.trim()}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigProveedores;
