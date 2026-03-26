import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMetas } from "@/hooks/useCeoData";
import { useLeads } from "@/hooks/useCeoData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { CeoGoalSetting } from "@/components/ceo/CeoGoalSetting";

const AMBER = "hsl(45, 100%, 55%)";
const periodos = ["mensal", "trimestral", "anual"] as const;

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

export default function CeoMetas() {
  const [periodo, setPeriodo] = useState<typeof periodos[number]>("mensal");
  const { data: metas, isLoading: loadingMetas } = useMetas();
  const { data: leads, isLoading: loadingLeads } = useLeads();

  const currentMeta = useMemo(() => {
    if (!metas?.length) return null;
    const monthly = metas.filter(m => m.periodo === "mensal");
    return monthly[0] || metas[0];
  }, [metas]);

  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const pctMonth = dayOfMonth / daysInMonth;

  const metaReceita = currentMeta?.meta_receita || 20000;
  const realizadoReceita = currentMeta?.realizado_receita || 0;
  const metaLeads = currentMeta?.meta_leads || 320;
  const realizadoLeads = currentMeta?.realizado_leads || 0;
  const metaReunioes = currentMeta?.meta_reunioes || 15;
  const realizadoReunioes = currentMeta?.realizado_reunioes || 0;
  const metaContratos = currentMeta?.meta_contratos || 2;
  const realizadoContratos = currentMeta?.realizado_contratos || 0;

  const metrics = [
    { label: "Meta de Receita", icon: "🎯", meta: metaReceita, realizado: realizadoReceita, isMoney: true },
    { label: "Meta de Reuniões", icon: "📅", meta: metaReunioes, realizado: realizadoReunioes, isMoney: false },
    { label: "Meta de Leads", icon: "👥", meta: metaLeads, realizado: realizadoLeads, isMoney: false },
    { label: "Meta de Contratos", icon: "📝", meta: metaContratos, realizado: realizadoContratos, isMoney: false },
  ];

  // Pipeline calculator
  const ticketMedio = 20000;
  const conversao = 0.004;
  const contratosNecessarios = Math.ceil(metaReceita / ticketMedio);
  const leadsNecessarios = Math.ceil(contratosNecessarios / conversao);
  const contatosNecessarios = Math.ceil(leadsNecessarios * 0.125);
  const reunioesNecessarias = Math.ceil(contatosNecessarios * 0.33);

  // Alerts
  const getAlert = () => {
    const pctReceita = realizadoReceita / metaReceita;
    if (dayOfMonth > 15 && pctReceita < 0.4) return { level: "critico", text: "Meta em risco crítico", color: "bg-red-500/20 text-red-400" };
    if (dayOfMonth > 20 && pctReceita < 0.6) return { level: "atencao", text: "Atenção: acelerar pipeline", color: "bg-amber-500/20 text-amber-400" };
    if (pctReceita > 0.8) return { level: "ok", text: "No caminho certo", color: "bg-green-500/20 text-green-400" };
    return { level: "neutro", text: `${(pctReceita * 100).toFixed(0)}% da meta`, color: "bg-muted text-muted-foreground" };
  };
  const alert = getAlert();

  // Forecast chart
  const forecastData = useMemo(() => {
    if (!metas?.length) return [];
    return metas.filter(m => m.periodo === "mensal").slice(0, 6).reverse().map(m => ({
      mes: m.mes || "",
      meta: m.meta_receita,
      realizado: m.realizado_receita,
    }));
  }, [metas]);

  if (loadingMetas || loadingLeads) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1", color: AMBER }}>Metas Comerciais</h1>
          <p className="text-sm text-muted-foreground mt-1">Dia {dayOfMonth}/{daysInMonth} do mês — {(pctMonth * 100).toFixed(0)}% do tempo</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${alert.color}`}>{alert.text}</span>
      </div>

      {/* Progress cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => {
          const pctDone = m.meta > 0 ? m.realizado / m.meta : 0;
          const falta = Math.max(0, m.meta - m.realizado);
          return (
            <div key={m.label} className="glass-card p-4" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center gap-2 mb-2">
                <span>{m.icon}</span>
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-xl font-bold tabular-nums" style={{ color: AMBER }}>
                  {m.isMoney ? fmt(m.realizado) : m.realizado}
                </span>
                <span className="text-xs text-muted-foreground">
                  / {m.isMoney ? fmt(m.meta) : m.meta}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted/50 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{
                  width: `${Math.min(100, pctDone * 100)}%`,
                  background: pctDone > 0.8 ? "hsl(160,100%,39%)" : pctDone > 0.5 ? AMBER : "hsl(0,70%,50%)",
                }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Falta: {m.isMoney ? fmt(falta) : falta} ({(pctDone * 100).toFixed(0)}%)
              </p>
            </div>
          );
        })}
      </div>

      {/* Pipeline Calculator */}
      <div className="glass-card p-6 border-amber-500/20">
        <h2 className="text-sm font-semibold mb-4" style={{ color: AMBER }}>Calculadora de Pipeline Necessário</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Contratos", value: contratosNecessarios, sub: `Ticket: ${fmt(ticketMedio)}` },
            { label: "Leads", value: leadsNecessarios, sub: `Conv: 0,4%` },
            { label: "Contatos", value: contatosNecessarios, sub: "12,5% resposta" },
            { label: "Reuniões", value: reunioesNecessarias, sub: "33% agendamento" },
          ].map(p => (
            <div key={p.label} className="p-3 rounded-xl bg-muted/30 text-center">
              <p className="text-2xl font-bold tabular-nums" style={{ color: AMBER }}>{p.value}</p>
              <p className="text-xs text-foreground font-medium">{p.label}</p>
              <p className="text-[10px] text-muted-foreground">{p.sub}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Para fechar {fmt(metaReceita)} com ticket de {fmt(ticketMedio)} = {contratosNecessarios} contrato(s).
          Com conversão de 0,4%: precisa de {leadsNecessarios} leads → {contatosNecessarios} contatos → {reunioesNecessarias} reuniões → {contratosNecessarios} fechamento(s)
        </p>
      </div>

      {/* Charts */}
      {forecastData.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-6">
            <h2 className="text-sm font-semibold mb-4" style={{ color: AMBER }}>Realizado vs Meta</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="mes" tick={{ fill: "hsl(220,10%,50%)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(220,10%,50%)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="meta" fill="rgba(245,158,11,0.3)" name="Meta" radius={[4,4,0,0]} />
                  <Bar dataKey="realizado" fill="hsl(45,100%,55%)" name="Realizado" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass-card p-6">
            <h2 className="text-sm font-semibold mb-4" style={{ color: AMBER }}>Forecast Mensal</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="mes" tick={{ fill: "hsl(220,10%,50%)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(220,10%,50%)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="realizado" stroke={AMBER} strokeWidth={2} dot={{ fill: AMBER }} />
                  <Line type="monotone" dataKey="meta" stroke="rgba(255,255,255,0.3)" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
