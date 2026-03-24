import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCeoFinanceiro, useCeoComercial, useCeoOperacional } from "@/hooks/useCeoData";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Progress } from "@/components/ui/progress";

const AMBER = "hsl(45, 100%, 55%)";

export function CeoMetricsAndAlerts() {
  const { finEmpresa, finClientes } = useCeoFinanceiro();
  const { leads, metas } = useCeoComercial();
  const { clientes } = useCeoOperacional();

  const loading = finEmpresa.isLoading || finClientes.isLoading || leads.isLoading || metas.isLoading || clientes.isLoading;

  const metrics = useMemo(() => {
    const empresaData = finEmpresa.data || [];
    const clientesFinData = finClientes.data || [];
    const leadsData = leads.data || [];
    const metasData = metas.data || [];
    const clientesAtivos = clientes.data || [];

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const mesData = empresaData.filter(d => d.data?.startsWith(currentMonth));
    const receitas = mesData.filter(d => d.tipo === "receita").reduce((s, d) => s + Number(d.valor), 0);
    const despesas = mesData.filter(d => d.tipo === "despesa").reduce((s, d) => s + Number(d.valor), 0);
    const resultadoOp = receitas - despesas;

    const currentMeta = metasData.find(m => m.periodo === "mensal") || metasData[0];
    const metaReceita = Number(currentMeta?.meta_receita || 20000);
    const pctMeta = metaReceita > 0 ? (receitas / metaReceita) * 100 : 0;

    // Caixa & Runway
    const totalReceitaHist = empresaData.filter(d => d.tipo === "receita").reduce((s, d) => s + Number(d.valor), 0);
    const totalDespesaHist = empresaData.filter(d => d.tipo === "despesa").reduce((s, d) => s + Number(d.valor), 0);
    const caixa = totalReceitaHist - totalDespesaHist;
    const burnMensal = despesas || 1;
    const runway = Math.floor(caixa / burnMensal);

    // Pipeline
    const emNegociacao = leadsData.filter(l => ["reuniao_agendada", "reuniao_realizada", "proposta"].includes(l.status));
    const pipelineValor = emNegociacao.reduce((s, l) => s + Number(l.valor_estimado || 0), 0);

    // Contratos
    const contratosMes = leadsData.filter(l => l.status === "fechado" && l.data_fechamento?.startsWith(currentMonth)).length;

    // Alerts
    const alerts: { type: "critical" | "attention" | "positive"; text: string; time: string }[] = [];
    const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    if (pctMeta < 50) alerts.push({ type: "critical", text: `Meta de receita em risco: apenas ${pctMeta.toFixed(0)}% atingida`, time: timeStr });
    const atrasados = clientesFinData.filter((c: any) => c.status === "atrasado").length;
    if (atrasados > 0) alerts.push({ type: "critical", text: `${atrasados} pagamento(s) em atraso`, time: timeStr });
    if (resultadoOp < 0) alerts.push({ type: "critical", text: `Resultado operacional negativo: R$ ${Math.abs(resultadoOp).toLocaleString("pt-BR")}`, time: timeStr });

    if (pipelineValor < metaReceita) alerts.push({ type: "attention", text: `Pipeline abaixo da meta mensal`, time: timeStr });
    const projetosAtrasados = clientesAtivos.filter(c => c.status === "ativo" && c.data_previsao && new Date(c.data_previsao) < now).length;
    if (projetosAtrasados > 0) alerts.push({ type: "attention", text: `${projetosAtrasados} projeto(s) com prazo vencido`, time: timeStr });

    if (pctMeta >= 100) alerts.push({ type: "positive", text: `Meta de receita batida! 🎉`, time: timeStr });
    if (contratosMes > 0) alerts.push({ type: "positive", text: `${contratosMes} contrato(s) fechado(s) este mês`, time: timeStr });
    if (atrasados === 0) alerts.push({ type: "positive", text: `Nenhum pagamento em atraso`, time: timeStr });

    return {
      receitas, metaReceita, pctMeta, resultadoOp, caixa, runway,
      pipelineValor, pipelineCount: emNegociacao.length, contratosMes,
      alerts: alerts.slice(0, 5),
    };
  }, [finEmpresa.data, finClientes.data, leads.data, metas.data, clientes.data]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  const alertIcons = { critical: "🔴", attention: "🟡", positive: "🟢" };

  return (
    <div className="space-y-4">
      {/* ROW 1 — 5 cards */}
      <div className="grid grid-cols-5 gap-3">
        {/* Faturamento */}
        <div className="glass-card p-4 border-amber-500/20">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Faturamento do Mês</p>
          <p className="text-lg font-bold mt-1" style={{ color: AMBER }}>
            <AnimatedNumber value={metrics.receitas} formatAsCurrency />
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Meta: R$ {metrics.metaReceita.toLocaleString("pt-BR")}</p>
          <Progress value={Math.min(metrics.pctMeta, 100)} className="h-1.5 mt-2 bg-white/5" />
          <p className="text-[10px] mt-1 font-medium" style={{ color: AMBER }}>{metrics.pctMeta.toFixed(0)}% atingido</p>
        </div>

        {/* Resultado Operacional */}
        <div className="glass-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Resultado Operacional</p>
          <p className={`text-lg font-bold mt-1 ${metrics.resultadoOp >= 0 ? "text-green-400" : "text-red-400"}`}>
            <AnimatedNumber value={metrics.resultadoOp} formatAsCurrency />
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">{metrics.resultadoOp >= 0 ? "Lucro operacional" : "Prejuízo operacional"}</p>
        </div>

        {/* Caixa */}
        <div className="glass-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Caixa Disponível</p>
          <p className="text-lg font-bold mt-1 text-foreground">
            <AnimatedNumber value={metrics.caixa} formatAsCurrency />
          </p>
          <p className={`text-[10px] mt-1 font-medium ${metrics.runway > 6 ? "text-green-400" : metrics.runway > 3 ? "text-amber-400" : "text-red-400"}`}>
            Runway: {metrics.runway} meses
          </p>
        </div>

        {/* Pipeline */}
        <div className="glass-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pipeline em Negociação</p>
          <p className="text-lg font-bold mt-1" style={{ color: AMBER }}>
            <AnimatedNumber value={metrics.pipelineValor} formatAsCurrency />
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">{metrics.pipelineCount} deal(s) ativo(s)</p>
        </div>

        {/* Contratos */}
        <div className="glass-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Contratos Fechados</p>
          <p className="text-lg font-bold mt-1 text-green-400">
            <AnimatedNumber value={metrics.contratosMes} />
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">este mês</p>
        </div>
      </div>

      {/* ROW 2 — Alerts */}
      {metrics.alerts.length > 0 && (
        <div className="glass-card p-4 border-amber-500/10">
          <h3 className="text-xs font-semibold mb-3" style={{ color: AMBER }}>🔔 Alertas</h3>
          <div className="space-y-2">
            {metrics.alerts.map((alert, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{alertIcons[alert.type]}</span>
                  <span className="text-xs text-foreground">{alert.text}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{alert.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
