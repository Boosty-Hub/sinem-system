import { useState, useRef, useEffect, useCallback } from "react";
import type { ProposalSettings } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Settings, Save, Eraser, Check, Loader2, Upload, PenLine, Globe } from "lucide-react";
import SignaturePad from "signature_pad";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

const emptySettings: ProposalSettings = {
  companyName: "", companyAddress: "", companyPhone: "", companyEmail: "",
  companyWebsite: "", companyRnc: "", logoUrl: "", defaultItbisPercent: 18,
  greetingText: "", warrantyText: "", responsibilityText: "", risksText: "",
  installationText: "", validityText: "", returnsText: "", legalClauses: "",
  purchaseOrderInfo: "", closingText: "", coverIntroText: "", coverPartnerText: "",
  coverClosingText: "", footerText: "",
  greetingTextEn: "", warrantyTextEn: "", responsibilityTextEn: "", risksTextEn: "",
  installationTextEn: "", validityTextEn: "", returnsTextEn: "", legalClausesEn: "",
  purchaseOrderInfoEn: "", closingTextEn: "", coverIntroTextEn: "", coverPartnerTextEn: "",
  coverClosingTextEn: "", footerTextEn: "",
  signatureName: "", signatureTitle: "", signaturePhone: "",
  signatureEmail: "", signatureImageUrl: "",
};

// Map DB snake_case row to frontend camelCase
const dbToSettings = (row: any): ProposalSettings => ({
  companyName: row.company_name ?? "",
  companyAddress: row.company_address ?? "",
  companyPhone: row.company_phone ?? "",
  companyEmail: row.company_email ?? "",
  companyWebsite: row.company_website ?? "",
  companyRnc: row.company_rnc ?? "",
  logoUrl: row.logo_url ?? "",
  defaultItbisPercent: row.default_itbis_percent ?? 18,
  greetingText: row.greeting_text ?? "",
  warrantyText: row.warranty_text ?? "",
  responsibilityText: row.responsibility_text ?? "",
  risksText: row.risks_text ?? "",
  installationText: row.installation_text ?? "",
  validityText: row.validity_text ?? "",
  returnsText: row.returns_text ?? "",
  legalClauses: row.legal_clauses ?? "",
  purchaseOrderInfo: row.purchase_order_info ?? "",
  closingText: row.closing_text ?? "",
  coverIntroText: row.cover_intro_text ?? "",
  coverPartnerText: row.cover_partner_text ?? "",
  coverClosingText: row.cover_closing_text ?? "",
  footerText: row.footer_text ?? "",
  greetingTextEn: row.greeting_text_en ?? "",
  warrantyTextEn: row.warranty_text_en ?? "",
  responsibilityTextEn: row.responsibility_text_en ?? "",
  risksTextEn: row.risks_text_en ?? "",
  installationTextEn: row.installation_text_en ?? "",
  validityTextEn: row.validity_text_en ?? "",
  returnsTextEn: row.returns_text_en ?? "",
  legalClausesEn: row.legal_clauses_en ?? "",
  purchaseOrderInfoEn: row.purchase_order_info_en ?? "",
  closingTextEn: row.closing_text_en ?? "",
  coverIntroTextEn: row.cover_intro_text_en ?? "",
  coverPartnerTextEn: row.cover_partner_text_en ?? "",
  coverClosingTextEn: row.cover_closing_text_en ?? "",
  footerTextEn: row.footer_text_en ?? "",
  signatureName: row.signature_name ?? "",
  signatureTitle: row.signature_title ?? "",
  signaturePhone: row.signature_phone ?? "",
  signatureEmail: row.signature_email ?? "",
  signatureImageUrl: row.signature_image_url ?? "",
});

const settingsToDb = (s: ProposalSettings) => ({
  company_name: s.companyName,
  company_address: s.companyAddress,
  company_phone: s.companyPhone,
  company_email: s.companyEmail,
  company_website: s.companyWebsite,
  company_rnc: s.companyRnc,
  logo_url: s.logoUrl,
  default_itbis_percent: s.defaultItbisPercent,
  greeting_text: s.greetingText,
  warranty_text: s.warrantyText,
  responsibility_text: s.responsibilityText,
  risks_text: s.risksText,
  installation_text: s.installationText,
  validity_text: s.validityText,
  returns_text: s.returnsText,
  legal_clauses: s.legalClauses,
  purchase_order_info: s.purchaseOrderInfo,
  closing_text: s.closingText,
  cover_intro_text: s.coverIntroText,
  cover_partner_text: s.coverPartnerText,
  cover_closing_text: s.coverClosingText,
  footer_text: s.footerText,
  greeting_text_en: s.greetingTextEn,
  warranty_text_en: s.warrantyTextEn,
  responsibility_text_en: s.responsibilityTextEn,
  risks_text_en: s.risksTextEn,
  installation_text_en: s.installationTextEn,
  validity_text_en: s.validityTextEn,
  returns_text_en: s.returnsTextEn,
  legal_clauses_en: s.legalClausesEn,
  purchase_order_info_en: s.purchaseOrderInfoEn,
  closing_text_en: s.closingTextEn,
  cover_intro_text_en: s.coverIntroTextEn,
  cover_partner_text_en: s.coverPartnerTextEn,
  cover_closing_text_en: s.coverClosingTextEn,
  footer_text_en: s.footerTextEn,
  signature_name: s.signatureName,
  signature_title: s.signatureTitle,
  signature_phone: s.signaturePhone,
  signature_email: s.signatureEmail,
  signature_image_url: s.signatureImageUrl,
  footer_text: s.footerText,
  updated_at: new Date().toISOString(),
});

const ConfigPropuestas = () => {
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  const canEditConfig = canEdit("Config: Propuestas");
  const [settings, setSettings] = useState<ProposalSettings>(emptySettings);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [langTab, setLangTab] = useState<'es' | 'en'>('es');
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sigPadRef = useRef<SignaturePad | null>(null);
  const [sigMode, setSigMode] = useState<"view" | "edit">("view");
  const [sigInputMode, setSigInputMode] = useState<"draw" | "upload">("draw");
  const [uploadingSig, setUploadingSig] = useState(false);
  const sigFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("proposal_settings").select("*").limit(1).single();
      if (data) {
        setSettings(dbToSettings(data));
        setSettingsId(data.id);
      }
      setLoadingData(false);
    };
    load();
  }, []);

  const update = (key: keyof ProposalSettings, value: string | number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const initPad = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(ratio, ratio);
    sigPadRef.current = new SignaturePad(canvas, {
      backgroundColor: "rgba(255,255,255,0)",
      penColor: "#1a1a1a",
      minWidth: 1.5,
      maxWidth: 3,
    });
  }, []);

  useEffect(() => {
    if (sigMode === "edit") {
      const timer = setTimeout(initPad, 50);
      return () => clearTimeout(timer);
    }
  }, [sigMode, initPad]);

  const cropSignature = (canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas.toDataURL("image/png");
    const w = canvas.width;
    const h = canvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const { data } = imageData;
    let minX = w, minY = h, maxX = 0, maxY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = data[(y * w + x) * 4 + 3];
        if (alpha > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX <= minX || maxY <= minY) return canvas.toDataURL("image/png");
    const pad = 10;
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(w, maxX - minX + pad * 2);
    const cropH = Math.min(h, maxY - minY + pad * 2);
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = cropW;
    tmpCanvas.height = cropH;
    const tmpCtx = tmpCanvas.getContext("2d")!;
    tmpCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    return tmpCanvas.toDataURL("image/png");
  };

  const handleSaveSignature = async () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) return;
    const dataUrl = canvasRef.current ? cropSignature(canvasRef.current) : sigPadRef.current.toDataURL("image/png");
    setSettings((prev) => ({ ...prev, signatureImageUrl: dataUrl }));
    setSigMode("view");
    // Persist immediately to Supabase
    if (settingsId) {
      const { error } = await supabase
        .from("proposal_settings")
        .update({ signature_image_url: dataUrl, updated_at: new Date().toISOString() })
        .eq("id", settingsId);
      if (error) {
        toast({ title: "Error al guardar firma", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Firma guardada", description: "La firma digital ha sido guardada correctamente." });
      }
    }
  };

  const handleClearPad = () => {
    sigPadRef.current?.clear();
  };

  const handleUploadSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSig(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `signatures/company-signature.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("company-assets")
        .upload(path, file, { upsert: true, contentType: file.type });

      let finalUrl: string;
      if (uploadErr) {
        // Fall back to data URL if storage fails
        finalUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
      } else {
        const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(path);
        finalUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      setSettings((prev) => ({ ...prev, signatureImageUrl: finalUrl }));
      setSigMode("view");

      if (settingsId) {
        const { error } = await supabase
          .from("proposal_settings")
          .update({ signature_image_url: finalUrl, updated_at: new Date().toISOString() })
          .eq("id", settingsId);
        if (error) {
          toast({ title: "Error al guardar firma", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Firma guardada", description: "La imagen de firma ha sido guardada correctamente." });
        }
      }
    } catch (err: any) {
      toast({ title: "Error al subir firma", description: err.message, variant: "destructive" });
    } finally {
      setUploadingSig(false);
      if (sigFileInputRef.current) sigFileInputRef.current.value = "";
    }
  };

  const handleDeleteSignature = async () => {
    setSettings((prev) => ({ ...prev, signatureImageUrl: "" }));
    if (settingsId) {
      await supabase
        .from("proposal_settings")
        .update({ signature_image_url: "", updated_at: new Date().toISOString() })
        .eq("id", settingsId);
      toast({ title: "Firma eliminada" });
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const payload = settingsToDb(settings);
    let error;
    if (settingsId) {
      ({ error } = await supabase.from("proposal_settings").update(payload).eq("id", settingsId));
    } else {
      const { data, error: e } = await supabase.from("proposal_settings").insert(payload).select("id").single();
      error = e;
      if (data) setSettingsId(data.id);
    }
    setSaving(false);
    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configuración guardada", description: "Todos los cambios han sido guardados correctamente." });
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Propuestas / Ofertas</h1>
          <p className="text-muted-foreground text-sm mt-1">Configuración de datos para las propuestas comerciales</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Textos:</span>
          <div className="flex rounded-md border overflow-hidden">
            <button type="button" onClick={() => setLangTab('es')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${langTab === 'es' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted text-muted-foreground'}`}>
              🇪🇸 Español
            </button>
            <button type="button" onClick={() => setLangTab('en')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-l ${langTab === 'en' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted text-muted-foreground'}`}>
              🇺🇸 English
            </button>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4" /> Datos de la Empresa
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Nombre de la Empresa</Label>
            <Input value={settings.companyName} onChange={(e) => update("companyName", e.target.value)} readOnly={!canEditConfig} />
          </div>
          <div>
            <Label>RNC</Label>
            <Input value={settings.companyRnc} onChange={(e) => update("companyRnc", e.target.value)} readOnly={!canEditConfig} />
          </div>
          <div className="col-span-2">
            <Label>Dirección</Label>
            <Input value={settings.companyAddress} onChange={(e) => update("companyAddress", e.target.value)} readOnly={!canEditConfig} />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input value={settings.companyPhone} onChange={(e) => update("companyPhone", e.target.value)} readOnly={!canEditConfig} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={settings.companyEmail} onChange={(e) => update("companyEmail", e.target.value)} readOnly={!canEditConfig} />
          </div>
          <div>
            <Label>Website</Label>
            <Input value={settings.companyWebsite} onChange={(e) => update("companyWebsite", e.target.value)} readOnly={!canEditConfig} />
          </div>
          <div>
            <Label>URL del Logo</Label>
            <Input value={settings.logoUrl} onChange={(e) => update("logoUrl", e.target.value)} readOnly={!canEditConfig} />
          </div>
        </div>
      </div>

      <div className="stat-card">
        <h2 className="font-semibold mb-4">Firma de la Propuesta</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Nombre del Firmante</Label>
            <Input value={settings.signatureName} onChange={(e) => update("signatureName", e.target.value)} readOnly={!canEditConfig} />
          </div>
          <div>
            <Label>Cargo</Label>
            <Input value={settings.signatureTitle} onChange={(e) => update("signatureTitle", e.target.value)} readOnly={!canEditConfig} />
          </div>
          <div>
            <Label>Teléfono del Firmante</Label>
            <Input value={settings.signaturePhone} onChange={(e) => update("signaturePhone", e.target.value)} readOnly={!canEditConfig} />
          </div>
          <div>
            <Label>Email del Firmante</Label>
            <Input value={settings.signatureEmail} onChange={(e) => update("signatureEmail", e.target.value)} readOnly={!canEditConfig} />
          </div>
          <div className="col-span-2">
            <Label>Firma Digital</Label>
            <p className="text-xs text-muted-foreground mb-2">Dibuja la firma o sube una imagen (JPEG/PNG) que aparecerá en las ofertas.</p>

            {sigMode === "edit" && canEditConfig ? (
              <div>
                {/* Mode tabs */}
                <div className="flex gap-1 mb-3 border rounded-lg p-1 bg-muted/30 w-fit">
                  <button
                    type="button"
                    onClick={() => setSigInputMode("draw")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${sigInputMode === "draw" ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <PenLine className="h-3.5 w-3.5" /> Dibujar
                  </button>
                  <button
                    type="button"
                    onClick={() => setSigInputMode("upload")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${sigInputMode === "upload" ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Upload className="h-3.5 w-3.5" /> Subir archivo
                  </button>
                </div>

                {sigInputMode === "draw" ? (
                  <>
                    <div className="border-2 border-primary/30 rounded-lg bg-white relative" style={{ height: "160px" }}>
                      <canvas
                        ref={canvasRef}
                        className="w-full h-full rounded-lg cursor-crosshair"
                      />
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                        <div className="border-t border-dashed border-gray-300 w-3/4" />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" onClick={handleSaveSignature}>
                        <Check className="h-3.5 w-3.5 mr-1" /> Guardar firma
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleClearPad}>
                        <Eraser className="h-3.5 w-3.5 mr-1" /> Limpiar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSigMode("view")}>
                        Cancelar
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      ref={sigFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      className="hidden"
                      onChange={handleUploadSignature}
                    />
                    <button
                      type="button"
                      onClick={() => sigFileInputRef.current?.click()}
                      disabled={uploadingSig}
                      className="flex flex-col items-center justify-center border-2 border-dashed border-primary/30 rounded-lg p-8 w-full hover:border-primary/60 hover:bg-primary/5 transition-colors disabled:opacity-60"
                    >
                      {uploadingSig ? (
                        <Loader2 className="h-7 w-7 animate-spin text-primary mb-2" />
                      ) : (
                        <Upload className="h-7 w-7 text-muted-foreground mb-2" />
                      )}
                      <span className="text-sm font-medium text-muted-foreground">
                        {uploadingSig ? "Subiendo..." : "Haz clic para seleccionar imagen"}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">JPEG o PNG — fondo transparente recomendado</span>
                    </button>
                    <div className="flex gap-2 mt-2">
                      <Button variant="ghost" size="sm" onClick={() => setSigMode("view")}>
                        Cancelar
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : settings.signatureImageUrl ? (
              <div className="flex items-start gap-4">
                <div className="border rounded-lg p-3 bg-white">
                  <img
                    src={settings.signatureImageUrl}
                    alt="Firma"
                    className="max-h-20 max-w-[200px] object-contain"
                  />
                </div>
                {canEditConfig && (
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setSigInputMode("draw"); setSigMode("edit"); }}>
                      <PenLine className="h-3.5 w-3.5 mr-1" /> Volver a dibujar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setSigInputMode("upload"); setSigMode("edit"); }}>
                      <Upload className="h-3.5 w-3.5 mr-1" /> Subir otra imagen
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={handleDeleteSignature}
                    >
                      Eliminar firma
                    </Button>
                  </div>
                )}
              </div>
            ) : canEditConfig ? (
              <div className="flex gap-3">
                <button
                  onClick={() => { setSigInputMode("draw"); setSigMode("edit"); }}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-lg p-6 flex-1 hover:border-primary/40 transition-colors"
                >
                  <PenLine className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-sm text-muted-foreground">Dibujar firma</span>
                </button>
                <button
                  onClick={() => { setSigInputMode("upload"); setSigMode("edit"); }}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-lg p-6 flex-1 hover:border-primary/40 transition-colors"
                >
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-sm text-muted-foreground">Subir imagen</span>
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sin firma configurada.</p>
            )}
          </div>
        </div>
      </div>

      <div className="stat-card">
        <h2 className="font-semibold mb-1">Carta de Presentación (Página 1)</h2>
        <p className="text-xs text-muted-foreground mb-4">Textos de la primera página de la oferta pública. Edita ambos idiomas para que se usen automáticamente según el idioma de cada cotización.</p>
        <div className="space-y-4">
          {langTab === 'es' ? (
            <>
              <div>
                <Label>Párrafo Introductorio</Label>
                <Textarea value={settings.coverIntroText} onChange={(e) => update("coverIntroText", e.target.value)} rows={3} readOnly={!canEditConfig} />
              </div>
              <div>
                <Label>Párrafo de Partner SIEMENS</Label>
                <Textarea value={settings.coverPartnerText} onChange={(e) => update("coverPartnerText", e.target.value)} rows={3} readOnly={!canEditConfig} />
              </div>
              <div>
                <Label>Párrafo de Cierre</Label>
                <Textarea value={settings.coverClosingText} onChange={(e) => update("coverClosingText", e.target.value)} rows={2} readOnly={!canEditConfig} />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Introductory Paragraph (English)</Label>
                <Textarea value={settings.coverIntroTextEn} onChange={(e) => update("coverIntroTextEn", e.target.value)} rows={3} readOnly={!canEditConfig} placeholder="e.g. In response to your request for proposal and in accordance with your needs, we are pleased to submit our best technical and commercial proposal..." />
              </div>
              <div>
                <Label>SIEMENS Partner Paragraph (English)</Label>
                <Textarea value={settings.coverPartnerTextEn} onChange={(e) => update("coverPartnerTextEn", e.target.value)} rows={3} readOnly={!canEditConfig} placeholder="e.g. SINEM, as official Business Partner of SIEMENS Energy in the Dominican Republic, guarantees..." />
              </div>
              <div>
                <Label>Closing Paragraph (English)</Label>
                <Textarea value={settings.coverClosingTextEn} onChange={(e) => update("coverClosingTextEn", e.target.value)} rows={2} readOnly={!canEditConfig} placeholder="e.g. We remain at your disposal for any questions or clarifications." />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="stat-card">
        <h2 className="font-semibold mb-4">Impuestos</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>ITBIS por defecto (%)</Label>
            <Input type="number" value={settings.defaultItbisPercent} onChange={(e) => update("defaultItbisPercent", Number(e.target.value))} readOnly={!canEditConfig} />
            <p className="text-xs text-muted-foreground mt-1">Este valor se usará por defecto al crear nuevas cotizaciones. Se puede activar/desactivar por oferta.</p>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <h2 className="font-semibold mb-1">Textos de la Propuesta</h2>
        <p className="text-xs text-muted-foreground mb-4">Aparecen en las páginas 2 y 3 de la oferta pública (garantías, condiciones, etc.).</p>
        <div className="space-y-4">
          {langTab === 'es' ? (
            <>
              <div>
                <Label>Saludo Introductorio</Label>
                <Textarea value={settings.greetingText} onChange={(e) => update("greetingText", e.target.value)} rows={3} readOnly={!canEditConfig} />
                <p className="text-xs text-muted-foreground mt-1">Aparece antes de la tabla de ítems.</p>
              </div>
              <div><Label>Garantía</Label><Textarea value={settings.warrantyText} onChange={(e) => update("warrantyText", e.target.value)} rows={5} readOnly={!canEditConfig} /></div>
              <div><Label>Responsabilidad</Label><Textarea value={settings.responsibilityText} onChange={(e) => update("responsibilityText", e.target.value)} rows={4} readOnly={!canEditConfig} /></div>
              <div><Label>Riesgos</Label><Textarea value={settings.risksText} onChange={(e) => update("risksText", e.target.value)} rows={5} readOnly={!canEditConfig} /></div>
              <div><Label>Instalación</Label><Textarea value={settings.installationText} onChange={(e) => update("installationText", e.target.value)} rows={3} readOnly={!canEditConfig} /></div>
              <div><Label>Vigencia de la Propuesta (texto adicional)</Label><Textarea value={settings.validityText} onChange={(e) => update("validityText", e.target.value)} rows={2} readOnly={!canEditConfig} /></div>
              <div><Label>Devoluciones y/o Cancelaciones</Label><Textarea value={settings.returnsText} onChange={(e) => update("returnsText", e.target.value)} rows={3} readOnly={!canEditConfig} /></div>
            </>
          ) : (
            <>
              <div>
                <Label>Introductory Greeting (English)</Label>
                <Textarea value={settings.greetingTextEn} onChange={(e) => update("greetingTextEn", e.target.value)} rows={3} readOnly={!canEditConfig} placeholder="e.g. Dear Sirs, in accordance with your request, we are pleased to present our offer..." />
                <p className="text-xs text-muted-foreground mt-1">Appears before the items table on page 2.</p>
              </div>
              <div><Label>Warranty (English)</Label><Textarea value={settings.warrantyTextEn} onChange={(e) => update("warrantyTextEn", e.target.value)} rows={5} readOnly={!canEditConfig} placeholder="e.g. Equipment carries 12 months warranty from commissioning or 18 months from delivery, whichever occurs first..." /></div>
              <div><Label>Responsibility (English)</Label><Textarea value={settings.responsibilityTextEn} onChange={(e) => update("responsibilityTextEn", e.target.value)} rows={4} readOnly={!canEditConfig} placeholder="e.g. SINEM shall not, under any circumstances, be liable for loss of use or production, loss of profit..." /></div>
              <div><Label>Risks (English)</Label><Textarea value={settings.risksTextEn} onChange={(e) => update("risksTextEn", e.target.value)} rows={5} readOnly={!canEditConfig} placeholder="e.g. Should the equipment suffer physical or electrical damage due to mishandling by the client, SINEM will not be responsible..." /></div>
              <div><Label>Installation (English)</Label><Textarea value={settings.installationTextEn} onChange={(e) => update("installationTextEn", e.target.value)} rows={3} readOnly={!canEditConfig} placeholder="e.g. Installation is not included in this offer. If required, please request a separate quotation..." /></div>
              <div><Label>Proposal Validity — additional text (English)</Label><Textarea value={settings.validityTextEn} onChange={(e) => update("validityTextEn", e.target.value)} rows={2} readOnly={!canEditConfig} placeholder="e.g. After this period, the offer shall be considered without any commitment from SINEM." /></div>
              <div><Label>Returns and/or Cancellations (English)</Label><Textarea value={settings.returnsTextEn} onChange={(e) => update("returnsTextEn", e.target.value)} rows={3} readOnly={!canEditConfig} placeholder="e.g. No returns or cancellations are accepted without written authorization from SINEM..." /></div>
            </>
          )}
        </div>
      </div>

      <div className="stat-card">
        <h2 className="font-semibold mb-1">Cláusulas Legales y Cierre</h2>
        <p className="text-xs text-muted-foreground mb-4">Términos y condiciones, datos para orden de compra y texto de cierre.</p>
        <div className="space-y-4">
          {langTab === 'es' ? (
            <>
              <div>
                <Label>Términos y Condiciones</Label>
                <Textarea value={settings.legalClauses} onChange={(e) => update("legalClauses", e.target.value)} rows={6} readOnly={!canEditConfig} />
                <p className="text-xs text-muted-foreground mt-1">Cada línea se muestra como un punto separado en la propuesta.</p>
              </div>
              <div>
                <Label>Datos para Orden de Compra</Label>
                <Textarea value={settings.purchaseOrderInfo} onChange={(e) => update("purchaseOrderInfo", e.target.value)} rows={4} readOnly={!canEditConfig} />
                <p className="text-xs text-muted-foreground mt-1">El nombre, teléfono y email del firmante se agregan automáticamente.</p>
              </div>
              <div>
                <Label>Texto de Cierre</Label>
                <Textarea value={settings.closingText} onChange={(e) => update("closingText", e.target.value)} rows={2} readOnly={!canEditConfig} />
                <p className="text-xs text-muted-foreground mt-1">Aparece antes de la firma al final de la oferta.</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Terms and Conditions (English)</Label>
                <Textarea value={settings.legalClausesEn} onChange={(e) => update("legalClausesEn", e.target.value)} rows={6} readOnly={!canEditConfig} placeholder="e.g. 1. Prices are subject to availability and confirmation at the time of the purchase order.&#10;2. Any modification to the original scope may result in price and delivery time adjustments..." />
                <p className="text-xs text-muted-foreground mt-1">Each line is shown as a separate point in the proposal.</p>
              </div>
              <div>
                <Label>Purchase Order Information (English)</Label>
                <Textarea value={settings.purchaseOrderInfoEn} onChange={(e) => update("purchaseOrderInfoEn", e.target.value)} rows={4} readOnly={!canEditConfig} placeholder="e.g. SINEM SRL&#10;RNC: 1-33-03034-9&#10;Winston Churchill Acropolis Business Mall..." />
                <p className="text-xs text-muted-foreground mt-1">Company data for the client to issue the purchase order. Signatory name, phone and email are added automatically.</p>
              </div>
              <div>
                <Label>Closing Text (English)</Label>
                <Textarea value={settings.closingTextEn} onChange={(e) => update("closingTextEn", e.target.value)} rows={2} readOnly={!canEditConfig} placeholder="e.g. Should you require any further information, please do not hesitate to contact us." />
                <p className="text-xs text-muted-foreground mt-1">Appears before the signature at the end of the offer.</p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="stat-card">
        <h2 className="font-semibold mb-4">Pie de Página</h2>
        <div>
          {langTab === 'es' ? (
            <>
              <Label>Texto del Footer</Label>
              <Input value={settings.footerText} onChange={(e) => update("footerText", e.target.value)} readOnly={!canEditConfig} />
            </>
          ) : (
            <>
              <Label>Footer Text (English)</Label>
              <Input value={settings.footerTextEn} onChange={(e) => update("footerTextEn", e.target.value)} readOnly={!canEditConfig} placeholder="e.g. SINEM SRL, Winston Churchill Acrópolis Business Mall floor 8, Piantini CP 10127, Santo Domingo, Dominican Republic..." />
            </>
          )}
        </div>
      </div>

      {canEditConfig && (
        <div className="flex justify-end">
          <Button onClick={handleSaveAll} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</> : <><Save className="h-4 w-4 mr-2" /> Guardar Configuración</>}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ConfigPropuestas;
