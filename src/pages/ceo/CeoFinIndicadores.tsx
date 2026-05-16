import { useState, useMemo } from "react";
import { useLancamentos } from "@/hooks/useLancamentos";
import { useBalanco } from "@/hooks/useBalanco";
import { useFluxoCaixa } from "@/hooks/useFluxoCaixa";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function fmt(v: number) {
  return `${v < 0 ? "-" : ""}R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Indicator {
  label: string;
  value: string;
  benchmark?: string;
  status: "green" | "yellow" | "red" | "neutral";
  prevValue?: string;
}

export default function CeoFinIndicadores() {
  const [monthOffset, setMonthOffset] = useState(0);
  const baseDate = addMonths(new Date(), monthOffset);
  const mes = format(baseDate, "MM/yyyy");
  const prevMes = format(subMonths(baseDate, 1), "MM/yyyy");
  const mesLabel = format(baseDate, "MMMM yyyy", { locale: ptBR });

  const lancQ = useLancamentos(mes);
  const prevLancQ = useLancamentos(prevMes);
  const balQ = useBalanco(mes);
  const fcQ = useFluxoCaixa(mes);

  const loading = lancQ.isLoading || balQ.isLoading || fcQ.isLoading;

  const indicators = useMemo((): Indicator[] => {
    const entries = lancQ.data || [];
    const bal = balQ.data?.[0] || {} as any;
    const fc = fcQ.data?.[0] || {} as any;

    const recBruta = entries.filter(e => e.classificacao === "Entrada" && (e.categoria === "Receitas Palacios" || e.categoria === "Receitas BKV")).reduce((s, e) => s + Number(e.valor), 0);
    const totalEntradas = entries.filter(e => e.classificacao === "Entrada").reduce((s, e) => s + Number(e.valor), 0);
    const totalSaidas = entries.filter(e => e.classificacao === "Saída").reduce((s, e) => s + Number(e.valor), 0);
    const cmv = 0;
    const lucroBruto = totalEntradas - cmv;
    const resultLiq = totalEntradas - totalSaidas;

    // Balance sheet calcs
    const ativoCirc = Number(bal.caixa || 0) + Number(bal.banco || 0) + Number(bal.duplicatas_receber || 0) + Number(bal.estoques || 0) + Number(bal.outros_circulante || 0);
    const estoques = Number(bal.estoques || 0);
    const passivoCirc = Number(bal.fornecedores_pagar || 0) + Number(bal.salarios_pagar || 0) + Number(bal.aluguel_pagar || 0) + Number(bal.impostos_recolher || 0) + Number(bal.emprestimos_cp || 0);
    const passivoNC = Number(bal.emprestimos_lp || 0) + Number(bal.financiamentos_lp || 0);
    const totalAtivo = ativoCirc + Number(bal.titulos_receber_lp || 0) + Number(bal.imobilizado || 0) + Number(bal.instalacoes || 0) + Number(bal.equipamentos || 0) - Number(bal.depreciacao || 0);
    const pl = Number(bal.capital_social || 0) + Number(bal.resultado_acumulado || 0) + resultLiq;

    const liqCorrente = passivoCirc > 0 ? ativoCirc / passivoCirc : 0;
    const liqSeca = passivoCirc > 0 ? (ativoCirc - estoques) / passivoCirc : 0;
    const margemBruta = totalEntradas > 0 ? lucroBruto / totalEntradas : 0;
    const margemLiq = totalEntradas > 0 ? resultLiq / totalEntradas : 0;
    const roe = pl > 0 ? resultLiq / pl : 0;
    const endivGeral = totalAtivo > 0 ? (passivoCirc + passivoNC) / totalAtivo : 0;
    const capTerc = pl > 0 ? (passivoCirc + passivoNC) / pl : 0;

    const saldoOp = Number(fc.recebimentos_clientes_real || 0) - Number(fc.pagamentos_fornecedores_real || 0) - Number(fc.pagamento_pessoal_real || 0) - Number(fc.pagamento_despesas_real || 0) - Number(fc.impostos_real || 0);

    return [
      // LIQUIDEZ
      { label: "Liquidez Corrente", value: liqCorrente.toFixed(2), benchmark: "≥ 1,0", status: liqCorrente >= 1 ? "green" : "red" },
      { label: "Liquidez Seca", value: liqSeca.toFixed(2), benchmark: "≥ 0,8", status: liqSeca >= 0.8 ? "green" : "red" },
      // RENTABILIDADE
      { label: "Margem Bruta", value: `${(margemBruta * 100).toFixed(1)}%`, benchmark: "Quanto maior melhor", status: margemBruta > 0.3 ? "green" : margemBruta > 0.15 ? "yellow" : "red" },
      { label: "Margem Líquida", value: `${(margemLiq * 100).toFixed(1)}%`, status: margemLiq > 0.1 ? "green" : margemLiq > 0 ? "yellow" : "red" },
      { label: "ROE", value: `${(roe * 100).toFixed(1)}%`, status: roe > 0.15 ? "green" : roe > 0 ? "yellow" : "red" },
      // ENDIVIDAMENTO
      { label: "Endividamento Geral", value: `${(endivGeral * 100).toFixed(1)}%`, benchmark: "< 60%", status: endivGeral < 0.6 ? "green" : "red" },
      { label: "Capital Terceiros / PL", value: capTerc.toFixed(2), benchmark: "< 1,0", status: capTerc < 1 ? "green" : "red" },
      // CAIXA
      { label: "Geração de Caixa Operacional", value: fmt(saldoOp), status: saldoOp > 0 ? "green" : "red" },
    ];
  }, [lancQ.data, balQ.data, fcQ.data]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}</div></div>;

  const groups = [
    { title: "Liquidez", items: indicators.slice(0, 2) },
    { title: "Rentabilidade", items: indicators.slice(2, 5) },
    { title: "Endividamento", items: indicators.slice(5, 7) },
    { title: "Caixa", items: indicators.slice(7) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-amber-400">📏 Indicadores Financeiros</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonthOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-medium capitalize min-w-[120px] text-center">{mesLabel}</span>
          <button onClick={() => setMonthOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {groups.map(g => (
        <div key={g.title}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{g.title}</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {g.items.map(ind => (
              <div key={ind.label} className="glass-card p-4 space-y-2">
                <p className="text-xs text-muted-foreground">{ind.label}</p>
                <p className="text-xl font-bold tabular-nums">{ind.value}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    ind.status === "green" ? "bg-emerald-500/20 text-emerald-400" :
                    ind.status === "yellow" ? "bg-amber-500/20 text-amber-400" :
                    ind.status === "red" ? "bg-red-500/20 text-red-400" :
                    "bg-muted/30 text-muted-foreground"
                  }`}>
                    {ind.status === "green" ? "🟢" : ind.status === "yellow" ? "🟡" : "🔴"}
                  </span>
                  {ind.benchmark && <span className="text-xs text-muted-foreground">{ind.benchmark}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
