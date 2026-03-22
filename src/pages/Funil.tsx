import { TrendingUp } from "lucide-react";
import { useLeads, getStatusDisplay, LeadStatus } from "@/hooks/useLeads";

const stageOrder: LeadStatus[] = ["lead", "contatado", "reuniao_agendada", "reuniao_realizada", "proposta", "fechado"];
const stageColors: Record<LeadStatus, string> = {
  lead: "from-blue-400/80 to-blue-500/80",
  contatado: "from-sky-400/80 to-sky-500/80",
  reuniao_agendada: "from-yellow-400/80 to-yellow-500/80",
  reuniao_realizada: "from-orange-400/80 to-orange-500/80",
  proposta: "from-purple-400/80 to-purple-500/80",
  fechado: "from-emerald-400/80 to-emerald-500/80",
  perdido: "from-red-400/80 to-red-500/80",
};

export default function Funil() {
  const { data: leads = [], isLoading } = useLeads();

  const stageCounts = stageOrder.map((status) => ({
    status,
    name: getStatusDisplay(status),
    count: leads.filter((l) => l.status === status).length,
    gradient: stageColors[status],
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
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-muted/30 rounded animate-pulse" />
        <div className="glass-card p-8 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-muted/30 rounded-lg animate-pulse mx-auto" style={{ width: `${100 - i * 12}%` }} />
          ))}
        </div>
      </div>
    );
  }

  const maxWidth = 100;
  const minWidth = 28;
  const stepDecrease = (maxWidth - minWidth) / Math.max(stages.length - 1, 1);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>Funil de Vendas</h1>
        <p className="text-sm text-muted-foreground mt-1">{leads.length} leads no pipeline</p>
      </div>

      <div className="glass-card p-8 animate-slide-up">
        <div className="flex flex-col items-center gap-0">
          {stages.map((stage, i) => {
            const widthPct = maxWidth - i * stepDecrease;
            const nextWidthPct = i < stages.length - 1 ? maxWidth - (i + 1) * stepDecrease : widthPct - stepDecrease;

            return (
              <div key={stage.status} className="w-full flex flex-col items-center">
                {/* Dropoff indicator */}
                {stage.dropoff && (
                  <div className="flex items-center gap-2 py-1">
                    <span className="text-[10px] text-destructive font-medium tracking-wide">{stage.dropoff} drop-off</span>
                  </div>
                )}

                {/* Funnel segment — trapezoid shape */}
                <div
                  className="relative group transition-all duration-500 ease-out"
                  style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                >
                  <div
                    className="relative overflow-hidden transition-all duration-700 ease-out"
                    style={{
                      width: `${widthPct}%`,
                      minHeight: '56px',
                      clipPath: `polygon(0 0, 100% 0, ${50 + (nextWidthPct / widthPct) * 50}% 100%, ${50 - (nextWidthPct / widthPct) * 50}% 100%)`,
                    }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${stage.gradient} opacity-90 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                    <div className="relative z-10 flex items-center justify-center h-full min-h-[56px] px-4">
                      <div className="flex items-center gap-3 text-white">
                        <span className="text-sm font-semibold tracking-wide">{stage.name}</span>
                        <span className="text-xs font-bold bg-black/20 backdrop-blur-sm rounded-full px-2.5 py-0.5">
                          {stage.count}
                        </span>
                        <span className="text-[10px] font-medium opacity-75">
                          {stage.pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
