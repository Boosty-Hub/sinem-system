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
import { MessageSquareText, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";

interface Props {
  prospects: Prospect[];
  onEdit: (p: Prospect) => void;
  onActivity?: (p: Prospect) => void;
  onStageChange?: (prospectId: string, newStage: string) => void;
  stages?: PipelineStage[];
}

const CRMTable = ({ prospects, onEdit, onActivity, onStageChange, stages: stagesProp }: Props) => {
  const stageList = stagesProp ?? PIPELINE_STAGES;

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
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-10">Código</TableHead>
              <TableHead>Proyecto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Costo USD</TableHead>
              <TableHead className="text-right">Precio USD</TableHead>
              <TableHead className="text-center">Go%</TableHead>
              <TableHead className="text-center">Get%</TableHead>
              <TableHead className="text-center">Prob.</TableHead>
              <TableHead className="text-right">Peso USD</TableHead>
              <TableHead className="text-right">Margen %</TableHead>
              <TableHead className="text-right">Margen USD</TableHead>
              <TableHead>OE Est.</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prospects.map((p) => (
              <TableRow
                key={p.id}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => onEdit(p)}
              >
                <TableCell><UserAvatar userId={p.createdBy} size="sm" /></TableCell>
                <TableCell className="text-muted-foreground text-xs font-mono">{p.code || p.cotorta || "—"}</TableCell>
                <TableCell>
                  <p className="font-medium text-sm">{p.projectName}</p>
                  <p className="text-xs text-muted-foreground">{p.scope.slice(0, 50)}</p>
                </TableCell>
                <TableCell className="text-sm">{p.directCustomer}</TableCell>
                <TableCell>
                  <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded">
                    {p.product}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm">${p.costUSD.toLocaleString()}</TableCell>
                <TableCell className="text-right text-sm font-medium">${p.priceUSD.toLocaleString()}</TableCell>
                <TableCell className="text-center text-sm">{p.go}%</TableCell>
                <TableCell className="text-center text-sm">{p.get}%</TableCell>
                <TableCell className="text-center text-sm font-medium">{p.probability}%</TableCell>
                <TableCell className="text-right text-sm">${p.weighted.toLocaleString()}</TableCell>
                <TableCell className="text-right text-sm">{p.marginPercent}%</TableCell>
                <TableCell className="text-right text-sm">${p.marginUSD.toLocaleString()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.estimatedOE}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.revenue || "—"}</TableCell>
                <TableCell>{statusBadge(p.status)}</TableCell>
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
    </div>
  );
};

export default CRMTable;
