import { useState } from "react";
import { useBalanco, useUpsertBalanco } from "@/hooks/useBalanco";
import { useLancamentos } from "@/hooks/useLancamentos";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Save, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function fmt(v: number) {
  const prefix = v < 0 ? "-" : "";
  return `${prefix}R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CeoFinBalanco() {
  const [monthOffset, setMonthOffset] = useState(0);
  const baseDate = addMonths(new Date(), monthOffset);
  const mes = format(baseDate, "MM/yyyy");
  const mesLabel = format(baseDate, "MMMM yyyy", { locale: ptBR });

  const balQ = useBalanco(mes);
  const upsert = useUpsertBalanco();
  const lancQ = useLancamentos(mes);

  const bal = balQ.data?.[0] || {} as any;
  const [local, setLocal] = useState<Record<string, number>>({});

  const getVal = (key: string) => local[key] ?? Number(bal[key] || 0);
  const setVal = (key: string, v: number) => setLocal(l => ({ ...l, [key]: v }));

  // Auto-calc: resultado do exercício from lancamentos
  const entries = lancQ.data || [];
  const resultadoExercicio = entries.reduce((s, e) => s + (e.classificacao === "Entrada" ? 1 : -1) * Number(e.valor), 0);

  // Ativo
  const ativoCirc = getVal("caixa") + getVal("banco") + getVal("duplicatas_receber") + getVal("estoques") + getVal("outros_circulante");
  const ativoNaoCirc = getVal("titulos_receber_lp") + getVal("imobilizado") + getVal("instalacoes") + getVal("equipamentos") - getVal("depreciacao");
  const totalAtivo = ativoCirc + ativoNaoCirc;

  // Passivo
  const passivoCirc = getVal("fornecedores_pagar") + getVal("salarios_pagar") + getVal("aluguel_pagar") + getVal("impostos_recolher") + getVal("emprestimos_cp");
  const passivoNaoCirc = getVal("emprestimos_lp") + getVal("financiamentos_lp");
  const pl = getVal("capital_social") + getVal("resultado_acumulado") + resultadoExercicio;
  const totalPassivoPL = passivoCirc + passivoNaoCirc + pl;

  const balanced = Math.abs(totalAtivo - totalPassivoPL) < 0.01;

  // Capital structure health
  const health = pl > ativoNaoCirc ? "saudavel" : (pl + passivoNaoCirc >= ativoNaoCirc * 0.9) ? "alerta" : "deficiente";

  const handleSave = () => {
    upsert.mutate({ mes, ...local });
    setLocal({});
  };

  if (balQ.isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>;

  const renderField = (label: string, key: string, auto?: boolean) => (
    <div className="flex items-center justify-between py-1.5 px-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      {auto ? (
        <span className="text-sm tabular-nums text-muted-foreground/70">{fmt(key === "resultado_exercicio" ? resultadoExercicio : getVal(key))}</span>
      ) : (
        <Input type="number" step="0.01" value={getVal(key) || ""} onChange={e => setVal(key, parseFloat(e.target.value) || 0)}
          className="w-32 bg-white/5 border-white/10 text-xs h-7 text-right tabular-nums" />
      )}
    </div>
  );

  const renderTotal = (label: string, value: number) => (
    <div className="flex justify-between py-2 px-3 bg-amber-500/10 rounded-lg font-semibold text-sm">
      <span>{label}</span>
      <span className="tabular-nums text-amber-400">{fmt(value)}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-amber-400">🏦 Balanço Patrimonial</h2>
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

      {!balanced && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4" />
          Balanço desbalanceado — verifique os lançamentos (Ativo: {fmt(totalAtivo)} ≠ Passivo+PL: {fmt(totalPassivoPL)})
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-1 rounded-full ${health === "saudavel" ? "bg-emerald-500/20 text-emerald-400" : health === "alerta" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
          {health === "saudavel" ? "🟢 SAUDÁVEL" : health === "alerta" ? "🟡 ALERTA" : "🔴 DEFICIENTE"}
        </span>
        <span className="text-xs text-muted-foreground">Estrutura de Capital</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ATIVO */}
        <div className="glass-card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Ativo</h3>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider pl-3">Ativo Circulante</p>
          {renderField("Caixa", "caixa")}
          {renderField("Banco", "banco")}
          {renderField("Duplicatas a Receber", "duplicatas_receber")}
          {renderField("Estoques", "estoques")}
          {renderField("Outros Ativos Circulantes", "outros_circulante")}
          {renderTotal("TOTAL ATIVO CIRCULANTE", ativoCirc)}

          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider pl-3 pt-2">Ativo Não Circulante</p>
          {renderField("Títulos a Receber LP", "titulos_receber_lp")}
          {renderField("Imobilizado", "imobilizado")}
          {renderField("Instalações", "instalacoes")}
          {renderField("Equipamentos", "equipamentos")}
          {renderField("(-) Depreciação Acumulada", "depreciacao")}
          {renderTotal("TOTAL ATIVO NÃO CIRC.", ativoNaoCirc)}

          <div className="pt-2">{renderTotal("TOTAL ATIVO", totalAtivo)}</div>
        </div>

        {/* PASSIVO + PL */}
        <div className="glass-card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Passivo + PL</h3>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider pl-3">Passivo Circulante</p>
          {renderField("Fornecedores a Pagar", "fornecedores_pagar")}
          {renderField("Salários a Pagar", "salarios_pagar")}
          {renderField("Aluguel a Pagar", "aluguel_pagar")}
          {renderField("Impostos a Recolher", "impostos_recolher")}
          {renderField("Empréstimos CP", "emprestimos_cp")}
          {renderTotal("TOTAL PASSIVO CIRCULANTE", passivoCirc)}

          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider pl-3 pt-2">Passivo Não Circulante</p>
          {renderField("Empréstimos LP", "emprestimos_lp")}
          {renderField("Financiamentos LP", "financiamentos_lp")}
          {renderTotal("TOTAL PASSIVO NÃO CIRC.", passivoNaoCirc)}

          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider pl-3 pt-2">Patrimônio Líquido</p>
          {renderField("Capital Social", "capital_social")}
          {renderField("Resultado Acumulado", "resultado_acumulado")}
          {renderField("Resultado do Exercício", "resultado_exercicio", true)}
          {renderTotal("TOTAL PL", pl)}

          <div className="pt-2">{renderTotal("TOTAL PASSIVO + PL", totalPassivoPL)}</div>
        </div>
      </div>
    </div>
  );
}
