import { useLeads, getStatusDisplay, LeadStatus } from "@/hooks/useLeads";
import { usePipedrive, PipedriveDeal } from "@/hooks/usePipedrive";
import { TrendingUp, Users, Target, AlertTriangle, DollarSign, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

const stageOrder: LeadStatus[] = ["lead", "contatado", "reuniao_agendada", "reuniao_realizada", "proposta", "fechado"];

const benchmarks: Record<LeadStatus, number | null> = {
  lead: null,
  contatado: 23,
  reuniao_agendada: 50,
  reuniao_realizada: 30,
  proposta: 30,
  fechado: 10,
  perdido: null,
};

const stageGradients: Record<LeadStatus, string> = {
  lead: "from-[hsl(230,80%,65%)] to-[hsl(250,70%,55%)]",
  contatado: "from-[hsl(260,70%,60%)] to-[hsl(280,65%,50%)]",
  reuniao_agendada: "from-[hsl(290,60%,55%)] to-[hsl(320,60%,50%)]",
  reuniao_realizada: "from-[hsl(330,65%,55%)] to-[hsl(350,60%,50%)]",
  proposta: "from-[hsl(20,80%,55%)] to-[hsl(35,75%,50%)]",
  fechado: "from-[hsl(150,60%,40%)] to-[hsl(160,55%,35%)]",
  perdido: "from-[hsl(0,60%,50%)] to-[hsl(0,50%,40%)]",
};

const stageGlows: Record<LeadStatus, string> = {
  lead: "shadow-[0_0_24px_hsl(240,80%,65%,0.3)]",
  contatado: "shadow-[0_0_24px_hsl(270,70%,55%,0.3)]",
  reuniao_agendada: "shadow-[0_0_24px_hsl(310,60%,50%,0.3)]",
  reuniao_realizada: "shadow-[0_0_24px_hsl(340,60%,50%,0.3)]",
  proposta: "shadow-[0_0_24px_hsl(28,75%,50%,0.3)]",
  fechado: "shadow-[0_0_24px_hsl(155,55%,40%,0.3)]",
  perdido: "shadow-[0_0_24px_hsl(0,60%,50%,0.3)]",
};

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function PerformanceIndicator({ actual, benchmark }: { actual: number; benchmark: number }) {
  const ratio = actual / benchmark;
  let label: string, colorClass: string, glowStyle: string;

  if (ratio >= 1) {
    label = "✦ Excelente";
    colorClass = "text-emerald-400";
    glowStyle = "0 0 12px hsl(155,60%,45%,0.4)";
  } else if (ratio >= 0.7) {
    label = "◈ Em Desenvolvimento";
    colorClass = "text-amber-400";
    glowStyle = "0 0 12px hsl(40,80%,50%,0.3)";
  } else {
    label = "◇ Oportunidade de Melhoria";
    colorClass = "text-rose-400";
    glowStyle = "0 0 12px hsl(350,70%,55%,0.3)";
  }

  const progressPct = Math.min((actual / benchmark) * 100, 100);

  return (
    <div className="flex flex-col items-end gap-1.5 min-w-[180px]">
      <span
        className={`text-[11px] font-semibold tracking-wide ${colorClass}`}
        style={{ textShadow: glowStyle }}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold text-foreground tabular-nums">{actual.toFixed(1)}%</span>
        <span className="text-[10px] text-muted-foreground">vs {benchmark}%</span>
      </div>
      <div className="w-full h-1 rounded-full bg-muted/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            ratio >= 1 ? "bg-emerald-500" : ratio >= 0.7 ? "bg-amber-500" : "bg-rose-500"
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}

export default function Funil() {
  const { data: leads = [], isLoading } = useLeads();
  const { deals: pipedriveDeals, manualSync, isSyncing: pipedriveSyncing, minutesAgo } = usePipedrive();

  // Merge: use Pipedrive deals as primary source, fallback to DB leads
  const mergedLeads = pipedriveDeals.length > 0
    ? pipedriveDeals.map(d => ({
        ...d,
        status: d.status as LeadStatus,
        valor_estimado: d.valor_estimado || 0,
      }))
    : leads.map(l => ({ ...l, days_in_stage: 0, pipedrive_stage: '', expected_close_date: null as string | null }));

  const stageCounts = stageOrder.map((status) => ({
    status,
    name: getStatusDisplay(status),
    count: mergedLeads.filter((l) => l.status === status).length,
  }));

  const totalLeads = mergedLeads.filter((l) => l.status !== "perdido").length;
  const closedCount = stageCounts.find((s) => s.status === "fechado")?.count || 0;
  const overallConversion = totalLeads > 0 ? (closedCount / totalLeads) * 100 : 0;

  const valorNegociacao = mergedLeads
    .filter((l) => ["proposta", "reuniao_realizada"].includes(l.status))
    .reduce((sum, l) => sum + (l.valor_estimado || 0), 0);

  // Calculate actual conversions
  const conversions = stageOrder.map((status, i) => {
    if (i === 0) return { status, actual: null, benchmark: null };
    const prevCount = stageCounts[i - 1].count;
    const curCount = stageCounts[i].count;
    const actual = prevCount > 0 ? (curCount / prevCount) * 100 : 0;
    return { status, actual, benchmark: benchmarks[status] };
  });

  // Find biggest bottleneck
  let biggestDrop = { stage: "", dropPct: 0 };
  for (let i = 1; i < stageOrder.length; i++) {
    const prev = stageCounts[i - 1].count;
    const cur = stageCounts[i].count;
    const drop = prev > 0 ? ((prev - cur) / prev) * 100 : 0;
    if (drop > biggestDrop.dropPct) {
      biggestDrop = { stage: getStatusDisplay(stageOrder[i]), dropPct: drop };
    }
  }

  // Calculate leads needed for 1 close
  const leadsForClose = overallConversion > 0 ? Math.ceil(100 / overallConversion) : 0;

  const maxWidth = 100;
  const minWidth = 32;
  const step = (maxWidth - minWidth) / Math.max(stageOrder.length - 1, 1);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/10 animate-pulse" />
          ))}
        </div>
        <div className="space-y-3 mt-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/10 animate-pulse mx-auto" style={{ width: `${100 - i * 12}%` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground" style={{ lineHeight: "1.1" }}>
            Funil de Vendas
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">{mergedLeads.length} leads no pipeline {pipedriveDeals.length > 0 ? "(Pipedrive)" : ""}</p>
        </div>
        <button
          onClick={manualSync}
          disabled={pipedriveSyncing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-all duration-300 disabled:opacity-50 active:scale-[0.96]"
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            color: 'hsl(45, 100%, 55%)',
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${pipedriveSyncing ? "animate-spin" : ""}`} />
          {pipedriveSyncing ? "Sincronizando..." : `Sync Pipedrive${minutesAgo !== null ? ` (${minutesAgo}min)` : ""}`}
        </button>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: Users,
            label: "Total no Pipeline",
            value: String(totalLeads),
            accent: "hsl(230,80%,65%)",
          },
          {
            icon: Target,
            label: "Conversão Geral",
            value: `${overallConversion.toFixed(1)}%`,
            accent: "hsl(155,60%,45%)",
          },
          {
            icon: DollarSign,
            label: "Em Negociação",
            value: formatCurrency(valorNegociacao),
            accent: "hsl(270,65%,55%)",
          },
          {
            icon: AlertTriangle,
            label: "Maior Gargalo",
            value: biggestDrop.stage || "—",
            subtitle: biggestDrop.dropPct > 0 ? `${biggestDrop.dropPct.toFixed(0)}% de perda` : undefined,
            accent: "hsl(40,80%,50%)",
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-xl border border-border/40 bg-card/60 backdrop-blur-md p-5 overflow-hidden"
            style={{ boxShadow: `0 0 20px ${card.accent}15` }}
          >
            <div
              className="absolute top-0 left-0 w-full h-[2px]"
              style={{ background: `linear-gradient(90deg, transparent, ${card.accent}, transparent)` }}
            />
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${card.accent}18`, border: `1px solid ${card.accent}25` }}
              >
                <card.icon className="w-4 h-4" style={{ color: card.accent }} />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground tabular-nums">{card.value}</p>
            {(card as any).subtitle && (
              <p className="text-[10px] text-amber-400/80 mt-0.5 font-medium">{(card as any).subtitle}</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Funnel */}
      <div className="space-y-2.5">
        {stageCounts.map((stage, i) => {
          const widthPct = maxWidth - i * step;
          const conv = conversions[i];
          const isEntry = i === 0;

          return (
            <motion.div
              key={stage.status}
              initial={{ opacity: 0, x: -40, filter: "blur(6px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.2 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-4"
            >
              {/* Stage bar */}
              <div className="flex-1 flex justify-center">
                <div
                  className={`relative rounded-xl overflow-hidden transition-all duration-500 ${stageGlows[stage.status]}`}
                  style={{ width: `${widthPct}%`, minHeight: "64px" }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${stageGradients[stage.status]} opacity-85`} />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent" />
                  <div className="absolute inset-0 border border-white/[0.08] rounded-xl" />
                  <div className="relative z-10 flex items-center justify-between h-full min-h-[64px] px-5">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-white tracking-wide">{stage.name}</span>
                      <span className="text-sm font-bold bg-black/25 backdrop-blur-sm rounded-full px-3 py-0.5 text-white/90 tabular-nums">
                        {stage.count}
                      </span>
                    </div>
                    {!isEntry && (
                      <span className="text-[10px] font-medium text-white/50">
                        {conv.actual !== null ? `${conv.actual.toFixed(1)}% do anterior` : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Performance indicator */}
              <div className="w-[200px] flex-shrink-0">
                {!isEntry && conv.actual !== null && conv.benchmark !== null ? (
                  <PerformanceIndicator actual={conv.actual} benchmark={conv.benchmark} />
                ) : (
                  <div className="text-[11px] text-muted-foreground/50 text-right">Ponto de entrada</div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom Insight */}
      {leads.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-xl border border-border/40 bg-card/60 backdrop-blur-md p-6 overflow-hidden"
          style={{ boxShadow: "0 0 24px hsl(230,60%,50%,0.08)" }}
        >
          <div
            className="absolute top-0 left-0 w-full h-[2px]"
            style={{ background: "linear-gradient(90deg, transparent, hsl(230,80%,65%), hsl(270,65%,55%), transparent)" }}
          />
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-1.5">Análise Automática</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {biggestDrop.stage ? (
                  <>
                    Seu maior gargalo está em <span className="text-amber-400 font-semibold">{biggestDrop.stage}</span>.{" "}
                    Com sua taxa atual de <span className="text-foreground font-semibold">{overallConversion.toFixed(1)}%</span>,
                    você precisa de <span className="text-foreground font-semibold">{leadsForClose || "∞"} leads</span>{" "}
                    para fechar 1 contrato de <span className="text-foreground font-semibold">R$20.000</span>.
                  </>
                ) : (
                  "Adicione leads para visualizar insights do funil."
                )}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Pipedrive Deals Table */}
      {pipedriveDeals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-xl border border-border/40 bg-card/60 backdrop-blur-md p-6 overflow-hidden"
        >
          <div
            className="absolute top-0 left-0 w-full h-[2px]"
            style={{ background: "linear-gradient(90deg, transparent, hsl(45,100%,55%), transparent)" }}
          />
          <h2 className="text-sm font-bold text-foreground mb-4">Deals do Pipedrive</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Empresa</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Contato</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Valor</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Etapa</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Previsão</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Responsável</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Dias na Etapa</th>
                </tr>
              </thead>
              <tbody>
                {pipedriveDeals
                  .filter(d => d.status !== 'perdido')
                  .sort((a, b) => b.valor_estimado - a.valor_estimado)
                  .slice(0, 30)
                  .map((deal) => {
                    const isStale = deal.days_in_stage >= 7;
                    return (
                      <tr
                        key={deal.pipedrive_id}
                        className={`border-b border-border/10 transition-colors ${isStale ? "bg-amber-500/5" : "hover:bg-muted/10"}`}
                      >
                        <td className="py-2.5 px-2 font-medium text-foreground">{deal.empresa}</td>
                        <td className="py-2.5 px-2 text-muted-foreground">{deal.contato || "—"}</td>
                        <td className="py-2.5 px-2 text-foreground tabular-nums font-medium">{formatCurrency(deal.valor_estimado)}</td>
                        <td className="py-2.5 px-2 text-muted-foreground text-[10px]">{deal.pipedrive_stage}</td>
                        <td className="py-2.5 px-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            deal.status === 'fechado' ? 'bg-emerald-500/15 text-emerald-400' :
                            deal.status === 'proposta' ? 'bg-purple-500/15 text-purple-400' :
                            deal.status === 'reuniao_realizada' ? 'bg-orange-500/15 text-orange-400' :
                            deal.status === 'reuniao_agendada' ? 'bg-yellow-500/15 text-yellow-400' :
                            deal.status === 'contatado' ? 'bg-blue-500/15 text-blue-400' :
                            'bg-muted/20 text-muted-foreground'
                          }`}>
                            {getStatusDisplay(deal.status as any)}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-muted-foreground tabular-nums">
                          {deal.expected_close_date || "—"}
                        </td>
                        <td className="py-2.5 px-2 text-muted-foreground">{deal.responsavel_nome || "—"}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums">
                          {isStale ? (
                            <span className="text-amber-400 font-semibold flex items-center justify-end gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {deal.days_in_stage}d — Sem atualização
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{deal.days_in_stage}d</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
