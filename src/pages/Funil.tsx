import { TrendingUp } from "lucide-react";
import { useLeads, getStatusDisplay, LeadStatus } from "@/hooks/useLeads";

const stageOrder: LeadStatus[] = ["lead", "contatado", "reuniao_agendada", "reuniao_realizada", "proposta", "fechado"];
const stageColors: Record<LeadStatus, string> = {
  lead: "bg-muted-foreground",
  contatado: "bg-blue-500",
  reuniao_agendada: "bg-yellow-500",
  reuniao_realizada: "bg-orange-500",
  proposta: "bg-purple-500",
  fechado: "bg-primary",
  perdido: "bg-destructive",
};

export default function Funil() {
  const { data: leads = [], isLoading } = useLeads();

  const stageCounts = stageOrder.map((status) => ({
    status,
    name: getStatusDisplay(status),
    count: leads.filter((l) => l.status === status).length,
    color: stageColors[status],
  }));

  const total = stageCounts[0]?.count || 1;

  const stages = stageCounts.map((s, i) => ({
    ...s,
    pct: total > 0 ? (s.count / total) * 100 : 0,
    dropoff: i > 0 && stageCounts[i - 1].count > 0
      ? `-${Math.round(((stageCounts[i - 1].count - s.count) / stageCounts[i - 1].count) * 100)}%`
      : undefined,
  }));

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="h-8 w-48 bg-muted/30 rounded animate-pulse" />
        <div className="glass-card p-6 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>Funil de Vendas</h1>
        <p className="text-sm text-muted-foreground mt-1">{leads.length} leads no pipeline</p>
      </div>

      <div className="glass-card p-6 space-y-4 animate-slide-up">
        {stages.map((stage) => (
          <div key={stage.status}>
            {stage.dropoff && (
              <div className="flex items-center gap-2 mb-1 ml-2">
                <div className="w-px h-4 bg-border" />
                <span className="text-xs text-destructive font-medium">{stage.dropoff} drop-off</span>
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="w-40 text-sm text-muted-foreground flex-shrink-0">{stage.name}</div>
              <div className="flex-1 h-10 bg-muted rounded-xl overflow-hidden relative">
                <div
                  className={`h-full ${stage.color} rounded-xl transition-all duration-1000`}
                  style={{ width: `${Math.max(stage.pct, 2)}%` }}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-foreground">
                  {stage.count}
                </span>
              </div>
              <div className="w-16 text-right text-sm font-medium text-foreground">
                {stage.pct.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {leads.length === 0 && (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">Adicione leads para visualizar o funil</p>
        </div>
      )}

      {leads.length > 0 && (
        <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: "200ms", animationFillMode: "backwards" }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <TrendingUp className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Conversão geral</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                De <span className="text-foreground font-medium">{stages[0]?.count || 0}</span> leads gerados,{" "}
                <span className="text-primary font-medium">{stages[stages.length - 1]?.count || 0}</span> foram fechados
                {" "}({total > 0 ? ((stages[stages.length - 1]?.count / total) * 100).toFixed(1) : 0}% de conversão).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
