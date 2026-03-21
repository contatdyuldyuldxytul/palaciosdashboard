import { DollarSign, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function Financeiro() {
  const dre = [
    { label: "Receita Bruta", value: 20000, bold: true },
    { label: "(-) ISS 5%", value: -1000 },
    { label: "= Receita Líquida", value: 19000, bold: true },
    { label: "(-) Custos dos Serviços", value: -4500, sub: "Freelancers, render farm, software" },
    { label: "= Lucro Bruto", value: 14500, bold: true },
    { label: "(-) Pessoas", value: -6000, icon: "👥" },
    { label: "(-) Infraestrutura", value: -800, icon: "🖥️" },
    { label: "(-) Comercial", value: -500, icon: "📣" },
    { label: "(-) Marketing", value: -300, icon: "📊" },
    { label: "(-) Adm/Jurídico", value: -400, icon: "⚖️" },
    { label: "(-) Consumo", value: -200, icon: "⚡" },
    { label: "= EBITDA", value: 6300, bold: true, highlight: true },
    { label: "= Lucro Líquido", value: 5800, bold: true, highlight: true },
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-1">DRE e indicadores financeiros — Março 2026</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Receita Bruta", value: "R$ 20.000", trend: "+8%", up: true },
          { label: "Lucro Líquido", value: "R$ 5.800", trend: "+12%", up: true },
          { label: "Margem Líquida", value: "29%", trend: "+2pp", up: true },
          { label: "Runway", value: "8 meses", trend: null, up: false },
        ].map((m, i) => (
          <div key={m.label} className="glass-card p-4 animate-slide-up" style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}>
            <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
            <p className="text-xl font-bold text-foreground">{m.value}</p>
            {m.trend && <p className={`text-xs mt-1 font-medium ${m.up ? "text-success" : "text-destructive"}`}>{m.trend}</p>}
          </div>
        ))}
      </div>

      {/* DRE */}
      <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: "300ms", animationFillMode: "backwards" }}>
        <h2 className="text-sm font-semibold mb-4">DRE — Demonstrativo de Resultados</h2>
        <div className="space-y-0">
          {dre.map((row) => (
            <div
              key={row.label}
              className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${
                row.highlight ? "bg-primary/5" : row.bold ? "bg-muted/30" : ""
              } ${row.bold ? "font-semibold" : ""}`}
            >
              <span className={`text-sm ${row.bold ? "text-foreground" : "text-muted-foreground"}`}>
                {row.icon && <span className="mr-2">{row.icon}</span>}
                {row.label}
                {row.sub && <span className="text-xs text-muted-foreground ml-2">({row.sub})</span>}
              </span>
              <span className={`text-sm tabular-nums ${
                row.value < 0 ? "text-destructive" : row.highlight ? "text-primary" : "text-foreground"
              }`}>
                R$ {Math.abs(row.value).toLocaleString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Gastos Fixos */}
      <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: "400ms", animationFillMode: "backwards" }}>
        <h2 className="text-sm font-semibold mb-4">Gastos Fixos por Categoria</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { cat: "👥 Pessoas", value: "R$ 6.000", pct: 73, change: "+5%" },
            { cat: "🖥️ Infraestrutura", value: "R$ 800", pct: 10, change: "0%" },
            { cat: "📣 Comercial", value: "R$ 500", pct: 6, change: "-10%" },
            { cat: "📊 Marketing", value: "R$ 300", pct: 4, change: "+15%" },
            { cat: "⚖️ Adm/Jurídico", value: "R$ 400", pct: 5, change: "0%" },
            { cat: "⚡ Consumo", value: "R$ 200", pct: 2, change: "-5%" },
          ].map((g) => (
            <div key={g.cat} className="p-3 rounded-xl bg-muted/30">
              <p className="text-xs text-muted-foreground">{g.cat}</p>
              <p className="text-lg font-bold text-foreground mt-1">{g.value}</p>
              <p className="text-xs text-muted-foreground">{g.change} vs. mês anterior</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
