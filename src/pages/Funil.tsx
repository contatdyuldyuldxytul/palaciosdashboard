import { useState } from "react";
import { usePipedrive, PipedriveDeal } from "@/hooks/usePipedrive";
import { TrendingUp, Users, Target, AlertTriangle, RefreshCw, Pause, Recycle, DoorOpen, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Funnel stages in order
const FUNNEL_STAGES = [
  { key: "Entrada de Leads", label: "Entrada de Leads", sublabel: "Leads disponíveis para prospectar" },
  { key: "Tentando Contato", label: "Tentando Contato", sublabel: "Em tentativa de contato", merge: ["Tentando Contato #A", "Tentando Contato #B"] },
  { key: "Contato Realizado", label: "Contato Realizado", sublabel: "Contato feito com a empresa", merge: ["Contato Realizado #A", "Contato Realizado #B"] },
  { key: "Contato com o Decisor", label: "Contato com o Decisor", sublabel: "Decisor alcançado" },
  { key: "Demo Agendada", label: "Demo Agendada", sublabel: "Reunião agendada — fim das pré-vendas", isFinal: true },
];

const SIDE_CARDS = [
  { key: "Hold", stages: ["Hold"], label: "Hold", sublabel: "Empreendimentos futuros", icon: Pause, clickable: true },
  { key: "Recicláveis", stages: ["Recicláveis"], label: "Recicláveis", sublabel: "Sem contato — prospectar no futuro", icon: Recycle, clickable: false },
  { key: "Porta Aberta Decisor", stages: ["Porta Aberta Decisores"], label: "Porta Aberta Decisor", sublabel: "Decisor contatado — sem momento agora", icon: DoorOpen, clickable: false },
];

const stageGradients = [
  "from-[hsl(230,80%,65%)] to-[hsl(250,70%,55%)]",
  "from-[hsl(260,70%,60%)] to-[hsl(280,65%,50%)]",
  "from-[hsl(290,60%,55%)] to-[hsl(320,60%,50%)]",
  "from-[hsl(330,65%,55%)] to-[hsl(350,60%,50%)]",
  "from-[hsl(150,60%,40%)] to-[hsl(160,55%,35%)]",
];

const stageGlows = [
  "shadow-[0_0_24px_hsl(240,80%,65%,0.3)]",
  "shadow-[0_0_24px_hsl(270,70%,55%,0.3)]",
  "shadow-[0_0_24px_hsl(310,60%,50%,0.3)]",
  "shadow-[0_0_24px_hsl(340,60%,50%,0.3)]",
  "shadow-[0_0_24px_hsl(155,55%,40%,0.3)]",
];

function countByStage(deals: PipedriveDeal[], stageNames: string[]): number {
  return deals.filter(d => d.status === 'open' && stageNames.includes(d.pipedrive_stage)).length;
}

function getDealsInStage(deals: PipedriveDeal[], stageNames: string[]): PipedriveDeal[] {
  return deals.filter(d => d.status === 'open' && stageNames.includes(d.pipedrive_stage));
}

export default function Funil() {
  const { deals: pipedriveDeals, manualSync, isSyncing: pipedriveSyncing, minutesAgo } = usePipedrive();
  const [holdModalOpen, setHoldModalOpen] = useState(false);

  // Only open deals for funnel
  const openDeals = pipedriveDeals.filter(d => d.status === 'open');

  // Build funnel data
  const funnelData = FUNNEL_STAGES.map(stage => {
    const stageNames = stage.merge || [stage.key];
    return {
      ...stage,
      count: countByStage(pipedriveDeals, stageNames),
      deals: getDealsInStage(pipedriveDeals, stageNames),
    };
  });

  // Side cards data
  const sideData = SIDE_CARDS.map(card => ({
    ...card,
    count: countByStage(pipedriveDeals, card.stages),
    deals: getDealsInStage(pipedriveDeals, card.stages),
  }));

  const holdDeals = sideData.find(s => s.key === "Hold")?.deals || [];

  // Pre-sales metrics
  const totalFunnelLeads = funnelData.reduce((s, f) => s + f.count, 0);
  const demoCount = funnelData.find(s => s.key === "Demo Agendada")?.count || 0;

  // Conversion rates between stages
  const conversions = funnelData.map((stage, i) => {
    if (i === 0) return null;
    const prev = funnelData[i - 1].count;
    return prev > 0 ? (stage.count / prev) * 100 : 0;
  });

  // Overall conversion (Entrada → Demo)
  const entradaCount = funnelData[0]?.count || 0;
  const overallConversion = totalFunnelLeads > 0 ? (demoCount / totalFunnelLeads) * 100 : 0;

  // Biggest bottleneck
  let biggestDrop = { stage: "", dropPct: 0 };
  for (let i = 1; i < funnelData.length; i++) {
    const prev = funnelData[i - 1].count;
    const cur = funnelData[i].count;
    const drop = prev > 0 ? ((prev - cur) / prev) * 100 : 0;
    if (drop > biggestDrop.dropPct) {
      biggestDrop = { stage: funnelData[i].label, dropPct: drop };
    }
  }

  // Aline commission: R$30 per Demo Agendada
  const comissaoDemo = demoCount * 30;

  const maxWidth = 100;
  const minWidth = 38;
  const step = (maxWidth - minWidth) / Math.max(funnelData.length - 1, 1);

  const isLoading = pipedriveDeals.length === 0 && pipedriveSyncing;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/10 animate-pulse" />
          ))}
        </div>
        <div className="space-y-3 mt-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/10 animate-pulse mx-auto" style={{ width: `${100 - i * 14}%` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground" style={{ lineHeight: "1.1" }}>
            Funil de Pré-Vendas
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            ALINE'S PIPELINE - ALFA · {openDeals.length} deals ativos
          </p>
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

      {/* Summary Cards — pre-sales only */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: Users,
            label: "Total no Funil",
            value: String(totalFunnelLeads),
            accent: "hsl(230,80%,65%)",
          },
          {
            icon: Target,
            label: "Demos Agendadas",
            value: String(demoCount),
            subtitle: "Meta final de pré-vendas",
            accent: "hsl(155,60%,45%)",
          },
          {
            icon: TrendingUp,
            label: "Comissão (R$30/demo)",
            value: `R$ ${comissaoDemo.toLocaleString("pt-BR")}`,
            subtitle: `${demoCount} demos × R$30`,
            accent: "hsl(45,80%,55%)",
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
            className="relative rounded-xl border border-border/40 backdrop-blur-md p-5 overflow-hidden bg-secondary"
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
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{(card as any).subtitle}</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Funnel + Side Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Main Funnel */}
        <div className="space-y-2.5">
          {funnelData.map((stage, i) => {
            const widthPct = maxWidth - i * step;
            const conv = conversions[i];
            const isEntry = i === 0;
            const isFinal = stage.isFinal;

            return (
              <motion.div
                key={stage.key}
                initial={{ opacity: 0, x: -40, filter: "blur(6px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.7, delay: 0.2 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-4"
              >
                <div className="flex-1 flex justify-center">
                  <div
                    className={`relative rounded-xl overflow-hidden transition-all duration-500 ${stageGlows[i]} ${isFinal ? "ring-2 ring-emerald-500/30" : ""}`}
                    style={{ width: `${widthPct}%`, minHeight: "68px" }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${stageGradients[i]} opacity-85`} />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent" />
                    <div className="absolute inset-0 border border-white/[0.08] rounded-xl" />
                    <div className="relative z-10 flex items-center justify-between h-full min-h-[68px] px-5">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white tracking-wide">{stage.label}</span>
                          <span className="text-sm font-bold bg-black/25 backdrop-blur-sm rounded-full px-3 py-0.5 text-white/90 tabular-nums">
                            {stage.count}
                          </span>
                          {isFinal && (
                            <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 rounded-full px-2 py-0.5 border border-emerald-500/30">
                              ✓ Meta
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-white/50 font-medium">{stage.sublabel}</span>
                      </div>
                      <div className="text-right">
                        {!isEntry && conv !== null && (
                          <span className="text-[10px] font-medium text-white/50">
                            {conv.toFixed(1)}% do anterior
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Side Metric Cards */}
        <div className="space-y-4">
          {sideData.map((card, i) => {
            const IconComp = card.icon;
            const isClickable = card.clickable;

            return (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                className={`relative rounded-xl border border-border/40 backdrop-blur-md p-4 overflow-hidden bg-secondary ${isClickable ? "cursor-pointer hover:border-amber-500/30 transition-all" : ""}`}
                style={{ boxShadow: "0 0 16px hsl(230,60%,50%,0.06)" }}
                onClick={isClickable ? () => setHoldModalOpen(true) : undefined}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
                  >
                    <IconComp className="w-4 h-4" style={{ color: "hsl(45,80%,55%)" }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{card.label}</p>
                    <p className="text-[10px] text-muted-foreground">{card.sublabel}</p>
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-foreground tabular-nums">{card.count}</p>
                {isClickable && (
                  <p className="text-[10px] text-amber-400/60 mt-1">Clique para ver detalhes →</p>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom Insight */}
      {totalFunnelLeads > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-xl border border-border/40 backdrop-blur-md p-6 overflow-hidden bg-secondary"
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
              <p className="text-sm font-bold text-foreground mb-1.5">Análise do Funil</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {biggestDrop.stage ? (
                  <>
                    Maior gargalo: <span className="text-amber-400 font-semibold">{biggestDrop.stage}</span> com{" "}
                    <span className="text-foreground font-semibold">{biggestDrop.dropPct.toFixed(0)}%</span> de perda.{" "}
                    Conversão geral (Entrada → Demo): <span className="text-foreground font-semibold">{overallConversion.toFixed(1)}%</span>.{" "}
                    Comissão atual: <span className="text-emerald-400 font-semibold">R$ {comissaoDemo.toLocaleString("pt-BR")}</span> ({demoCount} demos × R$30).
                  </>
                ) : (
                  "Aguardando dados do Pipedrive para gerar insights."
                )}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Deals Table */}
      {pipedriveDeals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-xl border border-border/40 backdrop-blur-md p-6 overflow-hidden bg-secondary"
        >
          <div
            className="absolute top-0 left-0 w-full h-[2px]"
            style={{ background: "linear-gradient(90deg, transparent, hsl(45,100%,55%), transparent)" }}
          />
          <h2 className="text-sm font-bold text-foreground mb-4">Deals — ALINE'S PIPELINE</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Empresa</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Contato</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Etapa</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Responsável</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Dias na Etapa</th>
                </tr>
              </thead>
              <tbody>
                {pipedriveDeals
                  .filter(d => d.status === 'open')
                  .sort((a, b) => b.days_in_stage - a.days_in_stage)
                  .slice(0, 40)
                  .map((deal) => {
                    const isStale = deal.days_in_stage >= 7;
                    return (
                      <tr
                        key={deal.pipedrive_id}
                        className={`border-b border-border/10 transition-colors ${isStale ? "bg-amber-500/5" : "hover:bg-muted/10"}`}
                      >
                        <td className="py-2.5 px-2 font-medium text-foreground">{deal.empresa}</td>
                        <td className="py-2.5 px-2 text-muted-foreground">{deal.contato || "—"}</td>
                        <td className="py-2.5 px-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/20 text-muted-foreground border border-border/20">
                            {deal.pipedrive_stage}
                          </span>
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

      {/* Hold Modal */}
      <Dialog open={holdModalOpen} onOpenChange={setHoldModalOpen}>
        <DialogContent className="max-w-2xl bg-background border-border/40">
          <DialogHeader>
            <DialogTitle className="text-foreground">Deals em Hold</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Empreendimentos futuros — {holdDeals.length} deals
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {holdDeals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum deal em Hold</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Empresa</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Contato</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Previsão Retorno</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Notas</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Dias</th>
                  </tr>
                </thead>
                <tbody>
                  {holdDeals
                    .sort((a, b) => {
                      if (!a.expected_close_date && !b.expected_close_date) return 0;
                      if (!a.expected_close_date) return 1;
                      if (!b.expected_close_date) return -1;
                      return new Date(a.expected_close_date).getTime() - new Date(b.expected_close_date).getTime();
                    })
                    .map((deal) => {
                      const isPast = deal.expected_close_date && new Date(deal.expected_close_date) < new Date();
                      return (
                        <tr key={deal.pipedrive_id} className={`border-b border-border/10 ${isPast ? "bg-red-500/5" : ""}`}>
                          <td className="py-2.5 px-2 font-medium text-foreground">{deal.empresa}</td>
                          <td className="py-2.5 px-2 text-muted-foreground">{deal.contato || "—"}</td>
                          <td className={`py-2.5 px-2 tabular-nums ${isPast ? "text-red-400 font-semibold" : "text-muted-foreground"}`}>
                            {deal.expected_close_date || "—"}
                            {isPast && " ⚠️"}
                          </td>
                          <td className="py-2.5 px-2 text-muted-foreground max-w-[200px] truncate">{deal.notas || "—"}</td>
                          <td className="py-2.5 px-2 text-right text-muted-foreground tabular-nums">{deal.days_in_stage}d</td>
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
