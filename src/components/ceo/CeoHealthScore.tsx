import { useMemo } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useCeoFinanceiro, useCeoComercial, useCeoOperacional } from "@/hooks/useCeoData";
import { AnimatedNumber } from "@/components/AnimatedNumber";

const AMBER = "hsl(45, 100%, 55%)";

export function CeoHealthScore() {
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

    // Financeiro (40%)
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const mesData = empresaData.filter(d => d.data?.startsWith(currentMonth));
    const receitas = mesData.filter(d => d.tipo === "receita").reduce((s, d) => s + Number(d.valor), 0);
    const despesas = mesData.filter(d => d.tipo === "despesa").reduce((s, d) => s + Number(d.valor), 0);
    const resultadoOp = receitas - despesas;
    const gastosFixos = despesas;
    const caixaCobre2Meses = receitas > gastosFixos * 2;
    const semAtrasados = clientesData.filter((c: any) => c.status === "atrasado").length === 0;

    let finScore = 0;
    if (resultadoOp > 0) finScore += 20;
    if (caixaCobre2Meses) finScore += 10;
    if (semAtrasados) finScore += 10;

    // Comercial (40%)
    const currentMeta = metasData.find(m => m.periodo === "mensal") || metasData[0];
    const metaReceita = currentMeta?.meta_receita || 1;
    const realizadoReceita = currentMeta?.realizado_receita || 0;
    const pctMeta = realizadoReceita / Number(metaReceita);
    const totalLeads = leadsData.length;
    const fechados = leadsData.filter(l => l.status === "fechado").length;
    const conversao = totalLeads > 0 ? fechados / totalLeads : 0;
    const metaLeads = currentMeta?.meta_leads || 100;
    const leadsSuficientes = totalLeads >= Number(metaLeads) * 0.8;

    let comScore = 0;
    if (pctMeta > 0.8) comScore += 20;
    if (leadsSuficientes) comScore += 10;
    if (conversao >= 0.004) comScore += 10;

    // Operacional (20%)
    const projAtivos = clientesAtivos.filter(c => c.status === "ativo");
    const noPrazo = projAtivos.filter(c => {
      if (!c.data_previsao) return true;
      return new Date(c.data_previsao) >= new Date();
    }).length;
    const todoNoPrazo = projAtivos.length > 0 && noPrazo === projAtivos.length;
    const checklistAvg = checklistData.length > 0
      ? (checklistData.filter(c => c.concluida).length / checklistData.length) * 100
      : 0;

    let opScore = 0;
    if (todoNoPrazo) opScore += 10;
    if (checklistAvg > 70) opScore += 10;

    const total = Math.round(finScore + comScore + opScore);

    return {
      total,
      financeiro: { score: finScore, max: 40, resultadoOp, caixaCobre2Meses, semAtrasados },
      comercial: { score: comScore, max: 40, pctMeta, leadsSuficientes, conversao },
      operacional: { score: opScore, max: 20, todoNoPrazo, checklistAvg },
    };
  }, [finEmpresa.data, finClientes.data, leads.data, metas.data, clientes.data, checklist.data]);

  const getColor = (score: number) => score >= 71 ? "#10B981" : score >= 41 ? AMBER : "#EF4444";
  const getLabel = (score: number) => score >= 71 ? "🟢 Operação Saudável" : score >= 41 ? "🟡 Em Desenvolvimento" : "🔴 Atenção Imediata";
  const getTextColor = (score: number) => score >= 71 ? "text-green-400" : score >= 41 ? "text-amber-400" : "text-red-400";

  if (loading) {
    return <div className="mx-6 mt-4"><Skeleton className="h-32 w-full rounded-2xl" /></div>;
  }

  const size = 120;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(scores.total, 100);

  return (
    <div className="mx-6 mt-4 glass-card p-5 border border-amber-500/20">
      <div className="flex items-center gap-6">
        {/* Gauge */}
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
            <motion.circle
              cx={size / 2} cy={size / 2} r={radius} fill="none"
              stroke={getColor(scores.total)} strokeWidth={stroke} strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - (pct / 100) * circumference }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              strokeDasharray={circumference}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold tabular-nums ${getTextColor(scores.total)}`}>
              <AnimatedNumber value={scores.total} />
            </span>
            <span className="text-[10px] text-muted-foreground">/100</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-bold" style={{ color: AMBER }}>Saúde da Empresa</h2>
            <span className={`text-xs font-medium ${getTextColor(scores.total)}`}>{getLabel(scores.total)}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Financeiro", score: scores.financeiro.score, max: 40, items: [
                { text: "Resultado operacional positivo", ok: scores.financeiro.resultadoOp > 0 },
                { text: "Caixa cobre 2+ meses", ok: scores.financeiro.caixaCobre2Meses },
                { text: "Sem pagamentos atrasados", ok: scores.financeiro.semAtrasados },
              ]},
              { label: "Comercial", score: scores.comercial.score, max: 40, items: [
                { text: "Meta receita > 80%", ok: scores.comercial.pctMeta > 0.8 },
                { text: "Volume leads suficiente", ok: scores.comercial.leadsSuficientes },
                { text: "Conversão >= 0.4%", ok: scores.comercial.conversao >= 0.004 },
              ]},
              { label: "Operacional", score: scores.operacional.score, max: 20, items: [
                { text: "Projetos no prazo", ok: scores.operacional.todoNoPrazo },
                { text: "Checklist > 70%", ok: scores.operacional.checklistAvg > 70 },
              ]},
            ].map(dim => (
              <div key={dim.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground">{dim.label}</span>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: AMBER }}>{dim.score}/{dim.max}</span>
                </div>
                {dim.items.map(item => (
                  <div key={item.text} className="flex items-center gap-1.5 text-[10px]">
                    <span>{item.ok ? "✅" : "❌"}</span>
                    <span className={item.ok ? "text-green-400/80" : "text-red-400/80"}>{item.text}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
