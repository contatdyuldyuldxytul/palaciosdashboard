import { type LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  delay?: number;
}

export function MetricCard({ title, value, subtitle, icon: Icon, trend, trendUp = true, delay = 0 }: MetricCardProps) {
  return (
    <div
      className="glass-gradient-card glass-card-hover p-5 animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: 'rgba(0, 200, 150, 0.1)',
            border: '1px solid rgba(0, 200, 150, 0.15)',
          }}
        >
          <Icon className="w-4 h-4 text-primary" />
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trendUp ? "text-success" : "text-destructive"}`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{title}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}
