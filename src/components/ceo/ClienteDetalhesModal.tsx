import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClienteCEO, useUpdateClienteCEO, useDeleteClienteCEO, useVendedores } from "@/hooks/useClientesCEO";
import { useLancamentos } from "@/hooks/useLancamentos";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Clock, AlertTriangle, Trash2, CheckCircle2, Pencil, Repeat } from "lucide-react";
import { useMemo, useState } from "react";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface Props {
  cliente: ClienteCEO | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit?: (cliente: ClienteCEO) => void;
}

export default function ClienteDetalhesModal({ cliente, open, onOpenChange, onEdit }: Props) {
  const update = useUpdateClienteCEO();
  const del = useDeleteClienteCEO();
  const { data: vendedores = [] } = useVendedores();
  const { data: lancamentos = [] } = useLancamentos();
  const [confirmDel, setConfirmDel] = useState(false);

  // Recurring totals
  const recurringEntries = useMemo(() => {
    if (!cliente?.recorrente) return [];
    const aliases = [cliente.empresa, ...(cliente.apelidos || [])].filter(Boolean);
    return lancamentos.filter((l) => {
      if (l.classificacao !== "Entrada") return false;
      if (l.categoria !== "Receitas Palacios" && l.categoria !== "Receitas BKV") return false;
      const desc = norm(l.descricao || "");
      return aliases.some((a) => {
        const na = norm(a);
        return na && new RegExp(`\\b${escapeRegex(na)}\\b`).test(desc);
      });
    });
  }, [cliente, lancamentos]);

  if (!cliente) return null;

  const isRec = !!cliente.recorrente;
  const total = Number(cliente.valor_total) || 0;
  const pago = isRec
    ? recurringEntries.reduce((s, l) => s + Number(l.valor || 0), 0)
    : (cliente.parcelas || []).filter((p) => p.status === "pago").reduce((s, p) => s + (p.valor_pago || 0), 0);
  const isConcluido = !!cliente.concluido_em;
  const vendedorNome = vendedores.find((v) => v.id === cliente.vendedor_id)?.nome;

  const concluir = async () => {
    await update.mutateAsync({ id: cliente.id, patch: { concluido_em: new Date().toISOString() } });
    onOpenChange(false);
  };
  const reabrir = async () => {
    await update.mutateAsync({ id: cliente.id, patch: { concluido_em: null } });
    onOpenChange(false);
  };
  const remover = async () => {
    await del.mutateAsync(cliente.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 flex-wrap">
            {cliente.empresa} <span className="text-muted-foreground font-normal">— {cliente.projeto}</span>
            {isRec && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 inline-flex items-center gap-1">
                <Repeat className="w-3 h-3" /> Recorrente
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo */}
          {isRec ? (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Total recebido" value={fmtBRL(pago)} color="text-emerald-400" />
              <Stat label="Entradas registradas" value={String(recurringEntries.length)} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Valor total" value={fmtBRL(total)} />
                <Stat label="Recebido" value={fmtBRL(pago)} color="text-emerald-400" />
                <Stat label="A receber" value={fmtBRL(total - pago)} color="text-amber-400" />
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-emerald-500/80 transition-all"
                  style={{ width: `${total > 0 ? Math.min(100, (pago / total) * 100) : 0}%` }} />
              </div>
            </>
          )}

          {/* Vendedor + comissão */}
          {vendedorNome && (
            <div className="rounded-xl p-3 bg-amber-500/5 border border-amber-500/15 text-xs flex items-center justify-between">
              <div>
                <p className="text-amber-400 font-semibold">Vendedor: {vendedorNome}</p>
                <p className="text-muted-foreground mt-0.5">Comissão de 4% sobre pagamentos recebidos</p>
              </div>
              <span className="text-base font-bold text-amber-300 tabular-nums">{fmtBRL(pago * 0.04)}</span>
            </div>
          )}

          {/* Parcelas (apenas não-recorrente) */}
          {!isRec && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-amber-400/90 font-semibold mb-2">Parcelas</h3>
              <div className="space-y-1.5">
                {(cliente.parcelas || []).map((p, i) => {
                  const expected = (Number(p.percentual) / 100) * total;
                  const venceu = p.status === "pendente" && p.data_prevista && parseISO(p.data_prevista) < new Date();
                  return (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04] text-sm">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: p.status === "pago" ? "rgba(0,200,150,0.15)" : venceu ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
                          color: p.status === "pago" ? "rgb(0,200,150)" : venceu ? "rgb(239,68,68)" : "rgb(160,160,160)",
                        }}>
                        {p.status === "pago" ? <Check className="w-3.5 h-3.5" /> : venceu ? <AlertTriangle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-xs text-muted-foreground w-12">#{p.numero}</span>
                      <span className="w-12 text-xs">{p.percentual}%</span>
                      <span className="text-xs text-muted-foreground w-24">
                        {p.data_prevista ? format(parseISO(p.data_prevista), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                      </span>
                      <span className="flex-1 text-xs text-muted-foreground truncate">{p.match_descricao || ""}</span>
                      <span className="tabular-nums text-xs">
                        {p.status === "pago" ? fmtBRL(p.valor_pago || 0) : fmtBRL(expected)}
                      </span>
                    </div>
                  );
                })}
                {(cliente.parcelas || []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhuma parcela configurada.</p>
                )}
              </div>
            </section>
          )}

          {/* Histórico de pagamentos (recorrente) */}
          {isRec && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-amber-400/90 font-semibold mb-2">Pagamentos recebidos</h3>
              {recurringEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum pagamento encontrado para os apelidos cadastrados.</p>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {recurringEntries.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04] text-sm">
                      <span className="text-xs text-muted-foreground w-20">{format(parseISO(l.data), "dd/MM/yyyy")}</span>
                      <span className="flex-1 text-xs truncate">{l.descricao}</span>
                      <span className="tabular-nums text-xs text-emerald-400">{fmtBRL(Number(l.valor))}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Serviços (não-recorrente) */}
          {!isRec && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-amber-400/90 font-semibold mb-2">Serviços</h3>
              <div className="flex flex-wrap gap-2 text-xs">
                {cliente.tem_imagens && <Chip>{cliente.qtd_imagens} imagens</Chip>}
                {cliente.tem_animacao && <Chip>{cliente.segundos_animacao}s animação</Chip>}
                {cliente.tem_tour_virtual && <Chip>Tour virtual — {fmtBRL(Number(cliente.valor_tour_virtual))}</Chip>}
                {cliente.servicos_adicionais && (
                  <Chip>{cliente.servicos_adicionais} — {fmtBRL(Number(cliente.valor_servicos_adicionais))}</Chip>
                )}
                {cliente.tem_software && <Chip>Software {cliente.plano_software}</Chip>}
                {!cliente.tem_imagens && !cliente.tem_animacao && !cliente.tem_tour_virtual && !cliente.servicos_adicionais && !cliente.tem_software && (
                  <p className="text-muted-foreground">Sem serviços marcados.</p>
                )}
              </div>
            </section>
          )}

          {/* Apelidos */}
          {cliente.apelidos?.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-amber-400/90 font-semibold mb-2">Apelidos para match</h3>
              <div className="flex flex-wrap gap-1.5">
                {cliente.apelidos.map((a) => (
                  <span key={a} className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-muted-foreground">{a}</span>
                ))}
              </div>
            </section>
          )}

          {/* Ações */}
          <div className="flex justify-between gap-2 pt-2 border-t border-white/5 flex-wrap">
            {!confirmDel ? (
              <Button variant="ghost" onClick={() => setConfirmDel(true)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                <Trash2 className="w-4 h-4 mr-1" /> Remover
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Confirmar remoção?</span>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDel(false)}>Não</Button>
                <Button size="sm" variant="destructive" onClick={remover}>Sim, remover</Button>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onEdit?.(cliente)}>
                <Pencil className="w-4 h-4 mr-1" /> Editar
              </Button>
              {isConcluido ? (
                <Button variant="outline" onClick={reabrir}>Reabrir projeto</Button>
              ) : (
                <Button onClick={concluir} className="bg-emerald-500/90 hover:bg-emerald-500 text-black">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Marcar como concluído
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold tabular-nums ${color || "text-foreground"}`}>{value}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
      {children}
    </span>
  );
}
