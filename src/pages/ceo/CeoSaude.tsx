import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCeoFinanceiro, useCeoComercial, useCeoOperacional } from "@/hooks/useCeoData";

const AMBER = "hsl(45, 100%, 55%)";

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

export default function CeoSaude() {
  const { finEmpresa, finClientes } = useCeoFinanceiro();
  const { leads, metas } = useCeoComercial();
  const { clientes, checklist } = useCeoOperacional();

  const loading = finEmpresa.isLoading || finClientes.isLoading || leads.isLoading || metas.isLoading || clientes.isLoading || checklist.isLoading;

  const scores = useMemo(() => {
    const empresaData = finEmpresa.data || [];
    const clientesData = finClientes.data || [];
    const leadsData = leads.data || [];
    const metasData = metas.data || [];
    const clientesAtivos = clientes.data || [];
    const checklistData = checklist.data || [];

    // Financial health (40%)
    const receitas = empresaData.filter(d => d.tipo === "receita").reduce((s, d) => s + Number(d.valor), 0);
    const despesas = empresaData.filter(d => d.tipo === "despesa").reduce((s, d) => s + Number(d.valor), 0);
    const resultadoOp = receitas - despesas;
    const inadimplentes = clientesData.filter((c: any) => c.status === "atrasado").length;
    const totalClientes = clientesData.length || 1;

    let finScore = 50;
    if (resultadoOp > 0) finScore += 25;
    if (receitas > despesas * 1.2) finScore += 15;
    if (inadimplentes / totalClientes < 0.1) finScore += 10;

    // Commercial health (40%)
    const currentMeta = metasData.find(m => m.periodo === "mensal") || metasData[0];
    const pctReceita = currentMeta ? (currentMeta.realizado_receita / (currentMeta.meta_receita || 1)) : 0;
    const totalLeads = leadsData.length;
    const fechados = leadsData.filter(l => l.status === "fechado").length;
    const conversao = totalLeads > 0 ? fechados / totalLeads : 0;

    let comScore = 30;
    if (pctReceita > 0.8) comScore += 40;
    else if (pctReceita > 0.5) comScore += 20;
    else if (pctReceita > 0.3) comScore += 10;
    if (conversao > 0.003) comScore += 15;
    if (totalLeads > 50) comScore += 15;

    // Operational health (20%)
    const projAtivos = clientesAtivos.filter(c => c.status === "ativo");
    const noPrazo = projAtivos.filter(c => {
      if (!c.data_previsao) return true;
      return new Date(c.data_previsao) >= new Date();
    }).length;
    const avgProgress = projAtivos.length > 0 ? projAtivos.reduce((s, c) => s + (c.progresso || 0), 0) / projAtivos.length : 0;
    const checklistAvg = checklistData.length > 0
      ? checklistData.filter(c => c.concluida).length / checklistData.length * 100
      : 50;

    let opScore = 40;
    if (projAtivos.length > 0 && noPrazo / projAtivos.length > 0.8) opScore += 30;
    if (checklistAvg > 60) opScore += 15;
    if (avgProgress > 40) opScore += 15;

    finScore = Math.min(100, finScore);
    comScore = Math.min(100, comScore);
    opScore = Math.min(100, opScore);
    const total = Math.round(finScore * 0.4 + comScore * 0.4 + opScore * 0.2);

    return {
      total,
      financeiro: { score: finScore, resultadoOp, inadimplentes, receitas, despesas },
      comercial: { score: comScore, pctReceita, conversao, totalLeads, fechados },
      operacional: { score: opScore, projAtivos: projAtivos.length, noPrazo, checklistAvg, avgProgress },
    };
  }, [finEmpresa.data, finClientes.data, leads.data, metas.data, clientes.data, checklist.data]);

  const getColor = (score: number) => score >= 71 ? "text-green-400" : score >= 41 ? "text-amber-400" : "text-red-400";
  const getLabel = (score: number) => score >= 71 ? "🟢 Saudável" : score >= 41 ? "🟡 Atenção" : "🔴 Crítico";
  const getBg = (score: number) => score >= 71 ? "bg-green-500/20 border-green-500/30" : score >= 41 ? "bg-amber-500/20 border-amber-500/30" : "bg-red-500/20 border-red-500/30";

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-48" />)}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1", color: AMBER }}>Saúde da Empresa</h1>

      {/* Gauge */}
      <div className={`glass-card p-8 flex flex-col items-center border ${getBg(scores.total)}`}>
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
            <circle cx="60" cy="60" r="52" fill="none"
              stroke={scores.total >= 71 ? "hsl(160,100%,39%)" : scores.total >= 41 ? AMBER : "hsl(0,70%,50%)"}
              strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${scores.total * 3.27} 327`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold tabular-nums ${getColor(scores.total)}`}>{scores.total}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>
        <p className={`text-sm font-medium mt-3 ${getColor(scores.total)}`}>{getLabel(scores.total)}</p>
      </div>

      {/* 3 dimension cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Financeiro */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: AMBER }}>💰 Saúde Financeira</h3>
            <span className={`text-xs font-bold ${getColor(scores.financeiro.score)}`}>{scores.financeiro.score}/100</span>
          </div>
          <div className="space-y-2">
            {[
              { label: "Resultado Operacional", value: fmt(scores.financeiro.resultadoOp), ok: scores.financeiro.resultadoOp > 0 },
              { label: "Receitas", value: fmt(scores.financeiro.receitas), ok: true },
              { label: "Despesas", value: fmt(scores.financeiro.despesas), ok: scores.financeiro.despesas < scores.financeiro.receitas },
              { label: "Clientes Inadimplentes", value: String(scores.financeiro.inadimplentes), ok: scores.financeiro.inadimplentes === 0 },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-xs py-1">
                <span className="text-muted-foreground">{r.label}</span>
                <span className={r.ok ? "text-green-400" : "text-red-400"}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Comercial */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: AMBER }}>📈 Saúde Comercial</h3>
            <span className={`text-xs font-bold ${getColor(scores.comercial.score)}`}>{scores.comercial.score}/100</span>
          </div>
          <div className="space-y-2">
            {[
              { label: "% Meta Receita", value: `${(scores.comercial.pctReceita * 100).toFixed(0)}%`, ok: scores.comercial.pctReceita > 0.5 },
              { label: "Taxa de Conversão", value: `${(scores.comercial.conversao * 100).toFixed(2)}%`, ok: scores.comercial.conversao > 0.003 },
              { label: "Total de Leads", value: String(scores.comercial.totalLeads), ok: scores.comercial.totalLeads > 50 },
              { label: "Contratos Fechados", value: String(scores.comercial.fechados), ok: scores.comercial.fechados > 0 },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-xs py-1">
                <span className="text-muted-foreground">{r.label}</span>
                <span className={r.ok ? "text-green-400" : "text-red-400"}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Operacional */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: AMBER }}>⚙️ Saúde Operacional</h3>
            <span className={`text-xs font-bold ${getColor(scores.operacional.score)}`}>{scores.operacional.score}/100</span>
          </div>
          <div className="space-y-2">
            {[
              { label: "Projetos Ativos", value: String(scores.operacional.projAtivos), ok: true },
              { label: "No Prazo", value: String(scores.operacional.noPrazo), ok: scores.operacional.noPrazo === scores.operacional.projAtivos },
              { label: "Checklist Médio", value: `${scores.operacional.checklistAvg.toFixed(0)}%`, ok: scores.operacional.checklistAvg > 60 },
              { label: "Progresso Médio", value: `${scores.operacional.avgProgress.toFixed(0)}%`, ok: scores.operacional.avgProgress > 40 },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-xs py-1">
                <span className="text-muted-foreground">{r.label}</span>
                <span className={r.ok ? "text-green-400" : "text-red-400"}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
