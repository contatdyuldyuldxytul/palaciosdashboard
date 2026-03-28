import { useState, useEffect, useMemo } from "react";
import { useLeads, getStatusDisplay, LeadStatus, useAddLead, useUpdateLead } from "@/hooks/useLeads";
import { usePipedrive, PipedriveDeal } from "@/hooks/usePipedrive";
import { writeToSheets } from "@/hooks/useWriteSheets";
import { SyncIndicator } from "@/components/SyncIndicator";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { CircularProgress } from "@/components/CircularProgress";
import { Plus, Search, Phone, FileText, TrendingUp, Users, Target, CalendarCheck, CheckCircle2, Activity } from "lucide-react";
import { CadenceChecklist } from "@/components/CadenceChecklist";
import { CalendarioPreVendas } from "@/components/CalendarioPreVendas";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const stageOrder: LeadStatus[] = ["lead", "contatado", "reuniao_agendada", "reuniao_realizada", "proposta", "fechado"];
const stageColors: Record<LeadStatus, string> = {
  lead: "bg-[hsl(230,80%,65%)]", contatado: "bg-[hsl(260,70%,60%)]",
  reuniao_agendada: "bg-[hsl(290,60%,55%)]", reuniao_realizada: "bg-[hsl(330,65%,55%)]",
  proposta: "bg-[hsl(20,80%,55%)]", fechado: "bg-[hsl(150,60%,40%)]", perdido: "bg-[hsl(0,60%,50%)]",
};

interface TeamMemberDashboardProps { memberName: string; initials: string; }

const statusOptions: Array<"Todos" | LeadStatus> = ["Todos", "lead", "contatado", "reuniao_agendada", "reuniao_realizada", "proposta", "fechado", "perdido"];
const statusDisplayForFilter: Record<string, string> = {
  Todos: "Todos", lead: "Lead", contatado: "Contatado", reuniao_agendada: "Reunião Agendada",
  reuniao_realizada: "Reunião Realizada", proposta: "Proposta", fechado: "Fechado", perdido: "Perdido",
};

const statusBadgeColors: Record<string, { bg: string; text: string; border: string }> = {
  lead: { bg: "rgba(255,255,255,0.06)", text: "text-muted-foreground", border: "rgba(255,255,255,0.08)" },
  contatado: { bg: "rgba(59,130,246,0.12)", text: "text-blue-400", border: "rgba(59,130,246,0.2)" },
  reuniao_agendada: { bg: "rgba(234,179,8,0.12)", text: "text-yellow-400", border: "rgba(234,179,8,0.2)" },
  reuniao_realizada: { bg: "rgba(249,115,22,0.12)", text: "text-orange-400", border: "rgba(249,115,22,0.2)" },
  proposta: { bg: "rgba(168,85,247,0.12)", text: "text-purple-400", border: "rgba(168,85,247,0.2)" },
  fechado: { bg: "rgba(0,200,150,0.12)", text: "text-primary", border: "rgba(0,200,150,0.2)" },
  perdido: { bg: "rgba(239,68,68,0.12)", text: "text-destructive", border: "rgba(239,68,68,0.2)" },
};

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

interface ChecklistItem {
  id: string;
  cliente_id: string;
  etapa: number;
  nome_etapa: string;
  concluida: boolean;
  responsavel: string | null;
  notas: string | null;
}

export default function TeamMemberDashboard({ memberName, initials }: TeamMemberDashboardProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "calendario">("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [showForm, setShowForm] = useState(false);
  const [newLead, setNewLead] = useState({ empresa: "", contato: "", cargo: "", cidade: "", telefone: "", email: "" });
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(true);

  const { data: allLeads = [], isLoading } = useLeads();
  const addLead = useAddLead();
  const updateLead = useUpdateLead();
  const { deals: pipedriveDeals } = usePipedrive();

  const memberLeads = allLeads.filter(
    (l) => (l.responsavel_nome || "").toLowerCase().trim() === memberName.toLowerCase().trim()
  );

  const filtered = memberLeads.filter((l) => {
    const matchSearch = l.empresa.toLowerCase().includes(search.toLowerCase()) || (l.contato || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "Todos" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const now = new Date();
  const thisMonthLeads = memberLeads.filter((l) => { const d = new Date(l.data_criacao); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const meetingsDone = memberLeads.filter((l) => ["reuniao_realizada", "proposta", "fechado"].includes(l.status)).length;
  const closedCount = memberLeads.filter((l) => l.status === "fechado").length;
  const closedValue = memberLeads.filter((l) => l.status === "fechado").reduce((s, l) => s + (l.valor_estimado || 0), 0);
  const conversionRate = memberLeads.length > 0 ? (closedCount / memberLeads.length) * 100 : 0;

  // SDR Commission: R$2,000 fixed + R$30/meeting + 4% contracts
  const commission = 2000 + (meetingsDone * 30) + (closedValue * 0.04);
  const metaMensal = 20000;
  const metaPct = metaMensal > 0 ? (closedValue / metaMensal) * 100 : 0;
  const metaReunioes = 15;
  const reunioesRestantes = Math.max(metaReunioes - meetingsDone, 0);

  // Fetch checklist
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

  // Activity feed: last 10 leads sorted by update date
  const activityFeed = [...memberLeads]
    .sort((a, b) => new Date(b.data_atualizacao).getTime() - new Date(a.data_atualizacao).getTime())
    .slice(0, 10);

  // Pipedrive Funnel (same as Pré-Vendas page)
  const PIPEDRIVE_STAGES = [
    { key: "Entrada de Leads", label: "Entrada de Leads", merge: undefined as string[] | undefined },
    { key: "Tentando Contato", label: "Tentando Contato", merge: ["Tentando Contato #A", "Tentando Contato #B"] },
    { key: "Contato Realizado", label: "Contato Realizado", merge: ["Contato Realizado #A", "Contato Realizado #B"] },
    { key: "Contato com o Decisor", label: "Contato c/ Decisor" },
    { key: "Demo Agendada", label: "Demo Agendada" },
  ];
  const SIDE_STAGES = [
    { key: "Hold", stages: ["Hold"], label: "Hold", sublabel: "Empreendimentos futuros" },
    { key: "Recicláveis", stages: ["Recicláveis"], label: "Recicláveis", sublabel: "Prospectar no futuro" },
    { key: "Porta Aberta", stages: ["Porta Aberta Decisores"], label: "Porta Aberta", sublabel: "Sem momento agora" },
  ];
  const pCnt = (names: string[]) => pipedriveDeals.filter(d => d.status === "open" && names.includes(d.pipedrive_stage)).length;
  const pipeFunnel = PIPEDRIVE_STAGES.map(s => ({ ...s, count: pCnt(s.merge || [s.key]) }));
  const pipeSide = SIDE_STAGES.map(s => ({ ...s, count: pCnt(s.stages) }));
  const pipeTotalFunnel = pipeFunnel.reduce((s, f) => s + f.count, 0);
  const pipeGradients = [
    "from-[hsl(230,80%,65%)] to-[hsl(250,70%,55%)]",
    "from-[hsl(260,70%,60%)] to-[hsl(280,65%,50%)]",
    "from-[hsl(290,60%,55%)] to-[hsl(320,60%,50%)]",
    "from-[hsl(330,65%,55%)] to-[hsl(350,60%,50%)]",
    "from-[hsl(150,60%,40%)] to-[hsl(160,55%,35%)]",
  ];
  const BENCHMARKS = [null, 85, 70, 40, 50];
  const pipeCumulative = [...pipeFunnel].map(f => f.count);
  for (let i = pipeFunnel.length - 2; i >= 0; i--) {
    pipeCumulative[i] = pipeFunnel[i].count + pipeCumulative[i + 1];
  }
  const pipeConvs = pipeFunnel.map((s, i) => {
    if (i === 0) return null;
    const totalPrev = pipeCumulative[i - 1];
    const totalCur = pipeCumulative[i];
    const pct = totalPrev > 0 ? (totalCur / totalPrev) * 100 : 0;
    return { from: pipeFunnel[i - 1].label, to: s.label, pct, bench: BENCHMARKS[i] };
  }).filter(Boolean) as { from: string; to: string; pct: number; bench: number | null }[];

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

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-white/10">
        {([
          { key: "dashboard" as const, label: "Dashboard" },
          { key: "calendario" as const, label: "📅 Calendário" },
        ]).map(tab => (
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

      {activeTab === "calendario" && <CalendarioPreVendas defaultFilter="Aline" />}
      {activeTab === "dashboard" && (
      <>
      {/* Banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="glass-card p-5 flex items-center gap-4" style={{ background: "linear-gradient(135deg, rgba(0,200,150,0.08), rgba(0,200,150,0.02))", borderColor: "rgba(0,200,150,0.15)" }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: "hsl(160,60%,38%)" }}>{initials}</div>
        <div>
          <p className="text-foreground font-semibold">{greeting}, {memberName}! {reunioesRestantes > 0 ? `Você está a ${reunioesRestantes} reuniões de bater sua meta.` : "Você bateu sua meta de reuniões! 🎉"} Vamos lá! 🚀</p>
          <p className="text-xs text-muted-foreground mt-1">{memberLeads.length} leads no total <SyncIndicator className="ml-2" /></p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/vendas/scripts" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all" style={{ border: '1px solid var(--glass-border)' }}><FileText className="w-4 h-4" /> Scripts</Link>
          <Link to="/vendas/ligacoes" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all" style={{ border: '1px solid var(--glass-border)' }}><Phone className="w-4 h-4" /> Ligações</Link>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all"><Plus className="w-4 h-4" /> Novo Lead</button>
        </div>
      </motion.div>

      {/* ROW 1 — 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Meta do Mês */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0 }} className="glass-card p-4 flex items-center gap-4">
          <CircularProgress value={metaPct} size={64} strokeWidth={5} color="hsl(160,100%,39%)">
            <span className="text-xs font-bold text-primary"><AnimatedNumber value={metaPct} suffix="%" decimals={0} /></span>
          </CircularProgress>
          <div>
            <p className="text-lg font-bold text-foreground"><AnimatedNumber value={closedValue} formatAsCurrency /></p>
            <p className="text-[11px] text-muted-foreground">Meta: {formatCurrency(metaMensal)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Meta do Mês</p>
          </div>
        </motion.div>

        {/* Comissão */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.2)" }}>
              <TrendingUp className="w-4 h-4" style={{ color: "hsl(20,80%,55%)" }} />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground"><AnimatedNumber value={commission} formatAsCurrency /></p>
          <p className="text-[10px] text-muted-foreground mt-1">R$2.000 + ({meetingsDone}×R$30) + (4%×{formatCurrency(closedValue)})</p>
          <p className="text-xs text-muted-foreground mt-0.5">Comissão Acumulada</p>
        </motion.div>

        {/* Reuniões */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.2)" }}>
              <CalendarCheck className="w-4 h-4" style={{ color: "hsl(280,60%,60%)" }} />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground"><AnimatedNumber value={meetingsDone} /> <span className="text-sm text-muted-foreground font-normal">/ {metaReunioes}</span></p>
          <p className="text-xs text-muted-foreground mt-0.5">Reuniões Realizadas</p>
          <div className="mt-2 h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((meetingsDone / metaReunioes) * 100, 100)}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-purple-500" />
          </div>
        </motion.div>

        {/* Conversão */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.24 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,200,150,0.12)", border: "1px solid rgba(0,200,150,0.2)" }}>
              <Target className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground"><AnimatedNumber value={conversionRate} suffix="%" decimals={1} /></p>
          <p className="text-xs text-muted-foreground mt-0.5">Taxa de Conversão</p>
          <p className="text-[10px] text-muted-foreground">{closedCount} fechados de {memberLeads.length} leads</p>
        </motion.div>
      </div>

      {/* ROW 2 — Checklist + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Checklist */}
        <CadenceChecklist colaborador={memberName} accentColor="hsl(160,100%,39%)" />

        {/* Activity Feed */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Feed de Atividades</h2>
          </div>
          {activityFeed.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma atividade recente</p>
          ) : (
            <div className="space-y-2 max-h-[240px] overflow-y-auto scrollbar-thin">
              {activityFeed.map((lead) => (
                <div key={lead.id} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-all">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground">
                      <span className="font-medium">{lead.empresa}</span> → <span className={statusBadgeColors[lead.status]?.text || "text-muted-foreground"}>{getStatusDisplay(lead.status)}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(lead.data_atualizacao), { addSuffix: true, locale: ptBR })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ROW 3 — Pipedrive Funnel (same as Pré-Vendas) */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Funil de Pré-Vendas</h2>
          <span className="text-[10px] text-muted-foreground">ALINE'S PIPELINE · {pipedriveDeals.filter(d => d.status === "open").length} ativos</span>
        </div>
        <div className="grid grid-cols-[1fr_160px] gap-4 items-stretch">
          {/* Funnel */}
          <div className="flex flex-col gap-1">
            {pipeFunnel.map((s, i) => {
              const maxW = 100;
              const minW = 40;
              const stp = (maxW - minW) / Math.max(pipeFunnel.length - 1, 1);
              const w = maxW - i * stp;
              const convBetween = i > 0 && (i - 1) < pipeConvs.length ? pipeConvs[i - 1] : null;
              return (
                <div key={s.key} className="flex flex-col items-center">
                  {convBetween && (
                    <div className="flex items-center gap-2 py-0.5">
                      <span className="text-muted-foreground/40 text-xs">↓</span>
                      <span className="text-xs font-bold tabular-nums" style={{
                        color: (convBetween.bench ? convBetween.pct / convBetween.bench : 1) >= 1
                          ? "hsl(155,60%,45%)"
                          : (convBetween.bench ? convBetween.pct / convBetween.bench : 1) >= 0.7
                            ? "hsl(45,80%,55%)"
                            : "hsl(0,70%,55%)"
                      }}>
                        {convBetween.pct.toFixed(1)}%
                      </span>
                      {convBetween.bench && (
                        <span className="text-[9px] text-muted-foreground/50 tabular-nums">vs {convBetween.bench}%</span>
                      )}
                    </div>
                  )}
                  <div className={`relative rounded-lg overflow-hidden ${i === pipeFunnel.length - 1 ? "ring-1 ring-emerald-500/30" : ""}`}
                    style={{ width: `${w}%`, height: "48px" }}>
                    <div className={`absolute inset-0 bg-gradient-to-r ${pipeGradients[i]} opacity-85`} />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent" />
                    <div className="absolute inset-0 border border-white/[0.08] rounded-lg" />
                    <div className="relative z-10 flex items-center justify-between h-full px-3">
                      <span className="text-xs font-semibold text-white">{s.label}</span>
                      <span className="text-xs font-bold bg-black/25 rounded-full px-2 py-0.5 text-white/90 tabular-nums">{s.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Side cards */}
          <div className="flex flex-col gap-2">
            {pipeSide.map((c) => (
              <div key={c.key} className="rounded-lg border border-border/40 backdrop-blur-md bg-secondary p-2.5 flex-1 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-foreground">{c.label}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{c.sublabel}</p>
                </div>
                <p className="text-lg font-extrabold text-foreground tabular-nums">{c.count}</p>
              </div>
            ))}
          </div>
        </div>
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
                  <th className="text-left p-4 font-medium">Última Interação</th>
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
                      <td className="p-4 text-muted-foreground text-xs">{format(new Date(lead.data_atualizacao), "dd/MM/yyyy")}</td>
                      <td className="p-4 text-muted-foreground text-xs max-w-[200px] truncate">{lead.notas || "—"}</td>
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
