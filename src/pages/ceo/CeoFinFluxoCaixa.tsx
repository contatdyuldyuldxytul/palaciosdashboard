import { useState, useMemo } from "react";
import { useFluxoCaixa, useUpsertFluxoCaixa } from "@/hooks/useFluxoCaixa";
import { useLancamentos } from "@/hooks/useLancamentos";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

function fmt(v: number) {
  const prefix = v < 0 ? "-" : "";
  return `${prefix}R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface FCRow { label: string; projKey: string; realKey: string; }

const OP_ROWS: FCRow[] = [
  { label: "Recebimentos de Clientes", projKey: "recebimentos_clientes_proj", realKey: "recebimentos_clientes_real" },
  { label: "Pagamentos a Fornecedores", projKey: "pagamentos_fornecedores_proj", realKey: "pagamentos_fornecedores_real" },
  { label: "Pagamento de Pessoal", projKey: "pagamento_pessoal_proj", realKey: "pagamento_pessoal_real" },
  { label: "Pagamento de Despesas Gerais", projKey: "pagamento_despesas_proj", realKey: "pagamento_despesas_real" },
  { label: "Impostos Pagos", projKey: "impostos_proj", realKey: "impostos_real" },
];
const INV_ROWS: FCRow[] = [
  { label: "Aquisição de Imobilizado", projKey: "aquisicao_imobilizado_proj", realKey: "aquisicao_imobilizado_real" },
  { label: "Venda de Ativos", projKey: "venda_ativos_proj", realKey: "venda_ativos_real" },
  { label: "Outros Investimentos", projKey: "outros_investimentos_proj", realKey: "outros_investimentos_real" },
];
const FIN_ROWS: FCRow[] = [
  { label: "Captação de Empréstimos", projKey: "captacao_emprestimos_proj", realKey: "captacao_emprestimos_real" },
  { label: "Pagamento de Empréstimos", projKey: "pagamento_emprestimos_proj", realKey: "pagamento_emprestimos_real" },
  { label: "Aporte de Capital / Dividendos", projKey: "aporte_capital_proj", realKey: "aporte_capital_real" },
];

export default function CeoFinFluxoCaixa() {
  const [monthOffset, setMonthOffset] = useState(0);
  const baseDate = addMonths(new Date(), monthOffset);
  const mes = format(baseDate, "MM/yyyy");
  const mesLabel = format(baseDate, "MMMM yyyy", { locale: ptBR });

  const fcQ = useFluxoCaixa(mes);
  const upsert = useUpsertFluxoCaixa();
  const lancQ = useLancamentos(mes);
  const allLancQ = useLancamentos();

  const fc = fcQ.data?.[0] || {} as any;
  const [local, setLocal] = useState<Record<string, number>>({});

  const getVal = (key: string) => local[key] ?? Number(fc[key] || 0);
  const setVal = (key: string, v: number) => setLocal(l => ({ ...l, [key]: v }));

  const sumProj = (rows: FCRow[]) => rows.reduce((s, r) => s + getVal(r.projKey), 0);
  const sumReal = (rows: FCRow[]) => rows.reduce((s, r) => s + getVal(r.realKey), 0);

  const saldoOpP = getVal("recebimentos_clientes_proj") - getVal("pagamentos_fornecedores_proj") - getVal("pagamento_pessoal_proj") - getVal("pagamento_despesas_proj") - getVal("impostos_proj");
  const saldoOpR = getVal("recebimentos_clientes_real") - getVal("pagamentos_fornecedores_real") - getVal("pagamento_pessoal_real") - getVal("pagamento_despesas_real") - getVal("impostos_real");
  const saldoInvP = getVal("venda_ativos_proj") - getVal("aquisicao_imobilizado_proj") - getVal("outros_investimentos_proj");
  const saldoInvR = getVal("venda_ativos_real") - getVal("aquisicao_imobilizado_real") - getVal("outros_investimentos_real");
  const saldoFinP = getVal("captacao_emprestimos_proj") + getVal("aporte_capital_proj") - getVal("pagamento_emprestimos_proj");
  const saldoFinR = getVal("captacao_emprestimos_real") + getVal("aporte_capital_real") - getVal("pagamento_emprestimos_real");
  const saldoFinalR = saldoOpR + saldoInvR + saldoFinR;

  const burnMensal = Math.abs(saldoOpR) || 1;
  const runway = saldoFinalR > 0 ? Math.floor(saldoFinalR / burnMensal) : 0;

  const handleSave = () => {
    upsert.mutate({ mes, ...local });
    setLocal({});
  };

  // Chart data - last 6 months
  const chartData = useMemo(() => {
    const months = [];
    const allEntries = allLancQ.data || [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(baseDate, i);
      const mKey = format(m, "MM/yyyy");
      const label = format(m, "MMM", { locale: ptBR });
      const mEntries = allEntries.filter(e => e.mes === mKey);
      const entradas = mEntries.filter(e => e.classificacao === "Entrada").reduce((s, e) => s + Number(e.valor), 0);
      const saidas = mEntries.filter(e => e.classificacao === "Saída").reduce((s, e) => s + Number(e.valor), 0);
      months.push({ month: label, Entradas: entradas, Saídas: saidas });
    }
    return months;
  }, [allLancQ.data, baseDate]);

  if (fcQ.isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>;

  const renderPanel = (title: string, rows: FCRow[], saldoP: number, saldoR: number, label: string) => (
    <div className="glass-card p-4 space-y-2">
      <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">{title}</h3>
      {rows.map(r => (
        <div key={r.projKey} className="grid grid-cols-3 gap-2 items-center">
          <span className="text-xs text-muted-foreground">{r.label}</span>
          <Input type="number" step="0.01" value={getVal(r.projKey) || ""} onChange={e => setVal(r.projKey, parseFloat(e.target.value) || 0)} className="bg-white/5 border-white/10 text-xs h-8" placeholder="Projetado" />
          <Input type="number" step="0.01" value={getVal(r.realKey) || ""} onChange={e => setVal(r.realKey, parseFloat(e.target.value) || 0)} className="bg-white/5 border-white/10 text-xs h-8" placeholder="Realizado" />
        </div>
      ))}
      <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-2 items-center">
        <span className="text-xs font-semibold">SALDO {label}</span>
        <span className={`text-xs font-bold tabular-nums text-right ${saldoP >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(saldoP)}</span>
        <span className={`text-xs font-bold tabular-nums text-right ${saldoR >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(saldoR)}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-amber-400">💰 Fluxo de Caixa</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setMonthOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium capitalize min-w-[120px] text-center">{mesLabel}</span>
            <button onClick={() => setMonthOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <Button onClick={handleSave} size="sm" disabled={upsert.isPending} className="bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30">
            <Save className="w-3.5 h-3.5 mr-1" /> Salvar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderPanel("Operacional", OP_ROWS, saldoOpP, saldoOpR, "(A)")}
        {renderPanel("Investimento", INV_ROWS, saldoInvP, saldoInvR, "(B)")}
        {renderPanel("Financiamento", FIN_ROWS, saldoFinP, saldoFinR, "(C)")}

        {/* Panel D - Fluxo Total */}
        <div className="glass-card p-4 space-y-3 border-amber-500/20">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Fluxo Total</h3>
          {[
            { label: "Saldo Operacional (A)", value: saldoOpR },
            { label: "Saldo Investimento (B)", value: saldoInvR },
            { label: "Saldo Financiamento (C)", value: saldoFinR },
          ].map(r => (
            <div key={r.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <span className={`tabular-nums font-medium ${r.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(r.value)}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-white/10 flex justify-between text-sm">
            <span className="font-semibold">= SALDO FINAL</span>
            <span className={`font-bold tabular-nums ${saldoFinalR >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(saldoFinalR)}</span>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">🏦 Runway:</span>
            <span className={`text-sm font-bold ${runway > 6 ? "text-emerald-400" : runway > 3 ? "text-amber-400" : "text-red-400"}`}>{runway} meses</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">Entradas vs Saídas — Últimos 6 meses</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "hsl(220,10%,50%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(220,10%,50%)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="Entradas" fill="#00C896" radius={[4,4,0,0]} />
              <Bar dataKey="Saídas" fill="#EF4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
