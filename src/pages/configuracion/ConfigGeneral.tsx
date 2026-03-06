import { useState, useEffect, useRef } from "react";
import { Settings, Save, Upload, Trash2, Image, Plus, Pencil, X, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { DEFAULT_PARTNERS, type GeneralSettings } from "@/lib/types";

const STORAGE_KEY = "sinem:general-settings";
const DEFAULT_SETTINGS: GeneralSettings = { managerApprovalLimit: 300000 };

const ConfigGeneral = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_SETTINGS);
  const [partners, setPartners] = useLocalStorage<string[]>("sinem:partners", DEFAULT_PARTNERS);
  const [newPartner, setNewPartner] = useState("");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setSettings(JSON.parse(stored)); } catch { /* use default */ }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    toast({ title: "Configuración guardada" });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Solo se permiten archivos de imagen.", variant: "destructive" });
      return;
    }
    if (file.size > 500 * 1024) {
      toast({ title: "Error", description: "La imagen no debe superar 500KB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setSettings((s) => ({ ...s, companyLogoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveLogo = () => {
    setSettings((s) => ({ ...s, companyLogoUrl: undefined }));
  };

  // ── Partners CRUD ──
  const addPartner = () => {
    const trimmed = newPartner.trim();
    if (!trimmed) return;
    if (partners.includes(trimmed)) {
      toast({ title: "Error", description: "Este partner ya existe.", variant: "destructive" });
      return;
    }
    setPartners([...partners, trimmed]);
    setNewPartner("");
    toast({ title: "Partner agregado" });
  };

  const saveEdit = (idx: number) => {
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    if (partners.some((p, i) => i !== idx && p === trimmed)) {
      toast({ title: "Error", description: "Este partner ya existe.", variant: "destructive" });
      return;
    }
    setPartners(partners.map((p, i) => (i === idx ? trimmed : p)));
    setEditingIdx(null);
    toast({ title: "Partner actualizado" });
  };

  const deletePartner = (idx: number) => {
    setPartners(partners.filter((_, i) => i !== idx));
    toast({ title: "Partner eliminado" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Configuración General</h1>
        <p className="text-muted-foreground text-sm mt-1">Parámetros generales del sistema</p>
      </div>

      {/* Logo de la Empresa */}
      <div className="stat-card max-w-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Image className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Logo de la Empresa</h3>
            <p className="text-xs text-muted-foreground">Este logo se muestra en cotizaciones, login y sidebar</p>
          </div>
        </div>

        <div className="space-y-4">
          {settings.companyLogoUrl ? (
            <div className="flex items-center gap-4">
              <div className="border rounded-lg p-3 bg-white">
                <img src={settings.companyLogoUrl} alt="Logo" className="h-14 max-w-[200px] object-contain" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => logoInputRef.current?.click()}>
                  <Upload className="h-3 w-3 mr-1" /> Cambiar
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={handleRemoveLogo}>
                  <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => logoInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Haz clic para subir el logo</p>
              <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG o SVG · Máximo 500KB</p>
            </div>
          )}
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </div>
      </div>

      {/* Partners */}
      <div className="stat-card max-w-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Handshake className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Partners / Proveedores</h3>
            <p className="text-xs text-muted-foreground">Listado de partners disponibles en cotizaciones y CRM</p>
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
                  <Button
                    size="sm" variant="ghost"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => { setEditingIdx(i); setEditingValue(p); }}
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => deletePartner(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Input
              value={newPartner}
              onChange={(e) => setNewPartner(e.target.value)}
              placeholder="Nuevo partner..."
              className="h-8 text-sm flex-1"
              onKeyDown={(e) => e.key === "Enter" && addPartner()}
            />
            <Button size="sm" variant="outline" className="h-8" onClick={addPartner} disabled={!newPartner.trim()}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          </div>
        </div>
      </div>

      {/* Aprobación de Cotizaciones */}
      <div className="stat-card max-w-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Aprobación de Cotizaciones</h3>
            <p className="text-xs text-muted-foreground">Define los límites de aprobación según rol</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Monto máximo de aprobación — Gerente Comercial (USD)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Cotizaciones con un monto total igual o inferior a este valor pueden ser aprobadas por un usuario con rol de Gerente Comercial. 
              Si el monto excede este límite, se requiere aprobación de un Administrador.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-medium">$</span>
              <Input
                type="number"
                value={settings.managerApprovalLimit}
                onChange={(e) => setSettings((s) => ({ ...s, managerApprovalLimit: Number(e.target.value) || 0 }))}
                className="w-48"
                min={0}
                step={10000}
              />
              <span className="text-sm text-muted-foreground">USD</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Valor actual: <strong>${settings.managerApprovalLimit.toLocaleString()} USD</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-xl flex justify-end">
        <Button onClick={handleSave} size="sm">
          <Save className="h-4 w-4 mr-1" /> Guardar Cambios
        </Button>
      </div>
    </div>
  );
};

export default ConfigGeneral;
