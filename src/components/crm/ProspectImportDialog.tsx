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

const ProspectImportDialog = ({ open, onOpenChange, onImported }: Props) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedProspect[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "processing">("upload");
  const [processing, setProcessing] = useState(false);

  const reset = () => {
    setParsed([]);
    setStep("upload");
    setProcessing(false);
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

        const prospects: ParsedProspect[] = dataRows.map((row) => {
          const code = String(row[0] ?? "").trim();
          const projectName = String(row[1] ?? "").trim();
          const directCustomer = String(row[2] ?? "").trim();
          const endCustomer = String(row[3] ?? "").trim();
          const bu = String(row[4] ?? "").trim();
          const product = String(row[5] ?? "").trim();
          const scope = String(row[6] ?? "").trim();
          const costUSD = Number(row[7] ?? 0) || 0;
          const priceUSD = Number(row[8] ?? 0) || 0;
          const go = Number(row[9] ?? 0) || 0;
          const get_ = Number(row[10] ?? 0) || 0;
          const status = String(row[11] ?? "prospecto").trim().toLowerCase();
          const comments = String(row[12] ?? "").trim();

          let valid = true;
          let error: string | undefined;
          if (!projectName) {
            valid = false;
            error = "Nombre de proyecto vacío";
          }

          return { code, projectName, directCustomer, endCustomer, bu, product, scope, costUSD, priceUSD, go, get: get_, status, comments, valid, error };
        });

        if (prospects.length === 0) {
          toast({ title: "Error", description: "El archivo no contiene datos.", variant: "destructive" });
          return;
        }

        setParsed(prospects);
        setStep("preview");
      } catch {
        toast({ title: "Error", description: "No se pudo leer el archivo.", variant: "destructive" });
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

    const { error } = await supabase.from("prospects").insert(rows);

    if (error) {
      toast({ title: "Error al importar", description: error.message, variant: "destructive" });
      setStep("preview");
    } else {
      toast({ title: `${validItems.length} oportunidades importadas exitosamente` });
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
                        <td className="py-2 px-3 text-right font-mono">${c.costUSD.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono">${c.priceUSD.toLocaleString()}</td>
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
                            : <span className="text-[10px] text-destructive" title={c.error}><XCircle className="h-3.5 w-3.5 mx-auto" /></span>}
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
