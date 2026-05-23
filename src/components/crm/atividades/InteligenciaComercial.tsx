import { useMemo, useState } from "react";
import { useCrmPipelines, useCrmDeals, CrmDeal } from "@/hooks/useCrm";
import { PipelineSwitcher } from "@/components/crm/PipelineSwitcher";
import { TemperaturaBadge } from "./TemperaturaBadge";
import { QualificacaoModal } from "./QualificacaoModal";
import { Flame, Snowflake, Thermometer, TrendingDown, Pencil } from "lucide-react";

export function InteligenciaComercial() {
  const { data: pipelines = [] } = useCrmPipelines();
  const [pipelineId, setPipelineId] = useState<string>("");
  const activeId = pipelineId || pipelines[0]?.id || "";
  const { data: deals = [], isLoading } = useCrmDeals(activeId);
  const [editing, setEditing] = useState<CrmDeal | null>(null);

  const tempCounts = useMemo(() => {
    const c = { quente: 0, morno: 0, frio: 0, sem: 0 };
    deals.filter(d => d.status === "open").forEach(d => {
      if (d.temperatura === "quente") c.quente++;
      else if (d.temperatura === "morno") c.morno++;
      else if (d.temperatura === "frio") c.frio++;
      else c.sem++;
    });
    return c;
  }, [deals]);

  const lossReasons = useMemo(() => {
    const since = Date.now() - 90 * 86400_000;
    const buckets: Record<string, number> = {};
    deals
      .filter(d => d.status === "lost" && d.data_fechamento && new Date(d.data_fechamento).getTime() >= since)
      .forEach(d => {
        const key = (d.motivo_perda || "Sem motivo").split(" — ")[0].split(":")[0].trim() || "Sem motivo";
        buckets[key] = (buckets[key] || 0) + 1;
      });
    const total = Object.values(buckets).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(buckets)
      .sort((a, b) => b[1] - a[1])
      .map(([motivo, count]) => ({ motivo, count, pct: Math.round(count / total * 100) }));
  }, [deals]);

  const avgScoreByOwner = useMemo(() => {
    const groups: Record<string, { sum: number; n: number }> = {};
    deals.filter(d => d.status === "open").forEach(d => {
      const score = (d.score_fit || 0) + (d.score_budget || 0) + (d.score_urgencia || 0);
      if (!score) return;
      const k = d.owner_label || "Sem responsável";
      groups[k] = groups[k] || { sum: 0, n: 0 };
      groups[k].sum += score; groups[k].n += 1;
    });
    return Object.entries(groups)
      .map(([owner, { sum, n }]) => ({ owner, avg: n ? sum / n : 0, n }))
      .sort((a, b) => b.avg - a.avg);
  }, [deals]);

  const openDeals = deals.filter(d => d.status === "open");

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
          <h2 className="text-lg font-semibold text-foreground">Inteligência Comercial</h2>
          <p className="text-[11px] text-muted-foreground">Qualifique, monitore temperatura e identifique padrões de perda</p>
        </div>
      </div>

      {/* Temperature stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <TempCard icon={<Flame className="w-4 h-4" />} label="Quente" value={tempCounts.quente} cls="text-red-300 bg-red-500/10" />
        <TempCard icon={<Thermometer className="w-4 h-4" />} label="Morno" value={tempCounts.morno} cls="text-amber-300 bg-amber-500/10" />
        <TempCard icon={<Snowflake className="w-4 h-4" />} label="Frio" value={tempCounts.frio} cls="text-sky-300 bg-sky-500/10" />
        <TempCard icon={<span className="text-xs">?</span>} label="Sem qualificação" value={tempCounts.sem} cls="text-muted-foreground bg-white/5" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Loss reasons */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">Motivos de Perda (90 dias)</h3>
          </div>
          {lossReasons.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Nenhum deal perdido nos últimos 90 dias.</p>
          ) : (
            <div className="space-y-2">
              {lossReasons.map(r => (
                <div key={r.motivo}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground">{r.motivo}</span>
                    <span className="text-muted-foreground tabular-nums">{r.count} · {r.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-red-500" style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Avg score by owner */}
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Score Médio por Responsável</h3>
          {avgScoreByOwner.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Sem qualificações registradas.</p>
          ) : (
            <div className="space-y-2">
              {avgScoreByOwner.map(o => (
                <div key={o.owner}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground">{o.owner}</span>
                    <span className="text-muted-foreground tabular-nums">{o.avg.toFixed(1)}/30 · {o.n} deals</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-emerald-500" style={{ width: `${(o.avg / 30) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Open deals list */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Deals Abertos · Qualificação</h3>
          <span className="text-[11px] text-muted-foreground">{openDeals.length} deals</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-white/[0.02]">
                <th className="text-left px-4 py-2 font-medium">Deal</th>
                <th className="text-left px-3 py-2 font-medium">Responsável</th>
                <th className="text-center px-3 py-2 font-medium">Temperatura</th>
                <th className="text-center px-3 py-2 font-medium">Fit</th>
                <th className="text-center px-3 py-2 font-medium">Budget</th>
                <th className="text-center px-3 py-2 font-medium">Urgência</th>
                <th className="text-center px-3 py-2 font-medium">Total</th>
                <th className="text-right px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="text-center text-xs text-muted-foreground py-8">Carregando…</td></tr>
              )}
              {!isLoading && openDeals.length === 0 && (
                <tr><td colSpan={8} className="text-center text-xs text-muted-foreground py-8">Nenhum deal aberto.</td></tr>
              )}
              {openDeals.map(d => {
                const total = (d.score_fit || 0) + (d.score_budget || 0) + (d.score_urgencia || 0);
                return (
                  <tr key={d.id} className="border-t border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="text-foreground line-clamp-1">{d.titulo}</div>
                      {d.organization?.nome && (
                        <div className="text-[10px] text-muted-foreground line-clamp-1">{d.organization.nome}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{d.owner_label || "—"}</td>
                    <td className="px-3 py-2.5 text-center"><TemperaturaBadge temperatura={d.temperatura as any} /></td>
                    <td className="px-3 py-2.5 text-center text-xs tabular-nums">{d.score_fit ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center text-xs tabular-nums">{d.score_budget ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center text-xs tabular-nums">{d.score_urgencia ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center text-xs font-semibold tabular-nums text-primary">{total || "—"}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => setEditing(d)} className="text-muted-foreground hover:text-primary p-1.5 rounded-md hover:bg-white/5 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <QualificacaoModal deal={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function TempCard({ icon, label, value, cls }: { icon: React.ReactNode; label: string; value: number; cls: string }) {
  return (
    <div className="glass-card rounded-xl p-3.5 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cls}`}>{icon}</div>
      <div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-base font-semibold text-foreground tabular-nums">{value}</div>
      </div>
    </div>
  );
}
