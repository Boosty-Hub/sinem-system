import { useState, useEffect, useRef, useCallback } from "react";
import { PIPELINE_STAGES, type Prospect, type PipelineStage } from "@/lib/types";
import { DollarSign, FileText, GripVertical, MessageSquareText, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";

interface Props {
  prospects: Prospect[];
  onEdit: (p: Prospect) => void;
  onStageChange?: (prospectId: string, newStage: string) => void;
  onActivity?: (p: Prospect) => void;
  stages?: PipelineStage[];
}

interface CardProps {
  prospect: Prospect;
  onEdit: (p: Prospect) => void;
  onActivity?: (p: Prospect) => void;
  onMarkInvoiced?: (prospectId: string) => void;
}

/* ── Draggable Card ── */
const DraggableCard = ({ prospect, onEdit, onActivity, onMarkInvoiced }: CardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: prospect.id,
    data: { prospect },
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    opacity: isDragging ? 0.3 : 1,
    transition: isDragging ? undefined : "opacity 200ms ease",
  };

  return (
    <div ref={setNodeRef} style={style} className="deal-card group relative" onClick={() => !isDragging && onEdit(prospect)}>
      <div
        {...listeners}
        {...attributes}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-muted transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <CardContent prospect={prospect} onActivity={onActivity} onMarkInvoiced={onMarkInvoiced} />
    </div>
  );
};

/* ── Card Content ── */
const CardContent = ({ prospect, onActivity, onMarkInvoiced }: { prospect: Prospect; onActivity?: (p: Prospect) => void; onMarkInvoiced?: (prospectId: string) => void }) => {
  const [quotationCount, setQuotationCount] = useState(0);

  useEffect(() => {
    supabase.from("quotations").select("id", { count: "exact", head: true }).eq("prospect_id", prospect.id)
      .then(({ count }) => setQuotationCount(count ?? 0));
  }, [prospect.id]);

  return (
    <>
      <p className="text-sm font-medium mb-1 leading-snug pr-5">{prospect.projectName}</p>
      <p className="text-xs text-muted-foreground mb-2">{prospect.directCustomer}</p>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">${prospect.priceUSD.toLocaleString()}</span>
        <span className="text-[10px] text-muted-foreground">{prospect.probability}% prob.</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary/60 rounded-full" style={{ width: `${prospect.probability}%` }} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {prospect.product && (
          <span className="text-[10px] bg-accent text-accent-foreground px-2 py-0.5 rounded">{prospect.product}</span>
        )}
        {quotationCount > 0 && (
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded flex items-center gap-1">
            <FileText className="h-2.5 w-2.5" />
            {quotationCount} cot.
          </span>
        )}
        {onActivity && (
          <button
            onClick={(e) => { e.stopPropagation(); onActivity(prospect); }}
            className="text-muted-foreground hover:text-primary transition-colors p-0.5"
            title="Actividad"
          >
            <MessageSquareText className="h-3.5 w-3.5" />
          </button>
        )}
        <span className="ml-auto"><UserAvatar userId={prospect.createdBy} size="xs" /></span>
      </div>
      {prospect.status === "ganado" && onMarkInvoiced && (
        <Button
          size="sm"
          variant="outline"
          className="mt-2 w-full h-7 text-xs gap-1 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          onClick={(e) => { e.stopPropagation(); onMarkInvoiced(prospect.id); }}
        >
          <Receipt className="h-3 w-3" /> Marcar Facturada
        </Button>
      )}
    </>
  );
};

const INITIAL_VISIBLE = 10;
const LOAD_MORE_COUNT = 10;

/* ── Droppable Column with infinite scroll ── */
const DroppableColumn = ({
  stageKey,
  isOver,
  items,
  children,
}: {
  stageKey: string;
  isOver: boolean;
  items: Prospect[];
  children: (visibleItems: Prospect[]) => React.ReactNode;
}) => {
  const { setNodeRef } = useDroppable({ id: stageKey });
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset visible count when items change (e.g. filter/search)
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [items.length]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && visibleCount < items.length) {
          setVisibleCount((prev) => Math.min(prev + LOAD_MORE_COUNT, items.length));
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, items.length]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return (
    <div
      ref={setNodeRef}
      className={`space-y-2.5 min-h-[80px] max-h-[calc(100vh-280px)] overflow-y-auto rounded-lg transition-all duration-200 scrollbar-thin ${
        isOver ? "bg-primary/5 ring-2 ring-primary/20 ring-dashed" : ""
      }`}
      style={{ padding: isOver ? "8px" : "0" }}
    >
      {children(visibleItems)}
      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-2">
          <span className="text-[10px] text-muted-foreground animate-pulse">
            Cargando más ({visibleCount}/{items.length})…
          </span>
        </div>
      )}
      {!hasMore && items.length > INITIAL_VISIBLE && (
        <div ref={sentinelRef} />
      )}
      {isOver && (
        <div className="border-2 border-dashed border-primary/30 rounded-lg h-[100px] flex items-center justify-center transition-all duration-200 animate-pulse">
          <span className="text-xs text-primary/50 font-medium">Soltar aquí</span>
        </div>
      )}
    </div>
  );
};

/* ── Main Kanban ── */
const CRMKanban = ({ prospects, onEdit, onStageChange, onActivity, stages: stagesProp }: Props) => {
  const stageList = stagesProp ?? PIPELINE_STAGES;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const activeProspect = activeId ? prospects.find((p) => p.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);
  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string | undefined;
    if (!overId) { setOverColumnId(null); return; }
    const isColumn = stageList.some((s) => s.key === overId);
    if (isColumn) { setOverColumnId(overId); } else {
      const overProspect = prospects.find((p) => p.id === overId);
      setOverColumnId(overProspect?.status ?? null);
    }
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null); setOverColumnId(null);
    if (!over || !onStageChange) return;
    const prospectId = active.id as string;
    const prospect = prospects.find((p) => p.id === prospectId);
    if (!prospect) return;
    let targetStage: string | null = null;
    const isColumn = stageList.some((s) => s.key === over.id);
    if (isColumn) { targetStage = over.id as string; } else {
      const overProspect = prospects.find((p) => p.id === over.id);
      targetStage = overProspect?.status ?? null;
    }
    if (targetStage && targetStage !== prospect.status) onStageChange(prospectId, targetStage);
  };
  const handleDragCancel = () => { setActiveId(null); setOverColumnId(null); };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stageList.map((stage) => {
          const items = prospects.filter((p) => p.status === stage.key);
          const total = items.reduce((s, p) => s + p.priceUSD, 0);
          return (
            <div key={stage.key} className="pipeline-column flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                  <h3 className="text-sm font-semibold">{stage.label}</h3>
                  <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5">{items.length}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                <DollarSign className="h-3 w-3" />{total.toLocaleString()}
              </p>
              <DroppableColumn stageKey={stage.key} isOver={overColumnId === stage.key && activeId !== null}>
                {items.map((prospect) => (
                  <DraggableCard key={prospect.id} prospect={prospect} onEdit={onEdit} onActivity={onActivity} onMarkInvoiced={onStageChange ? (id) => onStageChange(id, "facturada") : undefined} />
                ))}
                {items.length === 0 && !activeId && (
                  <p className="text-xs text-muted-foreground text-center py-6">Sin oportunidades</p>
                )}
              </DroppableColumn>
            </div>
          );
        })}
      </div>
      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeProspect ? (
          <div className="deal-card shadow-xl ring-2 ring-primary/30 rotate-[2deg] w-[280px]">
            <CardContent prospect={activeProspect} onActivity={undefined} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default CRMKanban;
