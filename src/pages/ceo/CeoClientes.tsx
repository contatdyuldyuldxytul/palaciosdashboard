import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientesCEO, ClienteCEO } from "@/hooks/useClientesCEO";
import { useParcelaMatcher } from "@/hooks/useParcelaMatcher";
import ClienteFormModal from "@/components/ceo/ClienteFormModal";
import ClienteDetalhesModal from "@/components/ceo/ClienteDetalhesModal";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const AMBER = "hsl(45, 100%, 55%)";
const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Tab = "ativos" | "anteriores";

export default function CeoClientes() {
  const { data: clientes = [], isLoading } = useClientesCEO();
  const matcher = useParcelaMatcher();
  const [tab, setTab] = useState<Tab>("ativos");
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<ClienteCEO | null>(null);

  const ativos = useMemo(() => clientes.filter((c) => !c.concluido_em), [clientes]);
  const anteriores = useMemo(() => clientes.filter((c) => !!c.concluido_em), [clientes]);
  const list = tab === "ativos" ? ativos : anteriores;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: AMBER, lineHeight: "1.1" }}>
            Clientes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {ativos.length} ativo{ativos.length === 1 ? "" : "s"} · {anteriores.length} concluído{anteriores.length === 1 ? "" : "s"}
            {matcher.matchedCount > 0 && ` · ${matcher.matchedCount} pagamento(s) sincronizado(s)`}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="bg-amber-500/90 hover:bg-amber-500 text-black">
          <Plus className="w-4 h-4 mr-1" /> Novo cliente
        </Button>
      </div>

      {/* Tabs */}
      <div className="inline-flex p-1 rounded-xl bg-white/[0.04] border border-white/5">
        {([
          { id: "ativos", label: `Ativos (${ativos.length})` },
          { id: "anteriores", label: `Anteriores (${anteriores.length})` },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === t.id ? "bg-amber-500/15 text-amber-400" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Unmatched alert */}
      {tab === "ativos" && matcher.unmatched.length > 0 && (
        <div className="rounded-xl p-3 bg-amber-500/5 border border-amber-500/20 text-xs">
          <p className="font-semibold text-amber-400 mb-1">
            {matcher.unmatched.length} pagamento(s) na planilha sem cliente identificado
          </p>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {matcher.unmatched.slice(0, 8).map((u) => (
              <p key={u.id} className="text-muted-foreground">
                · {format(parseISO(u.data), "dd/MM", { locale: ptBR })} — {u.descricao} ({fmtBRL(u.valor)})
              </p>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Dica: adicione um apelido ao cliente correspondente para que o sistema reconheça automaticamente.
          </p>
        </div>
      )}

      {/* Cards */}
      {list.length === 0 ? (
        <div className="rounded-2xl p-12 text-center bg-white/[0.02] border border-white/5">
          <p className="text-sm text-muted-foreground">
            {tab === "ativos" ? "Nenhum cliente ativo. Comece adicionando um." : "Nenhum projeto concluído ainda."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((c) => <ClienteCard key={c.id} cliente={c} onClick={() => setSelected(c)} />)}
        </div>
      )}

      <ClienteFormModal open={formOpen} onOpenChange={setFormOpen} />
      <ClienteDetalhesModal cliente={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />
    </div>
  );
}

function ClienteCard({ cliente, onClick }: { cliente: ClienteCEO; onClick: () => void }) {
  const total = Number(cliente.valor_total) || 0;
  const pago = (cliente.parcelas || []).filter((p) => p.status === "pago").reduce((s, p) => s + (p.valor_pago || 0), 0);
  const pct = total > 0 ? Math.min(100, (pago / total) * 100) : 0;
  const parcelas = cliente.parcelas || [];

  return (
    <button
      onClick={onClick}
      className="text-left p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] hover:border-amber-500/20 transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">{cliente.empresa}</p>
          <p className="text-xs text-muted-foreground truncate">{cliente.projeto}</p>
        </div>
        {cliente.concluido_em && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 whitespace-nowrap">
            Concluído {format(parseISO(cliente.concluido_em), "dd/MM/yy")}
          </span>
        )}
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Recebido</span>
          <span className="tabular-nums">
            <span className="text-emerald-400">{fmtBRL(pago)}</span>
            <span className="text-muted-foreground"> / {fmtBRL(total)}</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full bg-emerald-500/80 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Timeline parcelas */}
      <div className="flex items-center gap-1.5">
        {parcelas.map((p, i) => {
          const venceu = p.status === "pendente" && p.data_prevista && parseISO(p.data_prevista) < new Date();
          const cls = p.status === "pago"
            ? "bg-emerald-500"
            : venceu
              ? "bg-red-500"
              : "bg-white/20";
          return <div key={i} className={`flex-1 h-1.5 rounded-full ${cls}`} />;
        })}
        {parcelas.length === 0 && <span className="text-[10px] text-muted-foreground">Sem parcelas</span>}
      </div>
    </button>
  );
}
