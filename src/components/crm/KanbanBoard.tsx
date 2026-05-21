import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Calendar, Building2 } from "lucide-react";
import { CrmDeal, CrmStage, useMoveDealStage } from "@/hooks/useCrm";
import { toast } from "@/hooks/use-toast";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const fmtCompact = (v: number) => {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return fmt(v);
};

const ownerColor = (label: string | null) => {
  switch (label) {
    case "Aline": return "hsl(160,60%,42%)";
    case "Milena": return "hsl(45,80%,50%)";
    case "Felipe": return "hsl(22,90%,55%)";
    case "Thiago": return "hsl(210,80%,45%)";
    default: return "hsl(220,15%,45%)";
  }
};

function DealCard({ deal, isDragging = false, onOpen }: { deal: CrmDeal; isDragging?: boolean; onOpen?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging: dragging } = useDraggable({ id: deal.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined;
  const daysIn = Math.floor((Date.now() - new Date(deal.stage_entered_at).getTime()) / 86400000);
  const stale = daysIn >= 7;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onDoubleClick={onOpen}
      className={`group select-none ${dragging || isDragging ? "opacity-40" : ""}`}
    >
      <div
        className="glass-card p-3 rounded-xl space-y-2 cursor-grab active:cursor-grabbing transition-all duration-200 hover:bg-white/[0.07] hover:border-white/20 hover:-translate-y-0.5"
        onClick={(e) => {
          // single click also opens (but allow drag to override via constraint)
          if (e.detail === 1 && onOpen) onOpen();
        }}
      >
        <div className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">
          {deal.titulo}
        </div>

        {deal.organization?.nome && (
          <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground truncate">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{deal.organization.nome}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
          <span className="text-xs font-semibold text-primary tabular-nums">{fmtCompact(Number(deal.valor) || 0)}</span>
          <div className="flex items-center gap-1.5">
            {stale && (
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${daysIn >= 14 ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"}`}>
                {daysIn}d
              </span>
            )}
            {deal.owner_label && (
              <span
                className="text-[9px] font-bold text-white rounded-full w-5 h-5 flex items-center justify-center ring-2 ring-background"
                style={{ background: ownerColor(deal.owner_label) }}
                title={deal.owner_label}
              >
                {deal.owner_label.substring(0, 1).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {deal.expected_close_date && (
          <div className="flex items-center gap-1 text-[9.5px] text-muted-foreground/80">
            <Calendar className="w-2.5 h-2.5" />
            {new Date(deal.expected_close_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </div>
        )}
      </div>
    </div>
  );
}

function StageColumn({ stage, deals, onOpen }: { stage: CrmStage; deals: CrmDeal[]; onOpen: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = deals.reduce((s, d) => s + (Number(d.valor) || 0), 0);
  const color = stage.cor || "#3b82f6";

  return (
    <div
      className={`flex flex-col w-[280px] flex-shrink-0 rounded-2xl border backdrop-blur-xl transition-all overflow-hidden ${
        isOver ? "border-primary/60 ring-2 ring-primary/30" : "border-white/10"
      }`}
      style={{
        background: `linear-gradient(180deg, ${color}10 0%, rgba(255,255,255,0.02) 30%, rgba(255,255,255,0.02) 100%)`,
        boxShadow: `inset 0 3px 0 0 ${color}, 0 4px 24px -8px ${color}25`,
      }}
    >
      <div className="px-3 pt-3 pb-2.5 border-b border-white/5 sticky top-0 backdrop-blur-xl z-10" style={{ background: `linear-gradient(180deg, ${color}15, transparent)` }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}80` }} />
            <span className="text-[12px] font-semibold text-foreground tracking-wide uppercase truncate">{stage.nome}</span>
          </div>
          <span className="text-[10px] text-muted-foreground bg-white/10 px-1.5 py-0.5 rounded-full flex-shrink-0">{deals.length}</span>
        </div>
        <div className="text-[11px] text-muted-foreground tabular-nums pl-4">{fmt(total)}</div>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 space-y-2 p-2 min-h-[300px] overflow-y-auto"
      >
        {deals.map(d => <DealCard key={d.id} deal={d} onOpen={() => onOpen(d.id)} />)}
        {deals.length === 0 && (
          <div className="flex items-center justify-center text-[10px] text-muted-foreground/50 py-12 italic border border-dashed border-white/5 rounded-lg">
            arraste deals aqui
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({ stages, deals }: { stages: CrmStage[]; deals: CrmDeal[] }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const move = useMoveDealStage();
  const [activeId, setActiveId] = useState<string | null>(null);
  const navigate = useNavigate();

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

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={async (e: DragEndEvent) => {
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
      }}
    >
      <div className="flex gap-3 overflow-x-auto pb-6 -mx-1 px-1">
        {stages.map(s => (
          <StageColumn
            key={s.id}
            stage={s}
            deals={dealsByStage.get(s.id) || []}
            onOpen={(id) => navigate(`/crm/deal/${id}`)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeDeal ? <DealCard deal={activeDeal} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
