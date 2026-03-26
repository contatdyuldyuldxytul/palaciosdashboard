import { useState, useEffect } from "react";
import { useLeads, getStatusDisplay, LeadStatus, useAddLead, useUpdateLead } from "@/hooks/useLeads";
import { writeToSheets } from "@/hooks/useWriteSheets";
import { SyncIndicator } from "@/components/SyncIndicator";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { CircularProgress } from "@/components/CircularProgress";
import { Plus, Search, Users, Target, TrendingUp, CalendarCheck, CheckCircle2, Activity } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { RefinamentoDados } from "@/components/milena/RefinamentoDados";
import { HistoricoPipedrive } from "@/components/milena/HistoricoPipedrive";

interface LdrMemberDashboardProps {
  memberName: string;
  initials: string;
  avatarColor?: string;
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

const statusBadgeColors: Record<string, { bg: string; text: string; border: string }> = {
  lead: { bg: "rgba(255,255,255,0.06)", text: "text-muted-foreground", border: "rgba(255,255,255,0.08)" },
  contatado: { bg: "rgba(59,130,246,0.12)", text: "text-blue-400", border: "rgba(59,130,246,0.2)" },
  reuniao_agendada: { bg: "rgba(234,179,8,0.12)", text: "text-yellow-400", border: "rgba(234,179,8,0.2)" },
  reuniao_realizada: { bg: "rgba(249,115,22,0.12)", text: "text-orange-400", border: "rgba(249,115,22,0.2)" },
  proposta: { bg: "rgba(168,85,247,0.12)", text: "text-purple-400", border: "rgba(168,85,247,0.2)" },
  fechado: { bg: "rgba(0,200,150,0.12)", text: "text-primary", border: "rgba(0,200,150,0.2)" },
  perdido: { bg: "rgba(239,68,68,0.12)", text: "text-destructive", border: "rgba(239,68,68,0.2)" },
};

const statusOptions: Array<"Todos" | LeadStatus> = ["Todos", "lead", "contatado", "reuniao_agendada", "reuniao_realizada", "proposta", "fechado", "perdido"];
const statusDisplayForFilter: Record<string, string> = {
  Todos: "Todos", lead: "Lead", contatado: "Contatado", reuniao_agendada: "Reunião Agendada",
  reuniao_realizada: "Reunião Realizada", proposta: "Proposta", fechado: "Fechado", perdido: "Perdido",
};

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
  const [activeTab, setActiveTab] = useState<"dashboard" | "refinamento" | "historico">("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [showForm, setShowForm] = useState(false);
  const [newLead, setNewLead] = useState({ empresa: "", contato: "", cargo: "", cidade: "", telefone: "", email: "" });
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(true);

  const { data: allLeads = [], isLoading } = useLeads();
  const addLead = useAddLead();
  const updateLead = useUpdateLead();

  const memberLeads = allLeads.filter(
    (l) => (l.responsavel_nome || "").toLowerCase().trim() === memberName.toLowerCase().trim()
  );

  const filtered = memberLeads.filter((l) => {
    const matchSearch = l.empresa.toLowerCase().includes(search.toLowerCase()) || (l.contato || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "Todos" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const now = new Date();
  const today = format(now, "yyyy-MM-dd");

  const leadsToday = memberLeads.filter((l) => format(new Date(l.data_criacao), "yyyy-MM-dd") === today).length;
  const leadsThisMonth = memberLeads.filter((l) => { const d = new Date(l.data_criacao); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;

  const monthlyGoal = 300;
  const goalPct = monthlyGoal > 0 ? (leadsThisMonth / monthlyGoal) * 100 : 0;
  const workingDays = getWorkingDaysInMonth(now);
  const daysPassed = getWorkingDaysPassed(now);
  const dailyGoal = Math.ceil(monthlyGoal / workingDays);

  // LDR Commission
  const leadCommission = memberLeads.length * 1;
  const closedContractsValue = memberLeads.filter((l) => l.status === "fechado").reduce((sum, l) => sum + (l.valor_estimado || 0), 0);
  const contractCommission = closedContractsValue * 0.01;
  const totalCommission = leadCommission + contractCommission;

  // Qualification rate
  const qualifiedLeads = memberLeads.filter((l) => l.status !== "lead").length;
  const qualificationRate = memberLeads.length > 0 ? (qualifiedLeads / memberLeads.length) * 100 : 0;

  // Lead sources
  const sourceMap: Record<string, number> = {};
  memberLeads.forEach((l) => { const src = l.origem || "Outros"; sourceMap[src] = (sourceMap[src] || 0) + 1; });
  const sourceData = Object.entries(sourceMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

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
    setChecklist((prev) => prev.map((c) => c.id === item.id ? { ...c, concluida: newVal } : c));
    await supabase.from("checklist_projetos").update({ concluida: newVal, data_conclusao: newVal ? new Date().toISOString() : null }).eq("id", item.id);
  };

  const completedCount = checklist.filter((c) => c.concluida).length;

  // Activity feed
  const activityFeed = [...memberLeads].sort((a, b) => new Date(b.data_atualizacao).getTime() - new Date(a.data_atualizacao).getTime()).slice(0, 10);

  const handleAddLead = () => {
    if (!newLead.empresa) return;
    const leadData = { empresa: newLead.empresa, contato: newLead.contato || null, cargo: newLead.cargo || null, cidade: newLead.cidade || null, telefone: newLead.telefone || null, email: newLead.email || null, status: "lead" as const, responsavel_nome: memberName };
    addLead.mutate(leadData);
    writeToSheets({ tab: "leads", action: "append", record: leadData }).catch(() => {});
    setNewLead({ empresa: "", contato: "", cargo: "", cidade: "", telefone: "", email: "" });
    setShowForm(false);
  };

  const handleStatusChange = (lead: typeof allLeads[0], status: LeadStatus) => {
    updateLead.mutate({ id: lead.id, status });
    writeToSheets({ tab: "leads", action: "find_and_update", match_field: "empresa", match_value: lead.empresa, record: { ...lead, status } }).catch(() => {});
  };

  const greetingHour = now.getHours();
  const greeting = greetingHour < 12 ? "Bom dia" : greetingHour < 18 ? "Boa tarde" : "Boa noite";

  const tabs = [
    { key: "dashboard" as const, label: "Dashboard" },
    { key: "refinamento" as const, label: "Refinamento de Dados" },
    { key: "historico" as const, label: "Histórico Pipedrive" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-white/10">
        {tabs.map((tab) => (
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
      {activeTab === "dashboard" && (
      <>
      {/* Banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="glass-card p-5 flex items-center gap-4" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))", borderColor: "rgba(245,158,11,0.15)" }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: avatarColor }}>{initials}</div>
        <div>
          <p className="text-foreground font-semibold">{greeting}, {memberName}! Você gerou {leadsToday} leads hoje. Meta diária: {dailyGoal} leads. Continue assim! 🚀</p>
          <p className="text-xs text-muted-foreground mt-1">LDR · {memberLeads.length} leads gerados <SyncIndicator className="ml-2" /></p>
        </div>
        <div className="ml-auto">
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all"><Plus className="w-4 h-4" /> Novo Lead</button>
        </div>
      </motion.div>

      {/* ROW 1 — 4 Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Leads Hoje */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <CalendarCheck className="w-4 h-4" style={{ color: "hsl(45,80%,55%)" }} />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground"><AnimatedNumber value={leadsToday} /> <span className="text-sm text-muted-foreground font-normal">/ {dailyGoal}</span></p>
          <p className="text-xs text-muted-foreground mt-0.5">Leads Gerados Hoje</p>
          <div className="mt-2 h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((leadsToday / dailyGoal) * 100, 100)}%` }} transition={{ duration: 0.8 }}
              className="h-full rounded-full" style={{ background: leadsToday >= dailyGoal ? "hsl(160,100%,39%)" : "hsl(45,80%,55%)" }} />
          </div>
        </motion.div>

        {/* Leads do Mês */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }} className="glass-card p-4 flex items-center gap-4">
          <CircularProgress value={goalPct} size={64} strokeWidth={5} color="hsl(45,80%,55%)">
            <span className="text-xs font-bold" style={{ color: "hsl(45,80%,55%)" }}><AnimatedNumber value={goalPct} suffix="%" decimals={0} /></span>
          </CircularProgress>
          <div>
            <p className="text-lg font-bold text-foreground"><AnimatedNumber value={leadsThisMonth} /> <span className="text-sm text-muted-foreground font-normal">/ {monthlyGoal}</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">Leads do Mês</p>
          </div>
        </motion.div>

        {/* Comissão */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.2)" }}>
              <TrendingUp className="w-4 h-4" style={{ color: "hsl(20,80%,55%)" }} />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground"><AnimatedNumber value={totalCommission} formatAsCurrency /></p>
          <p className="text-[10px] text-muted-foreground mt-1">({memberLeads.length}×R$1) + (1%×{formatCurrency(closedContractsValue)})</p>
          <p className="text-xs text-muted-foreground mt-0.5">Comissão Acumulada</p>
        </motion.div>

        {/* Qualificação */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.24 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,200,150,0.12)", border: "1px solid rgba(0,200,150,0.2)" }}>
              <Target className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground"><AnimatedNumber value={qualificationRate} suffix="%" decimals={1} /></p>
          <p className="text-xs text-muted-foreground mt-0.5">Taxa de Qualificação</p>
          <p className="text-[10px] text-muted-foreground">{qualifiedLeads} qualificados de {memberLeads.length}</p>
        </motion.div>
      </div>

      {/* ROW 2 — Checklist + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" style={{ color: "hsl(45,80%,55%)" }} />
              <h2 className="text-sm font-semibold text-foreground">Checklist do Dia</h2>
            </div>
            <span className="text-xs text-muted-foreground">{completedCount} de {checklist.length} concluídas</span>
          </div>
          {checklist.length > 0 && (
            <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden mb-4">
              <motion.div initial={{ width: 0 }} animate={{ width: `${checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ background: "hsl(45,80%,55%)" }} />
            </div>
          )}
          {checklistLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-muted/30 rounded-lg animate-pulse" />)}</div>
          ) : checklist.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma tarefa encontrada</p>
          ) : (
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto scrollbar-thin">
              {checklist.map((item) => (
                <button key={item.id} onClick={() => handleToggleChecklist(item)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all hover:bg-white/[0.04] ${item.concluida ? "opacity-50" : ""}`}>
                  <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${item.concluida ? "border-amber-500" : "border-muted-foreground/30"}`} style={item.concluida ? { background: "hsl(45,80%,55%)" } : undefined}>
                    {item.concluida && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span className={`text-xs ${item.concluida ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.nome_etapa}</span>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4" style={{ color: "hsl(45,80%,55%)" }} />
            <h2 className="text-sm font-semibold text-foreground">Feed de Atividades</h2>
          </div>
          {activityFeed.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma atividade recente</p>
          ) : (
            <div className="space-y-2 max-h-[240px] overflow-y-auto scrollbar-thin">
              {activityFeed.map((lead) => (
                <div key={lead.id} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-all">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "hsl(45,80%,55%)" }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground"><span className="font-medium">{lead.empresa}</span> → <span className={statusBadgeColors[lead.status]?.text || "text-muted-foreground"}>{getStatusDisplay(lead.status)}</span></p>
                    <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(lead.data_atualizacao), { addSuffix: true, locale: ptBR })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ROW 3 — Lead Sources */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="glass-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Origem dos Leads</h2>
        {sourceData.length === 0 ? (
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

      {/* Add Lead Form */}
      {showForm && (
        <div className="glass-card p-4 space-y-3 animate-slide-up">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[{ key: "empresa", label: "Empresa *", placeholder: "Nome da empresa" }, { key: "contato", label: "Contato", placeholder: "Nome do contato" }, { key: "cargo", label: "Cargo", placeholder: "Cargo" }, { key: "cidade", label: "Cidade", placeholder: "Cidade" }, { key: "telefone", label: "Telefone", placeholder: "(11) 99999-0000" }, { key: "email", label: "E-mail", placeholder: "email@empresa.com" }].map((field) => (
              <div key={field.key}>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">{field.label}</label>
                <input type="text" value={newLead[field.key as keyof typeof newLead]} onChange={(e) => setNewLead({ ...newLead, [field.key]: e.target.value })} placeholder={field.placeholder} className="w-full h-9 px-3 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <button onClick={handleAddLead} disabled={addLead.isPending} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50">{addLead.isPending ? "Salvando..." : "Salvar"}</button>
          </div>
        </div>
      )}

      {/* ROW 4 — Filters & Leads Table */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar empresa ou contato..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-9 pl-9 pr-3 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {statusOptions.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{statusDisplayForFilter[s]}</button>
          ))}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground text-sm">Nenhum lead encontrado para {memberName}</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-primary hover:underline">Adicionar primeiro lead</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left p-4 font-medium">Empresa</th>
                  <th className="text-left p-4 font-medium">Contato</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Data</th>
                  <th className="text-left p-4 font-medium">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((lead) => {
                  const badge = statusBadgeColors[lead.status] || statusBadgeColors.lead;
                  return (
                    <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4"><p className="font-medium text-foreground">{lead.empresa}</p><p className="text-xs text-muted-foreground">{lead.cargo}</p></td>
                      <td className="p-4 text-muted-foreground">{lead.contato}</td>
                      <td className="p-4">
                        <select value={lead.status} onChange={(e) => handleStatusChange(lead, e.target.value as LeadStatus)}
                          className="text-xs border-0 focus:outline-none cursor-pointer rounded-full px-2.5 py-1 font-medium"
                          style={{ background: badge.bg, border: `1px solid ${badge.border}` }}>
                          {(["lead", "contatado", "reuniao_agendada", "reuniao_realizada", "proposta", "fechado", "perdido"] as LeadStatus[]).map((s) => (
                            <option key={s} value={s} className="bg-card text-foreground">{getStatusDisplay(s)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4 text-muted-foreground">{format(new Date(lead.data_criacao), "dd/MM/yyyy")}</td>
                      <td className="p-4 text-muted-foreground text-xs max-w-[200px] truncate">{lead.notas || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
