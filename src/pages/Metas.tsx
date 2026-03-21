import { Target } from "lucide-react";

export default function Metas() {
  const meta = 20000;
  const realizado = 12800;
  const pct = Math.round((realizado / meta) * 100);
  const falta = meta - realizado;

  const circumference = 2 * Math.PI * 45;
  const dashoffset = circumference * (1 - pct / 100);

  const progressColor = pct >= 80 ? "text-primary" : pct >= 50 ? "text-warning" : "text-destructive";
  const strokeColor = pct >= 80 ? "hsl(160, 100%, 39%)" : pct >= 50 ? "hsl(45, 100%, 55%)" : "hsl(0, 70%, 50%)";

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>Metas</h1>
        <p className="text-sm text-muted-foreground mt-1">Acompanhamento mensal — Março 2026</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Circular Progress */}
        <div className="glass-card p-6 flex flex-col items-center animate-slide-up">
          <svg width="140" height="140" viewBox="0 0 100 100" className="mb-4">
            <circle cx="50" cy="50" r="45" stroke="hsl(225, 15%, 14%)" strokeWidth="6" fill="none" />
            <circle
              cx="50" cy="50" r="45"
              stroke={strokeColor}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              transform="rotate(-90 50 50)"
              className="transition-all duration-1000"
            />
            <text x="50" y="46" textAnchor="middle" className={`text-2xl font-bold fill-current ${progressColor}`} style={{ fontSize: "20px" }}>
              {pct}%
            </text>
            <text x="50" y="60" textAnchor="middle" className="fill-current text-muted-foreground" style={{ fontSize: "7px" }}>
              da meta
            </text>
          </svg>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-lg font-bold text-foreground">R$ {(meta / 1000).toFixed(0)}k</p>
              <p className="text-xs text-muted-foreground">Meta</p>
            </div>
            <div>
              <p className="text-lg font-bold text-primary">R$ {(realizado / 1000).toFixed(1)}k</p>
              <p className="text-xs text-muted-foreground">Realizado</p>
            </div>
            <div>
              <p className="text-lg font-bold text-destructive">R$ {(falta / 1000).toFixed(1)}k</p>
              <p className="text-xs text-muted-foreground">Falta</p>
            </div>
          </div>
        </div>

        {/* Pipeline Calculator */}
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: "100ms", animationFillMode: "backwards" }}>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Calculadora de Pipeline</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Para fechar <span className="text-foreground font-medium">R$ 20.000</span> com ticket médio de <span className="text-foreground font-medium">R$ 15.000</span>:
          </p>
          <div className="space-y-3">
            {[
              { label: "Contratos necessários", value: "1,33", sub: "R$ 20.000 ÷ R$ 15.000" },
              { label: "Leads necessários", value: "333", sub: "Com conversão de 0,4%" },
              { label: "Contatos necessários", value: "41", sub: "Taxa contato 32%" },
              { label: "Reuniões necessárias", value: "14", sub: "Taxa agendamento 54%" },
              { label: "Leads/dia (úteis)", value: "~17", sub: "333 ÷ 20 dias úteis" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
                <p className="text-lg font-bold text-primary">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Pace */}
      <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: "200ms", animationFillMode: "backwards" }}>
        <h2 className="text-sm font-semibold mb-3">Ritmo Diário</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Leads hoje", value: "8", target: "17", pct: 47 },
            { label: "Contatos hoje", value: "5", target: "11", pct: 45 },
            { label: "Reuniões semana", value: "4", target: "4", pct: 100 },
            { label: "Propostas semana", value: "1", target: "2", pct: 50 },
          ].map((m) => (
            <div key={m.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{m.label}</span>
                <span className="text-foreground font-medium">{m.value}/{m.target}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${m.pct >= 80 ? "bg-primary" : m.pct >= 50 ? "bg-yellow-500" : "bg-destructive"}`}
                  style={{ width: `${Math.min(m.pct, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
