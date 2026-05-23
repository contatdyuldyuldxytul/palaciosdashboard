import { useEffect, useMemo, useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useDroppable, useDraggable, useSensor, useSensors,
} from "@dnd-kit/core";
import { Plus, Trash2, Building2, Calendar } from "lucide-react";
import {
  ProjectDeal, ProjectStage, useProjectPipelines, useProjectStages,
  useProjectDeals, useMoveProjectStage, useCreateProjectDeal, useDeleteProjectDeal,
  useClientesAtivosLite,
} from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { SwipeableKanban } from "@/components/mobile/SwipeableKanban";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

function ProjectCard({ deal, onDelete }: { deal: ProjectDeal; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined;
  const daysIn = Math.floor((Date.now() - new Date(deal.stage_entered_at).getTime()) / 86400000);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`group ${isDragging ? "opacity-40" : ""}`}>
      <div className="glass-card p-3 rounded-xl space-y-2 cursor-grab active:cursor-grabbing transition-all hover:bg-white/[0.07] hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[13px] font-medium text-foreground leading-snug line-clamp-2 flex-1">{deal.titulo}</div>
          <button
            onClick={(e) => { e.stopPropagation(); if (confirm("Remover projeto do kanban?")) onDelete(deal.id); }}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
        {deal.responsavel_label && (
          <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
            <Building2 className="w-3 h-3" /> {deal.responsavel_label}
          </div>
        )}
        <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
          <span className="text-xs font-semibold text-primary tabular-nums">{fmt(Number(deal.valor) || 0)}</span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" /> {daysIn}d nessa etapa
          </span>
        </div>
        {deal.progresso != null && deal.progresso > 0 && (
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${Math.min(100, deal.progresso)}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

function StageColumn({ stage, deals, onDelete }: { stage: ProjectStage; deals: ProjectDeal[]; onDelete: (id: string) => void }) {
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
      <div className="px-3 pt-3 pb-2.5 border-b border-white/5">
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
        {deals.map(d => <ProjectCard key={d.id} deal={d} onDelete={onDelete} />)}
        {deals.length === 0 && (
          <div className="flex items-center justify-center text-[10px] text-muted-foreground/50 py-12 italic border border-dashed border-white/5 rounded-lg">
            arraste projetos aqui
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectsKanban() {
  const { data: pipelines = [] } = useProjectPipelines();
  const [pipelineId, setPipelineId] = useState("");
  useEffect(() => { if (!pipelineId && pipelines.length) setPipelineId(pipelines[0].id); }, [pipelines, pipelineId]);
  const { data: stages = [] } = useProjectStages(pipelineId);
  const { data: deals = [] } = useProjectDeals(pipelineId);
  const move = useMoveProjectStage();
  const del = useDeleteProjectDeal();
  const qc = useQueryClient();
  const isMobile = useIsMobile();

  const [addOpen, setAddOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const byStage = useMemo(() => {
    const map = new Map<string, ProjectDeal[]>();
    for (const s of stages) map.set(s.id, []);
    for (const d of deals) map.get(d.stage_id)?.push(d);
    return map;
  }, [stages, deals]);

  const activeDeal = activeId ? deals.find(d => d.id === activeId) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <Select value={pipelineId} onValueChange={setPipelineId}>
          <SelectTrigger className="w-full sm:w-[260px] h-9 bg-white/5 border-white/10"><SelectValue placeholder="Pipeline" /></SelectTrigger>
          <SelectContent className="bg-background border-white/10">
            {pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setAddOpen(true)} disabled={!pipelineId || stages.length === 0} className="w-full sm:w-auto">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar projeto
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
        onDragEnd={async (e: DragEndEvent) => {
          const id = String(e.active.id);
          setActiveId(null);
          const overId = e.over ? String(e.over.id) : null;
          if (!overId) return;
          const d = deals.find(x => x.id === id);
          if (!d || d.stage_id === overId) return;
          try {
            await move.mutateAsync({ id, stageId: overId });
            qc.invalidateQueries({ queryKey: ["projects", "deals"] });
          } catch (err: any) {
            toast({ title: "Erro ao mover", description: err.message, variant: "destructive" });
          }
        }}
      >
        {isMobile && stages.length > 0 ? (
          <SwipeableKanban
            stages={stages.map(s => ({ id: s.id, nome: s.nome, cor: s.cor }))}
            renderColumn={(sid) => {
              const s = stages.find(x => x.id === sid)!;
              return <StageColumn stage={s} deals={byStage.get(s.id) || []} onDelete={(id) => del.mutate(id)} />;
            }}
          />
        ) : (
          <div className="flex gap-3 pb-6 overflow-x-auto">
            {stages.map(s => (
              <StageColumn key={s.id} stage={s} deals={byStage.get(s.id) || []} onDelete={(id) => del.mutate(id)} />
            ))}
            {stages.length === 0 && (
              <div className="flex-1 text-center py-12 text-sm text-muted-foreground">
                Pipeline sem etapas. Crie etapas no editor de pipelines.
              </div>
            )}
          </div>
        )}
        <DragOverlay>{activeDeal ? <ProjectCard deal={activeDeal} onDelete={() => {}} /> : null}</DragOverlay>
      </DndContext>

      <AddProjectDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        pipelineId={pipelineId}
        firstStageId={stages[0]?.id || ""}
      />
    </div>
  );
}

function AddProjectDialog({
  open, onOpenChange, pipelineId, firstStageId,
}: { open: boolean; onOpenChange: (o: boolean) => void; pipelineId: string; firstStageId: string }) {
  const { data: clientes = [] } = useClientesAtivosLite();
  const create = useCreateProjectDeal();
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [clienteId, setClienteId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [valor, setValor] = useState("");
  const [responsavel, setResponsavel] = useState("");

  const submit = async () => {
    try {
      if (mode === "existing") {
        const c: any = clientes.find((x: any) => x.id === clienteId);
        if (!c) return;
        await create.mutateAsync({
          pipeline_id: pipelineId,
          stage_id: firstStageId,
          titulo: c.projeto || c.empresa || "Projeto",
          valor: Number(c.valor_total) || 0,
          cliente_ativo_id: c.id,
          responsavel_label: responsavel || null,
        });
      } else {
        if (!titulo.trim()) return;
        await create.mutateAsync({
          pipeline_id: pipelineId,
          stage_id: firstStageId,
          titulo: titulo.trim(),
          valor: Number(valor) || 0,
          responsavel_label: responsavel || null,
        });
      }
      toast({ title: "Projeto adicionado" });
      setClienteId(""); setTitulo(""); setValor(""); setResponsavel("");
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Adicionar projeto ao kanban</DialogTitle></DialogHeader>
        <div className="flex gap-1 p-0.5 bg-white/5 rounded-lg">
          {(["existing", "new"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 text-xs py-1.5 rounded ${mode === m ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}
            >
              {m === "existing" ? "Cliente existente" : "Novo manual"}
            </button>
          ))}
        </div>
        {mode === "existing" ? (
          <div className="space-y-2">
            <Label className="text-xs">Cliente ativo</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Escolha um cliente" /></SelectTrigger>
              <SelectContent className="bg-background border-white/10 max-h-72">
                {clientes.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.empresa} {c.projeto ? `· ${c.projeto}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Título</Label>
              <Input value={titulo} onChange={e => setTitulo(e.target.value)} className="bg-white/5 border-white/10" />
            </div>
            <div>
              <Label className="text-xs">Valor (R$)</Label>
              <Input type="number" value={valor} onChange={e => setValor(e.target.value)} className="bg-white/5 border-white/10" />
            </div>
          </div>
        )}
        <div>
          <Label className="text-xs">Responsável (opcional)</Label>
          <Input value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Ex: Felipe" className="bg-white/5 border-white/10" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={submit} disabled={create.isPending || (mode === "existing" ? !clienteId : !titulo.trim())}>
            Adicionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
