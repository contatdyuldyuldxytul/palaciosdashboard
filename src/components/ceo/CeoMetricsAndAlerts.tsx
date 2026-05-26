import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCeoComercial } from "@/hooks/useCeoData";
import { useLancamentos } from "@/hooks/useLancamentos";
import { usePipedrive } from "@/hooks/usePipedrive";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

const AMBER = "hsl(45, 100%, 55%)";

export function CeoMetricsAndAlerts() {
  const now = new Date();
  const mesAtual = format(now, "MM/yyyy");
  const lancMes = useLancamentos(mesAtual);
  const lancAll = useLancamentos();
  const { metas } = useCeoComercial();
  const { summary, isLoading: loadingPipe } = usePipedrive();

  const loading = lancMes.isLoading || lancAll.isLoading || metas.isLoading;

  const metrics = useMemo(() => {
    const entriesMes = lancMes.data || [];
    const entriesAll = lancAll.data || [];
    const metasData = metas.data || [];

    // Mês: Receita Bruta (Palacios + BKV)
    const recPalacios = entriesMes.filter(e => e.classificacao === "Entrada" && e.categoria === "Receitas Palacios").reduce((s, e) => s + Number(e.valor), 0);
    const recBKV = entriesMes.filter(e => e.classificacao === "Entrada" && e.categoria === "Receitas BKV").reduce((s, e) => s + Number(e.valor), 0);
    const recOutras = entriesMes.filter(e => e.classificacao === "Entrada" && e.categoria === "Outras").reduce((s, e) => s + Number(e.valor), 0);
    const receitaBruta = recPalacios + recBKV;
    const totalEntradasMes = receitaBruta + recOutras;
    const despesasMes = entriesMes.filter(e => e.classificacao === "Saída" && e.categoria !== "Fundos").reduce((s, e) => s + Number(e.valor), 0);
    const fundosMes = entriesMes.filter(e => e.classificacao === "Saída" && e.categoria === "Fundos").reduce((s, e) => s + Number(e.valor), 0);
    const issMes = receitaBruta * 0.05;
    const receitaLiq = receitaBruta - issMes;
    const resultadoOp = receitaLiq - despesasMes;
    const resultadoLiq = resultadoOp - fundosMes;

    // Caixa: acumulado histórico
    const totalEntradasHist = entriesAll.filter(e => e.classificacao === "Entrada").reduce((s, e) => s + Number(e.valor), 0);
    const totalSaidasHist = entriesAll.filter(e => e.classificacao === "Saída").reduce((s, e) => s + Number(e.valor), 0);
    const receitaBrutaHist = entriesAll.filter(e => e.classificacao === "Entrada" && (e.categoria === "Receitas Palacios" || e.categoria === "Receitas BKV")).reduce((s, e) => s + Number(e.valor), 0);
    const issHist = receitaBrutaHist * 0.05;
    const caixa = totalEntradasHist - totalSaidasHist - issHist;
    const burnMensal = despesasMes || 1;
    const runway = Math.max(0, Math.floor(caixa / burnMensal));

    const currentMeta = metasData.find(m => m.periodo === "mensal") || metasData[0];
    const metaReceita = Number(currentMeta?.meta_receita || 20000);
    const pctMeta = metaReceita > 0 ? (receitaBruta / metaReceita) * 100 : 0;

    return { receitaBruta, totalEntradasMes, resultadoOp, resultadoLiq, fundosMes, caixa, runway, metaReceita, pctMeta };
  }, [lancMes.data, lancAll.data, metas.data]);

  const contratosMes = summary?.won_this_month ?? 0;
  const valorWonMes = summary?.won_value_this_month ?? 0;

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Faturamento */}
      <div className="glass-card p-4 border-amber-500/20">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Faturamento do Mês</p>
        <p className="text-lg font-bold mt-1" style={{ color: AMBER }}>
          <AnimatedNumber value={metrics.receitaBruta} formatAsCurrency />
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">Meta: R$ {metrics.metaReceita.toLocaleString("pt-BR")}</p>
        <Progress value={Math.min(metrics.pctMeta, 100)} className="h-1.5 mt-2 bg-white/5" />
        <p className="text-[10px] mt-1 font-medium" style={{ color: AMBER }}>{metrics.pctMeta.toFixed(0)}% atingido</p>
      </div>

      {/* Resultado Operacional */}
      <div className="glass-card p-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Resultado Operacional</p>
        <p className={`text-lg font-bold mt-1 ${metrics.resultadoOp >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          <AnimatedNumber value={metrics.resultadoOp} formatAsCurrency />
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">Rec. Líquida − Despesas (mês)</p>
      </div>

      {/* Caixa */}
      <div className="glass-card p-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Caixa Disponível</p>
        <p className={`text-lg font-bold mt-1 ${metrics.caixa >= 0 ? "text-foreground" : "text-red-400"}`}>
          <AnimatedNumber value={metrics.caixa} formatAsCurrency />
        </p>
        <p className={`text-[10px] mt-1 font-medium ${metrics.runway > 6 ? "text-emerald-400" : metrics.runway > 3 ? "text-amber-400" : "text-red-400"}`}>
          Runway: {metrics.runway} meses
        </p>
      </div>

      {/* Contratos Fechados (Pipedrive wons) */}
      <div className="glass-card p-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Contratos Fechados</p>
        <p className="text-lg font-bold mt-1 text-emerald-400">
          {loadingPipe ? "…" : <AnimatedNumber value={contratosMes} />}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {valorWonMes > 0 ? `R$ ${valorWonMes.toLocaleString("pt-BR")} este mês` : "este mês (Pipedrive)"}
        </p>
      </div>
    </div>
  );
}
