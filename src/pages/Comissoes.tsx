import { useEffect, useMemo, useState } from "react";
import { DollarSign, Plus, Trash2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { RegistrarVendaModal } from "@/components/RegistrarVendaModal";
import {
  COMISSAO_PCT,
  Contrato,
  STORAGE_KEY,
  Status,
  VENDEDORES_PADRAO,
  currentMonthKey,
  fmtBRL,
} from "@/lib/contratos";

const fmtDate = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const statusStyle: Record<Status, { bg: string; border: string; color: string }> = {
  Pago: { bg: "rgba(0,200,150,0.12)", border: "rgba(0,200,150,0.3)", color: "hsl(160,100%,45%)" },
  Pendente: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", color: "hsl(38,100%,60%)" },
  Parcelado: { bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)", color: "hsl(238,80%,70%)" },
};

export default function Comissoes() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        setContratos(raw ? JSON.parse(raw) : []);
      } catch {}
    };
    load();
    window.addEventListener("palacios:contratos-updated", load);
    return () => window.removeEventListener("palacios:contratos-updated", load);
  }, []);

  const persist = (next: Contrato[]) => {
    setContratos(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("palacios:contratos-updated"));
  };

  const vendedoresList = useMemo(() => {
    const extras = contratos.map((c) => c.vendedor).filter((v) => !VENDEDORES_PADRAO.includes(v));
    return Array.from(new Set([...VENDEDORES_PADRAO, ...extras]));
  }, [contratos]);

  const contratosMes = useMemo(
    () => contratos.filter((c) => c.data.startsWith(currentMonthKey())),
    [contratos]
  );

  const resumoPorVendedor = useMemo(() => {
    const map = new Map<string, { vendido: number; comissao: number; qtd: number }>();
    vendedoresList.forEach((v) => map.set(v, { vendido: 0, comissao: 0, qtd: 0 }));
    contratosMes.forEach((c) => {
      const cur = map.get(c.vendedor) || { vendido: 0, comissao: 0, qtd: 0 };
      cur.vendido += c.valor;
      cur.comissao += c.comissao;
      cur.qtd += 1;
      map.set(c.vendedor, cur);
    });
    return Array.from(map.entries()).map(([nome, v]) => ({ nome, ...v }));
  }, [contratosMes, vendedoresList]);

  const totalMes = contratosMes.reduce((s, c) => s + c.valor, 0);
  const totalComissaoMes = contratosMes.reduce((s, c) => s + c.comissao, 0);

  const handleAdd = (c: Omit<Contrato, "id" | "comissao">) => {
    const novo: Contrato = {
      ...c,
      id: crypto.randomUUID(),
      comissao: c.valor * COMISSAO_PCT,
    };
    setContratos((prev) => [novo, ...prev]);
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Excluir este contrato?")) return;
    setContratos((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(0,200,150,0.12)", border: "1px solid rgba(0,200,150,0.25)" }}
          >
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
              Comissões
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Contratos fechados e cálculo automático de comissões (4%)
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 shadow-[0_0_20px_hsla(160,100%,39%,0.2)]"
          style={{ background: "hsl(160,100%,39%)", color: "#001a14" }}
        >
          <Plus className="w-4 h-4" />
          Registrar Venda
        </button>
      </div>

      {/* Totais do mês */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Total vendido no mês</p>
          <p className="text-2xl font-bold text-foreground mt-1">{fmtBRL(totalMes)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{contratosMes.length} contrato(s)</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Comissões a pagar</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "hsl(160,100%,45%)" }}>
            {fmtBRL(totalComissaoMes)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">4% sobre total do mês</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Histórico total</p>
          <p className="text-2xl font-bold text-foreground mt-1">{contratos.length}</p>
          <p className="text-[10px] text-muted-foreground mt-1">contratos registrados</p>
        </div>
      </div>

      {/* Resumo por vendedor */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Resumo por vendedor — mês atual</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumoPorVendedor.map((v) => (
            <div key={v.nome} className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-foreground">{v.nome}</p>
                <span className="text-[10px] text-muted-foreground">{v.qtd} venda(s)</span>
              </div>
              <div className="space-y-1.5 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Vendido</span>
                  <span className="text-sm font-semibold text-foreground">{fmtBRL(v.vendido)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Comissão (4%)</span>
                  <span className="text-sm font-semibold" style={{ color: "hsl(160,100%,45%)" }}>
                    {fmtBRL(v.comissao)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="glass-card p-0 overflow-hidden">
        <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--glass-border)" }}>
          <h2 className="text-sm font-semibold text-foreground">Todos os contratos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground" style={{ borderBottom: "1px solid var(--glass-border)" }}>
                <th className="text-left px-5 py-3 font-medium">Empresa</th>
                <th className="text-left px-3 py-3 font-medium">Vendedor</th>
                <th className="text-right px-3 py-3 font-medium">Valor</th>
                <th className="text-right px-3 py-3 font-medium">Comissão (4%)</th>
                <th className="text-left px-3 py-3 font-medium">Data</th>
                <th className="text-left px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {contratos.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                    Nenhum contrato registrado. Clique em "Registrar Venda" para começar.
                  </td>
                </tr>
              )}
              {contratos.map((c) => {
                const s = statusStyle[c.status];
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-white/[0.03] transition-colors"
                    style={{ borderBottom: "1px solid var(--glass-border)" }}
                  >
                    <td className="px-5 py-3 font-medium text-foreground">{c.empresa}</td>
                    <td className="px-3 py-3 text-foreground">{c.vendedor}</td>
                    <td className="px-3 py-3 text-right font-medium text-foreground">{fmtBRL(c.valor)}</td>
                    <td className="px-3 py-3 text-right font-semibold" style={{ color: "hsl(160,100%,45%)" }}>
                      {fmtBRL(c.comissao)}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{fmtDate(c.data)}</td>
                    <td className="px-3 py-3">
                      <span
                        className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold"
                        style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <RegistrarVendaModal
            vendedores={vendedoresList}
            onClose={() => setShowModal(false)}
            onSave={handleAdd}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

