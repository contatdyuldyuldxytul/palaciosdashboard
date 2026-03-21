import { TrendingUp } from "lucide-react";

const stages = [
  { name: "Gerado", count: 127, color: "bg-muted-foreground", width: "100%" },
  { name: "Contatado", count: 41, color: "bg-blue-500", width: "32%", dropoff: "-68%" },
  { name: "Reunião Agendada", count: 22, color: "bg-yellow-500", width: "17%", dropoff: "-46%" },
  { name: "Reunião Realizada", count: 18, color: "bg-orange-500", width: "14%", dropoff: "-18%" },
  { name: "Proposta", count: 6, color: "bg-purple-500", width: "5%", dropoff: "-67%" },
  { name: "Fechado", count: 1, color: "bg-primary", width: "2%", dropoff: "-83%" },
];

export default function Funil() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>Funil de Vendas</h1>
        <p className="text-sm text-muted-foreground mt-1">Março 2026 — Visão completa do pipeline</p>
      </div>

      <div className="glass-card p-6 space-y-4 animate-slide-up">
        {stages.map((stage, i) => (
          <div key={stage.name}>
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
                  style={{ width: stage.width }}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-foreground">
                  {stage.count}
                </span>
              </div>
              <div className="w-16 text-right text-sm font-medium text-foreground">
                {((stage.count / 127) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insight */}
      <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: "200ms", animationFillMode: "backwards" }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium">🔴 Urgente</span>
              <p className="text-sm font-medium text-foreground">Gargalo crítico identificado</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Você perde <span className="text-warning font-medium">68%</span> dos leads entre <span className="text-foreground font-medium">Gerado → Contatado</span>. 
              Isso indica que o LDR pode estar gerando leads de baixa qualidade ou que os SDRs não estão fazendo contato 
              rápido o suficiente. Ação: estabelecer SLA de <span className="text-primary font-medium">2 horas</span> para primeiro contato após geração.
            </p>
          </div>
        </div>
      </div>

      {/* Conversion Matrix */}
      <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: "300ms", animationFillMode: "backwards" }}>
        <h2 className="text-sm font-semibold mb-4">Calculadora de Pipeline Necessário</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Meta de receita", value: "R$ 20.000" },
            { label: "Contratos necessários", value: "1,33" },
            { label: "Leads necessários", value: "333" },
            { label: "Contatos/dia", value: "~11" },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <p className="text-xl font-bold text-foreground">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
