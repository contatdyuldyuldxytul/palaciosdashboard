import { useMemo } from "react";
import { useLancamentos } from "@/hooks/useLancamentos";
import { useBalanco } from "@/hooks/useBalanco";
import { useFluxoCaixa } from "@/hooks/useFluxoCaixa";
import { useCustosConfig } from "@/hooks/useCustosConfig";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

function fmt(v: number) {
  return `R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtSign(v: number) {
  const prefix = v < 0 ? "-" : "";
  return `${prefix}R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CeoFinResumo() {
  const baseDate = new Date();
  const mes = format(baseDate, "MM/yyyy");
  const mesLabel = format(baseDate, "MMMM yyyy", { locale: ptBR });

  const lancamentos = useLancamentos(mes);
  const allLancamentos = useLancamentos();
  const custosQ = useCustosConfig(mes);

  const entries = lancamentos.data || [];
  const allEntries = allLancamentos.data || [];
  const custos = custosQ.data?.[0];

  const recPalacios = entries.filter(e => e.classificacao === "Entrada" && e.categoria === "Receitas Palacios").reduce((s, e) => s + Number(e.valor), 0);
  const recBKV = entries.filter(e => e.classificacao === "Entrada" && e.categoria === "Receitas BKV").reduce((s, e) => s + Number(e.valor), 0);
  const recOutras = entries.filter(e => e.classificacao === "Entrada" && e.categoria === "Outras").reduce((s, e) => s + Number(e.valor), 0);
  const receitaBruta = recPalacios + recBKV;
  const totalEntradas = receitaBruta + recOutras;
  const totalSaidas = entries.filter(e => e.classificacao === "Saída").reduce((s, e) => s + Number(e.valor), 0);
  const deducoes = receitaBruta * 0.05; // ISS estimado
  const receitaLiq = receitaBruta - deducoes;
  const ebit = receitaLiq - totalSaidas;
  const resultadoLiq = totalEntradas - totalSaidas - deducoes;
  const margemLiq = totalEntradas > 0 ? (resultadoLiq / totalEntradas) * 100 : 0;

  // Ponto de equilíbrio
  const gastoFixoTotal = custos ? (
    Number(custos.pessoal || 0) + Number(custos.aluguel || 0) + Number(custos.condominio_iptu || 0) +
    Number(custos.energia_agua_telefone || 0) + Number(custos.internet_ti || 0) +
    Number(custos.marketing_publicidade || 0) + Number(custos.contabilidade_juridico || 0) +
    Number(custos.financeiro_bancario || 0) + Number(custos.depreciacao || 0) +
    Number(custos.seguros || 0) + Number(custos.veiculos || 0) +
    Number(custos.diretoria_prolabore || 0) + Number(custos.outros_fixos || 0)
  ) : totalSaidas;

  const precoUnit = custos?.preco_venda_unitario || 20000;
  const gvUnit = custos?.gastos_variaveis_unitarios || 0;
  const mcUnit = precoUnit - gvUnit;
  const taxaContrib = precoUnit > 0 ? mcUnit / precoUnit : 0;
  const peReais = taxaContrib > 0 ? gastoFixoTotal / taxaContrib : 0;
  const margemSeguranca = totalEntradas > 0 ? ((totalEntradas - peReais) / totalEntradas) * 100 : 0;

  // Saldo de caixa - simple running total
  const saldoCaixa = totalEntradas - totalSaidas;

  // Runway
  const burnMensal = totalSaidas || 1;
  const runway = Math.max(0, Math.floor(Math.abs(saldoCaixa) / burnMensal));

  // 6-month chart
  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(baseDate, i);
      const mKey = format(m, "MM/yyyy");
      const label = format(m, "MMM", { locale: ptBR });
      const mEntries = allEntries.filter(e => e.mes === mKey);
      const rec = mEntries.filter(e => e.classificacao === "Entrada").reduce((s, e) => s + Number(e.valor), 0);
      const sai = mEntries.filter(e => e.classificacao === "Saída").reduce((s, e) => s + Number(e.valor), 0);
      months.push({ month: label, receita: rec, resultado: rec - sai });
    }
    return months;
  }, [allEntries, baseDate]);

  const loading = lancamentos.isLoading || allLancamentos.isLoading;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
      </div>
    );
  }

  const cards1 = [
    { label: "Receita Bruta", value: fmtSign(receitaBruta), color: "text-emerald-400" },
    { label: "Lucro Operacional", value: fmtSign(ebit), color: ebit >= 0 ? "text-emerald-400" : "text-red-400" },
    { label: "Resultado Líquido", value: fmtSign(resultadoLiq), color: resultadoLiq >= 0 ? "text-emerald-400" : "text-red-400" },
    { label: "Margem Líquida", value: `${margemLiq.toFixed(1)}%`, color: margemLiq >= 0 ? "text-emerald-400" : "text-red-400" },
  ];
  const cards2 = [
    { label: "Ponto de Equilíbrio", value: fmt(peReais) },
    { label: "Margem de Segurança", value: `${margemSeguranca.toFixed(1)}%` },
    { label: "Saldo de Caixa", value: fmtSign(saldoCaixa), color: saldoCaixa >= 0 ? "text-emerald-400" : "text-red-400" },
    { label: "Runway", value: `${runway} meses`, color: runway > 6 ? "text-emerald-400" : runway > 3 ? "text-amber-400" : "text-red-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Month label (auto-rotativo) */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-amber-400">Resumo do Negócio</h2>
        <span className="text-sm font-medium capitalize text-muted-foreground">{mesLabel}</span>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards1.map((c, i) => (
          <div key={c.label} className="glass-card p-4 animate-slide-up" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}>
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`text-xl font-bold mt-1 tabular-nums ${c.color || ""}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards2.map((c, i) => (
          <div key={c.label} className="glass-card p-4 animate-slide-up" style={{ animationDelay: `${(i + 4) * 60}ms`, animationFillMode: "backwards" }}>
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`text-xl font-bold mt-1 tabular-nums ${c.color || "text-foreground"}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">Receita vs Resultado — Últimos 6 meses</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "hsl(220,10%,50%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(220,10%,50%)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="receita" name="Receita Bruta" fill="#00C896" radius={[4,4,0,0]} />
              <Line type="monotone" dataKey="resultado" name="Resultado Líquido" stroke="#F59E0B" strokeWidth={2} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
