import { useState, useMemo } from "react";
import { useLancamentos } from "@/hooks/useLancamentos";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function fmt(v: number) {
  const prefix = v < 0 ? "-" : "";
  return `${prefix}R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export default function CeoFinDRE() {
  const [monthOffset, setMonthOffset] = useState(0);
  const baseDate = addMonths(new Date(), monthOffset);
  const mes = format(baseDate, "MM/yyyy");
  const prevMes = format(subMonths(baseDate, 1), "MM/yyyy");
  const mesLabel = format(baseDate, "MMMM yyyy", { locale: ptBR });

  const curQ = useLancamentos(mes);
  const prevQ = useLancamentos(prevMes);

  const calcDRE = (entries: any[]) => {
    const sumCat = (classif: string, cat: string) =>
      entries.filter(e => e.classificacao === classif && e.categoria === cat).reduce((s: number, e: any) => s + Number(e.valor), 0);
    const sumClass = (classif: string) =>
      entries.filter(e => e.classificacao === classif).reduce((s: number, e: any) => s + Number(e.valor), 0);

    const receitaBruta = sumCat("Entrada", "Receita de Projeto");
    const deducoes = sumCat("Saída", "Financeiro") * 0.05; // placeholder for ISS
    const receitaLiq = receitaBruta - deducoes;
    const cmv = sumCat("Saída", "CMV/Custo");
    const lucroBruto = receitaLiq - cmv;
    const pessoal = sumCat("Saída", "Pessoal");
    const aluguel = sumCat("Saída", "Aluguel");
    const marketing = sumCat("Saída", "Marketing");
    const adm = sumCat("Saída", "Adm");
    const financeiro = sumCat("Saída", "Financeiro");
    const outras = sumCat("Saída", "Outras Despesas");
    const educacao = sumCat("Saída", "Educação");
    const software = sumCat("Saída", "Software");
    const totalDesp = pessoal + aluguel + marketing + adm + financeiro + educacao + software + outras;
    const ebit = lucroBruto - totalDesp;
    const recNaoOp = sumCat("Entrada", "Receita não Operacional");
    const resultadoLiq = ebit + recNaoOp;

    return { receitaBruta, deducoes, receitaLiq, cmv, lucroBruto, pessoal, aluguel, marketing, adm, financeiro, educacao, software, outras, totalDesp, ebit, recNaoOp, resultadoLiq };
  };

  const cur = useMemo(() => calcDRE(curQ.data || []), [curQ.data]);
  const prev = useMemo(() => calcDRE(prevQ.data || []), [prevQ.data]);

  const variation = (c: number, p: number) => {
    if (p === 0) return "—";
    const v = ((c - p) / Math.abs(p)) * 100;
    return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
  };

  if (curQ.isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>;

  const rows = [
    { label: "Receita Bruta de Vendas", cur: cur.receitaBruta, prev: prev.receitaBruta, bold: true, section: true },
    { label: "(-) Deduções da Receita (ISS)", cur: -cur.deducoes, prev: -prev.deducoes },
    { label: "= RECEITA LÍQUIDA", cur: cur.receitaLiq, prev: prev.receitaLiq, bold: true, highlight: true,
      sub: cur.receitaBruta > 0 ? `Margem: ${pct(cur.receitaLiq / cur.receitaBruta)}` : undefined },
    { label: "(-) CMV / Custo dos Serviços", cur: -cur.cmv, prev: -prev.cmv },
    { label: "= LUCRO BRUTO", cur: cur.lucroBruto, prev: prev.lucroBruto, bold: true, highlight: true,
      sub: cur.receitaBruta > 0 ? `Margem Bruta: ${pct(cur.lucroBruto / cur.receitaBruta)}` : undefined },
    { label: "", divider: true },
    { label: "DESPESAS OPERACIONAIS", header: true },
    { label: "(-) Pessoal", cur: -cur.pessoal, prev: -prev.pessoal },
    { label: "(-) Aluguel", cur: -cur.aluguel, prev: -prev.aluguel },
    { label: "(-) Marketing", cur: -cur.marketing, prev: -prev.marketing },
    { label: "(-) Despesas Adm", cur: -cur.adm, prev: -prev.adm },
    { label: "(-) Despesas Financeiras", cur: -cur.financeiro, prev: -prev.financeiro },
    { label: "(-) Educação", cur: -cur.educacao, prev: -prev.educacao },
    { label: "(-) Software", cur: -cur.software, prev: -prev.software },
    { label: "(-) Outras Despesas", cur: -cur.outras, prev: -prev.outras },
    { label: "= TOTAL DESPESAS OPERACIONAIS", cur: -cur.totalDesp, prev: -prev.totalDesp, bold: true },
    { label: "", divider: true },
    { label: "= LUCRO OPERACIONAL (EBIT)", cur: cur.ebit, prev: prev.ebit, bold: true, highlight: true,
      sub: cur.receitaBruta > 0 ? `Margem Operacional: ${pct(cur.ebit / cur.receitaBruta)}` : undefined },
    { label: "Receita não Operacional", cur: cur.recNaoOp, prev: prev.recNaoOp },
    { label: "= RESULTADO LÍQUIDO", cur: cur.resultadoLiq, prev: prev.resultadoLiq, bold: true, highlight: true,
      sub: cur.receitaBruta > 0 ? `% Resultado: ${pct(cur.resultadoLiq / cur.receitaBruta)}` : undefined },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-amber-400">📈 DRE — Demonstração do Resultado</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonthOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-medium capitalize min-w-[120px] text-center">{mesLabel}</span>
          <button onClick={() => setMonthOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium w-1/2">Conta</th>
              <th className="px-4 py-3 text-right text-xs text-muted-foreground font-medium">Mês Atual</th>
              <th className="px-4 py-3 text-right text-xs text-muted-foreground font-medium">Mês Anterior</th>
              <th className="px-4 py-3 text-right text-xs text-muted-foreground font-medium">Var %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, i: number) => {
              if (r.divider) return <tr key={i}><td colSpan={4} className="h-2" /></tr>;
              if (r.header) return (
                <tr key={i}><td colSpan={4} className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{r.label}</td></tr>
              );
              const varStr = variation(r.cur, r.prev);
              return (
                <tr key={i} className={`border-b border-white/5 ${r.highlight ? "bg-amber-500/5" : r.bold ? "bg-muted/20" : ""}`}>
                  <td className={`px-4 py-2.5 ${r.bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {r.label}
                    {r.sub && <span className="block text-xs text-muted-foreground/60 mt-0.5">{r.sub}</span>}
                  </td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${r.cur < 0 ? "text-red-400" : r.highlight ? "text-emerald-400" : ""} ${r.bold ? "font-semibold" : ""}`}>
                    {fmt(r.cur)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(r.prev)}</td>
                  <td className={`px-4 py-2.5 text-right text-xs ${varStr.startsWith("+") ? "text-emerald-400" : varStr.startsWith("-") ? "text-red-400" : "text-muted-foreground"}`}>
                    {varStr}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
