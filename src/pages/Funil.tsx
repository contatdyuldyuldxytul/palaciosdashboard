import { useState, useMemo } from "react";
import { usePipedrive, PipedriveDeal } from "@/hooks/usePipedrive";
import { useFunnelAnalysis } from "@/hooks/useFunnelAnalysis";
import { TrendingUp, Users, Target, RefreshCw, Pause, Recycle, DoorOpen, Activity, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

const FUNNEL_STAGES = [
  { key: "Entrada de Leads", label: "Entrada de Leads", merge: undefined as string[] | undefined },
  { key: "Tentando Contato", label: "Tentando Contato", merge: ["Tentando Contato #A", "Tentando Contato #B"] },
  { key: "Contato Realizado", label: "Contato Realizado", merge: ["Contato Realizado #A", "Contato Realizado #B"] },
  { key: "Contato com o Decisor", label: "Contato c/ Decisor" },
  { key: "Demo Agendada", label: "Demo Agendada", isFinal: true },
];

const BENCHMARKS = [null, 85, 70, 40, 50];

const SIDE_CARDS = [
  { key: "Hold", stages: ["Hold"], label: "Hold", sublabel: "Empreendimentos futuros", icon: Pause, clickable: true },
  { key: "Recicláveis", stages: ["Recicláveis"], label: "Recicláveis", sublabel: "Prospectar no futuro", icon: Recycle, clickable: false },
  { key: "Porta Aberta", stages: ["Porta Aberta Decisores"], label: "Porta Aberta", sublabel: "Sem momento agora", icon: DoorOpen, clickable: false },
];

const gradients = [
  "from-[hsl(230,80%,65%)] to-[hsl(250,70%,55%)]",
  "from-[hsl(260,70%,60%)] to-[hsl(280,65%,50%)]",
  "from-[hsl(290,60%,55%)] to-[hsl(320,60%,50%)]",
  "from-[hsl(330,65%,55%)] to-[hsl(350,60%,50%)]",
  "from-[hsl(150,60%,40%)] to-[hsl(160,55%,35%)]",
];

function cnt(deals: PipedriveDeal[], names: string[]) {
  return deals.filter(d => d.status === "open" && names.includes(d.pipedrive_stage)).length;
}
function dealsIn(deals: PipedriveDeal[], names: string[]) {
  return deals.filter(d => d.status === "open" && names.includes(d.pipedrive_stage));
}

export default function Funil() {
  const { deals, manualSync, isSyncing, minutesAgo } = usePipedrive();
  const [holdOpen, setHoldOpen] = useState(false);

  const funnel = FUNNEL_STAGES.map(s => ({
    ...s,
    count: cnt(deals, s.merge || [s.key]),
  }));

  const side = SIDE_CARDS.map(c => ({
    ...c,
    count: cnt(deals, c.stages),
    deals: dealsIn(deals, c.stages),
  }));

  const holdDeals = side.find(s => s.key === "Hold")?.deals || [];
  const totalFunnel = funnel.reduce((s, f) => s + f.count, 0);
  const demoCount = funnel[4]?.count || 0;
  const demoGoal = 15;
  const demoPct = Math.min((demoCount / demoGoal) * 100, 100);

  const dayOfMonth = new Date().getDate();
  const monthProgress = dayOfMonth / 30;
  const demoRatio = demoCount / demoGoal;
  let statusLabel: string, statusColor: string;
  if (demoRatio >= monthProgress * 0.9) {
    statusLabel = "✦ Excelente";
    statusColor = "hsl(155,60%,45%)";
  } else if (demoRatio >= monthProgress * 0.7) {
    statusLabel = "◈ Saudável";
    statusColor = "hsl(220,70%,55%)";
  } else {
    statusLabel = "◇ Deficiente";
    statusColor = "hsl(0,70%,55%)";
  }

  const cumulative = [...funnel].map(f => f.count);
  for (let i = funnel.length - 2; i >= 0; i--) {
    cumulative[i] = funnel[i].count + cumulative[i + 1];
  }

  const convs = funnel.map((s, i) => {
    if (i === 0) return null;
    const totalPrev = cumulative[i - 1];
    const totalCur = cumulative[i];
    const pct = totalPrev > 0 ? (totalCur / totalPrev) * 100 : 0;
    const bench = BENCHMARKS[i];
    return { from: funnel[i - 1].label, to: s.label, pct, bench, totalPrev, totalCur };
  }).filter(Boolean) as { from: string; to: string; pct: number; bench: number | null; totalPrev: number; totalCur: number }[];

  // Prepare analysis data
  const analysisData = useMemo(() => {
    if (deals.length === 0) return null;
    return {
      entrada: funnel[0].count,
      tentando: funnel[1].count,
      contatoRealizado: funnel[2].count,
      decisor: funnel[3].count,
      demo: funnel[4].count,
      conv1: convs[0]?.pct.toFixed(1) || "0",
      conv2: convs[1]?.pct.toFixed(1) || "0",
      conv3: convs[2]?.pct.toFixed(1) || "0",
      conv4: convs[3]?.pct.toFixed(1) || "0",
      hold: side.find(s => s.key === "Hold")?.count || 0,
      reciclaveis: side.find(s => s.key === "Recicláveis")?.count || 0,
      portaAberta: side.find(s => s.key === "Porta Aberta")?.count || 0,
      demoGoal,
      dayOfMonth,
    };
  }, [deals.length, funnel[0].count, funnel[1].count, funnel[2].count, funnel[3].count, funnel[4].count]);

  const { analysis, loading: analysisLoading, updatedAt, refresh: refreshAnalysis } = useFunnelAnalysis(analysisData);

  const maxW = 100;
  const minW = 40;
  const stp = (maxW - minW) / Math.max(funnel.length - 1, 1);

  const loading = deals.length === 0 && isSyncing;

  if (loading) {
    return (
      <div className="p-5 space-y-4 max-w-6xl mx-auto">
        <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted/10 animate-pulse" />)}</div>
        <div className="space-y-2 mt-6">{[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted/10 animate-pulse mx-auto" style={{ width: `${100 - i * 12}%` }} />)}</div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Funil de Pré-Vendas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">ALINE'S PIPELINE · {deals.filter(d => d.status === "open").length} ativos</p>
        </div>
        <button onClick={manualSync} disabled={isSyncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-50 active:scale-[0.96]"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "hsl(45,100%,55%)" }}>
          <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Sync..." : `Sync${minutesAgo !== null ? ` (${minutesAgo}m)` : ""}`}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Pipeline", value: String(totalFunnel), accent: "hsl(230,80%,65%)" },
          { icon: Target, label: "Demos", value: String(demoCount), accent: "hsl(155,60%,45%)" },
        ].map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="relative rounded-lg border border-border/40 backdrop-blur-md px-3.5 py-3 bg-secondary overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1.5px]" style={{ background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)` }} />
            <div className="flex items-center gap-2 mb-1.5">
              <c.icon className="w-3.5 h-3.5" style={{ color: c.accent }} />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{c.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground tabular-nums">{c.value}</p>
          </motion.div>
        ))}

        {/* Meta Demos card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="relative rounded-lg border border-border/40 backdrop-blur-md px-3.5 py-3 bg-secondary overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1.5px]" style={{ background: `linear-gradient(90deg, transparent, hsl(45,80%,55%), transparent)` }} />
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5" style={{ color: "hsl(45,80%,55%)" }} />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Meta Demos</span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-1.5">
            <span className="text-lg font-bold text-foreground tabular-nums">{demoPct.toFixed(0)}%</span>
            <span className="text-[10px] text-muted-foreground">{demoCount}/{demoGoal}</span>
          </div>
          <Progress value={demoPct} className="h-1.5 bg-muted/20" />
        </motion.div>

        {/* Status card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="relative rounded-lg border border-border/40 backdrop-blur-md px-3.5 py-3 bg-secondary overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1.5px]" style={{ background: `linear-gradient(90deg, transparent, ${statusColor}, transparent)` }} />
          <div className="flex items-center gap-2 mb-1.5">
            <Activity className="w-3.5 h-3.5" style={{ color: statusColor }} />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Status</span>
          </div>
          <p className="text-lg font-bold tabular-nums" style={{ color: statusColor }}>{statusLabel}</p>
        </motion.div>
      </div>

      {/* Funnel + Side Cards */}
      <div className="grid grid-cols-[1fr_220px] gap-4 items-stretch">
        {/* LEFT: Funnel with inline conversions */}
        <div className="flex flex-col min-h-[460px]">
          {funnel.map((s, i) => {
            const w = maxW - i * stp;
            const isFinal = (s as any).isFinal;
            const convBetween = i > 0 && (i - 1) < convs.length ? convs[i - 1] : null;

            return (
              <div key={s.key} className="flex-1 flex flex-col justify-center">
                {convBetween && (
                  <div className="flex justify-center py-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 cursor-default">
                          <span className="text-muted-foreground/40 text-xs">↓</span>
                          <span className="text-[16px] font-bold tabular-nums" style={{
                            color: (convBetween.bench ? convBetween.pct / convBetween.bench : 1) >= 1
                              ? "hsl(155,60%,45%)"
                              : (convBetween.bench ? convBetween.pct / convBetween.bench : 1) >= 0.7
                                ? "hsl(45,80%,55%)"
                                : "hsl(0,70%,55%)"
                          }}>
                            {convBetween.pct.toFixed(1)}%
                          </span>
                          {convBetween.bench && (
                            <span className="text-[10px] text-muted-foreground/50 tabular-nums">vs {convBetween.bench}%</span>
                          )}
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                            background: (convBetween.bench ? convBetween.pct / convBetween.bench : 1) >= 1
                              ? "hsl(155,60%,45%)"
                              : (convBetween.bench ? convBetween.pct / convBetween.bench : 1) >= 0.7
                                ? "hsl(45,80%,55%)"
                                : "hsl(0,70%,55%)"
                          }} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-background border-border/40 text-foreground">
                        <p className="text-xs">
                          {convBetween.totalCur} leads chegaram até <span className="font-semibold">{convBetween.to}</span> de {convBetween.totalPrev} totais que passaram por <span className="font-semibold">{convBetween.from}</span>
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}

                <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 + i * 0.07 }}
                  className="flex justify-center">
                  <div className={`relative rounded-lg overflow-hidden ${isFinal ? "ring-1 ring-emerald-500/30" : ""}`}
                    style={{ width: `${w}%`, height: "64px" }}>
                    <div className={`absolute inset-0 bg-gradient-to-r ${gradients[i]} opacity-85`} />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent" />
                    <div className="absolute inset-0 border border-white/[0.08] rounded-lg" />
                    <div className="relative z-10 flex items-center justify-between h-full px-4">
                      <span className="text-sm font-semibold text-white">{s.label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold bg-black/25 rounded-full px-2.5 py-0.5 text-white/90 tabular-nums">{s.count}</span>
                        {isFinal && <span className="text-[9px] font-semibold bg-emerald-500/25 text-emerald-300 rounded-full px-1.5 py-0.5">✓</span>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* RIGHT: Side cards stacked vertically */}
        <div className="flex flex-col gap-2">
          {side.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div key={c.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.05 }}
                className={`rounded-lg border border-border/40 backdrop-blur-md bg-secondary p-3 flex-1 flex items-center gap-3 ${c.clickable ? "cursor-pointer hover:border-amber-500/30 transition-all" : ""}`}
                onClick={c.clickable ? () => setHoldOpen(true) : undefined}>
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(45,80%,55%)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{c.label}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{c.sublabel}</p>
                </div>
                <p className="text-xl font-extrabold text-foreground tabular-nums">{c.count}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Análise Automática */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="relative rounded-lg border border-border/40 backdrop-blur-md bg-secondary p-4 overflow-hidden"
        style={{ borderLeft: "3px solid hsl(155,60%,45%)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: "hsl(155,60%,45%)" }} />
            <span className="text-xs font-semibold text-foreground">Análise Automática</span>
            {updatedAt && (
              <span className="text-[10px] text-muted-foreground">
                Atualizado às {updatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <button
            onClick={refreshAnalysis}
            disabled={analysisLoading}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${analysisLoading ? "animate-spin" : ""}`} />
            Atualizar análise
          </button>
        </div>
        {analysisLoading && !analysis ? (
          <div className="space-y-2">
            <div className="h-3 rounded bg-muted/20 animate-pulse w-full" />
            <div className="h-3 rounded bg-muted/20 animate-pulse w-4/5" />
            <div className="h-3 rounded bg-muted/20 animate-pulse w-3/5" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">{analysis || "Clique em 'Atualizar análise' para gerar."}</p>
        )}
      </motion.div>

      {/* Hold Modal */}
      <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
        <DialogContent className="max-w-2xl bg-background border-border/40">
          <DialogHeader>
            <DialogTitle className="text-foreground">Deals em Hold</DialogTitle>
            <DialogDescription className="text-muted-foreground">{holdDeals.length} deals</DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {holdDeals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum deal em Hold</p>
            ) : (
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border/30">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Empresa</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Contato</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Previsão</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Notas</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Dias</th>
                </tr></thead>
                <tbody>
                  {holdDeals.sort((a, b) => {
                    if (!a.expected_close_date && !b.expected_close_date) return 0;
                    if (!a.expected_close_date) return 1;
                    if (!b.expected_close_date) return -1;
                    return new Date(a.expected_close_date).getTime() - new Date(b.expected_close_date).getTime();
                  }).map(d => {
                    const past = d.expected_close_date && new Date(d.expected_close_date) < new Date();
                    return (
                      <tr key={d.pipedrive_id} className={`border-b border-border/10 ${past ? "bg-red-500/5" : ""}`}>
                        <td className="py-2 px-2 font-medium text-foreground">{d.empresa}</td>
                        <td className="py-2 px-2 text-muted-foreground">{d.contato || "—"}</td>
                        <td className={`py-2 px-2 tabular-nums ${past ? "text-red-400 font-semibold" : "text-muted-foreground"}`}>{d.expected_close_date || "—"}{past && " ⚠️"}</td>
                        <td className="py-2 px-2 text-muted-foreground max-w-[200px] truncate">{d.notas || "—"}</td>
                        <td className="py-2 px-2 text-right text-muted-foreground tabular-nums">{d.days_in_stage}d</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
