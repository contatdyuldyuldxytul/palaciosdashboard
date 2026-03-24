import { useState } from "react";
import { useLeads, getStatusDisplay, LeadStatus, useAddLead, useUpdateLead } from "@/hooks/useLeads";
import { writeToSheets } from "@/hooks/useWriteSheets";
import { SyncIndicator } from "@/components/SyncIndicator";
import { Plus, Search, Users, Target, TrendingUp, CalendarCheck } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface LdrMemberDashboardProps {
  memberName: string;
  initials: string;
  avatarColor?: string;
}

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function getWorkingDaysInMonth(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  let count = 0;
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function getWorkingDaysPassed(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  let count = 0;
  const d = new Date(year, month, 1);
  while (d <= date) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

const statusOptions: Array<"Todos" | LeadStatus> = ["Todos", "lead", "contatado", "reuniao_agendada", "reuniao_realizada", "proposta", "fechado", "perdido"];
const statusDisplayForFilter: Record<string, string> = {
  Todos: "Todos", lead: "Lead", contatado: "Contatado", reuniao_agendada: "Reunião Agendada",
  reuniao_realizada: "Reunião Realizada", proposta: "Proposta", fechado: "Fechado", perdido: "Perdido",
};

export default function LdrMemberDashboard({ memberName, initials, avatarColor = "hsl(45,80%,45%)" }: LdrMemberDashboardProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [showForm, setShowForm] = useState(false);
  const [newLead, setNewLead] = useState({ empresa: "", contato: "", cargo: "", cidade: "", telefone: "", email: "" });

  const { data: allLeads = [], isLoading } = useLeads();
  const addLead = useAddLead();
  const updateLead = useUpdateLead();

  const memberLeads = allLeads.filter(
    (l) => (l.responsavel_nome || "").toLowerCase().trim() === memberName.toLowerCase().trim()
  );

  const filtered = memberLeads.filter((l) => {
    const matchSearch = l.empresa.toLowerCase().includes(search.toLowerCase()) ||
      (l.contato || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "Todos" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const now = new Date();
  const today = format(now, "yyyy-MM-dd");

  // LDR Metrics
  const leadsToday = memberLeads.filter((l) => format(new Date(l.data_criacao), "yyyy-MM-dd") === today).length;
  const leadsThisMonth = memberLeads.filter((l) => {
    const d = new Date(l.data_criacao);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const monthlyGoal = 200; // meta mensal de leads
  const goalPct = monthlyGoal > 0 ? (leadsThisMonth / monthlyGoal) * 100 : 0;

  const workingDays = getWorkingDaysInMonth(now);
  const daysPassed = getWorkingDaysPassed(now);
  const dailyGoal = Math.ceil(monthlyGoal / workingDays);
  const expectedByNow = dailyGoal * daysPassed;
  const dailyProgressPct = expectedByNow > 0 ? (leadsThisMonth / expectedByNow) * 100 : 0;

  // LDR Commission: R$1/lead + 1% of closed contracts from her leads
  const leadCommission = memberLeads.length * 1;
  const closedContractsValue = memberLeads
    .filter((l) => l.status === "fechado")
    .reduce((sum, l) => sum + (l.valor_estimado || 0), 0);
  const contractCommission = closedContractsValue * 0.01;
  const totalCommission = leadCommission + contractCommission;

  const metrics = [
    { label: "Leads gerados hoje", value: String(leadsToday), icon: CalendarCheck, color: "hsl(45,80%,55%)" },
    { label: "Leads no mês", value: `${leadsThisMonth} / ${monthlyGoal}`, icon: Users, color: "hsl(230,80%,65%)" },
    { label: "Meta atingida", value: `${goalPct.toFixed(1)}%`, icon: Target, color: goalPct >= 100 ? "hsl(150,60%,40%)" : goalPct >= 70 ? "hsl(45,80%,55%)" : "hsl(0,60%,50%)" },
    { label: "Comissão estimada", value: formatCurrency(totalCommission), icon: TrendingUp, color: "hsl(20,80%,55%)" },
  ];

  const handleAddLead = () => {
    if (!newLead.empresa) return;
    const leadData = {
      empresa: newLead.empresa, contato: newLead.contato || null, cargo: newLead.cargo || null,
      cidade: newLead.cidade || null, telefone: newLead.telefone || null, email: newLead.email || null,
      status: "lead" as const, responsavel_nome: memberName,
    };
    addLead.mutate(leadData);
    writeToSheets({ tab: "leads", action: "append", record: leadData }).catch(() => {});
    setNewLead({ empresa: "", contato: "", cargo: "", cidade: "", telefone: "", email: "" });
    setShowForm(false);
  };

  const handleStatusChange = (lead: typeof allLeads[0], status: LeadStatus) => {
    updateLead.mutate({ id: lead.id, status });
    writeToSheets({ tab: "leads", action: "find_and_update", match_field: "empresa", match_value: lead.empresa, record: { ...lead, status } }).catch(() => {});
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: avatarColor }}>
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>Dashboard — {memberName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              LDR · {memberLeads.length} leads gerados <SyncIndicator className="ml-2" />
            </p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all">
          <Plus className="w-4 h-4" /> Novo Lead
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${m.color}20`, border: `1px solid ${m.color}30` }}>
                <m.icon className="w-4 h-4" style={{ color: m.color }} />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground tabular-nums">{m.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Daily Progress */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Progresso diário</h2>
          <span className="text-xs text-muted-foreground">Meta diária: {dailyGoal} leads · Dia {daysPassed}/{workingDays}</span>
        </div>
        <div className="h-3 rounded-full bg-muted/30 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(dailyProgressPct, 100)}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full"
            style={{
              background: dailyProgressPct >= 100
                ? "hsl(150,60%,40%)"
                : dailyProgressPct >= 70
                ? "hsl(45,80%,55%)"
                : "hsl(0,60%,50%)",
            }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-muted-foreground">{leadsThisMonth} leads gerados</span>
          <span className="text-xs text-muted-foreground">Esperado até hoje: {expectedByNow}</span>
        </div>
      </motion.div>

      {/* Commission Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card p-5"
      >
        <h2 className="text-sm font-semibold text-foreground mb-3">Calculadora de comissão (LDR)</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-foreground tabular-nums">{formatCurrency(leadCommission)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{memberLeads.length} leads × R$1</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground tabular-nums">{formatCurrency(contractCommission)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">1% de {formatCurrency(closedContractsValue)}</p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 rounded-xl" style={{ background: "hsl(45,80%,55%)", opacity: 0.08 }} />
            <p className="text-lg font-bold tabular-nums relative" style={{ color: "hsl(45,80%,55%)" }}>{formatCurrency(totalCommission)}</p>
            <p className="text-[11px] text-muted-foreground mt-1 relative">Total estimado</p>
          </div>
        </div>
      </motion.div>

      {/* Add Lead Form */}
      {showForm && (
        <div className="glass-card p-4 space-y-3 animate-slide-up">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: "empresa", label: "Empresa *", placeholder: "Nome da empresa" },
              { key: "contato", label: "Contato", placeholder: "Nome do contato" },
              { key: "cargo", label: "Cargo", placeholder: "Cargo" },
              { key: "cidade", label: "Cidade", placeholder: "Cidade" },
              { key: "telefone", label: "Telefone", placeholder: "(11) 99999-0000" },
              { key: "email", label: "E-mail", placeholder: "email@empresa.com" },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">{field.label}</label>
                <input
                  type="text"
                  value={newLead[field.key as keyof typeof newLead]}
                  onChange={(e) => setNewLead({ ...newLead, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full h-9 px-3 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <button onClick={handleAddLead} disabled={addLead.isPending} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50">
              {addLead.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar empresa ou contato..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {statusOptions.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {statusDisplayForFilter[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.45, ease: [0.16, 1, 0.3, 1] }} className="glass-card overflow-hidden">
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
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-foreground">{lead.empresa}</p>
                      <p className="text-xs text-muted-foreground">{lead.cargo}</p>
                    </td>
                    <td className="p-4 text-muted-foreground">{lead.contato}</td>
                    <td className="p-4">
                      <select value={lead.status} onChange={(e) => handleStatusChange(lead, e.target.value as LeadStatus)}
                        className="bg-transparent text-xs border-0 focus:outline-none cursor-pointer">
                        {(["lead", "contatado", "reuniao_agendada", "reuniao_realizada", "proposta", "fechado", "perdido"] as LeadStatus[]).map((s) => (
                          <option key={s} value={s} className="bg-card text-foreground">{getStatusDisplay(s)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4 text-muted-foreground">{format(new Date(lead.data_criacao), "dd/MM/yyyy")}</td>
                    <td className="p-4 text-muted-foreground text-xs max-w-[200px] truncate">{lead.notas || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
