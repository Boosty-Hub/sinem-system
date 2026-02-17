import type { Prospect } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PIPELINE_STAGES } from "@/lib/types";

interface Props {
  prospects: Prospect[];
  onEdit: (p: Prospect) => void;
}

const statusBadge = (status: Prospect["status"]) => {
  const stage = PIPELINE_STAGES.find((s) => s.key === status);
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full text-primary-foreground ${stage?.color ?? "bg-muted"}`}>
      {stage?.label ?? status}
    </span>
  );
};

const CRMTable = ({ prospects, onEdit }: Props) => {
  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10">#</TableHead>
              <TableHead>Proyecto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Costo USD</TableHead>
              <TableHead className="text-right">Precio USD</TableHead>
              <TableHead className="text-right">Margen %</TableHead>
              <TableHead className="text-center">Prob.</TableHead>
              <TableHead>OE Est.</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prospects.map((p) => (
              <TableRow
                key={p.id}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => onEdit(p)}
              >
                <TableCell className="text-muted-foreground text-xs">{p.cotorta}</TableCell>
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
                <TableCell className="text-right text-sm">{p.marginPercent}%</TableCell>
                <TableCell className="text-center text-sm">{p.probability}%</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.estimatedOE}</TableCell>
                <TableCell>{statusBadge(p.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CRMTable;
