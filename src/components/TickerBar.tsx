import { TrendingUp, Users, Calendar, Target } from "lucide-react";

const metrics = [
  { label: "Leads do mês", value: "127", icon: Users, trend: "+12%" },
  { label: "Reuniões realizadas", value: "18", icon: Calendar, trend: "+5%" },
  { label: "Meta atingida", value: "64%", icon: Target, trend: null },
  { label: "Pipeline", value: "R$ 45.000", icon: TrendingUp, trend: "+8%" },
];

export function TickerBar() {
  return (
    <div className="ticker-bar h-10 flex items-center px-4 gap-6 overflow-x-auto text-xs">
      {metrics.map((m) => (
        <div key={m.label} className="flex items-center gap-2 flex-shrink-0">
          <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{m.label}:</span>
          <span className="font-semibold text-foreground">{m.value}</span>
          {m.trend && (
            <span className="text-success text-[10px] font-medium">{m.trend}</span>
          )}
        </div>
      ))}
      <div className="ml-auto text-muted-foreground flex-shrink-0">
        Última sync: agora
      </div>
    </div>
  );
}
