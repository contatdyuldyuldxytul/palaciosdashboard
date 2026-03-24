import { useState } from "react";
import { usePipedrive, PipedriveDeal } from "@/hooks/usePipedrive";
import { TrendingUp, Users, Target, AlertTriangle, RefreshCw, Pause, Recycle, DoorOpen } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const FUNNEL_STAGES = [
  { key: "Entrada de Leads", label: "Entrada de Leads", merge: undefined as string[] | undefined },
  { key: "Tentando Contato", label: "Tentando Contato", merge: ["Tentando Contato #A", "Tentando Contato #B"] },
  { key: "Contato Realizado", label: "Contato Realizado", merge: ["Contato Realizado #A", "Contato Realizado #B"] },
  { key: "Contato com o Decisor", label: "Contato c/ Decisor" },
  { key: "Demo Agendada", label: "Demo Agendada", isFinal: true },
];

const BENCHMARKS = [null, 100, 23, 50, 30]; // index matches stage index

const SIDE_CARDS = [
  { key: "Hold", stages: ["Hold"], label: "Hold", icon: Pause, clickable: true },
  { key: "Recicláveis", stages: ["Recicláveis"], label: "Recicláveis", icon: Recycle, clickable: false },
  { key: "Porta Aberta", stages: ["Porta Aberta Decisores"], label: "Porta Aberta", icon: DoorOpen, clickable: false },
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
  const overallConv = totalFunnel > 0 ? (demoCount / totalFunnel) * 100 : 0;
  const comissao = demoCount * 30;

  // Conversions
  const convs = funnel.map((s, i) => {
    if (i === 0) return null;
    const prev = funnel[i - 1].count;
    const cur = s.count;
    const pct = prev > 0 ? (cur / prev) * 100 : 0;
    const bench = BENCHMARKS[i];
    return { from: funnel[i - 1].label, to: s.label, pct, bench, prev, cur };
  }).filter(Boolean) as { from: string; to: string; pct: number; bench: number | null; prev: number; cur: number }[];

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

      {/* Compact Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Pipeline", value: String(totalFunnel), accent: "hsl(230,80%,65%)" },
          { icon: Target, label: "Demos", value: String(demoCount), accent: "hsl(155,60%,45%)" },
          { icon: TrendingUp, label: "Comissão", value: `R$${comissao}`, accent: "hsl(45,80%,55%)" },
          { icon: AlertTriangle, label: "Conversão", value: `${overallConv.toFixed(1)}%`, accent: "hsl(40,80%,50%)" },
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
      </div>

      {/* Funnel + Conversions + Side Cards */}
      <div className="grid grid-cols-[1fr_320px] gap-5">
        {/* LEFT: Funnel bars */}
        <div className="space-y-3 flex flex-col justify-between min-h-[420px]">
          {funnel.map((s, i) => {
            const w = maxW - i * stp;
            const isFinal = (s as any).isFinal;
            return (
              <motion.div key={s.key} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.07 }}
                className="flex justify-center">
                <div className={`relative rounded-lg overflow-hidden ${isFinal ? "ring-1 ring-emerald-500/30" : ""}`}
                  style={{ width: `${w}%`, height: "72px" }}>
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
            );
          })}
        </div>

        {/* RIGHT: Conversions + Side Cards */}
        <div className="space-y-4">
          {/* Conversion rates */}
          <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-lg border border-border/40 backdrop-blur-md bg-secondary p-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Taxas de Conversão</p>
            <div className="space-y-2.5">
              {convs.map((c, i) => {
                const ratio = c.bench ? c.pct / c.bench : 1;
                const dotColor = ratio >= 1 ? "hsl(155,60%,45%)" : ratio >= 0.7 ? "hsl(45,80%,55%)" : "hsl(0,70%,55%)";
                // Shorten labels
                const fromShort = c.from.replace("Entrada de Leads", "Entrada").replace("Contato c/ Decisor", "Decisor");
                const toShort = c.to.replace("Entrada de Leads", "Entrada").replace("Tentando Contato", "Tentando").replace("Contato Realizado", "Contato").replace("Contato c/ Decisor", "Decisor").replace("Demo Agendada", "Demo");

                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                    <span className="text-[11px] text-muted-foreground flex-1 min-w-0 truncate">
                      {fromShort} → {toShort}
                    </span>
                    <span className="text-sm font-bold text-foreground tabular-nums whitespace-nowrap" style={{ color: dotColor }}>
                      {c.pct.toFixed(1)}%
                    </span>
                    {c.bench && (
                      <span className="text-[10px] text-muted-foreground/60 tabular-nums whitespace-nowrap">
                        vs {c.bench}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Side cards */}
          <div className="grid grid-cols-3 gap-2">
            {side.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.div key={c.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.05 }}
                  className={`rounded-lg border border-border/40 backdrop-blur-md bg-secondary p-3 text-center ${c.clickable ? "cursor-pointer hover:border-amber-500/30 transition-all" : ""}`}
                  onClick={c.clickable ? () => setHoldOpen(true) : undefined}>
                  <Icon className="w-3.5 h-3.5 mx-auto mb-1.5" style={{ color: "hsl(45,80%,55%)" }} />
                  <p className="text-xl font-extrabold text-foreground tabular-nums">{c.count}</p>
                  <p className="text-[9px] text-muted-foreground font-medium mt-0.5">{c.label}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>


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
