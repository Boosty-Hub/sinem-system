import { PIPELINE_STAGES, type Prospect } from "@/lib/types";
import { DollarSign } from "lucide-react";

interface Props {
  prospects: Prospect[];
  onEdit: (p: Prospect) => void;
}

const CRMKanban = ({ prospects, onEdit }: Props) => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map((stage) => {
        const items = prospects.filter((p) => p.status === stage.key);
        const total = items.reduce((s, p) => s + p.priceUSD, 0);

        return (
          <div key={stage.key} className="pipeline-column flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                <h3 className="text-sm font-semibold">{stage.label}</h3>
                <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5">
                  {items.length}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {total.toLocaleString()}
            </p>

            <div className="space-y-2.5">
              {items.map((prospect) => (
                <div
                  key={prospect.id}
                  className="deal-card"
                  onClick={() => onEdit(prospect)}
                >
                  <p className="text-sm font-medium mb-1 leading-snug">{prospect.projectName}</p>
                  <p className="text-xs text-muted-foreground mb-2">{prospect.directCustomer}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">
                      ${prospect.priceUSD.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {prospect.probability}% prob.
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-full"
                        style={{ width: `${prospect.probability}%` }}
                      />
                    </div>
                  </div>
                  {prospect.product && (
                    <span className="inline-block mt-2 text-[10px] bg-accent text-accent-foreground px-2 py-0.5 rounded">
                      {prospect.product}
                    </span>
                  )}
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Sin cotizaciones</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CRMKanban;
