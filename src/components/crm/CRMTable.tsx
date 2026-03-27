import { useState, useMemo } from "react";
import type { Prospect, PipelineStage } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PIPELINE_STAGES } from "@/lib/types";
import { MessageSquareText, Receipt, ArrowUp, ArrowDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UserAvatar from "@/components/UserAvatar";

interface Props {
  prospects: Prospect[];
  onEdit: (p: Prospect) => void;
  onActivity?: (p: Prospect) => void;
  onStageChange?: (prospectId: string, newStage: string) => void;
  stages?: PipelineStage[];
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

type SortKey =
  | "code" | "projectName" | "directCustomer" | "endCustomer" | "product"
  | "costUSD" | "priceUSD" | "go" | "get" | "probability"
  | "weighted" | "marginPercent" | "marginUSD" | "estimatedOE"
  | "revenue" | "status" | "assignedTo";

type SortDir = "asc" | "desc";

const CRMTable = ({ prospects, onEdit, onActivity, onStageChange, stages: stagesProp, selectedIds = [], onSelectionChange }: Props) => {
  const stageList = stagesProp ?? PIPELINE_STAGES;
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return prospects;
    return [...prospects].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const as = String(av ?? "").toLowerCase();
      const bs = String(bv ?? "").toLowerCase();
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [prospects, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const allSelected = paginated.length > 0 && paginated.every(p => selectedIds.includes(p.id));
  const someSelected = paginated.some(p => selectedIds.includes(p.id)) && !allSelected;

  const toggleAll = () => {
    onSelectionChange?.(allSelected ? selectedIds.filter(id => !paginated.find(p => p.id === id)) : [...new Set([...selectedIds, ...paginated.map(p => p.id)])]);
  };

  const toggleOne = (id: string) => {
    onSelectionChange?.(
      selectedIds.includes(id)
        ? selectedIds.filter(i => i !== id)
        : [...selectedIds, id]
    );
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const SortableHead = ({ col, children, className = "" }: { col: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={`cursor-pointer select-none hover:bg-muted/70 transition-colors ${className}`} onClick={() => handleSort(col)}>
      <span className="inline-flex items-center gap-1">
        {children}
        <SortIcon col={col} />
      </span>
    </TableHead>
  );

  const statusBadge = (status: string) => {
    const stage = stageList.find((s) => s.key === status);
    return (
      <span className={`text-[11px] px-2 py-0.5 rounded-full text-primary-foreground ${stage?.color ?? "bg-muted"}`}>
        {stage?.label ?? status}
      </span>
    );
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                  aria-label="Seleccionar todos"
                />
              </TableHead>
              <TableHead className="w-10"></TableHead>
              <SortableHead col="code">Código</SortableHead>
              <SortableHead col="projectName">Proyecto</SortableHead>
              <SortableHead col="directCustomer">Cliente Directo</SortableHead>
              <SortableHead col="endCustomer">Cliente Final</SortableHead>
              <SortableHead col="product">Producto</SortableHead>
              <SortableHead col="costUSD" className="text-right">Costo USD</SortableHead>
              <SortableHead col="priceUSD" className="text-right">Precio USD</SortableHead>
              <SortableHead col="go" className="text-center">Go%</SortableHead>
              <SortableHead col="get" className="text-center">Get%</SortableHead>
              <SortableHead col="probability" className="text-center">Prob.</SortableHead>
              <SortableHead col="weighted" className="text-right">Peso USD</SortableHead>
              <SortableHead col="marginPercent" className="text-right">Margen %</SortableHead>
              <SortableHead col="marginUSD" className="text-right">Margen USD</SortableHead>
              <SortableHead col="estimatedOE">OE Est.</SortableHead>
              <SortableHead col="revenue">Revenue</SortableHead>
              <SortableHead col="status">Status</SortableHead>
              <SortableHead col="assignedTo">Responsable</SortableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((p) => (
              <TableRow
                key={p.id}
                className={`cursor-pointer hover:bg-muted/30 transition-colors ${selectedIds.includes(p.id) ? "bg-primary/5" : ""}`}
                onClick={() => onEdit(p)}
              >
                <TableCell onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(p.id)}
                    onCheckedChange={() => toggleOne(p.id)}
                    aria-label={`Seleccionar ${p.projectName}`}
                  />
                </TableCell>
                <TableCell><UserAvatar userId={p.createdBy} size="sm" /></TableCell>
                <TableCell className="text-muted-foreground text-xs font-mono">{p.code || p.cotorta || "—"}</TableCell>
                <TableCell>
                  <p className="font-medium text-sm">{p.projectName}</p>
                  <p className="text-xs text-muted-foreground">{p.scope.slice(0, 50)}</p>
                </TableCell>
                <TableCell className="text-sm">{p.directCustomer}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.endCustomer || "—"}</TableCell>
                <TableCell>
                  <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded">
                    {p.product}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm">${p.costUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right text-sm font-medium">${p.priceUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-center text-sm">{p.go}%</TableCell>
                <TableCell className="text-center text-sm">{p.get}%</TableCell>
                <TableCell className="text-center text-sm font-medium">{p.probability}%</TableCell>
                <TableCell className="text-right text-sm">${p.weighted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right text-sm">{p.marginPercent}%</TableCell>
                <TableCell className="text-right text-sm">${p.marginUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.estimatedOE}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.revenue || "—"}</TableCell>
                <TableCell>{statusBadge(p.status)}</TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  {p.assignedTo
                    ? <UserAvatar userId={p.assignedTo} size="sm" showTooltip />
                    : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="flex items-center gap-1">
                  {p.status === "ganado" && onStageChange && (
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1 border-emerald-600 text-emerald-700 hover:bg-emerald-50" onClick={(e) => { e.stopPropagation(); onStageChange(p.id, "facturada"); }}>
                      <Receipt className="h-3 w-3" /> Facturar
                    </Button>
                  )}
                  {onActivity && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); onActivity(p); }}>
                      <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border/60">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{selectedIds.length > 0 ? `${selectedIds.length} seleccionado(s) · ` : ""}{sorted.length} registro(s)</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Filas por página</span>
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(0); }}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Página {safePage + 1} de {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMTable;
