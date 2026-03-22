import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientes, useFinanceiroClientes, useChecklist } from "@/hooks/useCeoData";
import { differenceInDays, parseISO } from "date-fns";

const AMBER = "hsl(45, 100%, 55%)";

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

export default function CeoJuridico() {
  const { data: clientesData, isLoading: l1 } = useClientes();
  const { data: finData, isLoading: l2 } = useFinanceiroClientes();
  const { data: checklistData, isLoading: l3 } = useChecklist();

  const clientes = clientesData || [];
  const fin = finData || [];
  const chk = checklistData || [];

  const now = new Date();

  // Contract list with payment status
  const contracts = useMemo(() => {
    return clientes.map(c => {
      const pagamentos = fin.filter((f: any) => f.cliente_id === c.id);
      const atrasados = pagamentos.filter((f: any) => f.status === "atrasado");
      const pendentes = pagamentos.filter((f: any) => f.status === "pendente");
      const daysToDelivery = c.data_previsao ? differenceInDays(parseISO(c.data_previsao), now) : null;
      return {
        ...c,
        pagamentos,
        atrasados: atrasados.length,
        pendentes: pendentes.length,
        totalAtrasado: atrasados.reduce((s: number, f: any) => s + Number(f.valor), 0),
        daysToDelivery,
        paymentStatus: atrasados.length > 0 ? "inadimplente" : pendentes.length > 0 ? "atencao" : "em_dia",
      };
    });
  }, [clientes, fin]);

  // Inadimplência summary
  const totalReceber = fin.reduce((s: number, f: any) => s + Number(f.valor), 0);
  const totalAtrasado = fin.filter((f: any) => f.status === "atrasado").reduce((s: number, f: any) => s + Number(f.valor), 0);
  const pctInadimplencia = totalReceber > 0 ? (totalAtrasado / totalReceber) * 100 : 0;

  // Alerts
  const alerts = useMemo(() => {
    const a: string[] = [];
    contracts.forEach(c => {
      if (c.atrasados > 0) a.push(`🔴 ${c.empresa}: ${c.atrasados} pagamento(s) em atraso (${fmt(c.totalAtrasado)})`);
      if (c.daysToDelivery !== null && c.daysToDelivery <= 7 && c.daysToDelivery >= 0) a.push(`🟡 ${c.empresa}: entrega em ${c.daysToDelivery} dia(s)`);
    });
    return a;
  }, [contracts]);

  if (l1 || l2 || l3) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1", color: AMBER }}>Jurídico & Contratos</h1>

      {/* Inadimplência summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Total a Receber</p>
          <p className="text-xl font-bold tabular-nums" style={{ color: AMBER }}>{fmt(totalReceber)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Total em Atraso</p>
          <p className="text-xl font-bold tabular-nums text-red-400">{fmt(totalAtrasado)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">% Inadimplência</p>
          <p className={`text-xl font-bold tabular-nums ${pctInadimplencia > 10 ? "text-red-400" : pctInadimplencia > 5 ? "text-amber-400" : "text-green-400"}`}>
            {pctInadimplencia.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="glass-card p-4 border-amber-500/20 space-y-1">
          <h3 className="text-xs font-semibold mb-2" style={{ color: AMBER }}>Alertas</h3>
          {alerts.map((a, i) => <p key={i} className="text-xs text-muted-foreground">{a}</p>)}
        </div>
      )}

      {/* Contracts table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--glass-border)" }}>
              {["Cliente", "Projeto", "Valor", "Início", "Entrega", "Status"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contracts.map(c => (
              <tr key={c.id} className="border-b hover:bg-white/[0.02] transition-colors" style={{ borderColor: "var(--glass-border)" }}>
                <td className="px-4 py-3 font-medium">{c.empresa}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.projeto}</td>
                <td className="px-4 py-3 tabular-nums">{fmt(c.valor_total || 0)}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{c.data_inicio?.split("T")[0] || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {c.data_previsao?.split("T")[0] || "—"}
                  {c.daysToDelivery !== null && c.daysToDelivery <= 7 && c.daysToDelivery >= 0 && (
                    <span className="ml-1 text-amber-400">({c.daysToDelivery}d)</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    c.paymentStatus === "em_dia" ? "bg-green-500/20 text-green-400" :
                    c.paymentStatus === "atencao" ? "bg-amber-500/20 text-amber-400" :
                    "bg-red-500/20 text-red-400"
                  }`}>
                    {c.paymentStatus === "em_dia" ? "🟢 Em dia" : c.paymentStatus === "atencao" ? "🟡 Atenção" : "🔴 Inadimplente"}
                  </span>
                </td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum contrato ativo</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
