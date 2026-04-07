import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { writeToSheets } from "@/hooks/useWriteSheets";
import { SyncIndicator } from "@/components/SyncIndicator";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { CircularProgress } from "@/components/CircularProgress";
import { Plus, Search, Users, Target, TrendingUp, CalendarCheck, CheckCircle2, Activity, RefreshCw, AlertTriangle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";

import { RefinamentoDados } from "@/components/milena/RefinamentoDados";
import { HistoricoPipedrive } from "@/components/milena/HistoricoPipedrive";
import { LockedCommission } from "@/components/LockedCommission";
import { CadenceChecklist } from "@/components/CadenceChecklist";
import { CalendarioPreVendas } from "@/components/CalendarioPreVendas";
import { useMetasComerciais } from "@/hooks/useMetasComerciais";

interface LdrMemberDashboardProps {
  memberName: string;
  initials: string;
  avatarColor?: string;
}

interface SheetLead {
  id: string;
  empresa: string;
  contato_nome: string;
  cargo: string;
  telefone: string;
  email: string;
  cidade: string;
  status: string;
  data_primeiro_contato: string;
  data_ultima_interacao: string;
  data_reuniao: string;
  valor_contrato: string;
  observacoes: string;
  origem_lead: string;
  perdido_motivo: string;
  responsavel: string;
  row_index: number;
}

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function getWorkingDaysInMonth(date: Date) {
  const year = date.getFullYear(), month = date.getMonth();
  let count = 0;
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) { if (d.getDay() !== 0 && d.getDay() !== 6) count++; d.setDate(d.getDate() + 1); }
  return count;
}

function getWorkingDaysPassed(date: Date) {
  const year = date.getFullYear(), month = date.getMonth();
  let count = 0;
  const d = new Date(year, month, 1);
  while (d <= date) { if (d.getDay() !== 0 && d.getDay() !== 6) count++; d.setDate(d.getDate() + 1); }
  return count;
}

function parseSheetDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Try yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return new Date(dateStr);
  // Try dd/MM/yyyy
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return new Date(dateStr);
}

function normalizeStatus(s: string): string {
  return (s || "lead").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").trim();
}

const statusBadgeColors: Record<string, { bg: string; text: string; border: string }> = {
  lead: { bg: "rgba(255,255,255,0.06)", text: "text-muted-foreground", border: "rgba(255,255,255,0.08)" },
  contatado: { bg: "rgba(59,130,246,0.12)", text: "text-blue-400", border: "rgba(59,130,246,0.2)" },
  reuniao_agendada: { bg: "rgba(234,179,8,0.12)", text: "text-yellow-400", border: "rgba(234,179,8,0.2)" },
  reuniao_realizada: { bg: "rgba(249,115,22,0.12)", text: "text-orange-400", border: "rgba(249,115,22,0.2)" },
  proposta: { bg: "rgba(168,85,247,0.12)", text: "text-purple-400", border: "rgba(168,85,247,0.2)" },
  fechado: { bg: "rgba(0,200,150,0.12)", text: "text-primary", border: "rgba(0,200,150,0.2)" },
  perdido: { bg: "rgba(239,68,68,0.12)", text: "text-destructive", border: "rgba(239,68,68,0.2)" },
};

const statusDisplayMap: Record<string, string> = {
  lead: "Lead", contatado: "Contatado", reuniao_agendada: "Reunião Agendada",
  reuniao_realizada: "Reunião Realizada", proposta: "Proposta", fechado: "Fechado", perdido: "Perdido",
};

const statusOptions = ["Todos", "lead", "contatado", "reuniao_agendada", "reuniao_realizada", "proposta", "fechado", "perdido"];

const sourceColors = ["hsl(230,80%,65%)", "hsl(160,100%,39%)", "hsl(45,80%,55%)", "hsl(280,60%,60%)", "hsl(20,80%,55%)", "hsl(350,65%,55%)"];

interface ChecklistItem {
  id: string;
  cliente_id: string;
  etapa: number;
  nome_etapa: string;
  concluida: boolean;
  responsavel: string | null;
  notas: string | null;
}

export default function LdrMemberDashboard({ memberName, initials, avatarColor = "hsl(45,80%,45%)" }: LdrMemberDashboardProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "refinamento" | "historico" | "calendario">("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(true);

  // Fetch leads directly from Google Sheets via edge function
  const { data: sheetLeadsRaw = [], isLoading: sheetsLoading, refetch: fetchSheetLeads } = useQuery({
    queryKey: ["milena-leads-sheets"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("milena-leads-sheets");
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao buscar leads");
      return (data.leads || []) as SheetLead[];
    },
    staleTime: 2 * 60 * 1000,
  });

  // Read goals from metas_comerciais (single source of truth)
  const currentMesForMetas = (() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  })();
  const { data: metasComerciais = [] } = useMetasComerciais(currentMesForMetas);
  const metaComercial = metasComerciais[0] || null;

  const sheetLeads = sheetLeadsRaw;

  const lastSync = new Date();

  // Computed metrics from filtered data
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  const leadsToday = sheetLeads.filter(l => {
    const d = parseSheetDate(l.data_primeiro_contato);
    return d && format(d, "yyyy-MM-dd") === todayStr;
  }).length;

  const leadsThisMonth = sheetLeads.length;

  // Goals from metas_comerciais — Milena generates ALL leads (total_leads)
  const monthlyGoal = metaComercial ? Number(metaComercial.total_leads) || 0 : 0;
  const hasGoals = !!metaComercial;
  const goalPct = monthlyGoal > 0 ? (leadsThisMonth / monthlyGoal) * 100 : 0;
  const workingDays = getWorkingDaysInMonth(now);
  const daysPassed = getWorkingDaysPassed(now);
  const dailyGoal = monthlyGoal > 0 ? Math.ceil(monthlyGoal / workingDays) : 0;

  // Qualification rate: status != "lead"
  const qualifiedLeads = sheetLeads.filter(l => normalizeStatus(l.status) !== "lead").length;
  const qualificationRate = sheetLeads.length > 0 ? (qualifiedLeads / sheetLeads.length) * 100 : 0;

  // Commission
  const leadCommission = sheetLeads.length * 1;
  const closedLeads = sheetLeads.filter(l => normalizeStatus(l.status) === "fechado");
  const closedContractsValue = closedLeads.reduce((sum, l) => {
    const v = parseFloat(l.valor_contrato?.replace(/[^\d.,]/g, "").replace(",", ".") || "0");
    return sum + (isNaN(v) ? 0 : v);
  }, 0);
  const contractCommission = closedContractsValue * 0.01;
  const totalCommission = leadCommission + contractCommission;

  // Lead sources
  const sourceMap: Record<string, number> = {};
  sheetLeads.forEach(l => {
    const src = l.origem_lead || "Outros";
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  });
  const sourceData = Object.entries(sourceMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Filtered leads for table
  const filtered = sheetLeads.filter(l => {
    const matchSearch = l.empresa.toLowerCase().includes(search.toLowerCase()) || (l.contato_nome || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "Todos" || normalizeStatus(l.status) === statusFilter;
    return matchSearch && matchStatus;
  });

  // Activity feed (sorted by most recent)
  const activityFeed = [...sheetLeads]
    .filter(l => l.data_ultima_interacao || l.data_primeiro_contato)
    .sort((a, b) => {
      const da = parseSheetDate(a.data_ultima_interacao || a.data_primeiro_contato);
      const db = parseSheetDate(b.data_ultima_interacao || b.data_primeiro_contato);
      return (db?.getTime() || 0) - (da?.getTime() || 0);
    })
    .slice(0, 10);

  // Checklist
  useEffect(() => {
    async function fetchChecklist() {
      setChecklistLoading(true);
      const { data } = await supabase.from("checklist_projetos").select("*").ilike("responsavel", `%${memberName}%`).order("etapa", { ascending: true });
      setChecklist((data as ChecklistItem[]) || []);
      setChecklistLoading(false);
    }
    fetchChecklist();
  }, [memberName]);

  const handleToggleChecklist = async (item: ChecklistItem) => {
    const newVal = !item.concluida;
    setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, concluida: newVal } : c));
    await supabase.from("checklist_projetos").update({ concluida: newVal, data_conclusao: newVal ? new Date().toISOString() : null }).eq("id", item.id);
  };

  const completedCount = checklist.filter(c => c.concluida).length;

  // Status update writes back to Sheets
  const handleStatusChange = (lead: SheetLead, newStatus: string) => {
    // Refetch to get updated data
    fetchSheetLeads();
    writeToSheets({
      tab: "leads",
      action: "update",
      row_index: lead.row_index,
      record: { ...lead, status: newStatus },
    }).catch(() => {});
  };

  const greetingHour = now.getHours();
  const greeting = greetingHour < 12 ? "Bom dia" : greetingHour < 18 ? "Boa tarde" : "Boa noite";

  const tabs = [
    { key: "dashboard" as const, label: "Dashboard" },
    { key: "refinamento" as const, label: "Filtro de Empresas" },
    { key: "historico" as const, label: "Histórico Pipedrive" },
    { key: "calendario" as const, label: "📅 Calendário" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-white/10">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-300 border-b-2 ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-white/10"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "refinamento" && <RefinamentoDados />}
      {activeTab === "historico" && <HistoricoPipedrive />}
      {activeTab === "calendario" && <CalendarioPreVendas defaultFilter="Milena" />}
      {activeTab === "dashboard" && (
      <>
      {/* No goals banner */}
      {!hasGoals && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 border-amber-500/30" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.03))" }}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">⚠️ Metas de {format(now, "MMMM yyyy", { locale: ptBR })} não definidas.</p>
              <p className="text-xs text-muted-foreground">Aguardando configuração no painel CEO.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="glass-card p-5 flex items-center gap-4" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))", borderColor: "rgba(245,158,11,0.15)" }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: avatarColor }}>{initials}</div>
        <div>
          <p className="text-foreground font-semibold">{greeting}, {memberName}! Você gerou {leadsToday} leads hoje. Meta diária: {dailyGoal} leads. Continue assim! 🚀</p>
          <p className="text-xs text-muted-foreground mt-1">
            LDR · {sheetLeads.length} leads gerados
            {lastSync && <span className="ml-2">· Última sincronização: {format(lastSync, "HH:mm")}</span>}
            <button onClick={() => fetchSheetLeads()} disabled={sheetsLoading} className="ml-2 inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${sheetsLoading ? "animate-spin" : ""}`} /> Atualizar
            </button>
          </p>
        </div>
      </motion.div>

      {/* ROW 1 — 4 Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Leads Hoje */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0 }} className="glass-card p-4">
          {sheetsLoading ? <div className="h-20 bg-muted/30 rounded-lg animate-pulse" /> : <>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <CalendarCheck className="w-4 h-4" style={{ color: "hsl(45,80%,55%)" }} />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground"><AnimatedNumber value={leadsToday} /> <span className="text-sm text-muted-foreground font-normal">/ {dailyGoal}</span></p>
          <p className="text-xs text-muted-foreground mt-0.5">Leads Gerados</p>
          <div className="mt-2 h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((leadsToday / dailyGoal) * 100, 100)}%` }} transition={{ duration: 0.8 }}
              className="h-full rounded-full" style={{ background: leadsToday >= dailyGoal ? "hsl(160,100%,39%)" : "hsl(45,80%,55%)" }} />
          </div>
          </>}
        </motion.div>

        {/* Leads do Mês */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }} className="glass-card p-4 flex items-center gap-4">
          {sheetsLoading ? <div className="h-20 w-full bg-muted/30 rounded-lg animate-pulse" /> : <>
          <CircularProgress value={goalPct} size={64} strokeWidth={5} color="hsl(45,80%,55%)">
            <span className="text-xs font-bold" style={{ color: "hsl(45,80%,55%)" }}><AnimatedNumber value={goalPct} suffix="%" decimals={0} /></span>
          </CircularProgress>
          <div>
            <p className="text-lg font-bold text-foreground"><AnimatedNumber value={leadsThisMonth} /> <span className="text-sm text-muted-foreground font-normal">/ {monthlyGoal}</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">Leads do Mês</p>
          </div>
          </>}
        </motion.div>

        {/* Comissão — Protected */}
        <LockedCommission password="Milena#2">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16 }} className="glass-card p-4">
            {sheetsLoading ? <div className="h-20 bg-muted/30 rounded-lg animate-pulse" /> : <>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.2)" }}>
                <TrendingUp className="w-4 h-4" style={{ color: "hsl(20,80%,55%)" }} />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground"><AnimatedNumber value={totalCommission} formatAsCurrency /></p>
            <p className="text-[10px] text-muted-foreground mt-1">({sheetLeads.length}×R$1) + (1%×{formatCurrency(closedContractsValue)})</p>
            <p className="text-xs text-muted-foreground mt-0.5">Comissão Acumulada</p>
            </>}
          </motion.div>
        </LockedCommission>

        {/* Qualificação */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.24 }} className="glass-card p-4">
          {sheetsLoading ? <div className="h-20 bg-muted/30 rounded-lg animate-pulse" /> : <>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,200,150,0.12)", border: "1px solid rgba(0,200,150,0.2)" }}>
              <Target className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground"><AnimatedNumber value={qualificationRate} suffix="%" decimals={1} /></p>
          <p className="text-xs text-muted-foreground mt-0.5">Taxa de Qualificação</p>
          <p className="text-[10px] text-muted-foreground">{qualifiedLeads} qualificados de {sheetLeads.length}</p>
          </>}
        </motion.div>
      </div>

      {/* ROW 2 — Checklist + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CadenceChecklist colaborador={memberName} accentColor="hsl(45,80%,55%)" />

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4" style={{ color: "hsl(45,80%,55%)" }} />
            <h2 className="text-sm font-semibold text-foreground">Feed de Atividades</h2>
          </div>
          {sheetsLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted/30 rounded-lg animate-pulse" />)}</div>
          ) : activityFeed.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma atividade recente</p>
          ) : (
            <div className="space-y-2 max-h-[240px] overflow-y-auto scrollbar-thin">
              {activityFeed.map(lead => {
                const d = parseSheetDate(lead.data_ultima_interacao || lead.data_primeiro_contato);
                const normStatus = normalizeStatus(lead.status);
                return (
                  <div key={lead.id} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-all">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "hsl(45,80%,55%)" }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground"><span className="font-medium">{lead.empresa}</span> → <span className={statusBadgeColors[normStatus]?.text || "text-muted-foreground"}>{statusDisplayMap[normStatus] || lead.status}</span></p>
                      {d && <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(d, { addSuffix: true, locale: ptBR })}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* ROW 3 — Lead Sources */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="glass-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Origem dos Leads</h2>
        {sheetsLoading ? (
          <div className="h-[180px] bg-muted/30 rounded-lg animate-pulse" />
        ) : sourceData.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum dado de origem disponível</p>
        ) : (
          <div className="flex items-center gap-8">
            <div className="w-[180px] h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                    {sourceData.map((_, i) => <Cell key={i} fill={sourceColors[i % sourceColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(228,16%,10%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2">
              {sourceData.map((src, i) => (
                <div key={src.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: sourceColors[i % sourceColors.length] }} />
                  <span className="text-xs text-muted-foreground">{src.name}</span>
                  <span className="text-xs font-medium text-foreground ml-auto tabular-nums">{src.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* ROW 4 — Filters & Leads Table */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar empresa ou contato..." value={search} onChange={e => setSearch(e.target.value)} className="w-full h-9 pl-9 pr-3 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {statusOptions.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {s === "Todos" ? "Todos" : statusDisplayMap[s] || s}
            </button>
          ))}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="glass-card overflow-hidden">
        {sheetsLoading ? (
          <div className="p-8 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground text-sm">Nenhum lead encontrado para {memberName}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                 <tr className="text-xs text-muted-foreground border-b border-border">
                   <th className="text-left p-4 font-medium">Empresa</th>
                   <th className="text-left p-4 font-medium">Cidade</th>
                   <th className="text-left p-4 font-medium">Status</th>
                   <th className="text-left p-4 font-medium">Data</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(lead => {
                  const normStatus = normalizeStatus(lead.status);
                  const badge = statusBadgeColors[normStatus] || statusBadgeColors.lead;
                  const d = parseSheetDate(lead.data_primeiro_contato);
                  return (
                    <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4"><p className="font-medium text-foreground">{lead.empresa}</p></td>
                      <td className="p-4 text-muted-foreground">{lead.cidade || "—"}</td>
                      <td className="p-4">
                        <select value={normStatus} onChange={e => handleStatusChange(lead, e.target.value)}
                          className="text-xs border-0 focus:outline-none cursor-pointer rounded-full px-2.5 py-1 font-medium"
                          style={{ background: badge.bg, border: `1px solid ${badge.border}` }}>
                          {(["lead", "contatado", "reuniao_agendada", "reuniao_realizada", "proposta", "fechado", "perdido"]).map(s => (
                            <option key={s} value={s} className="bg-card text-foreground">{statusDisplayMap[s]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4 text-muted-foreground">{d ? format(d, "dd/MM/yyyy") : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
      </>
      )}
    </div>
  );
}
