import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeads, useMetas } from "@/hooks/useCeoData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const AMBER = "hsl(45, 100%, 55%)";

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

const STATUS_ORDER = ["lead", "contatado", "reuniao_agendada", "reuniao_realizada", "proposta", "fechado", "perdido"];
const STATUS_LABELS: Record<string, string> = {
  lead: "Lead", contatado: "Contatado", reuniao_agendada: "Reunião Agendada",
  reuniao_realizada: "Reunião Realizada", proposta: "Proposta", fechado: "Fechado", perdido: "Perdido",
};
const FUNNEL_COLORS = ["#6366F1", "#8B5CF6", "#A78BFA", "#F59E0B", "#EF4444", "#10B981", "#64748B"];

export default function CeoPipeline() {
  const { data: leadsData, isLoading: loadingLeads } = useLeads();
  const { data: metasData, isLoading: loadingMetas } = useMetas();

  const leads = leadsData || [];
  const currentMeta = metasData?.find(m => m.periodo === "mensal") || metasData?.[0];
  const metaReceita = currentMeta?.meta_receita || 20000;

  // Pipeline value
  const pipelineValue = useMemo(() => {
    return leads
      .filter(l => ["proposta", "reuniao_realizada", "reuniao_agendada"].includes(l.status))
      .reduce((s, l) => s + (l.valor_estimado || 0), 0);
  }, [leads]);

  // Conversion rate
  const totalLeads = leads.length || 1;
  const fechados = leads.filter(l => l.status === "fechado").length;
  const convRate = fechados / totalLeads;

  // Probability
  const probMeta = Math.min(100, (pipelineValue * convRate / metaReceita) * 100 + (fechados > 0 ? 30 : 0));

  // Forecast scenarios
  const scenarios = [
    { label: "Pessimista", conv: 0.002, color: "text-red-400" },
    { label: "Realista", conv: 0.004, color: "text-amber-400" },
    { label: "Otimista", conv: 0.008, color: "text-green-400" },
  ].map(s => ({
    ...s,
    value: pipelineValue * s.conv * 100,
  }));

  // Funnel data
  const funnelData = useMemo(() => {
    return STATUS_ORDER.filter(s => s !== "perdido").map((status, i) => {
      const items = leads.filter(l => l.status === status);
      return {
        name: STATUS_LABELS[status],
        count: items.length,
        value: items.reduce((s, l) => s + (l.valor_estimado || 0), 0),
        fill: FUNNEL_COLORS[i],
      };
    });
  }, [leads]);

  // Bottleneck
  const bottleneck = useMemo(() => {
    const active = funnelData.filter(f => f.name !== "Fechado");
    if (active.length < 2) return null;
    let worstDrop = 0;
    let worstIdx = 0;
    for (let i = 0; i < active.length - 1; i++) {
      const from = active[i].count || 1;
      const to = active[i + 1].count;
      const drop = 1 - to / from;
      if (drop > worstDrop) { worstDrop = drop; worstIdx = i; }
    }
    return {
      from: active[worstIdx].name,
      to: active[worstIdx + 1].name,
      pct: (worstDrop * 100).toFixed(0),
    };
  }, [funnelData]);

  if (loadingLeads || loadingMetas) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1", color: AMBER }}>Pipeline & Forecast</h1>

      {/* Pipeline summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-5 border-amber-500/20">
          <p className="text-xs text-muted-foreground">Valor em Negociação</p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: AMBER }}>{fmt(pipelineValue)}</p>
          <p className="text-xs text-muted-foreground mt-1">{leads.filter(l => !["fechado", "perdido"].includes(l.status)).length} leads ativos</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-muted-foreground">Probabilidade de Meta</p>
          <p className={`text-2xl font-bold tabular-nums ${probMeta > 60 ? "text-green-400" : probMeta > 30 ? "text-amber-400" : "text-red-400"}`}>
            {probMeta.toFixed(0)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">Conv. atual: {(convRate * 100).toFixed(2)}%</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-muted-foreground">Meta do Mês</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">{fmt(metaReceita)}</p>
          <p className="text-xs text-muted-foreground mt-1">Realizado: {fmt(currentMeta?.realizado_receita || 0)}</p>
        </div>
      </div>

      {/* Forecast scenarios */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold mb-4" style={{ color: AMBER }}>Forecast — 3 Cenários</h2>
        <div className="grid grid-cols-3 gap-4">
          {scenarios.map(s => (
            <div key={s.label} className="p-4 rounded-xl bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">{s.label} ({(s.conv * 100).toFixed(1)}%)</p>
              <p className={`text-xl font-bold mt-1 tabular-nums ${s.color}`}>{fmt(s.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Funnel */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold mb-4" style={{ color: AMBER }}>Análise do Funil</h2>
        <div className="h-48 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: "hsl(220,10%,50%)", fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} width={120} />
              <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                formatter={(v: number, name: string, props: any) => [`${v} (${fmt(props.payload.value)})`, "Leads"]}
              />
              <Bar dataKey="count" radius={[0,6,6,0]}>
                {funnelData.map((_, i) => <Cell key={i} fill={FUNNEL_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {bottleneck && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-400">
              ⚠️ Maior gargalo: <strong>{bottleneck.from} → {bottleneck.to}</strong> (queda de {bottleneck.pct}%).
              Melhore o volume de prospecção ou ajuste o script nessa etapa.
            </p>
          </div>
        )}
      </div>

      {/* Scale up */}
      <div className="glass-card p-6 border-amber-500/20">
        <h2 className="text-sm font-semibold mb-3" style={{ color: AMBER }}>Para Dobrar o Faturamento</h2>
        <p className="text-xs text-muted-foreground">
          Para atingir {fmt(metaReceita * 2)}/mês, com ticket de R$20.000 = {Math.ceil(metaReceita * 2 / 20000)} contratos.
          Precisa de: 500 leads/mês → 63 contatos → 20 reuniões → {Math.ceil(metaReceita * 2 / 20000)} fechamento(s)
        </p>
      </div>
    </div>
  );
}
