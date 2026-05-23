import { useMemo, useState } from "react";
import { Lock, AlertTriangle, Clock, Activity, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCrmPipelines, useCrmStages, useCrmDeals } from "@/hooks/useCrm";
import { PipelineSwitcher } from "@/components/crm/PipelineSwitcher";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export function VisaoGestor() {
  const { isFundador } = useAuth();
  if (!isFundador) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <Lock className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Acesso restrito</h3>
        <p className="text-sm text-muted-foreground max-w-sm">Esta área é exclusiva para o CEO/Fundador. A visão do gestor consolida saúde do pipeline, tarefas em atraso e cadência por responsável.</p>
      </div>
    );
  }
  return <Painel />;
}

function Painel() {
  const { data: pipelines = [] } = useCrmPipelines();
  const [pipelineId, setPipelineId] = useState<string>("");
  const activeId = pipelineId || pipelines[0]?.id || "";
  const { data: stages = [] } = useCrmStages(activeId);
  const { data: deals = [] } = useCrmDeals(activeId);
  const navigate = useNavigate();

  const { data: activities = [] } = useQuery({
    queryKey: ["crm_activities_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_activities")
        .select("id,deal_id,owner_label,owner_user_id,scheduled_at,concluida,concluida_em,titulo,tipo")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const dealsByStage = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of stages) map[s.id] = 0;
    for (const d of deals) if (d.status === "open") map[d.stage_id] = (map[d.stage_id] || 0) + 1;
    return map;
  }, [deals, stages]);
  const maxStage = Math.max(1, ...Object.values(dealsByStage));

  const overdueByOwner = useMemo(() => {
    const now = Date.now();
    const buckets: Record<string, number> = {};
    for (const a of activities as any[]) {
      if (a.concluida) continue;
      if (!a.scheduled_at) continue;
      if (new Date(a.scheduled_at).getTime() >= now) continue;
      const k = a.owner_label || "Sem responsável";
      buckets[k] = (buckets[k] || 0) + 1;
    }
    return Object.entries(buckets).sort((a, b) => b[1] - a[1]);
  }, [activities]);

  const cadenceRows = useMemo(() => {
    const now = Date.now();
    const lastByDeal: Record<string, number> = {};
    const nextByDeal: Record<string, { at: number; titulo: string } | null> = {};
    for (const a of activities as any[]) {
      if (!a.deal_id) continue;
      if (a.concluida && a.concluida_em) {
        const t = new Date(a.concluida_em).getTime();
        lastByDeal[a.deal_id] = Math.max(lastByDeal[a.deal_id] || 0, t);
      }
      if (!a.concluida && a.scheduled_at) {
        const t = new Date(a.scheduled_at).getTime();
        if (t >= now) {
          const cur = nextByDeal[a.deal_id];
          if (!cur || t < cur.at) nextByDeal[a.deal_id] = { at: t, titulo: a.titulo };
        }
      }
    }
    return deals
      .filter(d => d.status === "open")
      .map(d => {
        const last = lastByDeal[d.id] || new Date(d.stage_entered_at).getTime();
        const diasParado = Math.floor((now - last) / 86400000);
        const next = nextByDeal[d.id] || null;
        return { deal: d, last, diasParado, next };
      })
      .sort((a, b) => b.diasParado - a.diasParado);
  }, [deals, activities]);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <PipelineSwitcher
          pipelines={pipelines}
          currentId={activeId}
          onSelect={setPipelineId}
          onEdit={() => {}}
          onCreate={() => {}}
        />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Visão do Gestor</h2>
          <p className="text-[11px] text-muted-foreground">Saúde do pipeline em segundos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Volume por etapa */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Volume por Etapa</h3>
          </div>
          <div className="space-y-2">
            {stages.map(s => {
              const count = dealsByStage[s.id] || 0;
              return (
                <div key={s.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.cor || "#3b82f6" }} />
                      {s.nome}
                    </span>
                    <span className="text-muted-foreground tabular-nums">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full" style={{ width: `${(count / maxStage) * 100}%`, background: s.cor || "#3b82f6" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tarefas em atraso */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">Tarefas em Atraso por Responsável</h3>
          </div>
          {overdueByOwner.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">🎉 Sem atrasos no momento.</p>
          ) : (
            <div className="space-y-2">
              {overdueByOwner.map(([owner, count]) => (
                <div key={owner} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                  <span className="text-sm text-foreground">{owner}</span>
                  <span className="text-xs font-semibold text-amber-300 tabular-nums bg-amber-500/10 px-2 py-0.5 rounded-full">{count} atrasada{count > 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rastreador de cadência */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Rastreador de Cadência</h3>
          <span className="text-[11px] text-muted-foreground ml-auto">Ordenado por dias parado</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-white/[0.02]">
                <th className="text-left px-4 py-2 font-medium">Deal</th>
                <th className="text-left px-3 py-2 font-medium">Responsável</th>
                <th className="text-center px-3 py-2 font-medium">Dias parado</th>
                <th className="text-left px-3 py-2 font-medium">Próxima ação</th>
              </tr>
            </thead>
            <tbody>
              {cadenceRows.length === 0 && (
                <tr><td colSpan={4} className="text-center text-xs text-muted-foreground py-8">Sem deals abertos.</td></tr>
              )}
              {cadenceRows.slice(0, 50).map(({ deal, diasParado, next }) => (
                <tr
                  key={deal.id}
                  onClick={() => navigate(`/crm/deal/${deal.id}`)}
                  className="border-t border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-2.5">
                    <div className="text-foreground line-clamp-1">{deal.titulo}</div>
                    {deal.organization?.nome && (
                      <div className="text-[10px] text-muted-foreground line-clamp-1">{deal.organization.nome}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{deal.owner_label || "—"}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full ${
                      diasParado >= 14 ? "bg-red-500/15 text-red-300" :
                      diasParado >= 7 ? "bg-amber-500/15 text-amber-300" :
                      "bg-white/5 text-muted-foreground"
                    }`}>
                      {diasParado}d
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {next ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(next.at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · <span className="text-foreground">{next.titulo}</span>
                      </span>
                    ) : (
                      <span className="text-red-300">⚠ Sem próxima ação</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
