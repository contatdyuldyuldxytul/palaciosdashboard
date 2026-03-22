import { useState } from "react";
import { useLeads, getStatusDisplay, LeadStatus, useAddLead, useUpdateLead } from "@/hooks/useLeads";
import { writeToSheets } from "@/hooks/useWriteSheets";
import { SyncIndicator } from "@/components/SyncIndicator";
import { Plus, Search, Phone, FileText, TrendingUp, Users, Target, CalendarCheck } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const stageOrder: LeadStatus[] = ["lead", "contatado", "reuniao_agendada", "reuniao_realizada", "proposta", "fechado"];

const stageColors: Record<LeadStatus, string> = {
  lead: "bg-[hsl(230,80%,65%)]",
  contatado: "bg-[hsl(260,70%,60%)]",
  reuniao_agendada: "bg-[hsl(290,60%,55%)]",
  reuniao_realizada: "bg-[hsl(330,65%,55%)]",
  proposta: "bg-[hsl(20,80%,55%)]",
  fechado: "bg-[hsl(150,60%,40%)]",
  perdido: "bg-[hsl(0,60%,50%)]",
};

interface TeamMemberDashboardProps {
  memberName: string;
  initials: string;
}

const statusOptions: Array<"Todos" | LeadStatus> = ["Todos", "lead", "contatado", "reuniao_agendada", "reuniao_realizada", "proposta", "fechado", "perdido"];
const statusDisplayForFilter: Record<string, string> = {
  Todos: "Todos", lead: "Lead", contatado: "Contatado", reuniao_agendada: "Reunião Agendada",
  reuniao_realizada: "Reunião Realizada", proposta: "Proposta", fechado: "Fechado", perdido: "Perdido",
};

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

export default function TeamMemberDashboard({ memberName, initials }: TeamMemberDashboardProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [showForm, setShowForm] = useState(false);
  const [newLead, setNewLead] = useState({ empresa: "", contato: "", cargo: "", cidade: "", telefone: "", email: "" });

  const { data: allLeads = [], isLoading } = useLeads();
  const addLead = useAddLead();
  const updateLead = useUpdateLead();

  // Filter leads for this team member
  const memberLeads = allLeads.filter(
    (l) => (l.responsavel_nome || "").toLowerCase().trim() === memberName.toLowerCase().trim()
  );

  const filtered = memberLeads.filter((l) => {
    const matchSearch = l.empresa.toLowerCase().includes(search.toLowerCase()) ||
      (l.contato || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "Todos" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Metrics
  const now = new Date();
  const thisMonthLeads = memberLeads.filter((l) => {
    const d = new Date(l.data_criacao);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const meetingsDone = memberLeads.filter((l) => ["reuniao_realizada", "proposta", "fechado"].includes(l.status)).length;
  const closedCount = memberLeads.filter((l) => l.status === "fechado").length;
  const conversionRate = memberLeads.length > 0 ? (closedCount / memberLeads.length) * 100 : 0;
  const estimatedCommission = memberLeads
    .filter((l) => l.status === "fechado")
    .reduce((sum, l) => sum + (l.valor_estimado || 0) * 0.05, 0);

  // Mini funnel
  const funnelData = stageOrder.map((status) => ({
    status,
    name: getStatusDisplay(status),
    count: memberLeads.filter((l) => l.status === status).length,
  }));
  const maxFunnelCount = Math.max(...funnelData.map((s) => s.count), 1);

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

  const metrics = [
    { label: "Leads este mês", value: String(thisMonthLeads.length), icon: Users, color: "hsl(230,80%,65%)" },
    { label: "Reuniões realizadas", value: String(meetingsDone), icon: CalendarCheck, color: "hsl(290,60%,55%)" },
    { label: "Taxa de conversão", value: `${conversionRate.toFixed(1)}%`, icon: Target, color: "hsl(150,60%,40%)" },
    { label: "Comissão estimada", value: formatCurrency(estimatedCommission), icon: TrendingUp, color: "hsl(20,80%,55%)" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: "hsl(160,60%,38%)" }}>
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>Dashboard — {memberName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{memberLeads.length} leads no total <SyncIndicator className="ml-2" /></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/vendas/scripts" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all" style={{ border: '1px solid var(--glass-border)' }}>
            <FileText className="w-4 h-4" /> Scripts
          </Link>
          <Link to="/vendas/ligacoes" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all" style={{ border: '1px solid var(--glass-border)' }}>
            <Phone className="w-4 h-4" /> Ligações
          </Link>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all">
            <Plus className="w-4 h-4" /> Novo Lead
          </button>
        </div>
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

      {/* Mini Funnel */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card p-5"
      >
        <h2 className="text-sm font-semibold text-foreground mb-4">Funil de {memberName}</h2>
        <div className="space-y-2">
          {funnelData.map((stage) => {
            const widthPct = maxFunnelCount > 0 ? (stage.count / maxFunnelCount) * 100 : 0;
            return (
              <div key={stage.status} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-32 text-right truncate">{stage.name}</span>
                <div className="flex-1 h-7 rounded-md bg-muted/20 overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(widthPct, 2)}%` }}
                    transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className={`h-full rounded-md ${stageColors[stage.status]}`}
                    style={{ opacity: 0.85 }}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-foreground tabular-nums">
                    {stage.count}
                  </span>
                </div>
              </div>
            );
          })}
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
                  <th className="text-left p-4 font-medium">Cidade</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Valor Est.</th>
                  <th className="text-left p-4 font-medium">Data</th>
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
                    <td className="p-4 text-muted-foreground">{lead.cidade}</td>
                    <td className="p-4">
                      <select value={lead.status} onChange={(e) => handleStatusChange(lead, e.target.value as LeadStatus)}
                        className="bg-transparent text-xs border-0 focus:outline-none cursor-pointer">
                        {(["lead", "contatado", "reuniao_agendada", "reuniao_realizada", "proposta", "fechado", "perdido"] as LeadStatus[]).map((s) => (
                          <option key={s} value={s} className="bg-card text-foreground">{getStatusDisplay(s)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4 text-muted-foreground tabular-nums">{formatCurrency(lead.valor_estimado || 0)}</td>
                    <td className="p-4 text-muted-foreground">{format(new Date(lead.data_criacao), "dd/MM/yyyy")}</td>
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
