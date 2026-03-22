import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientes, useChecklist } from "@/hooks/useCeoData";
import { differenceInDays, parseISO } from "date-fns";

const AMBER = "hsl(45, 100%, 55%)";

const STAGES = ["Briefing", "Modelagem", "Renders", "Revisão", "Entrega"];
const STAGE_COLORS = ["#6366F1", "#8B5CF6", "#F59E0B", "#EF4444", "#10B981"];

export default function CeoProcessos() {
  const { data: clientesData, isLoading: l1 } = useClientes();
  const { data: checklistData, isLoading: l2 } = useChecklist();

  const clientes = clientesData || [];
  const chk = checklistData || [];
  const now = new Date();

  const projetos = useMemo(() => {
    return clientes.filter(c => c.status === "ativo").map(c => {
      const items = chk.filter(ch => ch.cliente_id === c.id);
      const concluidas = items.filter(ch => ch.concluida).length;
      const total = items.length || 1;
      const pctChecklist = (concluidas / total) * 100;
      const daysToDelivery = c.data_previsao ? differenceInDays(parseISO(c.data_previsao), now) : null;
      const atrasado = daysToDelivery !== null && daysToDelivery < 0;

      // Determine stage based on progress
      const progress = c.progresso || 0;
      const stageIdx = progress < 20 ? 0 : progress < 40 ? 1 : progress < 60 ? 2 : progress < 80 ? 3 : 4;

      return { ...c, pctChecklist, daysToDelivery, atrasado, stageIdx, stageName: STAGES[stageIdx], checklistItems: items };
    });
  }, [clientes, chk]);

  const capacity = 5;
  const activeCount = projetos.length;
  const capacityPct = (activeCount / capacity) * 100;

  // Group by stage for kanban
  const byStage = STAGES.map((stage, i) => ({
    name: stage,
    color: STAGE_COLORS[i],
    projects: projetos.filter(p => p.stageIdx === i),
  }));

  // Alerts
  const alerts = projetos.filter(p => p.atrasado || (p.daysToDelivery !== null && p.daysToDelivery <= 3));

  if (l1 || l2) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1", color: AMBER }}>Processos & Operacional</h1>

      {/* Capacity */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <p className="text-xs text-muted-foreground">Projetos Ativos</p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: AMBER }}>{activeCount}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-muted-foreground">Capacidade</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">{capacity}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className={`text-sm font-bold mt-1 ${capacityPct < 60 ? "text-green-400" : capacityPct < 90 ? "text-amber-400" : "text-red-400"}`}>
            {capacityPct < 60 ? "Disponível" : capacityPct < 90 ? "Ocupado" : "Sobrecarregado"}
          </p>
          <div className="w-full h-2 rounded-full bg-muted/50 mt-2 overflow-hidden">
            <div className="h-full rounded-full" style={{
              width: `${Math.min(100, capacityPct)}%`,
              background: capacityPct < 60 ? "hsl(160,100%,39%)" : capacityPct < 90 ? AMBER : "hsl(0,70%,50%)",
            }} />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="glass-card p-4 border-amber-500/20 space-y-1">
          <h3 className="text-xs font-semibold mb-2" style={{ color: AMBER }}>⚠️ Alertas de Gargalo</h3>
          {alerts.map(a => (
            <p key={a.id} className="text-xs text-muted-foreground">
              {a.atrasado ? "🔴" : "🟡"} {a.empresa} — {a.projeto}:
              {a.atrasado ? ` atrasado ${Math.abs(a.daysToDelivery!)} dia(s)` : ` entrega em ${a.daysToDelivery} dia(s)`}
            </p>
          ))}
        </div>
      )}

      {/* Kanban */}
      <div className="grid grid-cols-5 gap-3">
        {byStage.map(stage => (
          <div key={stage.name}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
              <span className="text-xs font-semibold text-muted-foreground">{stage.name}</span>
              <span className="text-[10px] text-muted-foreground">({stage.projects.length})</span>
            </div>
            <div className="space-y-2">
              {stage.projects.map(p => (
                <div key={p.id} className="glass-card p-3 text-xs">
                  <p className="font-medium text-foreground truncate">{p.empresa}</p>
                  <p className="text-muted-foreground truncate">{p.projeto}</p>
                  <div className="flex justify-between mt-2">
                    <span className="text-muted-foreground">{p.progresso}%</span>
                    {p.daysToDelivery !== null && (
                      <span className={p.atrasado ? "text-red-400" : p.daysToDelivery <= 3 ? "text-amber-400" : "text-muted-foreground"}>
                        {p.atrasado ? `${Math.abs(p.daysToDelivery)}d atraso` : `${p.daysToDelivery}d`}
                      </span>
                    )}
                  </div>
                  <div className="w-full h-1 rounded-full bg-muted/50 mt-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p.progresso}%`, background: stage.color }} />
                  </div>
                </div>
              ))}
              {stage.projects.length === 0 && (
                <div className="p-3 rounded-xl bg-muted/20 text-center text-[10px] text-muted-foreground">Vazio</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
