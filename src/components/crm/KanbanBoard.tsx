import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Calendar, Building2, Trash2, XCircle, Trophy, ArrowRightLeft } from "lucide-react";
import { CrmDeal, CrmStage, CrmLabel, useMoveDealStage, useCrmPipelines, useCrmStages, useCrmLabels } from "@/hooks/useCrm";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { MotivoPerdaModal } from "@/components/crm/atividades/MotivoPerdaModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { SwipeableKanban } from "@/components/mobile/SwipeableKanban";

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
          if (e.detail === 1 && onOpen) onOpen();
        }}
      >
        <div className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">
          {deal.titulo}
        </div>

        {(deal.person?.nome || deal.owner_label) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {deal.person?.nome && (
              <span className="text-[10.5px] text-muted-foreground">
                {deal.person.nome.split(" ")[0]}
              </span>
            )}
            {deal.owner_label && (
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                style={{ background: ownerColor(deal.owner_label) }}
              >
                {deal.owner_label}
              </span>
            )}
          </div>
        )}

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
      className={`flex flex-col flex-1 min-w-0 rounded-2xl border backdrop-blur-xl transition-all overflow-hidden ${
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
        className="flex-1 space-y-2 p-2 min-h-[300px] overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
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

const ACTION_IDS = ["__delete__", "__lost__", "__won__", "__moveto__"] as const;
type ActionId = typeof ACTION_IDS[number];

function ActionZone({
  id, icon, label, tone,
}: {
  id: ActionId;
  icon: React.ReactNode;
  label: string;
  tone: "danger" | "warning" | "success" | "info";
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const toneMap = {
    danger: { base: "text-red-300/70 border-red-500/20", active: "bg-red-500/20 text-red-200 border-red-400/60 ring-2 ring-red-400/40" },
    warning: { base: "text-amber-300/70 border-amber-500/20", active: "bg-amber-500/20 text-amber-100 border-amber-400/60 ring-2 ring-amber-400/40" },
    success: { base: "text-emerald-300/70 border-emerald-500/20", active: "bg-emerald-500/20 text-emerald-100 border-emerald-400/60 ring-2 ring-emerald-400/40" },
    info: { base: "text-sky-300/70 border-sky-500/20", active: "bg-sky-500/20 text-sky-100 border-sky-400/60 ring-2 ring-sky-400/40" },
  }[tone];

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 h-14 flex items-center justify-center gap-2 rounded-xl border border-dashed text-[12px] font-semibold uppercase tracking-wider transition-all ${
        isOver ? toneMap.active + " scale-[1.02]" : toneMap.base + " bg-white/[0.02]"
      }`}
    >
      {icon}
      {label}
    </div>
  );
}

export function KanbanBoard({ stages, deals }: { stages: CrmStage[]; deals: CrmDeal[] }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const move = useMoveDealStage();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [moveToDealId, setMoveToDealId] = useState<string | null>(null);
  const [lostDealId, setLostDealId] = useState<string | null>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();


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

  const handleAction = async (action: ActionId, dealId: string) => {
    try {
      if (action === "__delete__") {
        if (!confirm("Excluir este deal permanentemente?")) return;
        const { error } = await supabase.from("crm_deals").delete().eq("id", dealId);
        if (error) throw error;
        toast({ title: "Deal excluído" });
      } else if (action === "__lost__") {
        setLostDealId(dealId);
        return;
      } else if (action === "__won__") {
        const { error } = await supabase
          .from("crm_deals")
          .update({ status: "won", data_fechamento: new Date().toISOString() })
          .eq("id", dealId);
        if (error) throw error;
        toast({ title: "Marcado como Ganho 🎉" });
      } else if (action === "__moveto__") {
        setMoveToDealId(dealId);
        return;
      }
      qc.invalidateQueries({ queryKey: ["crm"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const isDragging = activeId !== null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={async (e: DragEndEvent) => {
        const dealId = String(e.active.id);
        setActiveId(null);
        const overId = e.over ? String(e.over.id) : null;
        if (!overId) return;

        if ((ACTION_IDS as readonly string[]).includes(overId)) {
          await handleAction(overId as ActionId, dealId);
          return;
        }

        const deal = deals.find(d => d.id === dealId);
        if (!deal || deal.stage_id === overId) return;
        try {
          await move.mutateAsync({ dealId, stageId: overId });
        } catch (err: any) {
          toast({ title: "Erro ao mover deal", description: err.message, variant: "destructive" });
        }
      }}
    >
      {isMobile && stages.length > 0 ? (
        <SwipeableKanban
          stages={stages.map(s => ({ id: s.id, nome: s.nome, cor: s.cor }))}
          renderColumn={(sid) => {
            const s = stages.find(x => x.id === sid)!;
            return (
              <StageColumn
                stage={s}
                deals={dealsByStage.get(s.id) || []}
                onOpen={(id) => navigate(`/crm/deal/${id}`)}
              />
            );
          }}
        />
      ) : (
        <div className="flex gap-3 pb-6 -mx-1 px-1 w-full overflow-x-auto">
          {stages.map(s => (
            <StageColumn
              key={s.id}
              stage={s}
              deals={dealsByStage.get(s.id) || []}
              onOpen={(id) => navigate(`/crm/deal/${id}`)}
            />
          ))}
        </div>
      )}

      {/* Bottom action drop bar — only during drag */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-40 px-4 pb-4 pointer-events-none transition-all duration-200 ${
          isDragging ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div
          className={`mx-auto max-w-5xl glass-card rounded-2xl p-2 flex gap-2 border border-white/10 backdrop-blur-2xl bg-background/80 ${
            isDragging ? "pointer-events-auto" : ""
          }`}
        >
          <ActionZone id="__delete__" icon={<Trash2 className="w-4 h-4" />} label="Delete" tone="danger" />
          <ActionZone id="__lost__" icon={<XCircle className="w-4 h-4" />} label="Lost" tone="warning" />
          <ActionZone id="__won__" icon={<Trophy className="w-4 h-4" />} label="Won" tone="success" />
          <ActionZone id="__moveto__" icon={<ArrowRightLeft className="w-4 h-4" />} label="Move to" tone="info" />
        </div>
      </div>

      <DragOverlay>
        {activeDeal ? <DealCard deal={activeDeal} isDragging /> : null}
      </DragOverlay>

      {/* Move to: pipeline picker */}
      <MoveToPipelineDialog
        dealId={moveToDealId}
        onClose={() => setMoveToDealId(null)}
      />

      {/* Motivo de perda obrigatório */}
      <MotivoPerdaModal
        open={!!lostDealId}
        dealTitulo={lostDealId ? deals.find(d => d.id === lostDealId)?.titulo : null}
        onCancel={() => setLostDealId(null)}
        onConfirm={async (motivo) => {
          if (!lostDealId) return;
          try {
            const { error } = await supabase
              .from("crm_deals")
              .update({ status: "lost", motivo_perda: motivo, data_fechamento: new Date().toISOString() })
              .eq("id", lostDealId);
            if (error) throw error;
            toast({ title: "Marcado como Perdido", description: motivo });
            qc.invalidateQueries({ queryKey: ["crm"] });
          } catch (err: any) {
            toast({ title: "Erro", description: err.message, variant: "destructive" });
          } finally {
            setLostDealId(null);
          }
        }}
      />
    </DndContext>
  );
}

function MoveToPipelineDialog({ dealId, onClose }: { dealId: string | null; onClose: () => void }) {
  const { data: pipelines = [] } = useCrmPipelines();
  const [targetPipelineId, setTargetPipelineId] = useState<string | null>(null);
  const { data: targetStages = [] } = useCrmStages(targetPipelineId || undefined);
  const qc = useQueryClient();

  const handleMove = async (stageId: string, pipelineName: string, stageName: string) => {
    if (!dealId) return;
    try {
      const { error } = await supabase
        .from("crm_deals")
        .update({ pipeline_id: targetPipelineId, stage_id: stageId, stage_entered_at: new Date().toISOString() })
        .eq("id", dealId);
      if (error) throw error;
      toast({ title: `Movido para ${pipelineName} · ${stageName}` });
      qc.invalidateQueries({ queryKey: ["crm"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setTargetPipelineId(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={!!dealId}
      onOpenChange={(o) => {
        if (!o) {
          setTargetPipelineId(null);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {targetPipelineId ? "Escolher etapa…" : "Mover para qual pipeline?"}
          </DialogTitle>
        </DialogHeader>

        {!targetPipelineId ? (
          <div className="grid grid-cols-1 gap-1.5 mt-2">
            {pipelines.map((p) => (
              <button
                key={p.id}
                onClick={() => setTargetPipelineId(p.id)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left text-sm border border-white/5"
              >
                <span className="text-foreground font-medium">{p.nome}</span>
                {p.owner_label && (
                  <span className="text-[10px] text-muted-foreground">{p.owner_label}</span>
                )}
              </button>
            ))}
            {pipelines.length === 0 && (
              <div className="text-xs text-muted-foreground py-4 text-center">Nenhum pipeline disponível.</div>
            )}
          </div>
        ) : (
          <>
            <button
              onClick={() => setTargetPipelineId(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors mb-1"
            >
              ← Voltar aos pipelines
            </button>
            <div className="grid grid-cols-1 gap-1.5">
              {targetStages.map((s) => {
                const pipelineName = pipelines.find((p) => p.id === targetPipelineId)?.nome || "";
                return (
                  <button
                    key={s.id}
                    onClick={() => handleMove(s.id, pipelineName, s.nome)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left text-sm"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.cor || "#3b82f6" }} />
                    <span className="text-foreground">{s.nome}</span>
                  </button>
                );
              })}
              {targetStages.length === 0 && (
                <div className="text-xs text-muted-foreground py-4 text-center">Carregando etapas…</div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
