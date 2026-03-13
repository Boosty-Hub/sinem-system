import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface ParsedClient {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  industry: string;
  address: string;
  status: "activo" | "inactivo";
  valid: boolean;
  error?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const TEMPLATE_COLUMNS = [
  "Nombre / Empresa",
  "Persona de Contacto",
  "Email",
  "Teléfono",
  "Industria",
  "Dirección",
  "Estado (activo/inactivo)",
];

const ClientImportDialog = ({ open, onOpenChange, onImported }: Props) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedClient[]>([]);
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
      ["AES Dominicana", "Juan Pérez", "juan@aes.com", "+1 809 555-0001", "Energía", "Av. Winston Churchill 100, Santo Domingo", "activo"],
      ["CEPM", "María García", "maria@cepm.com", "+1 809 555-0002", "Distribución Eléctrica", "Calle Principal 50, San Pedro", "activo"],
    ]);
    ws["!cols"] = TEMPLATE_COLUMNS.map(() => ({ wch: 25 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "Plantilla_Clientes.xlsx");
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

        // Skip header row
        const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell != null && String(cell).trim() !== ""));

        const clients: ParsedClient[] = dataRows.map((row, idx) => {
          const name = String(row[0] ?? "").trim();
          const contactName = String(row[1] ?? "").trim();
          const contactEmail = String(row[2] ?? "").trim();
          const contactPhone = String(row[3] ?? "").trim();
          const industry = String(row[4] ?? "").trim();
          const address = String(row[5] ?? "").trim();
          const rawStatus = String(row[6] ?? "activo").trim().toLowerCase();
          const status = rawStatus === "inactivo" ? "inactivo" : "activo";

          const errors: string[] = [];
          if (!name) errors.push("Nombre vacío");
          if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) errors.push("Email inválido");

          return {
            name, contactName, contactEmail, contactPhone, industry, address, status,
            valid: errors.length === 0,
            error: errors.length > 0 ? `Fila ${idx + 2}: ${errors.join(", ")}` : undefined,
          };
        });

        if (clients.length === 0) {
          toast({ title: "Error", description: "El archivo no contiene datos.", variant: "destructive" });
          return;
        }

        setParsed(clients);
        setStep("preview");
      } catch {
        toast({ title: "Error", description: "No se pudo leer el archivo.", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const validClients = parsed.filter((c) => c.valid);
  const invalidClients = parsed.filter((c) => !c.valid);

  const handleImport = async () => {
    if (validClients.length === 0) return;
    setProcessing(true);
    setStep("processing");

    const rows = validClients.map((c) => ({
      name: c.name,
      contact_name: c.contactName,
      contact_email: c.contactEmail,
      contact_phone: c.contactPhone,
      industry: c.industry,
      address: c.address,
      status: c.status,
    }));

    const { error } = await supabase.from("clients").insert(rows);

    if (error) {
      toast({ title: "Error al importar", description: error.message, variant: "destructive" });
      setStep("preview");
    } else {
      toast({ title: `${validClients.length} clientes importados exitosamente` });
      onImported();
      handleClose(false);
    }
    setProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Importar Clientes
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6 mt-2">
            {/* Step 1: Download template */}
            <div className="stat-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</div>
                <h3 className="font-semibold text-sm">Descargar plantilla</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3 ml-11">
                Descarga la plantilla Excel con las columnas requeridas y llénala con los datos de tus clientes.
              </p>
              <div className="ml-11">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-1" /> Descargar Plantilla (.xlsx)
                </Button>
              </div>
            </div>

            {/* Step 2: Upload file */}
            <div className="stat-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</div>
                <h3 className="font-semibold text-sm">Subir archivo</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3 ml-11">
                Sube el archivo Excel con los datos de los clientes a importar.
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
            {/* Summary */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-sinem-success" />
                <span className="font-medium">{validClients.length}</span>
                <span className="text-muted-foreground">válidos</span>
              </div>
              {invalidClients.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="font-medium">{invalidClients.length}</span>
                  <span className="text-muted-foreground">con errores (se omitirán)</span>
                </div>
              )}
              <span className="text-xs text-muted-foreground ml-auto">Total: {parsed.length} filas</span>
            </div>

            {/* Error details */}
            {invalidClients.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-destructive">Detalle de errores:</p>
                {invalidClients.map((c, i) => (
                  <p key={i} className="text-[11px] text-destructive/80">• {c.error}</p>
                ))}
              </div>
            )}

            {/* Preview table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground w-8">#</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Nombre</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Contacto</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Teléfono</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Industria</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Estado</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground w-8">✓</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((c, i) => (
                      <tr key={i} className={`border-t border-border/30 ${!c.valid ? "bg-destructive/5" : "hover:bg-muted/30"}`}>
                        <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 px-3 font-medium">{c.name || <span className="text-destructive italic">vacío</span>}</td>
                        <td className="py-2 px-3">{c.contactName}</td>
                        <td className="py-2 px-3">{c.contactEmail}</td>
                        <td className="py-2 px-3">{c.contactPhone}</td>
                        <td className="py-2 px-3">{c.industry}</td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${c.status === "activo" ? "bg-sinem-success/20 text-sinem-success" : "bg-muted text-muted-foreground"}`}>
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

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" onClick={reset}>
                Volver
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleImport} disabled={validClients.length === 0}>
                  <Upload className="h-4 w-4 mr-1" /> Importar {validClients.length} clientes
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Importando {validClients.length} clientes...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClientImportDialog;
