import { useState, useEffect, useRef } from "react";
import { Settings, Save, Upload, Trash2, Image, Plus, Pencil, X, Handshake, Briefcase, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { usePartners } from "@/hooks/usePartners";
import { useBusinessUnits, type BusinessUnit } from "@/hooks/useBusinessUnits";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";

const ConfigGeneral = () => {
  const { canEdit, canCreate, canDelete } = usePermissions();
  const canEditConfig = canEdit("Configuración");
  const canCreateConfig = canCreate("Configuración");
  const canDeleteConfig = canDelete("Configuración");
  const { toast } = useToast();
  const { partners, setPartners } = usePartners();
  const { businessUnits, setBusinessUnits } = useBusinessUnits();
  const [newPartner, setNewPartner] = useState("");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [newBUKey, setNewBUKey] = useState("");
  const [newBULabel, setNewBULabel] = useState("");
  const [editingBUIdx, setEditingBUIdx] = useState<number | null>(null);
  const [editingBUKey, setEditingBUKey] = useState("");
  const [editingBULabel, setEditingBULabel] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Logo state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Approval limit
  const [managerApprovalLimit, setManagerApprovalLimit] = useState(300000);

  // Load settings from DB
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("general_settings")
        .select("key, value")
        .in("key", ["company_logo_url", "manager_approval_limit"]);
      if (data) {
        for (const row of data) {
          if (row.key === "company_logo_url") setLogoUrl(row.value);
          if (row.key === "manager_approval_limit") setManagerApprovalLimit(Number(row.value) || 300000);
        }
      }
    };
    load();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Solo se permiten archivos de imagen.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "La imagen no debe superar 2MB.", variant: "destructive" });
      return;
    }

    setUploadingLogo(true);
    const ext = file.name.split(".").pop() || "png";
    const filePath = `logo/company-logo.${ext}`;

    // Upload to storage (overwrite)
    const { error: uploadErr } = await supabase.storage
      .from("company-assets")
      .upload(filePath, file, { upsert: true, cacheControl: "0" });

    if (uploadErr) {
      toast({ title: "Error al subir", description: uploadErr.message, variant: "destructive" });
      setUploadingLogo(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl + "?t=" + Date.now(); // cache bust

    // Save URL to general_settings
    await supabase.from("general_settings").upsert(
      { key: "company_logo_url", value: publicUrl, description: "URL del logo de la empresa" },
      { onConflict: "key" }
    );

    // Also update proposal_settings logo_url
    const { data: ps } = await supabase.from("proposal_settings").select("id").limit(1).maybeSingle();
    if (ps) {
      await supabase.from("proposal_settings").update({ logo_url: publicUrl }).eq("id", ps.id);
    }

    setLogoUrl(publicUrl);
    setUploadingLogo(false);
    toast({ title: "Logo actualizado" });
    e.target.value = "";
  };

  const handleRemoveLogo = async () => {
    await supabase.storage.from("company-assets").remove(["logo/company-logo.png", "logo/company-logo.jpg", "logo/company-logo.svg", "logo/company-logo.jpeg", "logo/company-logo.webp"]);
    await supabase.from("general_settings").delete().eq("key", "company_logo_url");
    const { data: ps } = await supabase.from("proposal_settings").select("id").limit(1).maybeSingle();
    if (ps) {
      await supabase.from("proposal_settings").update({ logo_url: "" }).eq("id", ps.id);
    }
    setLogoUrl(null);
    toast({ title: "Logo eliminado" });
  };

  const handleSave = async () => {
    await supabase.from("general_settings").upsert(
      { key: "manager_approval_limit", value: String(managerApprovalLimit), description: "Límite de aprobación del gerente comercial (USD)" },
      { onConflict: "key" }
    );
    toast({ title: "Configuración guardada" });
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
          {logoUrl ? (
            <div className="flex items-center gap-4">
              <div className="border rounded-lg p-3 bg-white">
                <img src={logoUrl} alt="Logo" className="h-14 max-w-[200px] object-contain" />
              </div>
              <div className="flex flex-col gap-1.5">
                {canEditConfig && (
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                    {uploadingLogo ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />} Cambiar
                  </Button>
                )}
                {canDeleteConfig && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={handleRemoveLogo}>
                    <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${canEditConfig ? "cursor-pointer hover:border-primary/40" : "opacity-50 pointer-events-none"} transition-colors ${uploadingLogo ? "opacity-50 pointer-events-none" : ""}`}
              onClick={() => canEditConfig && logoInputRef.current?.click()}
            >
              {uploadingLogo ? (
                <Loader2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2 animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              )}
              <p className="text-sm text-muted-foreground">{uploadingLogo ? "Subiendo..." : "Haz clic para subir el logo"}</p>
              <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG o SVG · Máximo 2MB</p>
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
                  {canEditConfig && (
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => { setEditingIdx(i); setEditingValue(p); }}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                  {canDeleteConfig && (
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
          {canCreateConfig && (
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
          )}
        </div>
      </div>

      {/* Business Units */}
      <div className="stat-card max-w-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Unidades de Negocio (BU)</h3>
            <p className="text-xs text-muted-foreground">Categorías disponibles en CRM y catálogo de productos</p>
          </div>
        </div>

        <div className="space-y-2">
          {businessUnits.map((bu, i) => (
            <div key={i} className="flex items-center gap-2 group">
              {editingBUIdx === i ? (
                <>
                  <Input
                    value={editingBUKey}
                    onChange={(e) => setEditingBUKey(e.target.value.toUpperCase())}
                    className="h-8 text-sm w-20"
                    placeholder="KEY"
                    maxLength={4}
                  />
                  <Input
                    value={editingBULabel}
                    onChange={(e) => setEditingBULabel(e.target.value)}
                    className="h-8 text-sm flex-1"
                    placeholder="Nombre completo"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const k = editingBUKey.trim();
                        const l = editingBULabel.trim();
                        if (!k || !l) return;
                        if (businessUnits.some((b, j) => j !== i && b.key === k)) {
                          toast({ title: "Error", description: "Esta clave ya existe.", variant: "destructive" });
                          return;
                        }
                        setBusinessUnits(businessUnits.map((b, j) => j === i ? { key: k, label: `${k} - ${l}` } : b));
                        setEditingBUIdx(null);
                        toast({ title: "BU actualizada" });
                      }
                    }}
                    autoFocus
                  />
                  <Button size="sm" variant="default" className="h-8 px-2" onClick={() => {
                    const k = editingBUKey.trim();
                    const l = editingBULabel.trim();
                    if (!k || !l) return;
                    if (businessUnits.some((b, j) => j !== i && b.key === k)) {
                      toast({ title: "Error", description: "Esta clave ya existe.", variant: "destructive" });
                      return;
                    }
                    setBusinessUnits(businessUnits.map((b, j) => j === i ? { key: k, label: `${k} - ${l}` } : b));
                    setEditingBUIdx(null);
                    toast({ title: "BU actualizada" });
                  }}>
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingBUIdx(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm font-mono w-10 text-center py-1.5 px-1 rounded bg-primary/10 text-primary font-semibold">{bu.key}</span>
                  <span className="text-sm flex-1 py-1.5 px-2 rounded bg-muted/50">{bu.label}</span>
                  {canEditConfig && (
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setEditingBUIdx(i);
                        setEditingBUKey(bu.key);
                        const parts = bu.label.split(" - ");
                        setEditingBULabel(parts.length > 1 ? parts.slice(1).join(" - ") : bu.label);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                  {canDeleteConfig && (
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={() => {
                        setBusinessUnits(businessUnits.filter((_, j) => j !== i));
                        toast({ title: "BU eliminada" });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}
          {canCreateConfig && <div className="flex items-center gap-2 pt-2 border-t">
            <Input
              value={newBUKey}
              onChange={(e) => setNewBUKey(e.target.value.toUpperCase())}
              placeholder="KEY"
              className="h-8 text-sm w-20"
              maxLength={4}
            />
            <Input
              value={newBULabel}
              onChange={(e) => setNewBULabel(e.target.value)}
              placeholder="Nombre completo (ej: Electrical Products)"
              className="h-8 text-sm flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const k = newBUKey.trim();
                  const l = newBULabel.trim();
                  if (!k || !l) return;
                  if (businessUnits.some((b) => b.key === k)) {
                    toast({ title: "Error", description: "Esta clave ya existe.", variant: "destructive" });
                    return;
                  }
                  setBusinessUnits([...businessUnits, { key: k, label: `${k} - ${l}` }]);
                  setNewBUKey("");
                  setNewBULabel("");
                  toast({ title: "BU agregada" });
                }
              }}
            />
            <Button size="sm" variant="outline" className="h-8" disabled={!newBUKey.trim() || !newBULabel.trim()} onClick={() => {
              const k = newBUKey.trim();
              const l = newBULabel.trim();
              if (!k || !l) return;
              if (businessUnits.some((b) => b.key === k)) {
                toast({ title: "Error", description: "Esta clave ya existe.", variant: "destructive" });
                return;
              }
              setBusinessUnits([...businessUnits, { key: k, label: `${k} - ${l}` }]);
              setNewBUKey("");
              setNewBULabel("");
              toast({ title: "BU agregada" });
            }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          </div>}
        </div>
      </div>

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
                value={managerApprovalLimit}
                onChange={(e) => setManagerApprovalLimit(Number(e.target.value) || 0)}
                className="w-48"
                min={0}
                step={10000}
                disabled={!canEditConfig}
              />
              <span className="text-sm text-muted-foreground">USD</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Valor actual: <strong>${managerApprovalLimit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong>
            </p>
          </div>
        </div>
      </div>

      {canEditConfig && (
        <div className="max-w-xl flex justify-end">
          <Button onClick={handleSave} size="sm">
            <Save className="h-4 w-4 mr-1" /> Guardar Cambios
          </Button>
        </div>
      )}
    </div>
  );
};

export default ConfigGeneral;
