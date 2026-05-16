import { useMemo, useState } from "react";
import { Plus, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientesCEO, ClienteCEO } from "@/hooks/useClientesCEO";
import { useParcelaMatcher } from "@/hooks/useParcelaMatcher";
import { useLancamentos } from "@/hooks/useLancamentos";
import ClienteFormModal from "@/components/ceo/ClienteFormModal";
import ClienteDetalhesModal from "@/components/ceo/ClienteDetalhesModal";
import { format, parseISO } from "date-fns";

const AMBER = "hsl(45, 100%, 55%)";
const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type Tab = "ativos" | "anteriores";

export default function CeoClientes() {
  const { data: clientes = [], isLoading } = useClientesCEO();
  const { data: lancamentos = [] } = useLancamentos();
  const matcher = useParcelaMatcher();
  const [tab, setTab] = useState<Tab>("ativos");
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<ClienteCEO | null>(null);
  const [editing, setEditing] = useState<ClienteCEO | null>(null);

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

  const handleEdit = (c: ClienteCEO) => {
    setSelected(null);
    setEditing(c);
    setFormOpen(true);
  };

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
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="bg-amber-500/90 hover:bg-amber-500 text-black">
          <Plus className="w-4 h-4 mr-1" /> Novo cliente
        </Button>
      </div>

      <div className="inline-flex p-1 rounded-xl bg-white/[0.04] border border-white/5">
        {([
          { id: "ativos", label: `Ativos (${ativos.length})` },
          { id: "anteriores", label: `Anteriores (${anteriores.length})` },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === t.id ? "bg-amber-500/15 text-amber-400" : "text-muted-foreground hover:text-foreground"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl p-12 text-center bg-white/[0.02] border border-white/5">
          <p className="text-sm text-muted-foreground">
            {tab === "ativos" ? "Nenhum cliente ativo. Comece adicionando um." : "Nenhum projeto concluído ainda."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((c) => <ClienteCard key={c.id} cliente={c} lancamentos={lancamentos} onClick={() => setSelected(c)} />)}
        </div>
      )}

      <ClienteFormModal
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}
        cliente={editing}
      />
      <ClienteDetalhesModal
        cliente={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        onEdit={handleEdit}
      />
    </div>
  );
}

function ClienteCard({
  cliente, lancamentos, onClick,
}: { cliente: ClienteCEO; lancamentos: any[]; onClick: () => void; }) {
  const isRec = !!cliente.recorrente;
  const total = Number(cliente.valor_total) || 0;
  const parcelas = cliente.parcelas || [];

  const recPago = useMemo(() => {
    if (!isRec) return 0;
    const aliases = [cliente.empresa, ...(cliente.apelidos || [])].filter(Boolean);
    return lancamentos
      .filter((l) => l.classificacao === "Entrada" && (l.categoria === "Receitas Palacios" || l.categoria === "Receitas BKV"))
      .filter((l) => {
        const desc = norm(l.descricao || "");
        return aliases.some((a) => {
          const na = norm(a);
          return na && new RegExp(`\\b${escapeRegex(na)}\\b`).test(desc);
        });
      })
      .reduce((s, l) => s + Number(l.valor || 0), 0);
  }, [isRec, cliente, lancamentos]);

  const pago = isRec ? recPago : parcelas.filter((p) => p.status === "pago").reduce((s, p) => s + (p.valor_pago || 0), 0);
  const pct = !isRec && total > 0 ? Math.min(100, (pago / total) * 100) : 0;

  return (
    <button onClick={onClick}
      className="text-left p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] hover:border-amber-500/20 transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground truncate">{cliente.empresa}</p>
            {isRec && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 inline-flex items-center gap-1">
                <Repeat className="w-2.5 h-2.5" /> Recorrente
              </span>
            )}
          </div>
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
          <span className="text-muted-foreground">{isRec ? "Total recebido" : "Recebido"}</span>
          <span className="tabular-nums">
            <span className="text-emerald-400">{fmtBRL(pago)}</span>
            {!isRec && <span className="text-muted-foreground"> / {fmtBRL(total)}</span>}
          </span>
        </div>
        {!isRec && (
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-emerald-500/80 transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      {!isRec && (
        <div className="flex items-center gap-1.5">
          {parcelas.map((p, i) => {
            const venceu = p.status === "pendente" && p.data_prevista && parseISO(p.data_prevista) < new Date();
            const cls = p.status === "pago" ? "bg-emerald-500" : venceu ? "bg-red-500" : "bg-white/20";
            return <div key={i} className={`flex-1 h-1.5 rounded-full ${cls}`} />;
          })}
          {parcelas.length === 0 && <span className="text-[10px] text-muted-foreground">Sem parcelas</span>}
        </div>
      )}
    </button>
  );
}
