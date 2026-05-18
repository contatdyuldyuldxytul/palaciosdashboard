import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Phone, FileText, TrendingUp, Target, CalendarCheck, Flame,
  ExternalLink, AlertTriangle, Plus, DollarSign, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePipedrive, PipedriveDeal } from "@/hooks/usePipedrive";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { CircularProgress } from "@/components/CircularProgress";
import { SyncIndicator } from "@/components/SyncIndicator";
import { useDailyActivities, useToggleActivity } from "@/hooks/useDailyActivities";
import { DailyTasksPanel } from "@/components/DailyTasksPanel";

const THIAGO_PIPEDRIVE_ID = 23830611;

const CASH_GOAL = 20000;
const CASH_MIN = 7000;
const HOT_STAGES = ["Proposta Enviada", "Negociação", "R1", "R2", "Reunião 1", "Reunião 2"];

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function todayISO() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
    .toISOString().slice(0, 10);
}

export default function ThiagoDashboard() {
  const memberName = "Thiago";
  const initials = "TH";
  const accent = "hsl(210,80%,55%)";
  const { deals: pipedriveDeals = [] } = usePipedrive();
  const { data: activities = [] } = useDailyActivities({ assignee: memberName });
  const toggle = useToggleActivity();

  const [cashThisMonth, setCashThisMonth] = useState(0);
  const [meetingsDoneMonth, setMeetingsDoneMonth] = useState(0);
  const [meetingsPlannedMonth, setMeetingsPlannedMonth] = useState(0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Cash this month from financeiro_clientes (paid)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("financeiro_clientes")
        .select("valor, data_pagamento, status")
        .eq("status", "pago")
        .gte("data_pagamento", monthStart.toISOString());
      setCashThisMonth((data ?? []).reduce((s, r: any) => s + Number(r.valor || 0), 0));
    })();
  }, [monthStart.toISOString()]);

  // Meetings: from meeting_checks for Thiago
  useEffect(() => {
    (async () => {
      const mes = `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
      const { data } = await supabase.from("meeting_checks").select("*").eq("colaborador", memberName).eq("mes", mes);
      setMeetingsDoneMonth((data ?? []).filter((m: any) => m.realizada).length);
      setMeetingsPlannedMonth((data ?? []).filter((m: any) => m.agendada).length);
    })();
  }, []);

  // Pipedrive: hot pipeline
  const hotDeals = useMemo(
    () => pipedriveDeals.filter(d => d.status === "open" && HOT_STAGES.some(s => d.pipedrive_stage?.includes(s))),
    [pipedriveDeals]
  );
  const hotValue = hotDeals.reduce((s, d) => s + (d.valor_estimado || 0), 0);

  const proposalDeals = pipedriveDeals.filter(d => d.status === "open" && d.pipedrive_stage?.toLowerCase().includes("proposta"));
  const stalledProposals = proposalDeals.filter(d => (d.days_in_stage ?? 0) > 5);
  const wonThisMonth = pipedriveDeals.filter(d => d.status === "won" && d.data_fechamento && new Date(d.data_fechamento) >= monthStart);
  const proposedTotal = pipedriveDeals.filter(d => ["won", "lost"].includes(d.status) && d.data_fechamento && new Date(d.data_fechamento) >= monthStart).length;
  const closeRate = proposedTotal > 0 ? (wonThisMonth.length / proposedTotal) * 100 : 0;

  // Today's meetings (from daily_activities task_type=meeting OR proposalDeals follow-ups)
  const today = todayISO();
  const todaysMeetings = activities.filter(a => a.task_type === "meeting" && a.scheduled_date === today);
  const todaysFollowups = stalledProposals.slice(0, 5);
  const strategicTasks = activities.filter(a => a.source === "claude_briefing" || a.task_type === "strategic");

  const checklist = [
    ...todaysMeetings.map(m => ({
      id: m.id, kind: "meeting" as const, title: m.task_description, deal: m.related_deal_id, completed: m.completed,
    })),
    ...todaysFollowups.map(d => ({
      id: `prop-${d.pipedrive_id}`, kind: "proposal" as const,
      title: `Follow-up: ${d.empresa} (${d.days_in_stage}d parado)`,
      deal: d.pipedrive_id, completed: false,
    })),
    ...strategicTasks.map(s => ({
      id: s.id, kind: "strategic" as const, title: s.task_description, deal: s.related_deal_id, completed: s.completed,
    })),
  ];

  const greeting = now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite";
  const cashPct = Math.min((cashThisMonth / CASH_GOAL) * 100, 100);
  const cashColor = cashThisMonth >= CASH_MIN ? "hsl(160,100%,39%)" : "hsl(45,93%,47%)";

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="glass-card p-5 flex items-center gap-4"
        style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.10), rgba(59,130,246,0.02))", borderColor: "rgba(59,130,246,0.18)" }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: accent }}>{initials}</div>
        <div className="min-w-0">
          <p className="text-foreground font-semibold">
            {greeting}, {memberName}! Você tem {todaysMeetings.length} reunião(ões) hoje e {stalledProposals.length} proposta(s) a follow-upar.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {hotDeals.length} deals quentes · {brl(hotValue)} em pipeline <SyncIndicator className="ml-2" />
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/vendas/funil" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all" style={{ border: '1px solid var(--glass-border)' }}><Flame className="w-4 h-4" /> Pipeline Quente</Link>
          <Link to="/vendas/funil" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all" style={{ border: '1px solid var(--glass-border)' }}><FileText className="w-4 h-4" /> Propostas Vivas</Link>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all"><Plus className="w-4 h-4" /> Nova Reunião</button>
        </div>
      </motion.div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Meta de Caixa */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="glass-card p-4 flex items-center gap-4">
          <CircularProgress value={cashPct} size={64} strokeWidth={5} color={cashColor}>
            <span className="text-xs font-bold" style={{ color: cashColor }}><AnimatedNumber value={cashPct} suffix="%" decimals={0} /></span>
          </CircularProgress>
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground"><AnimatedNumber value={cashThisMonth} formatAsCurrency /> <span className="text-xs text-muted-foreground font-normal">/ {brl(CASH_GOAL)}</span></p>
            <p className="text-[11px] text-muted-foreground">META DE CAIXA</p>
            <span className={`text-[10px] font-medium ${cashThisMonth >= CASH_MIN ? "text-primary" : "text-amber-400"}`}>
              Mínimo {brl(CASH_MIN)} {cashThisMonth >= CASH_MIN ? "✓" : "◇"}
            </span>
          </div>
        </motion.div>

        {/* Propostas Vivas */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.2)" }}>
              <FileText className="w-4 h-4" style={{ color: "hsl(280,60%,60%)" }} />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground"><AnimatedNumber value={proposalDeals.length} /></p>
          <p className="text-[10px] text-muted-foreground">{brl(proposalDeals.reduce((s, d) => s + (d.valor_estimado || 0), 0))} em jogo</p>
          <p className="text-xs text-muted-foreground mt-0.5">Propostas Vivas</p>
        </motion.div>

        {/* Reuniões do Mês */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <CalendarCheck className="w-4 h-4" style={{ color: accent }} />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground"><AnimatedNumber value={meetingsDoneMonth} /> <span className="text-sm text-muted-foreground font-normal">/ {meetingsPlannedMonth}</span></p>
          <p className="text-xs text-muted-foreground mt-0.5">Reuniões do Mês</p>
          <div className="mt-2 h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${meetingsPlannedMonth > 0 ? Math.min((meetingsDoneMonth / meetingsPlannedMonth) * 100, 100) : 0}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ background: accent }} />
          </div>
        </motion.div>

        {/* Taxa de Fechamento */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.24 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,200,150,0.12)", border: "1px solid rgba(0,200,150,0.2)" }}>
              <Target className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground"><AnimatedNumber value={closeRate} suffix="%" decimals={1} /></p>
          <p className="text-xs text-muted-foreground mt-0.5">Taxa de Fechamento</p>
          <p className="text-[10px] text-muted-foreground">{wonThisMonth.length} won / {proposedTotal} proposed</p>
        </motion.div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Checklist do Dia (Thiago) */}
        <DailyTasksPanel
          mode={{ kind: "pipedrive", pipedriveUserId: THIAGO_PIPEDRIVE_ID }}
          title="Checklist do Dia"
          subtitle="Reuniões · Propostas · Ligações estratégicas"
          assigneeLabel="Thiago"
        />

        {/* Pipeline Quente */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Flame className="w-4 h-4 text-orange-400" /> Pipeline Quente</h2>
              <p className="text-[11px] text-muted-foreground">Proposta · Negociação · R1 · R2</p>
            </div>
            <span className="text-[10px] text-muted-foreground">{hotDeals.length} deals · {brl(hotValue)}</span>
          </div>
          {hotDeals.length === 0 ? (
            <div className="py-10 text-center">
              <Flame className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-foreground font-medium">Pipeline frio agora.</p>
              <p className="text-xs text-muted-foreground mt-1">Hora de provocar movimento — chame uma demo agendada.</p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
              {hotDeals
                .sort((a, b) => (b.valor_estimado || 0) - (a.valor_estimado || 0))
                .map(deal => {
                  const stalled = (deal.days_in_stage ?? 0) > 5;
                  return (
                    <li key={deal.pipedrive_id}
                      className="p-3 rounded-xl flex items-center gap-3 hover:bg-white/[0.03] transition-all"
                      style={{ border: '1px solid var(--glass-border)' }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{deal.empresa}</p>
                          {stalled && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> {deal.days_in_stage}d
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{deal.pipedrive_stage} · {deal.contato || "—"}</p>
                      </div>
                      <p className="text-sm font-bold tabular-nums text-foreground">{brl(deal.valor_estimado || 0)}</p>
                      <a href={`https://palacios3dstudio.pipedrive.com/deal/${deal.pipedrive_id}`} target="_blank" rel="noreferrer"
                        className="text-muted-foreground hover:text-primary"><ExternalLink className="w-4 h-4" /></a>
                    </li>
                  );
                })}
            </ul>
          )}
        </motion.div>
      </div>
    </div>
  );
}
