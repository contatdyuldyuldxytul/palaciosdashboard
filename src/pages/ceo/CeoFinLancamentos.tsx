import { useState } from "react";
import { useLancamentos, useAddLancamento, useDeleteLancamento } from "@/hooks/useLancamentos";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const CATS_ENTRADA = ["Receita de Projeto", "Receita não Operacional", "Outros"];
const CATS_SAIDA = ["CMV/Custo", "Pessoal", "Aluguel", "Marketing", "Adm", "Financeiro", "Outras Despesas"];

function fmt(v: number) {
  return `R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CeoFinLancamentos() {
  const [monthOffset, setMonthOffset] = useState(0);
  const baseDate = addMonths(new Date(), monthOffset);
  const mes = format(baseDate, "MM/yyyy");
  const mesLabel = format(baseDate, "MMMM yyyy", { locale: ptBR });

  const lancamentos = useLancamentos(mes);
  const addMut = useAddLancamento();
  const delMut = useDeleteLancamento();

  const [form, setForm] = useState({
    data: format(new Date(), "yyyy-MM-dd"),
    classificacao: "Entrada" as "Entrada" | "Saída",
    descricao: "",
    categoria: CATS_ENTRADA[0],
    valor: "",
  });

  const cats = form.classificacao === "Entrada" ? CATS_ENTRADA : CATS_SAIDA;

  const handleClassChange = (c: "Entrada" | "Saída") => {
    const newCats = c === "Entrada" ? CATS_ENTRADA : CATS_SAIDA;
    setForm(f => ({ ...f, classificacao: c, categoria: newCats[0] }));
  };

  const handleSubmit = () => {
    if (!form.descricao || !form.valor) return;
    const dateParts = form.data.split("-");
    const mesFormatted = `${dateParts[1]}/${dateParts[0]}`;
    addMut.mutate({
      data: form.data,
      mes: mesFormatted,
      classificacao: form.classificacao,
      descricao: form.descricao,
      categoria: form.categoria,
      valor: parseFloat(form.valor),
    });
    setForm(f => ({ ...f, descricao: "", valor: "" }));
  };

  const entries = lancamentos.data || [];
  const totalEntradas = entries.filter(e => e.classificacao === "Entrada").reduce((s, e) => s + Number(e.valor), 0);
  const totalSaidas = entries.filter(e => e.classificacao === "Saída").reduce((s, e) => s + Number(e.valor), 0);
  const saldo = totalEntradas - totalSaidas;

  if (lancamentos.isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-amber-400">📝 Lançamentos</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonthOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-medium capitalize min-w-[120px] text-center">{mesLabel}</span>
          <button onClick={() => setMonthOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Form */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Data</label>
            <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="bg-white/5 border-white/10 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Classificação</label>
            <select value={form.classificacao} onChange={e => handleClassChange(e.target.value as any)} className="w-full h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-foreground">
              <option value="Entrada">Entrada</option>
              <option value="Saída">Saída</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
            <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="w-full h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-foreground">
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
            <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição..." className="bg-white/5 border-white/10 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Valor (R$)</label>
            <Input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" className="bg-white/5 border-white/10 text-sm" />
          </div>
          <Button onClick={handleSubmit} disabled={addMut.isPending} size="sm" className="bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30">
            <Plus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">#</th>
              <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Data</th>
              <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Classificação</th>
              <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Descrição</th>
              <th className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">Categoria</th>
              <th className="px-4 py-3 text-right text-xs text-muted-foreground font-medium">Valor</th>
              <th className="px-4 py-3 text-center text-xs text-muted-foreground font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.id} className={`border-b border-white/5 ${e.classificacao === "Entrada" ? "bg-emerald-500/5" : "bg-red-500/5"}`}>
                <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-2.5">{e.data}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${e.classificacao === "Entrada" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                    {e.classificacao}
                  </span>
                </td>
                <td className="px-4 py-2.5">{e.descricao}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{e.categoria}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${e.classificacao === "Entrada" ? "text-emerald-400" : "text-red-400"}`}>
                  {fmt(Number(e.valor))}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <button onClick={() => delMut.mutate(e.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum lançamento neste mês</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4 border-emerald-500/20">
          <p className="text-xs text-muted-foreground">✅ Total Entradas</p>
          <p className="text-xl font-bold text-emerald-400 tabular-nums mt-1">{fmt(totalEntradas)}</p>
        </div>
        <div className="glass-card p-4 border-red-500/20">
          <p className="text-xs text-muted-foreground">🔴 Total Saídas</p>
          <p className="text-xl font-bold text-red-400 tabular-nums mt-1">{fmt(totalSaidas)}</p>
        </div>
        <div className={`glass-card p-4 ${saldo >= 0 ? "border-emerald-500/20" : "border-red-500/20"}`}>
          <p className="text-xs text-muted-foreground">= Saldo</p>
          <p className={`text-xl font-bold tabular-nums mt-1 ${saldo >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {saldo < 0 ? "-" : ""}{fmt(saldo)}
          </p>
        </div>
      </div>
    </div>
  );
}
