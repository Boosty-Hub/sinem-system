import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface ParsedProspect {
  code: string;
  projectName: string;
  directCustomer: string;
  endCustomer: string;
  bu: string;
  product: string;
  scope: string;
  costUSD: number;
  priceUSD: number;
  go: number;
  get: number;
  status: string;
  comments: string;
  valid: boolean;
  error?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const TEMPLATE_COLUMNS = [
  "Código",
  "Nombre del Proyecto",
  "Cliente Directo",
  "Cliente Final",
  "BU",
  "Producto",
  "Alcance",
  "Costo USD",
  "Precio USD",
  "GO %",
  "GET %",
  "Etapa",
  "Comentarios",
];

const VALID_STATUSES = ["prospecto", "propuesta", "negociacion", "seguimiento", "standby", "ganado", "perdido", "cancelado", "calificado", "facturada"];

const STATUS_ALIASES: Record<string, string> = {
  "prospect": "prospecto",
  "qualified": "calificado",
  "proposal": "propuesta",
  "negotiation": "negociacion",
  "negociación": "negociacion",
  "won": "ganado",
  "lost": "perdido",
  "cancelled": "cancelado",
  "canceled": "cancelado",
  "invoiced": "facturada",
  "follow up": "seguimiento",
  "follow-up": "seguimiento",
};

const normalizeStatus = (raw: string): string => {
  const s = raw.trim().toLowerCase();
  if (VALID_STATUSES.includes(s)) return s;
  return STATUS_ALIASES[s] ?? s;
};

const parseLocalizedNumber = (value: any): number => {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value;
  let str = String(value).trim().replace(/[¤$\u20AC£¥\s]/g, "");
  const lastComma = str.lastIndexOf(",");
  const lastDot = str.lastIndexOf(".");
  if (lastComma > lastDot) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else {
    str = str.replace(/,/g, "");
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

const ProspectImportDialog = ({ open, onOpenChange, onImported }: Props) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedProspect[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "processing">("upload");
  const [processing, setProcessing] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const reset = () => {
    setParsed([]);
    setStep("upload");
    setProcessing(false);
    setImportErrors([]);
  };

  const handleClose = (v: boolean) => {
    onOpenChange(v);
    if (!v) reset();
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_COLUMNS,
      ["OPP-001", "Subestación 115kV", "AES Dominicana", "CDEEE", "SI", "Transformador", "Suministro + Instalación", 150000, 210000, 80, 60, "prospecto", "Proyecto prioritario Q1"],
      ["OPP-002", "Centro de Control SCADA", "CEPM", "EdeNorte", "DG", "SCADA", "Ingeniería + Comisionamiento", 85000, 125000, 70, 50, "calificado", ""],
    ]);
    ws["!cols"] = TEMPLATE_COLUMNS.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Oportunidades");
    XLSX.writeFile(wb, "Plantilla_Oportunidades_CRM.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell != null && String(cell).trim() !== ""));

        const prospects: ParsedProspect[] = dataRows.map((row, idx) => {
          const rowNum = idx + 2;
          const code = String(row[0] ?? "").trim();
          const projectName = String(row[1] ?? "").trim();
          const directCustomer = String(row[2] ?? "").trim();
          const endCustomer = String(row[3] ?? "").trim();
          const bu = String(row[4] ?? "").trim();
          const product = String(row[5] ?? "").trim();
          const scope = String(row[6] ?? "").trim();
          const costUSD = parseLocalizedNumber(row[7]);
          const priceUSD = parseLocalizedNumber(row[8]);
          const go = parseLocalizedNumber(row[9]);
          const get_ = parseLocalizedNumber(row[10]);
          const rawStatus = String(row[11] ?? "prospecto").trim();
          const status = normalizeStatus(rawStatus);
          const comments = String(row[12] ?? "").trim();

          const errors: string[] = [];
          if (!projectName) errors.push(`Fila ${rowNum}, columna "Nombre del Proyecto": está vacío (campo obligatorio)`);
          if (!directCustomer) errors.push(`Fila ${rowNum}, columna "Cliente Directo": está vacío (campo obligatorio)`);
          if (go < 0 || go > 100) errors.push(`Fila ${rowNum}, columna "GO%": valor "${go}" fuera de rango (debe ser 0-100)`);
          if (get_ < 0 || get_ > 100) errors.push(`Fila ${rowNum}, columna "GET%": valor "${get_}" fuera de rango (debe ser 0-100)`);
          if (costUSD < 0) errors.push(`Fila ${rowNum}, columna "Costo USD": valor negativo no permitido`);
          if (priceUSD < 0) errors.push(`Fila ${rowNum}, columna "Precio USD": valor negativo no permitido`);
          if (!VALID_STATUSES.includes(status)) {
            errors.push(`Fila ${rowNum}, columna "Etapa": "${rawStatus}" no es válido. Valores permitidos: ${VALID_STATUSES.join(", ")}`);
          }

          return {
            code, projectName, directCustomer, endCustomer, bu, product, scope, costUSD, priceUSD, go, get: get_, status, comments,
            valid: errors.length === 0,
            error: errors.length > 0 ? errors.join(" | ") : undefined,
          };
        });

        if (prospects.length === 0) {
          toast({ title: "Error", description: "El archivo no contiene datos. Asegúrate de que los datos empiezan en la fila 2.", variant: "destructive" });
          return;
        }

        setParsed(prospects);
        setImportErrors([]);
        setStep("preview");
      } catch {
        toast({ title: "Error de lectura", description: "No se pudo leer el archivo. Verifica que sea un archivo Excel válido (.xlsx o .xls).", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const validItems = parsed.filter((c) => c.valid);
  const invalidItems = parsed.filter((c) => !c.valid);

  const handleImport = async () => {
    if (validItems.length === 0) return;
    setProcessing(true);
    setStep("processing");
    setImportErrors([]);

    const rows = validItems.map((p) => {
      const probability = (p.go / 100) * (p.get / 100) * 100;
      const weighted = p.priceUSD * (probability / 100);
      const marginUsd = p.priceUSD - p.costUSD;
      const marginPercent = p.priceUSD > 0 ? (marginUsd / p.priceUSD) * 100 : 0;

      return {
        code: p.code,
        project_name: p.projectName,
        direct_customer: p.directCustomer,
        end_customer: p.endCustomer,
        bu: p.bu,
        product: p.product,
        scope: p.scope,
        cost_usd: p.costUSD,
        price_usd: p.priceUSD,
        go_percent: p.go,
        get_percent: p.get,
        probability,
        weighted,
        margin_usd: marginUsd,
        margin_percent: marginPercent,
        status: p.status,
        comments: p.comments,
      };
    });

    // Insert in batches for better error reporting
    const BATCH_SIZE = 20;
    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("prospects").insert(batch);

      if (error) {
        // Try one by one to identify problematic rows
        for (let j = 0; j < batch.length; j++) {
          const { error: singleError } = await supabase.from("prospects").insert([batch[j]]);
          if (singleError) {
            const rowIdx = i + j;
            const prospect = validItems[rowIdx];
            let friendlyMsg = `"${prospect.projectName}"`;

            if (singleError.message.includes("status_check")) {
              friendlyMsg += `: la etapa "${prospect.status}" no es válida. Valores permitidos: ${VALID_STATUSES.join(", ")}`;
            } else if (singleError.message.includes("unique") || singleError.message.includes("duplicate")) {
              friendlyMsg += `: ya existe un registro con el mismo código "${prospect.code}"`;
            } else if (singleError.message.includes("null value")) {
              friendlyMsg += `: tiene campos obligatorios vacíos`;
            } else {
              friendlyMsg += `: ${singleError.message}`;
            }
            errors.push(friendlyMsg);
          } else {
            successCount++;
          }
        }
      } else {
        successCount += batch.length;
      }
    }

    if (errors.length > 0) {
      setImportErrors(errors);
      if (successCount > 0) {
        toast({ title: `${successCount} importadas, ${errors.length} con errores`, description: "Revisa los detalles de errores abajo.", variant: "destructive" });
        onImported();
      } else {
        toast({ title: "Error al importar", description: `${errors.length} oportunidades fallaron. Revisa los detalles.`, variant: "destructive" });
      }
      setStep("preview");
    } else {
      toast({ title: `${successCount} oportunidades importadas exitosamente` });
      onImported();
      handleClose(false);
    }
    setProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Importar Oportunidades
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6 mt-2">
            <div className="stat-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</div>
                <h3 className="font-semibold text-sm">Descargar plantilla</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3 ml-11">
                Descarga la plantilla Excel con las columnas requeridas y llénala con los datos de tus oportunidades.
              </p>
              <div className="ml-11">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-1" /> Descargar Plantilla (.xlsx)
                </Button>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</div>
                <h3 className="font-semibold text-sm">Subir archivo</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3 ml-11">
                Sube el archivo Excel con los datos de las oportunidades a importar.
              </p>
              <div className="ml-11">
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Haz clic para seleccionar el archivo</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Formatos: .xlsx, .xls</p>
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
              </div>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-sinem-success" />
                <span className="font-medium">{validItems.length}</span>
                <span className="text-muted-foreground">válidos</span>
              </div>
              {invalidItems.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="font-medium">{invalidItems.length}</span>
                  <span className="text-muted-foreground">con errores (se omitirán)</span>
                </div>
              )}
              <span className="text-xs text-muted-foreground ml-auto">Total: {parsed.length} filas</span>
            </div>

            {/* Import errors from Supabase */}
            {importErrors.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-destructive">Errores al importar en base de datos:</p>
                {importErrors.map((err, i) => (
                  <p key={i} className="text-[11px] text-destructive/80">• {err}</p>
                ))}
              </div>
            )}

            {/* Validation errors */}
            {invalidItems.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-destructive">Errores de validación ({invalidItems.length} filas):</p>
                {invalidItems.map((c, i) => (
                  <p key={i} className="text-[11px] text-destructive/80">• {c.error}</p>
                ))}
              </div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground w-8">#</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Código</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Proyecto</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Cliente</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">BU</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Producto</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Costo</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Precio</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">GO%</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">GET%</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Etapa</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground w-8">✓</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((c, i) => (
                      <tr key={i} className={`border-t border-border/30 ${!c.valid ? "bg-destructive/5" : "hover:bg-muted/30"}`}>
                        <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 px-3 font-mono text-[11px]">{c.code || "—"}</td>
                        <td className="py-2 px-3 font-medium">{c.projectName || <span className="text-destructive italic">vacío</span>}</td>
                        <td className="py-2 px-3">{c.directCustomer}</td>
                        <td className="py-2 px-3">{c.bu}</td>
                        <td className="py-2 px-3">{c.product}</td>
                        <td className="py-2 px-3 text-right font-mono">${c.costUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right font-mono">${c.priceUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-center">{c.go}%</td>
                        <td className="py-2 px-3 text-center">{c.get}%</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {c.valid
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-sinem-success mx-auto" />
                            : (
                              <div className="flex items-center gap-1 justify-center" title={c.error}>
                                <XCircle className="h-3.5 w-3.5 text-destructive" />
                                <span className="text-[10px] text-destructive max-w-[120px] truncate hidden sm:inline">{c.error}</span>
                              </div>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" onClick={reset}>
                Volver
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleImport} disabled={validItems.length === 0}>
                  <Upload className="h-4 w-4 mr-1" /> Importar {validItems.length} oportunidades
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Importando {validItems.length} oportunidades...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProspectImportDialog;
