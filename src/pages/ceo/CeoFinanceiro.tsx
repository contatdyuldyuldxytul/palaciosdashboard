import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCeoFinanceiro } from "@/hooks/useCeoData";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { CeoMetricsAndAlerts } from "@/components/ceo/CeoMetricsAndAlerts";

const periodos = ["mensal", "trimestral", "anual"] as const;
type Periodo = typeof periodos[number];

const AMBER = "hsl(45, 100%, 55%)";
const CATS = ["Pessoal", "Consumo", "Infraestrutura", "Comercial", "Marketing", "Adm/Jurídico"];
const CAT_COLORS = ["#F59E0B", "#EF4444", "#8B5CF6", "#3B82F6", "#10B981", "#6366F1"];

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export default function CeoFinanceiro() {
  const [periodo, setPeriodo] = useState<Periodo>("mensal");
  const { finEmpresa, finClientes } = useCeoFinanceiro();

  const loading = finEmpresa.isLoading || finClientes.isLoading;
  const empresaData = finEmpresa.data || [];
  const clientesData = finClientes.data || [];

  const now = new Date();
  const currentMonth = format(now, "yyyy-MM");

  // Filter by period
  const filterByPeriod = (data: any[], dateField: string) => {
    const start = periodo === "mensal"
      ? startOfMonth(now)
      : periodo === "trimestral"
      ? subMonths(startOfMonth(now), 2)
      : subMonths(startOfMonth(now), 11);
    return data.filter(d => {
      try {
        const date = parseISO(d[dateField]);
        return date >= start;
      } catch { return true; }
    });
  };

  const periodData = filterByPeriod(empresaData, "data");
  const periodClientes = filterByPeriod(clientesData, "data_vencimento");

  // DRE Calculations
  const dre = useMemo(() => {
    const receitas = periodData.filter(d => d.tipo === "receita");
    const despesas = periodData.filter(d => d.tipo === "despesa");
    const receitaBruta = receitas.reduce((s, d) => s + Number(d.valor), 0);
    // Also add paid client invoices
    const receitaClientes = periodClientes.filter(d => d.status === "pago").reduce((s: number, d: any) => s + Number(d.valor), 0);
    const totalReceita = receitaBruta + receitaClientes;
    const iss = totalReceita * 0.05;
    const receitaLiquida = totalReceita - iss;

    const custosByCategoria: Record<string, number> = {};
    despesas.forEach(d => {
      const cat = d.categoria || "Outros";
      custosByCategoria[cat] = (custosByCategoria[cat] || 0) + Number(d.valor);
    });

    const custoServicos = (custosByCategoria["Freelancers"] || 0) + (custosByCategoria["Render Farm"] || 0) + (custosByCategoria["Software"] || 0);
    const resultadoBruto = receitaLiquida - custoServicos;

    const gastosFixos = {
      pessoal: custosByCategoria["Pessoal"] || custosByCategoria["Salários"] || 0,
      consumo: custosByCategoria["Consumo"] || custosByCategoria["Energia"] || 0,
      infra: custosByCategoria["Infraestrutura"] || custosByCategoria["Infra"] || 0,
      comercial: custosByCategoria["Comercial"] || 0,
      marketing: custosByCategoria["Marketing"] || 0,
      admJuridico: custosByCategoria["Adm/Jurídico"] || custosByCategoria["Administrativo"] || 0,
    };
    const totalGastosFixos = Object.values(gastosFixos).reduce((s, v) => s + v, 0);
    const resultadoOperacional = resultadoBruto - totalGastosFixos;
    const despesasFinanceiras = custosByCategoria["Financeiras"] || 0;
    const resultadoAnteIR = resultadoOperacional - despesasFinanceiras;
    const ir = resultadoAnteIR > 0 ? resultadoAnteIR * 0.15 : 0;
    const resultadoLiquido = resultadoAnteIR - ir;

    const taxaContribuicao = totalReceita > 0 ? resultadoBruto / totalReceita : 0;
    const pontoEquilibrio = taxaContribuicao > 0 ? totalGastosFixos / taxaContribuicao : 0;
    const margemSeguranca = totalReceita > 0 ? ((totalReceita - pontoEquilibrio) / totalReceita) * 100 : 0;

    return {
      totalReceita, iss, receitaLiquida, custoServicos, resultadoBruto,
      gastosFixos, totalGastosFixos, resultadoOperacional, despesasFinanceiras,
      resultadoAnteIR, ir, resultadoLiquido,
      taxaContribuicao, pontoEquilibrio, margemSeguranca,
      custosByCategoria,
    };
  }, [periodData, periodClientes]);

  // Cash flow - last 12 months
  const cashFlowData = useMemo(() => {
    const months: { month: string; saldo: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const m = subMonths(now, i);
      const key = format(m, "yyyy-MM");
      const label = format(m, "MMM", { locale: ptBR });
      const rec = empresaData.filter(d => d.data?.startsWith(key) && d.tipo === "receita").reduce((s, d) => s + Number(d.valor), 0);
      const desp = empresaData.filter(d => d.data?.startsWith(key) && d.tipo === "despesa").reduce((s, d) => s + Number(d.valor), 0);
      const prev = months.length > 0 ? months[months.length - 1].saldo : 0;
      months.push({ month: label, saldo: prev + rec - desp });
    }
    return months;
  }, [empresaData]);

  // Gastos fixos chart data
  const gastosFixosChart = useMemo(() => {
    return CATS.map((cat, i) => ({
      name: cat,
      valor: Object.values(dre.gastosFixos)[i] || 0,
      fill: CAT_COLORS[i],
    }));
  }, [dre]);

  // Runway
  const burnMensal = dre.totalGastosFixos + dre.custoServicos;
  const caixaAtual = cashFlowData.length > 0 ? cashFlowData[cashFlowData.length - 1].saldo : 0;
  const runway = burnMensal > 0 ? Math.floor(caixaAtual / burnMensal) : 99;

  // Balance health
  const balancoHealth = dre.resultadoLiquido > 0 && dre.margemSeguranca > 20
    ? "saudavel" : dre.resultadoLiquido > 0 ? "alerta" : "deficiente";

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* CEO Metrics & Alerts */}
      <CeoMetricsAndAlerts />

      {/* Period toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1", color: AMBER }}>Financeiro CEO</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão G4 Traction — Balanço, DRE, Fluxo de Caixa</p>
        </div>
        <div className="flex gap-1 glass-card p-1">
          {periodos.map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${periodo === p ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-muted-foreground hover:text-foreground"}`}
            >{p.charAt(0).toUpperCase() + p.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* DRE Metric cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Taxa de Contribuição", value: pct(dre.taxaContribuicao) },
          { label: "Ponto de Equilíbrio", value: fmt(dre.pontoEquilibrio) },
          { label: "Margem de Segurança", value: `${dre.margemSeguranca.toFixed(1)}%` },
        ].map((m, i) => (
          <div key={m.label} className="glass-card p-4 border-amber-500/20" style={{ animationDelay: `${i * 80}ms` }}>
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: AMBER }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* PAINEL 1 — BALANÇO */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: AMBER }}>Balanço Patrimonial</h2>
          <span className={`text-xs px-2 py-1 rounded-full ${
            balancoHealth === "saudavel" ? "bg-green-500/20 text-green-400" :
            balancoHealth === "alerta" ? "bg-amber-500/20 text-amber-400" :
            "bg-red-500/20 text-red-400"
          }`}>
            {balancoHealth === "saudavel" ? "🟢 Saudável" : balancoHealth === "alerta" ? "🟡 Alerta" : "🔴 Deficiente"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Ativo</h3>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground pl-2">Circulante</p>
              {[
                { label: "Caixa / Banco", value: caixaAtual },
                { label: "Duplicatas a Receber", value: clientesData.filter((c: any) => c.status === "pendente").reduce((s: number, c: any) => s + Number(c.valor), 0) },
                { label: "Estoque/WIP (projetos)", value: 0 },
              ].map(r => (
                <div key={r.label} className="flex justify-between py-1.5 px-3 text-sm">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="tabular-nums">{fmt(r.value)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Passivo + PL</h3>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground pl-2">Circulante</p>
              {[
                { label: "Fornecedores a Pagar", value: 0 },
                { label: "Salários a Pagar", value: dre.gastosFixos.pessoal },
                { label: "ISS a Recolher", value: dre.iss },
              ].map(r => (
                <div key={r.label} className="flex justify-between py-1.5 px-3 text-sm">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="tabular-nums">{fmt(r.value)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1.5 px-3 text-sm font-semibold bg-muted/30 rounded-lg mt-2">
                <span>Resultado do Exercício</span>
                <span className={dre.resultadoLiquido >= 0 ? "text-green-400" : "text-red-400"} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {fmt(dre.resultadoLiquido)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PAINEL 2 — DRE */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold mb-4" style={{ color: AMBER }}>DRE — Demonstração de Resultado</h2>
        <div className="space-y-0">
          {[
            { label: "Receita Bruta", value: dre.totalReceita, bold: true },
            { label: "(-) ISS 5%", value: -dre.iss },
            { label: "= Receita Líquida", value: dre.receitaLiquida, bold: true },
            { label: "(-) Custos dos Serviços Prestados", value: -dre.custoServicos, sub: "Freelancers, render farm, software" },
            { label: "= Resultado Bruto", value: dre.resultadoBruto, bold: true },
            { label: "(-) Pessoal", value: -dre.gastosFixos.pessoal, icon: "👥" },
            { label: "(-) Consumo", value: -dre.gastosFixos.consumo, icon: "⚡" },
            { label: "(-) Infraestrutura", value: -dre.gastosFixos.infra, icon: "🖥️" },
            { label: "(-) Comercial", value: -dre.gastosFixos.comercial, icon: "📣" },
            { label: "(-) Marketing", value: -dre.gastosFixos.marketing, icon: "📊" },
            { label: "(-) Adm/Jurídico", value: -dre.gastosFixos.admJuridico, icon: "⚖️" },
            { label: "= Resultado Operacional (EBIT)", value: dre.resultadoOperacional, bold: true, highlight: true },
            { label: "(-) Despesas Financeiras", value: -dre.despesasFinanceiras },
            { label: "= Resultado Antes do IR", value: dre.resultadoAnteIR, bold: true },
            { label: "(-) IR/CSLL", value: -dre.ir },
            { label: "= Resultado Líquido", value: dre.resultadoLiquido, bold: true, highlight: true },
          ].map((row: any) => (
            <div key={row.label} className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${
              row.highlight ? "bg-amber-500/5" : row.bold ? "bg-muted/30" : ""
            } ${row.bold ? "font-semibold" : ""}`}>
              <span className={`text-sm ${row.bold ? "text-foreground" : "text-muted-foreground"}`}>
                {row.icon && <span className="mr-2">{row.icon}</span>}
                {row.label}
                {row.sub && <span className="text-xs text-muted-foreground ml-2">({row.sub})</span>}
              </span>
              <span className={`text-sm tabular-nums ${
                row.value < 0 ? "text-red-400" : row.highlight ? "text-amber-400" : "text-foreground"
              }`}>
                {row.value < 0 ? "-" : ""}R$ {Math.abs(row.value).toLocaleString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* PAINEL 3 — FLUXO DE CAIXA */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold mb-4" style={{ color: AMBER }}>Fluxo de Caixa — Últimos 12 meses</h2>
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Operacional", value: dre.totalReceita - dre.custoServicos - dre.totalGastosFixos },
            { label: "Investimento", value: 0 },
            { label: "Financiamento", value: 0 },
            { label: "Fluxo Total", value: dre.resultadoLiquido },
          ].map(c => (
            <div key={c.label} className="p-3 rounded-xl bg-muted/30">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className={`text-lg font-bold mt-1 tabular-nums ${c.value >= 0 ? "text-green-400" : "text-red-400"}`}>
                {fmt(c.value)}
              </p>
            </div>
          ))}
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "hsl(220,10%,50%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(220,10%,50%)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="saldo" stroke={AMBER} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 p-3 rounded-xl bg-muted/30 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">🏦 Runway:</span>
          <span className={`text-sm font-bold ${runway > 6 ? "text-green-400" : runway > 3 ? "text-amber-400" : "text-red-400"}`}>
            {runway} meses
          </span>
          <span className="text-xs text-muted-foreground">no ritmo atual de burn</span>
        </div>
      </div>

      {/* PAINEL 4 — GASTO FIXO */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold mb-4" style={{ color: AMBER }}>Gasto Fixo por Categoria</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gastosFixosChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} />
                <YAxis tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                  {gastosFixosChart.map((_, i) => <Cell key={i} fill={CAT_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={gastosFixosChart.filter(d => d.valor > 0)} dataKey="valor" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} strokeWidth={0}>
                  {gastosFixosChart.map((_, i) => <Cell key={i} fill={CAT_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-muted-foreground">Total Gasto Fixo</p>
          <p className="text-xl font-bold" style={{ color: AMBER, fontVariantNumeric: "tabular-nums" }}>{fmt(dre.totalGastosFixos)}</p>
        </div>
      </div>

      {/* PAINEL 5 — RESUMO EXECUTIVO */}
      <div className="glass-card p-6 border-amber-500/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: AMBER }}>Resumo Executivo do Negócio</h2>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            dre.resultadoLiquido >= 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          }`}>
            {dre.resultadoLiquido >= 0 ? "🟢 Lucrativo" : "🔴 Prejuízo"}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Faturamento", value: fmt(dre.totalReceita) },
            { label: "Margem Contribuição", value: fmt(dre.resultadoBruto) },
            { label: "Taxa Contribuição", value: pct(dre.taxaContribuicao) },
            { label: "Gasto Fixo", value: fmt(dre.totalGastosFixos) },
            { label: "Resultado Operacional", value: fmt(dre.resultadoOperacional) },
            { label: "Ponto Equilíbrio", value: fmt(dre.pontoEquilibrio) },
            { label: "Margem Segurança", value: `${dre.margemSeguranca.toFixed(1)}%` },
            { label: "Resultado Líquido", value: fmt(dre.resultadoLiquido) },
          ].map(m => (
            <div key={m.label} className="p-3 rounded-xl bg-muted/30">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-sm font-bold mt-1 tabular-nums">{m.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
