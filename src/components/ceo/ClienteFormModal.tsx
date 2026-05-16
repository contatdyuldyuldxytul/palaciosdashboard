import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpsertClienteCEO, useVendedores, Parcela, ClienteCEO } from "@/hooks/useClientesCEO";
import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cliente?: ClienteCEO | null;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const defaultParcelas = (): Parcela[] => ([
  { numero: 1, percentual: 40, dias_apos_inicio: 0, data_prevista: "", status: "pendente" },
  { numero: 2, percentual: 30, dias_apos_inicio: 15, data_prevista: "", status: "pendente" },
  { numero: 3, percentual: 30, dias_apos_inicio: 30, data_prevista: "", status: "pendente" },
]);

export default function ClienteFormModal({ open, onOpenChange, cliente }: Props) {
  const upsert = useUpsertClienteCEO();
  const { data: vendedores = [] } = useVendedores();
  const isEdit = !!cliente;

  const [recorrente, setRecorrente] = useState(false);
  const [empresa, setEmpresa] = useState("");
  const [projeto, setProjeto] = useState("");
  const [valorTotal, setValorTotal] = useState<string>("");
  const [dataInicio, setDataInicio] = useState(format(new Date(), "yyyy-MM-dd"));
  const [qtdParcelas, setQtdParcelas] = useState(3);
  const [parcelas, setParcelas] = useState<Parcela[]>(defaultParcelas());
  const [vendedorId, setVendedorId] = useState<string>("none");

  const [temImagens, setTemImagens] = useState(false);
  const [qtdImagens, setQtdImagens] = useState(0);
  const [temAnimacao, setTemAnimacao] = useState(false);
  const [segAnimacao, setSegAnimacao] = useState(0);
  const [temTour, setTemTour] = useState(false);
  const [valorTour, setValorTour] = useState(0);
  const [temAdic, setTemAdic] = useState(false);
  const [descAdic, setDescAdic] = useState("");
  const [valorAdic, setValorAdic] = useState(0);
  const [temSoftware, setTemSoftware] = useState(false);
  const [planoSw, setPlanoSw] = useState<string>("Prata");
  const [apelidosText, setApelidosText] = useState("");

  // Hydrate on open / when cliente changes
  useEffect(() => {
    if (!open) return;
    if (cliente) {
      setRecorrente(!!cliente.recorrente);
      setEmpresa(cliente.empresa || "");
      setProjeto(cliente.projeto || "");
      setValorTotal(cliente.valor_total ? String(cliente.valor_total) : "");
      setDataInicio(cliente.data_inicio ? cliente.data_inicio.slice(0, 10) : format(new Date(), "yyyy-MM-dd"));
      const ps = (cliente.parcelas || []).length > 0 ? cliente.parcelas : defaultParcelas();
      setParcelas(ps);
      setQtdParcelas(ps.length || 3);
      setVendedorId(cliente.vendedor_id || "none");
      setTemImagens(!!cliente.tem_imagens);
      setQtdImagens(cliente.qtd_imagens || 0);
      setTemAnimacao(!!cliente.tem_animacao);
      setSegAnimacao(cliente.segundos_animacao || 0);
      setTemTour(!!cliente.tem_tour_virtual);
      setValorTour(Number(cliente.valor_tour_virtual) || 0);
      setTemAdic(!!cliente.servicos_adicionais);
      setDescAdic(cliente.servicos_adicionais || "");
      setValorAdic(Number(cliente.valor_servicos_adicionais) || 0);
      setTemSoftware(!!cliente.tem_software);
      setPlanoSw(cliente.plano_software || "Prata");
      setApelidosText((cliente.apelidos || []).filter((a) => a !== cliente.empresa).join(", "));
    } else {
      setRecorrente(false);
      setEmpresa(""); setProjeto(""); setValorTotal("");
      setDataInicio(format(new Date(), "yyyy-MM-dd"));
      setParcelas(defaultParcelas()); setQtdParcelas(3);
      setVendedorId("none");
      setTemImagens(false); setQtdImagens(0);
      setTemAnimacao(false); setSegAnimacao(0);
      setTemTour(false); setValorTour(0);
      setTemAdic(false); setDescAdic(""); setValorAdic(0);
      setTemSoftware(false); setPlanoSw("Prata");
      setApelidosText("");
    }
  }, [cliente, open]);

  const valorNum = Number(valorTotal.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
  const somaPct = parcelas.reduce((s, p) => s + Number(p.percentual || 0), 0);
  const pctOk = Math.round(somaPct) === 100;

  const updateParcelas = (n: number) => {
    setQtdParcelas(n);
    const next: Parcela[] = [];
    const pctBase = Math.floor(100 / n);
    for (let i = 0; i < n; i++) {
      const existing = parcelas[i];
      next.push({
        numero: i + 1,
        percentual: existing?.percentual ?? (i === n - 1 ? 100 - pctBase * (n - 1) : pctBase),
        dias_apos_inicio: existing?.dias_apos_inicio ?? i * 15,
        data_prevista: "",
        status: "pendente",
      });
    }
    setParcelas(next);
  };

  const distribuirIgualmente = () => {
    const pct = Math.floor(100 / qtdParcelas);
    const resto = 100 - pct * qtdParcelas;
    setParcelas((ps) =>
      ps.map((p, i) => ({ ...p, percentual: pct + (i === ps.length - 1 ? resto : 0) })),
    );
  };

  const updateParcela = (idx: number, patch: Partial<Parcela>) => {
    setParcelas((ps) => ps.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const previstas = useMemo(() => {
    if (!dataInicio) return [];
    const base = parseISO(dataInicio);
    return parcelas.map((p) => format(addDays(base, p.dias_apos_inicio), "yyyy-MM-dd"));
  }, [parcelas, dataInicio]);

  const canSave = recorrente
    ? empresa.trim() && projeto.trim()
    : empresa.trim() && projeto.trim() && valorNum > 0 && pctOk;

  const handleSave = async () => {
    const apelidosArr = apelidosText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!apelidosArr.includes(empresa.trim())) apelidosArr.unshift(empresa.trim());

    const patch: Partial<ClienteCEO> = recorrente
      ? {
          empresa: empresa.trim(),
          projeto: projeto.trim(),
          valor_total: 0,
          data_inicio: null,
          parcelas: [],
          tem_imagens: false, qtd_imagens: 0,
          tem_animacao: false, segundos_animacao: 0,
          tem_tour_virtual: false, valor_tour_virtual: 0,
          servicos_adicionais: null, valor_servicos_adicionais: 0,
          tem_software: false, plano_software: null,
          apelidos: apelidosArr,
          recorrente: true,
          vendedor_id: vendedorId === "none" ? null : vendedorId,
          status: "ativo",
        }
      : {
          empresa: empresa.trim(),
          projeto: projeto.trim(),
          valor_total: valorNum,
          data_inicio: dataInicio,
          parcelas: parcelas.map((p, i) => ({ ...p, data_prevista: previstas[i] })),
          tem_imagens: temImagens,
          qtd_imagens: temImagens ? qtdImagens : 0,
          tem_animacao: temAnimacao,
          segundos_animacao: temAnimacao ? segAnimacao : 0,
          tem_tour_virtual: temTour,
          valor_tour_virtual: temTour ? valorTour : 0,
          servicos_adicionais: temAdic ? descAdic : null,
          valor_servicos_adicionais: temAdic ? valorAdic : 0,
          tem_software: temSoftware,
          plano_software: temSoftware ? planoSw : null,
          apelidos: apelidosArr,
          recorrente: false,
          vendedor_id: vendedorId === "none" ? null : vendedorId,
          status: "ativo",
        };

    await upsert.mutateAsync({ id: cliente?.id, patch });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl">{isEdit ? "Editar cliente" : "Novo cliente"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Toggle Recorrente */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <div>
              <p className="text-sm font-medium">Cliente recorrente</p>
              <p className="text-[11px] text-muted-foreground">
                Sem parcelas/valor fixo — entradas mensais somam direto no histórico.
              </p>
            </div>
            <Switch checked={recorrente} onCheckedChange={setRecorrente} />
          </div>

          {/* Seção A — Projeto */}
          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-amber-400/90 font-semibold">
              {recorrente ? "Identificação" : "Projeto"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Empresa / cliente</Label>
                <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ex: Arcko" />
              </div>
              <div className="space-y-1.5">
                <Label>{recorrente ? "Descrição do serviço" : "Nome do projeto"}</Label>
                <Input value={projeto} onChange={(e) => setProjeto(e.target.value)} placeholder="Ex: Edifício Aurora" />
              </div>
              {!recorrente && (
                <>
                  <div className="space-y-1.5">
                    <Label>Valor total (R$)</Label>
                    <Input type="number" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} placeholder="20000" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data de início</Label>
                    <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                  </div>
                </>
              )}
              <div className="space-y-1.5 md:col-span-2">
                <Label>Vendedor responsável (4% de comissão)</Label>
                <Select value={vendedorId} onValueChange={setVendedorId}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sem vendedor —</SelectItem>
                    {vendedores.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {!recorrente && (
            <>
              {/* Seção B — Parcelas */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-wider text-amber-400/90 font-semibold">Parcelas</h3>
                  <button type="button" onClick={distribuirIgualmente}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
                    Distribuir igualmente
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-sm">Quantidade:</Label>
                  <Input type="number" min={1} max={12} value={qtdParcelas}
                    onChange={(e) => updateParcelas(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                    className="w-20" />
                  <span className={`text-xs ml-auto ${pctOk ? "text-emerald-400" : "text-red-400"}`}>
                    Soma: {somaPct}% {pctOk ? "✓" : "(deve ser 100%)"}
                  </span>
                </div>
                <div className="space-y-2">
                  {parcelas.map((p, i) => (
                    <div key={i} className="rounded-xl p-3 bg-white/[0.03] border border-white/5 grid grid-cols-12 gap-2 items-center">
                      <span className="col-span-1 text-xs text-muted-foreground">#{p.numero}</span>
                      <div className="col-span-3">
                        <Input type="number" value={p.percentual}
                          onChange={(e) => updateParcela(i, { percentual: Number(e.target.value) })}
                          className="h-8 text-sm" placeholder="%" />
                      </div>
                      <span className="col-span-1 text-[10px] text-muted-foreground">% após</span>
                      <div className="col-span-2">
                        <Input type="number" value={p.dias_apos_inicio}
                          onChange={(e) => updateParcela(i, { dias_apos_inicio: Number(e.target.value) })}
                          className="h-8 text-sm" placeholder="dias" />
                      </div>
                      <span className="col-span-2 text-[11px] text-muted-foreground">
                        {previstas[i] ? format(parseISO(previstas[i]), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                      </span>
                      <span className="col-span-3 text-xs text-right tabular-nums text-foreground/80">
                        {fmtBRL((Number(p.percentual) / 100) * valorNum)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Seção C — Serviços */}
              <section className="space-y-3">
                <h3 className="text-xs uppercase tracking-wider text-amber-400/90 font-semibold">Serviços incluídos</h3>
                <div className="space-y-2">
                  <ServicoRow checked={temImagens} onChecked={setTemImagens} label="Imagens">
                    <Input type="number" className="h-8 w-28 text-sm" placeholder="Qtd"
                      value={qtdImagens || ""} onChange={(e) => setQtdImagens(Number(e.target.value) || 0)} />
                  </ServicoRow>
                  <ServicoRow checked={temAnimacao} onChecked={setTemAnimacao} label="Animação">
                    <Input type="number" className="h-8 w-28 text-sm" placeholder="Segundos"
                      value={segAnimacao || ""} onChange={(e) => setSegAnimacao(Number(e.target.value) || 0)} />
                  </ServicoRow>
                  <ServicoRow checked={temTour} onChecked={setTemTour} label="Tour virtual">
                    <Input type="number" className="h-8 w-32 text-sm" placeholder="Valor R$"
                      value={valorTour || ""} onChange={(e) => setValorTour(Number(e.target.value) || 0)} />
                  </ServicoRow>
                  <ServicoRow checked={temAdic} onChecked={setTemAdic} label="Serviços adicionais">
                    <div className="flex gap-2 flex-1">
                      <Input className="h-8 text-sm flex-1" placeholder="Descrição"
                        value={descAdic} onChange={(e) => setDescAdic(e.target.value)} />
                      <Input type="number" className="h-8 w-28 text-sm" placeholder="R$"
                        value={valorAdic || ""} onChange={(e) => setValorAdic(Number(e.target.value) || 0)} />
                    </div>
                  </ServicoRow>
                  <ServicoRow checked={temSoftware} onChecked={setTemSoftware} label="Software">
                    <Select value={planoSw} onValueChange={setPlanoSw}>
                      <SelectTrigger className="h-8 w-32 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Prata">Prata</SelectItem>
                        <SelectItem value="Ouro">Ouro</SelectItem>
                        <SelectItem value="Diamante">Diamante</SelectItem>
                      </SelectContent>
                    </Select>
                  </ServicoRow>
                </div>
              </section>
            </>
          )}

          {/* Apelidos */}
          <section className="space-y-2">
            <h3 className="text-xs uppercase tracking-wider text-amber-400/90 font-semibold">
              Apelidos para match financeiro
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Palavras que aparecem nos pagamentos da planilha (separe por vírgula). O nome da empresa é incluído automaticamente.
            </p>
            <Input value={apelidosText} onChange={(e) => setApelidosText(e.target.value)}
              placeholder="Ex: ARK, Arcko Engenharia" />
          </section>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!canSave || upsert.isPending}
              className="bg-amber-500/90 hover:bg-amber-500 text-black">
              {upsert.isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Salvar cliente"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ServicoRow({
  checked, onChecked, label, children,
}: { checked: boolean; onChecked: (v: boolean) => void; label: string; children: React.ReactNode; }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      <Checkbox checked={checked} onCheckedChange={(v) => onChecked(!!v)} />
      <span className={`text-sm w-40 ${checked ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
      {checked && <div className="flex items-center gap-2 flex-1">{children}</div>}
    </div>
  );
}
