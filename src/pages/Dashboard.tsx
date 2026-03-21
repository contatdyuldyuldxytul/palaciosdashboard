import { DollarSign, Users, Calendar, TrendingUp, Target, FileText } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";

const recentLeads = [
  { name: "MRV Engenharia", city: "São Paulo", status: "Reunião Agendada", resp: "Carlos" },
  { name: "Cyrela Brazil Realty", city: "Rio de Janeiro", status: "Proposta", resp: "Ana" },
  { name: "Tenda Construtora", city: "Belo Horizonte", status: "Contatado", resp: "Carlos" },
  { name: "Direcional Engenharia", city: "Goiânia", status: "Lead", resp: "Pedro" },
  { name: "Even Construtora", city: "São Paulo", status: "Fechado", resp: "Ana" },
];

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral de março 2026</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Receita do mês"
          value="R$ 12.800"
          icon={DollarSign}
          trend="+18%"
          delay={0}
        />
        <MetricCard
          title="Leads gerados"
          value="127"
          subtitle="Meta: 333"
          icon={Users}
          trend="+12%"
          delay={80}
        />
        <MetricCard
          title="Reuniões realizadas"
          value="18"
          subtitle="Meta: 14"
          icon={Calendar}
          trend="+28%"
          delay={160}
        />
        <MetricCard
          title="Meta atingida"
          value="64%"
          subtitle="Faltam R$ 7.200"
          icon={Target}
          trend="-"
          trendUp={false}
          delay={240}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Funnel Summary */}
        <div className="glass-card p-5 lg:col-span-1 animate-slide-up" style={{ animationDelay: "300ms", animationFillMode: "backwards" }}>
          <h2 className="text-sm font-semibold mb-4">Funil de Vendas</h2>
          <div className="space-y-3">
            {[
              { stage: "Gerado", count: 127, pct: 100, color: "bg-muted-foreground" },
              { stage: "Contatado", count: 41, pct: 32, color: "bg-blue-500" },
              { stage: "Reunião Agendada", count: 22, pct: 17, color: "bg-yellow-500" },
              { stage: "Reunião Realizada", count: 18, pct: 14, color: "bg-orange-500" },
              { stage: "Proposta", count: 6, pct: 5, color: "bg-purple-500" },
              { stage: "Fechado", count: 1, pct: 1, color: "bg-primary" },
            ].map((s) => (
              <div key={s.stage}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{s.stage}</span>
                  <span className="text-foreground font-medium">{s.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.color} transition-all duration-700`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="glass-card p-5 lg:col-span-2 animate-slide-up" style={{ animationDelay: "380ms", animationFillMode: "backwards" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Leads Recentes</h2>
            <span className="text-xs text-muted-foreground">Últimos 5</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left pb-2 font-medium">Empresa</th>
                  <th className="text-left pb-2 font-medium">Cidade</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-left pb-2 font-medium">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentLeads.map((lead) => (
                  <tr key={lead.name} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 font-medium text-foreground">{lead.name}</td>
                    <td className="py-2.5 text-muted-foreground">{lead.city}</td>
                    <td className="py-2.5"><StatusBadge status={lead.status} /></td>
                    <td className="py-2.5 text-muted-foreground">{lead.resp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AI Insight */}
      <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: "460ms", animationFillMode: "backwards" }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-1">Insight IA</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Você perde <span className="text-warning font-medium">68%</span> dos leads entre Reunião Realizada e Proposta. 
              Recomendação: envie a proposta em até <span className="text-primary font-medium">24 horas</span> após a reunião 
              para aumentar a taxa de conversão.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
