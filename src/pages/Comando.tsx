import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Flame, Users, Activity, Target, AlertTriangle, ExternalLink,
  Compass, MessageSquare, ArrowRight, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePipedrive } from "@/hooks/usePipedrive";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { CircularProgress } from "@/components/CircularProgress";
import { useAuth } from "@/contexts/AuthContext";
import { SyncIndicator } from "@/components/SyncIndicator";

const CASH_GOAL = 20000;
const CASH_MIN = 7000;
const HOT_STAGES = ["Proposta Enviada", "Negociação", "R1", "R2", "Reunião 1", "Reunião 2", "Demo Agendada"];
const TEAM = [
  { name: "Aline", role: "BDR", color: "hsl(160,60%,38%)", url: "/equipe/aline" },
  { name: "Milena", role: "LDR", color: "hsl(45,80%,45%)", url: "/equipe/milena" },
  { name: "Felipe", role: "BDR Júnior", color: "hsl(20,90%,55%)", url: "/equipe/felipe" },
];

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}
function todayISO() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
    .toISOString().slice(0, 10);
}
function weekRange() {
  const t = new Date(todayISO());
  const day = t.getDay() || 7;
  const monday = new Date(t); monday.setDate(t.getDate() - (day - 1));
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
}

export default function Comando() {
  const { profile } = useAuth();
  const { deals: pipedriveDeals = [] } = usePipedrive();

  const [cashThisMonth, setCashThisMonth] = useState(0);
  const [teamActivities, setTeamActivities] = useState<any[]>([]);
  const [weekActivities, setWeekActivities] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const greeting = now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite";
  const userName = (profile?.full_name || "").split(" ")[0] || "Time";

  useEffect(() => {
    (async () => {
      const { data: cash } = await supabase
        .from("financeiro_clientes").select("valor")
        .eq("status", "pago").gte("data_pagamento", monthStart.toISOString());
      setCashThisMonth((cash ?? []).reduce((s, r: any) => s + Number(r.valor || 0), 0));

      const today = todayISO();
      const { data: ta } = await supabase.from("daily_activities").select("*").eq("scheduled_date", today);
      setTeamActivities(ta ?? []);

      const wk = weekRange();
      const { data: wa } = await supabase
        .from("daily_activities").select("*")
        .gte("scheduled_date", wk.start).lte("scheduled_date", wk.end);
      setWeekActivities(wa ?? []);

      const { data: c } = await supabase
        .from("campaigns").select("*, campaign_leads(count)")
        .eq("status", "active").order("start_date", { ascending: false }).limit(6);
      setCampaigns(c ?? []);
    })();
  }, [monthStart.toISOString()]);

  // KPIs
  const cashPct = Math.min((cashThisMonth / CASH_GOAL) * 100, 100);
  const cashColor = cashThisMonth >= CASH_MIN ? "hsl(160,100%,39%)" : "hsl(45,93%,47%)";

  const hotDeals = pipedriveDeals.filter(d => d.status === "open" && HOT_STAGES.some(s => d.pipedrive_stage?.includes(s)));
  const hotValue = hotDeals.reduce((s, d) => s + (d.valor_estimado || 0), 0);

  const todayDone = teamActivities.filter(a => a.completed).length;
  const todayPct = teamActivities.length > 0 ? (todayDone / teamActivities.length) * 100 : 0;

  const weekDone = weekActivities.filter(a => a.completed).length;
  const weekPct = weekActivities.length > 0 ? (weekDone / weekActivities.length) * 100 : 0;

  // Per-person summary
  const perPerson = TEAM.map(p => {
    const tasks = teamActivities.filter(a => a.assignee_label === p.name);
    const done = tasks.filter(a => a.completed).length;
    const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
    const next = tasks.find(a => !a.completed);
    return { ...p, total: tasks.length, done, pct, nextAction: next?.task_description ?? null };
  });

  // Alerts
  const stalledProposals = pipedriveDeals.filter(d => d.status === "open" && d.pipedrive_stage?.toLowerCase().includes("proposta") && (d.days_in_stage ?? 0) > 5);
  const ghostDemos = pipedriveDeals.filter(d => d.status === "open" && d.pipedrive_stage?.toLowerCase().includes("demo") && (d.days_in_stage ?? 0) > 7);
  const coldHotLeads = pipedriveDeals.filter(d => d.status === "open" && (d.days_in_stage ?? 0) > 10 && (d.valor_estimado || 0) >= 15000);

  const alerts = [
    ...stalledProposals.map(d => ({ id: `p-${d.pipedrive_id}`, kind: "warning" as const, label: "Proposta parada", desc: `${d.empresa} · ${d.days_in_stage}d sem mexer`, deal: d.pipedrive_id })),
    ...ghostDemos.map(d => ({ id: `g-${d.pipedrive_id}`, kind: "danger" as const, label: "Demo fantasma", desc: `${d.empresa} · ${d.days_in_stage}d na demo`, deal: d.pipedrive_id })),
    ...coldHotLeads.map(d => ({ id: `c-${d.pipedrive_id}`, kind: "info" as const, label: "Lead quente esfriando", desc: `${d.empresa} · ${brl(d.valor_estimado)}`, deal: d.pipedrive_id })),
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="glass-card p-5 flex items-center gap-4"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.10), rgba(99,102,241,0.02))", borderColor: "rgba(99,102,241,0.18)" }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: "hsl(245,60%,55%)" }}>
          <Compass className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-foreground font-semibold">{greeting}, {userName}! Visão geral do time hoje.</p>
          <p className="text-xs text-muted-foreground mt-1">
            {teamActivities.length} atividades planejadas · {alerts.length} alertas ativos <SyncIndicator className="ml-2" />
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/ceo/estrategias" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all" style={{ border: '1px solid var(--glass-border)' }}><Compass className="w-4 h-4" /> Importar Estratégia</Link>
          <Link to="/vendas/assistente" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all" style={{ border: '1px solid var(--glass-border)' }}><MessageSquare className="w-4 h-4" /> Sessão com Claude</Link>
          <a href="https://palacios3dstudio.pipedrive.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all"><ExternalLink className="w-4 h-4" /> Pipedrive</a>
        </div>
      </motion.div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="glass-card p-4 flex items-center gap-4">
          <CircularProgress value={cashPct} size={64} strokeWidth={5} color={cashColor}>
            <span className="text-xs font-bold" style={{ color: cashColor }}><AnimatedNumber value={cashPct} suffix="%" decimals={0} /></span>
          </CircularProgress>
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground"><AnimatedNumber value={cashThisMonth} formatAsCurrency /> <span className="text-xs text-muted-foreground font-normal">/ {brl(CASH_GOAL)}</span></p>
            <p className="text-[11px] text-muted-foreground">CAIXA DO MÊS</p>
            <span className={`text-[10px] font-medium ${cashThisMonth >= CASH_MIN ? "text-primary" : "text-amber-400"}`}>Mínimo {brl(CASH_MIN)} {cashThisMonth >= CASH_MIN ? "✓" : "◇"}</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.2)" }}>
              <Flame className="w-4 h-4" style={{ color: "hsl(20,80%,55%)" }} />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground"><AnimatedNumber value={hotDeals.length} /></p>
          <p className="text-[10px] text-muted-foreground">{brl(hotValue)} ativo</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pipeline Quente</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16 }} className="glass-card p-4 flex items-center gap-4">
          <CircularProgress value={todayPct} size={64} strokeWidth={5} color="hsl(280,60%,60%)">
            <span className="text-xs font-bold" style={{ color: "hsl(280,60%,60%)" }}><AnimatedNumber value={todayPct} suffix="%" decimals={0} /></span>
          </CircularProgress>
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground"><AnimatedNumber value={todayDone} /> <span className="text-sm text-muted-foreground font-normal">/ {teamActivities.length}</span></p>
            <p className="text-[11px] text-muted-foreground">ATIVIDADES DO TIME</p>
            <span className="text-[10px] text-muted-foreground">Hoje · agregado</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.24 }} className="glass-card p-4 flex items-center gap-4">
          <CircularProgress value={weekPct} size={64} strokeWidth={5} color="hsl(200,80%,55%)">
            <span className="text-xs font-bold" style={{ color: "hsl(200,80%,55%)" }}><AnimatedNumber value={weekPct} suffix="%" decimals={0} /></span>
          </CircularProgress>
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground"><AnimatedNumber value={weekDone} /> <span className="text-sm text-muted-foreground font-normal">/ {weekActivities.length}</span></p>
            <p className="text-[11px] text-muted-foreground">PROGRESSO DA SEMANA</p>
            <span className="text-[10px] text-muted-foreground">Seg → Dom</span>
          </div>
        </motion.div>
      </div>

      {/* Three blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Resumo por Pessoa */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.32 }} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Resumo por Pessoa</h2>
          </div>
          <ul className="space-y-3">
            {perPerson.map(p => (
              <li key={p.name} className="p-3 rounded-xl" style={{ border: '1px solid var(--glass-border)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: p.color }}>
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{p.name} <span className="text-[10px] text-muted-foreground font-normal">· {p.role}</span></p>
                    <p className="text-[10px] text-muted-foreground">{p.done}/{p.total} concluídas hoje</p>
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color: p.pct >= 70 ? "hsl(160,100%,39%)" : p.pct >= 40 ? "hsl(45,93%,47%)" : "hsl(0,70%,55%)" }}>
                    {p.pct}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden mb-2">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ background: p.color }} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground truncate flex-1">
                    {p.nextAction ? `→ ${p.nextAction}` : (p.total === 0 ? "Sem tarefas planejadas" : "Tudo feito ✓")}
                  </p>
                  <Link to={p.url} className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 flex-shrink-0">
                    Abrir <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Campanhas Ativas */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Campanhas Ativas</h2>
          </div>
          {campaigns.length === 0 ? (
            <div className="py-10 text-center">
              <Target className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-foreground font-medium">Nenhuma campanha ativa.</p>
              <p className="text-xs text-muted-foreground mt-1">A próxima sessão estratégica define o playbook do mês.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {campaigns.map((c: any) => {
                const start = c.start_date ? new Date(c.start_date) : null;
                const end = c.end_date ? new Date(c.end_date) : null;
                const today = new Date(todayISO());
                const totalDays = start && end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000)) : 0;
                const elapsed = start ? Math.max(0, Math.round((today.getTime() - start.getTime()) / 86400000)) : 0;
                const dayX = Math.min(elapsed + 1, totalDays || 1);
                const pct = totalDays > 0 ? Math.min((elapsed / totalDays) * 100, 100) : 0;
                const leadCount = c.campaign_leads?.[0]?.count ?? 0;
                return (
                  <li key={c.id} className="p-3 rounded-xl" style={{ border: '1px solid var(--glass-border)' }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{leadCount} leads · {c.playbook_type}</p>
                      </div>
                      {totalDays > 0 && (
                        <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">dia {dayX}/{totalDays}</span>
                      )}
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-primary" />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.div>

        {/* Alertas */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.48 }} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-foreground">Alertas</h2>
          </div>
          {alerts.length === 0 ? (
            <div className="py-10 text-center">
              <Activity className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-foreground font-medium">Tudo sob controle.</p>
              <p className="text-xs text-muted-foreground mt-1">Sem propostas paradas, demos fantasma ou leads quentes esquecidos.</p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
              {alerts.slice(0, 12).map(a => {
                const tone = a.kind === "danger"
                  ? { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", text: "text-destructive" }
                  : a.kind === "warning"
                  ? { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", text: "text-amber-400" }
                  : { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)", text: "text-blue-400" };
                return (
                  <li key={a.id} className="p-3 rounded-xl flex items-start gap-3"
                    style={{ background: tone.bg, border: `1px solid ${tone.border}` }}>
                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tone.text}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${tone.text}`}>{a.label}</p>
                      <p className="text-[11px] text-foreground truncate">{a.desc}</p>
                    </div>
                    {a.deal && (
                      <a href={`https://palacios3dstudio.pipedrive.com/deal/${a.deal}`} target="_blank" rel="noreferrer"
                        className="text-muted-foreground hover:text-primary flex-shrink-0"><ExternalLink className="w-3.5 h-3.5" /></a>
                    )}
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
