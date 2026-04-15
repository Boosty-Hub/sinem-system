import { useState, useEffect } from "react";
import { Loader2, Save, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";

interface FieldRow {
  id: string;
  module: string;
  field_key: string;
  field_label: string;
  is_required: boolean;
  sort_order: number;
}

const MODULE_LABELS: Record<string, string> = {
  oportunidad: "Oportunidad (CRM)",
  cotizacion: "Cotización",
  cliente: "Cliente",
  contacto: "Contacto",
  proyecto: "Proyecto",
};

const MODULE_ORDER = ["oportunidad", "cotizacion", "cliente", "contacto", "proyecto"];

const ConfigCamposObligatorios = () => {
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  const canEditConfig = canEdit("Configuración");
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("required_fields" as any)
        .select("*")
        .order("sort_order");
      setFields((data as unknown as FieldRow[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const toggle = (id: string) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, is_required: !f.is_required } : f))
    );
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    for (const f of fields) {
      await supabase
        .from("required_fields" as any)
        .update({ is_required: f.is_required })
        .eq("id", f.id);
    }
    setSaving(false);
    setDirty(false);
    toast({ title: "Campos obligatorios actualizados" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const grouped: Record<string, FieldRow[]> = {};
  for (const f of fields) {
    if (!grouped[f.module]) grouped[f.module] = [];
    grouped[f.module].push(f);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Campos Obligatorios
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configura qué campos son obligatorios al crear o editar registros en cada módulo
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !dirty || !canEditConfig} size="sm">
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Guardar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {MODULE_ORDER.map((mod) => {
          const rows = grouped[mod];
          if (!rows) return null;
          const requiredCount = rows.filter((r) => r.is_required).length;
          return (
            <div key={mod} className="stat-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-sm">{MODULE_LABELS[mod] ?? mod}</h3>
                  <p className="text-xs text-muted-foreground">
                    {requiredCount} de {rows.length} campo{rows.length !== 1 ? "s" : ""} obligatorio{requiredCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                {rows.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-sm">
                      {f.field_label}
                      {f.is_required && <span className="text-destructive ml-1">*</span>}
                    </span>
                    <Switch
                      checked={f.is_required}
                      onCheckedChange={() => canEditConfig && toggle(f.id)}
                      disabled={!canEditConfig}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConfigCamposObligatorios;
