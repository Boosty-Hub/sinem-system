import { useState, useEffect } from "react";
import { mockQuotations } from "@/lib/mockData";
import { QUOTATION_STATUSES, type Quotation } from "@/lib/types";
import { Search, Plus, FileText, ExternalLink } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import QuotationDialog from "@/components/cotizaciones/QuotationDialog";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export interface QuotationPrefill {
  prospectId?: string;
  clientId?: string;
  contactId?: string;
  subject?: string;
  customer?: string;
}

const Cotizaciones = () => {
  const [search, setSearch] = useState("");
  const [quotations, setQuotations] = useLocalStorage<Quotation[]>("sinem:quotations", mockQuotations);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [prefill, setPrefill] = useState<QuotationPrefill | undefined>();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const prospectId = searchParams.get("prospectId");
    if (prospectId) {
      const pf: QuotationPrefill = { prospectId };
      const clientId = searchParams.get("clientId");
      const contactId = searchParams.get("contactId");
      const subject = searchParams.get("subject");
      const customer = searchParams.get("customer");
      if (clientId) pf.clientId = clientId;
      if (contactId) pf.contactId = contactId;
      if (subject) pf.subject = subject;
      if (customer) pf.customer = customer;
      setPrefill(pf);
      setSelectedQuotation(null);
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = quotations.filter((q) => {
    const matchesSearch =
      q.subject.toLowerCase().includes(search.toLowerCase()) ||
      q.client.company.toLowerCase().includes(search.toLowerCase()) ||
      q.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || q.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalValue = filtered.reduce((sum, q) => sum + q.totalUSD, 0);

  const handleEdit = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setDialogOpen(true);
  };

  const handleStatusChange = (quotationId: string, newStatus: string) => {
    setQuotations((prev) =>
      prev.map((q) => (q.id === quotationId ? { ...q, status: newStatus as Quotation["status"] } : q))
    );
  };

  const getStatusConfig = (status: string) => {
    return QUOTATION_STATUSES.find((s) => s.key === status) ?? { label: status, color: "bg-muted" };
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cotizaciones</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length} cotizaciones · Total:{" "}
            <span className="font-semibold text-foreground">${totalValue.toLocaleString()}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cotización..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-[240px]"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Todos los estados</option>
            {QUOTATION_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <Button onClick={() => { setSelectedQuotation(null); setDialogOpen(true); }} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Nueva Cotización
          </Button>
        </div>
      </div>

      <div className="stat-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Código</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Asunto</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cliente</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Subtotal</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Margen</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Estado</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fecha</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => {
                const statusCfg = getStatusConfig(q.status);
                return (
                  <tr
                    key={q.id}
                    className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => handleEdit(q)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-xs">{q.code}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium max-w-[250px] truncate">{q.subject}</td>
                    <td className="py-3 px-4 text-muted-foreground">{q.client.company}</td>
                    <td className="py-3 px-4 text-right">${q.subtotalUSD.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-semibold text-primary">${q.totalUSD.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sinem-success font-medium">{q.marginPercent}%</span>
                      <span className="text-muted-foreground text-xs ml-1">(${q.marginUSD.toLocaleString()})</span>
                    </td>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={q.status}
                        onChange={(e) => handleStatusChange(q.id, e.target.value)}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer appearance-none text-center text-white ${statusCfg.color}`}
                        style={{ backgroundImage: "none", paddingRight: "10px" }}
                      >
                        {QUOTATION_STATUSES.map((s) => (
                          <option key={s.key} value={s.key} className="text-foreground bg-background">
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{q.createdAt}</td>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <Link to={`/oferta/${q.id}`} target="_blank">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    No se encontraron cotizaciones
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <QuotationDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setPrefill(undefined); }}
        quotation={selectedQuotation}
        prefill={prefill}
      />
    </div>
  );
};

export default Cotizaciones;
