import { useEffect, useState } from "react";
import { DollarSign, Users, Calendar as CalendarIcon, TrendingUp, Wallet, CalendarDays, Plus } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { SyncIndicator } from "@/components/SyncIndicator";
import { useLeads, getStatusDisplay, LeadStatus } from "@/hooks/useLeads";
import { format } from "date-fns";
import { CalendarioPreVendas } from "@/components/CalendarioPreVendas";
import { RegistrarVendaModal } from "@/components/RegistrarVendaModal";
import { Contrato, addContrato, currentMonthKey, fmtBRL, loadContratos } from "@/lib/contratos";

const stageOrder: LeadStatus[] = ["lead", "contatado", "reuniao_agendada", "reuniao_realizada", "proposta", "fechado"];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "calendario">("dashboard");
  const { data: leads = [], isLoading } = useLeads();

  const leadsCount = leads.length;
  const reunioesCount = leads.filter((l) => ["reuniao_realizada", "proposta", "fechado"].includes(l.status)).length;
  const fechados = leads.filter((l) => l.status === "fechado");
  const receita = fechados.reduce((sum, l) => sum + (l.valor_estimado || 0), 0);

  const stageCounts = stageOrder.map((status) => ({
    stage: getStatusDisplay(status),
    count: leads.filter((l) => l.status === status).length,
    pct: leadsCount > 0 ? (leads.filter((l) => l.status === status).length / leadsCount) * 100 : 0,
    color: {
      lead: "bg-muted-foreground",
      contatado: "bg-blue-500",
      reuniao_agendada: "bg-yellow-500",
      reuniao_realizada: "bg-orange-500",
      proposta: "bg-purple-500",
      fechado: "bg-primary",
    }[status] || "bg-muted",
  }));

  const recentLeads = leads.slice(0, 5);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl relative z-10">
        <div className="h-8 w-48 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl relative z-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground" style={{ lineHeight: "1.1" }}>Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral <SyncIndicator className="ml-2" /></p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: "dashboard" as const, label: "📊 Dashboard", icon: TrendingUp },
          { key: "calendario" as const, label: "📅 Calendário", icon: CalendarDays },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === tab.key
                ? "glass-button text-primary shadow-[0_0_20px_hsla(160,100%,39%,0.1)]"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
            }`}
            style={activeTab === tab.key ? { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(0,200,150,0.2)' } : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "calendario" ? (
        <CalendarioPreVendas />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard title="Leads gerados" value={String(leadsCount)} icon={Users} delay={0} />
            <MetricCard title="Reuniões realizadas" value={String(reunioesCount)} icon={CalendarIcon} delay={80} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="glass-card p-5 lg:col-span-1 animate-slide-up" style={{ animationDelay: "300ms", animationFillMode: "backwards" }}>
              <h2 className="text-sm font-semibold mb-4 text-foreground">Funil de Vendas</h2>
              <div className="space-y-3">
                {stageCounts.map((s) => (
                  <div key={s.stage}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{s.stage}</span>
                      <span className="text-foreground font-medium">{s.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className={`h-full rounded-full ${s.color} transition-all duration-700`} style={{ width: `${Math.max(s.pct, 1)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-5 lg:col-span-2 animate-slide-up" style={{ animationDelay: "380ms", animationFillMode: "backwards" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">Leads Recentes</h2>
                <span className="text-xs text-muted-foreground">{recentLeads.length} mais recentes</span>
              </div>
              {recentLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum lead cadastrado</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <th className="text-left pb-2 font-medium">Empresa</th>
                        <th className="text-left pb-2 font-medium">Cidade</th>
                        <th className="text-left pb-2 font-medium">Status</th>
                        <th className="text-left pb-2 font-medium">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLeads.map((lead) => (
                        <tr
                          key={lead.id}
                          className="hover:bg-white/[0.03] transition-all duration-300"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        >
                          <td className="py-2.5 font-medium text-foreground">{lead.empresa}</td>
                          <td className="py-2.5 text-muted-foreground">{lead.cidade || "—"}</td>
                          <td className="py-2.5"><StatusBadge status={getStatusDisplay(lead.status)} /></td>
                          <td className="py-2.5 text-muted-foreground">{format(new Date(lead.data_criacao), "dd/MM/yyyy")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
