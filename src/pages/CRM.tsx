import { useState } from "react";
import { mockProspects } from "@/lib/mockData";
import { PIPELINE_STAGES, type Prospect } from "@/lib/types";
import { Search, LayoutGrid, Table as TableIcon, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CRMKanban from "@/components/crm/CRMKanban";
import CRMTable from "@/components/crm/CRMTable";
import ProspectDialog from "@/components/crm/ProspectDialog";

const CRM = () => {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [search, setSearch] = useState("");
  const [prospects, setProspects] = useState<Prospect[]>(mockProspects);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  const filtered = prospects.filter(
    (p) =>
      p.projectName.toLowerCase().includes(search.toLowerCase()) ||
      p.directCustomer.toLowerCase().includes(search.toLowerCase()) ||
      p.product.toLowerCase().includes(search.toLowerCase())
  );

  const totalPipeline = filtered.reduce((sum, p) => sum + p.priceUSD, 0);
  const totalWeighted = filtered.reduce((sum, p) => sum + p.weighted, 0);

  const handleEdit = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pipeline: <span className="font-semibold text-foreground">${totalPipeline.toLocaleString()}</span>
            {" · "}Ponderado: <span className="font-semibold text-foreground">${totalWeighted.toLocaleString()}</span>
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
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className={`p-2 transition-colors ${view === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("table")}
              className={`p-2 transition-colors ${view === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              <TableIcon className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={() => { setSelectedProspect(null); setDialogOpen(true); }} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Nueva Cotización
          </Button>
        </div>
      </div>

      {view === "kanban" ? (
        <CRMKanban prospects={filtered} onEdit={handleEdit} />
      ) : (
        <CRMTable prospects={filtered} onEdit={handleEdit} />
      )}

      <ProspectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        prospect={selectedProspect}
      />
    </div>
  );
};

export default CRM;
