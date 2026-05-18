import { useMemo, useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CrmDeal, CrmStage, useMoveDealStage } from "@/hooks/useCrm";
import { toast } from "@/hooks/use-toast";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const ownerColor = (label: string | null) => {
  switch (label) {
    case "Aline": return "hsl(160,60%,38%)";
    case "Milena": return "hsl(45,80%,45%)";
    case "Felipe": return "#f97316";
    case "Thiago": return "#0a3a5c";
    default: return "hsl(0,0%,40%)";
  }
};

function DealCard({ deal, isDragging = false }: { deal: CrmDeal; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging: dragging } = useDraggable({
    id: deal.id,
  });

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const daysIn = Math.floor((Date.now() - new Date(deal.stage_entered_at).getTime()) / 86400000);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-3 rounded-lg cursor-grab active:cursor-grabbing transition-all ${
        dragging || isDragging ? "opacity-50" : ""
      }`}
      // glassmorphism card
      data-card
    >
      <div className="glass-card p-3 rounded-lg space-y-1.5 hover:bg-white/[0.06]">
        <div className="text-sm font-medium text-foreground line-clamp-2">{deal.titulo}</div>
        {deal.organization?.nome && (
          <div className="text-[11px] text-muted-foreground truncate">{deal.organization.nome}</div>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-primary font-medium">{fmt(Number(deal.valor) || 0)}</span>
          {deal.owner_label && (
            <span
              className="text-[9px] font-bold text-white rounded-full w-5 h-5 flex items-center justify-center"
              style={{ background: ownerColor(deal.owner_label) }}
              title={deal.owner_label}
            >
              {deal.owner_label.substring(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        {daysIn > 7 && (
          <div className={`text-[10px] ${daysIn >= 14 ? "text-red-400" : "text-amber-400"}`}>
            {daysIn}d no estágio
          </div>
        )}
      </div>
    </div>
  );
}

function StageColumn({ stage, deals }: { stage: CrmStage; deals: CrmDeal[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = deals.reduce((s, d) => s + (Number(d.valor) || 0), 0);

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      <div className="px-3 py-2 mb-2 rounded-lg glass-card">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-foreground">{stage.nome}</div>
          <div className="text-[10px] text-muted-foreground">{deals.length}</div>
        </div>
        <div className="text-[10px] text-muted-foreground">{fmt(total)}</div>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 p-1.5 rounded-lg min-h-[120px] transition-colors ${
          isOver ? "bg-primary/5 ring-1 ring-primary/30" : ""
        }`}
      >
        {deals.map(d => <DealCard key={d.id} deal={d} />)}
        {deals.length === 0 && (
          <div className="text-[10px] text-muted-foreground text-center py-4 opacity-50">vazio</div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({ stages, deals }: { stages: CrmStage[]; deals: CrmDeal[] }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const move = useMoveDealStage();
  const [activeId, setActiveId] = useState<string | null>(null);

  const dealsByStage = useMemo(() => {
    const map = new Map<string, CrmDeal[]>();
    for (const s of stages) map.set(s.id, []);
    for (const d of deals) {
      if (d.status !== "open") continue;
      const arr = map.get(d.stage_id);
      if (arr) arr.push(d);
    }
    return map;
  }, [stages, deals]);

  const activeDeal = activeId ? deals.find(d => d.id === activeId) : null;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const dealId = String(e.active.id);
    const newStageId = e.over ? String(e.over.id) : null;
    if (!newStageId) return;
    const deal = deals.find(d => d.id === dealId);
    if (!deal || deal.stage_id === newStageId) return;
    try {
      await move.mutateAsync({ dealId, stageId: newStageId });
    } catch (err: any) {
      toast({ title: "Erro ao mover deal", description: err.message, variant: "destructive" });
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map(s => (
          <StageColumn key={s.id} stage={s} deals={dealsByStage.get(s.id) || []} />
        ))}
      </div>
      <DragOverlay>
        {activeDeal ? <DealCard deal={activeDeal} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
