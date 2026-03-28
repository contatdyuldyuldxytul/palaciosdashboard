import { useState, useMemo } from "react";
import { useCustosConfig, useUpsertCustosConfig } from "@/hooks/useCustosConfig";
import { useLancamentos } from "@/hooks/useLancamentos";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function fmt(v: number) {
  const prefix = v < 0 ? "-" : "";
  return `${prefix}R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const FIXED_COST_FIELDS = [
  { key: "pessoal", label: "Pessoal / Folha de Pagamento", autoFromCat: "Pessoal" },
  { key: "aluguel", label: "Aluguel", autoFromCat: "Aluguel" },
  { key: "condominio_iptu", label: "Condomínio / IPTU" },
  { key: "energia_agua_telefone", label: "Energia / Água / Telefone" },
  { key: "internet_ti", label: "Internet / TI" },
  { key: "marketing_publicidade", label: "Marketing / Publicidade", autoFromCat: "Marketing" },
  { key: "contabilidade_juridico", label: "Contabilidade / Jurídico" },
  { key: "financeiro_bancario", label: "Financeiro / Bancário" },
  { key: "depreciacao", label: "Depreciação" },
  { key: "seguros", label: "Seguros" },
  { key: "veiculos", label: "Veículos" },
  { key: "diretoria_prolabore", label: "Diretoria / Sócios (pró-labore)" },
  { key: "outros_fixos", label: "Outros Gastos Fixos" },
];

export default function CeoFinCustosPE() {
  const [monthOffset, setMonthOffset] = useState(0);
  const baseDate = addMonths(new Date(), monthOffset);
  const mes = format(baseDate, "MM/yyyy");
  const mesLabel = format(baseDate, "MMMM yyyy", { locale: ptBR });

  const custosQ = useCustosConfig(mes);
  const upsert = useUpsertCustosConfig();
  const lancQ = useLancamentos(mes);

  const custos = custosQ.data?.[0] || {} as any;
  const [local, setLocal] = useState<Record<string, number>>({});

  const getVal = (key: string) => local[key] ?? Number(custos[key] || 0);
  const setVal = (key: string, v: number) => setLocal(l => ({ ...l, [key]: v }));

  // Auto from lancamentos
  const autoValues = useMemo(() => {
    const entries = lancQ.data || [];
    const sumByCat = (cat: string) => entries.filter(e => e.classificacao === "Saída" && e.categoria === cat).reduce((s, e) => s + Number(e.valor), 0);
    return { Pessoal: sumByCat("Pessoal"), Aluguel: sumByCat("Aluguel"), Marketing: sumByCat("Marketing") };
  }, [lancQ.data]);

  const totalFixo = FIXED_COST_FIELDS.reduce((s, f) => {
    if (f.autoFromCat) return s + (autoValues[f.autoFromCat as keyof typeof autoValues] || 0);
    return s + getVal(f.key);
  }, 0);

  // Margem de contribuição
  const precoUnit = getVal("preco_venda_unitario") || 20000;
  const gvUnit = getVal("gastos_variaveis_unitarios");
  const mcUnit = precoUnit - gvUnit;
  const taxaContrib = precoUnit > 0 ? mcUnit / precoUnit : 0;
  const volume = getVal("volume_vendas");
  const receitaTotal = precoUnit * volume;
  const gvTotal = gvUnit * volume;
  const mcTotal = mcUnit * volume;

  // Ponto de equilíbrio
  const peUnit = mcUnit > 0 ? totalFixo / mcUnit : 0;
  const peReais = taxaContrib > 0 ? totalFixo / taxaContrib : 0;
  const margemSeg = volume - peUnit;
  const taxaSeg = volume > 0 ? (margemSeg / volume) * 100 : 0;
  const resultadoOp = mcTotal - totalFixo;

  // Gauge position
  const gaugePos = peReais > 0 ? Math.min(100, (receitaTotal / peReais) * 50) : 50;

  const handleSave = () => {
    upsert.mutate({ mes, ...local });
    setLocal({});
  };

  if (custosQ.isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-amber-400">📐 Custos & Ponto de Equilíbrio</h2>
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
        {/* LEFT - Gasto Fixo */}
        <div className="glass-card p-4 space-y-2">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Gasto Fixo (por competência)</h3>
          {FIXED_COST_FIELDS.map(f => (
            <div key={f.key} className="flex items-center justify-between py-1.5 px-3">
              <span className="text-xs text-muted-foreground">{f.label}</span>
              {f.autoFromCat ? (
                <span className="text-sm tabular-nums text-muted-foreground/70">{fmt(autoValues[f.autoFromCat as keyof typeof autoValues] || 0)}</span>
              ) : (
                <Input type="number" step="0.01" value={getVal(f.key) || ""} onChange={e => setVal(f.key, parseFloat(e.target.value) || 0)}
                  className="w-32 bg-white/5 border-white/10 text-xs h-7 text-right tabular-nums" />
              )}
            </div>
          ))}
          <div className="pt-2 flex justify-between py-2 px-3 bg-amber-500/10 rounded-lg font-semibold text-sm">
            <span>TOTAL GASTO FIXO</span>
            <span className="tabular-nums text-amber-400">{fmt(totalFixo)}</span>
          </div>
        </div>

        {/* RIGHT - Margem de Contribuição */}
        <div className="space-y-4">
          <div className="glass-card p-4 space-y-2">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Margem de Contribuição</h3>
            {[
              { label: "Preço de Venda Unitário (R$)", key: "preco_venda_unitario" },
              { label: "Gastos Variáveis Unitários (R$)", key: "gastos_variaveis_unitarios" },
            ].map(f => (
              <div key={f.key} className="flex items-center justify-between py-1.5 px-3">
                <span className="text-xs text-muted-foreground">{f.label}</span>
                <Input type="number" step="0.01" value={getVal(f.key) || ""} onChange={e => setVal(f.key, parseFloat(e.target.value) || 0)}
                  className="w-32 bg-white/5 border-white/10 text-xs h-7 text-right tabular-nums" />
              </div>
            ))}
            <div className="flex justify-between py-1.5 px-3 bg-muted/20 rounded-lg">
              <span className="text-xs text-muted-foreground">MC Unitária (R$)</span>
              <span className="text-sm tabular-nums font-medium">{fmt(mcUnit)}</span>
            </div>
            <div className="flex justify-between py-1.5 px-3 bg-muted/20 rounded-lg">
              <span className="text-xs text-muted-foreground">Taxa de Contribuição (%)</span>
              <span className="text-sm tabular-nums font-medium">{(taxaContrib * 100).toFixed(1)}%</span>
            </div>

            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between py-1.5 px-3">
                <span className="text-xs text-muted-foreground">Volume de Vendas (contratos)</span>
                <Input type="number" value={getVal("volume_vendas") || ""} onChange={e => setVal("volume_vendas", parseFloat(e.target.value) || 0)}
                  className="w-24 bg-white/5 border-white/10 text-xs h-7 text-right tabular-nums" />
              </div>
              {[
                { label: "Receita Total", value: receitaTotal },
                { label: "Gasto Variável Total", value: gvTotal },
                { label: "MC Total", value: mcTotal },
              ].map(r => (
                <div key={r.label} className="flex justify-between py-1.5 px-3">
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                  <span className="text-sm tabular-nums">{fmt(r.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ponto de equilíbrio */}
          <div className="glass-card p-4 space-y-2">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Ponto de Equilíbrio</h3>
            {[
              { label: "PE Unitário (contratos)", value: peUnit.toFixed(1) },
              { label: "PE em Reais", value: fmt(peReais) },
            ].map(r => (
              <div key={r.label} className="flex justify-between py-1.5 px-3 bg-muted/20 rounded-lg">
                <span className="text-xs text-muted-foreground">{r.label}</span>
                <span className="text-sm tabular-nums font-medium">{r.value}</span>
              </div>
            ))}
          </div>

          {/* Análise */}
          <div className="glass-card p-4 space-y-2">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Análise</h3>
            {[
              { label: "Margem de Segurança (contratos)", value: margemSeg.toFixed(1) },
              { label: "Taxa de Segurança (%)", value: `${taxaSeg.toFixed(1)}%` },
              { label: "Resultado Operacional", value: fmt(resultadoOp), color: resultadoOp >= 0 ? "text-emerald-400" : "text-red-400" },
            ].map(r => (
              <div key={r.label} className="flex justify-between py-1.5 px-3">
                <span className="text-xs text-muted-foreground">{r.label}</span>
                <span className={`text-sm tabular-nums font-medium ${r.color || ""}`}>{r.value}</span>
              </div>
            ))}

            {/* Visual gauge */}
            <div className="pt-3">
              <div className="relative h-6 rounded-full bg-gradient-to-r from-red-500/30 via-amber-500/30 to-emerald-500/30 overflow-hidden">
                <div className="absolute top-0 h-full w-0.5 bg-white/60" style={{ left: "50%" }} />
                <div className="absolute top-0 h-full w-2 bg-white rounded-full shadow-lg transition-all" style={{ left: `${Math.min(100, Math.max(0, gaugePos))}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Prejuízo</span>
                <span>PE</span>
                <span>Lucro</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
