import { useMemo, useState } from "react";
import { CrmDeal, CrmStage, useCrmPipelines, useCrmStages } from "@/hooks/useCrm";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowRight, Trash2, Mail, UserCog, Trophy, X, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Composer } from "@/components/crm/email/Composer";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const OWNERS = ["Aline", "Milena", "Felipe", "Thiago"];

export function DealListView({ deals, stages }: { deals: CrmDeal[]; stages: CrmStage[] }) {
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Move popover
  const [movePipelineId, setMovePipelineId] = useState<string>("");
  const [moveStageId, setMoveStageId] = useState<string>("");
  const { data: pipelines = [] } = useCrmPipelines();
  const { data: moveStages = [] } = useCrmStages(movePipelineId || undefined);

  // Email composer
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailPrefill, setEmailPrefill] = useState<string>("");

  const qc = useQueryClient();
  const stageMap = useMemo(() => Object.fromEntries(stages.map(s => [s.id, s.nome])), [stages]);

  const filtered = useMemo(() => {
    return deals.filter(d => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (ownerFilter !== "all" && d.owner_label !== ownerFilter) return false;
      if (stageFilter !== "all" && d.stage_id !== stageFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hit =
          d.titulo.toLowerCase().includes(q) ||
          d.organization?.nome?.toLowerCase().includes(q) ||
          d.person?.nome?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [deals, search, ownerFilter, stageFilter, statusFilter]);

  const selectedDeals = useMemo(() => deals.filter(d => selectedIds.has(d.id)), [deals, selectedIds]);
  const selectedTotal = selectedDeals.reduce((s, d) => s + Number(d.valor || 0), 0);

  const visibleIds = filtered.map(d => d.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some(id => selectedIds.has(id));

  const toggleAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach(id => next.delete(id));
      else visibleIds.forEach(id => next.add(id));
      return next;
    });
  };
  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const bulkUpdate = async (patch: Record<string, any>, successMsg: string) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const { error } = await supabase.from("crm_deals").update(patch as any).in("id", ids);
    if (error) { toast.error(error.message); return; }
    toast.success(successMsg);
    qc.invalidateQueries({ queryKey: ["crm"] });
    clearSelection();
  };

  const handleMove = async () => {
    if (!moveStageId) { toast.error("Selecione um estágio"); return; }
    await bulkUpdate(
      { pipeline_id: movePipelineId, stage_id: moveStageId, stage_entered_at: new Date().toISOString() },
      `${selectedIds.size} deals movidos`,
    );
    setMovePipelineId(""); setMoveStageId("");
  };

  const handleReassign = async (owner: string) => {
    await bulkUpdate({ owner_label: owner }, `${selectedIds.size} deals reatribuídos a ${owner}`);
  };

  const handleWon = async () => {
    await bulkUpdate(
      { status: "won", data_fechamento: new Date().toISOString() },
      `${selectedIds.size} deals marcados como ganhos`,
    );
  };

  const handleLost = async () => {
    const motivo = window.prompt("Motivo da perda (aplicado a todos):");
    if (motivo === null) return;
    await bulkUpdate(
      { status: "lost", motivo_perda: motivo || null, data_fechamento: new Date().toISOString() },
      `${selectedIds.size} deals marcados como perdidos`,
    );
  };

  const handleDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const { error } = await supabase.from("crm_deals").delete().in("id", ids);
    if (error) { toast.error(error.message); return; }
    toast.success(`${ids.length} deals excluídos`);
    qc.invalidateQueries({ queryKey: ["crm"] });
    clearSelection();
  };

  const handleEmail = () => {
    const emails = Array.from(
      new Set(selectedDeals.map(d => d.person?.email).filter((e): e is string => !!e)),
    );
    const semEmail = selectedDeals.length - emails.length;
    if (!emails.length) { toast.error("Nenhum deal selecionado tem e-mail de contato"); return; }
    if (semEmail > 0) toast.message(`${semEmail} deal(s) sem e-mail foram ignorados`);
    setEmailPrefill(emails.join(", "));
    setEmailOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar empresa, contato, título..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos resp.</SelectItem>
            {OWNERS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Estágio" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos estágios</SelectItem>
            {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Abertos</SelectItem>
            <SelectItem value="won">Ganhos</SelectItem>
            <SelectItem value="lost">Perdidos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground self-center ml-auto">
          {filtered.length} deals · {fmt(filtered.reduce((s, d) => s + Number(d.valor || 0), 0))}
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="glass-card rounded-lg p-2 flex flex-wrap items-center gap-2 border border-primary/30">
          <div className="text-xs text-foreground font-medium px-2">
            {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""} · {fmt(selectedTotal)}
          </div>

          {/* Move */}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-1">
                <ArrowRight className="w-3.5 h-3.5" /> Mover
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 space-y-2">
              <div className="text-xs font-medium">Mover para funil/estágio</div>
              <Select value={movePipelineId} onValueChange={(v) => { setMovePipelineId(v); setMoveStageId(""); }}>
                <SelectTrigger><SelectValue placeholder="Funil" /></SelectTrigger>
                <SelectContent>
                  {pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={moveStageId} onValueChange={setMoveStageId} disabled={!movePipelineId}>
                <SelectTrigger><SelectValue placeholder="Estágio" /></SelectTrigger>
                <SelectContent>
                  {moveStages.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="w-full" onClick={handleMove} disabled={!moveStageId}>Aplicar</Button>
            </PopoverContent>
          </Popover>

          {/* Reassign */}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-1">
                <UserCog className="w-3.5 h-3.5" /> Responsável
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1">
              {OWNERS.map(o => (
                <button
                  key={o}
                  onClick={() => handleReassign(o)}
                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-white/5"
                >{o}</button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Won/Lost */}
          <Button size="sm" variant="outline" className="h-8 gap-1 text-emerald-400" onClick={handleWon}>
            <Trophy className="w-3.5 h-3.5" /> Ganho
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1 text-amber-400" onClick={handleLost}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Perdido
          </Button>

          {/* Email */}
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleEmail}>
            <Mail className="w-3.5 h-3.5" /> E-mail
          </Button>

          {/* Delete */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-1 text-red-400 hover:text-red-300">
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir {selectedIds.size} deal(s)?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Apenas o fundador pode excluir.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button size="sm" variant="ghost" className="h-8 gap-1 ml-auto" onClick={clearSelection}>
            <X className="w-3.5 h-3.5" /> Limpar
          </Button>
        </div>
      )}

      <div className="glass-card rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-white/10">
              <th className="w-10 px-3 py-2">
                <Checkbox
                  checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                  onCheckedChange={toggleAllVisible}
                  aria-label="Selecionar todos visíveis"
                />
              </th>
              <th className="text-left px-3 py-2 font-medium">Empresa / Título</th>
              <th className="text-left px-3 py-2 font-medium">Contato</th>
              <th className="text-left px-3 py-2 font-medium">Estágio</th>
              <th className="text-left px-3 py-2 font-medium">Resp.</th>
              <th className="text-right px-3 py-2 font-medium">Valor</th>
              <th className="text-left px-3 py-2 font-medium">Dias estágio</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => {
              const days = Math.floor((Date.now() - new Date(d.stage_entered_at).getTime()) / 86400000);
              const checked = selectedIds.has(d.id);
              return (
                <tr
                  key={d.id}
                  className={`border-b border-white/5 hover:bg-white/[0.03] ${checked ? "bg-primary/5" : ""}`}
                >
                  <td className="px-3 py-2">
                    <Checkbox checked={checked} onCheckedChange={() => toggleOne(d.id)} aria-label="Selecionar deal" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-foreground font-medium">{d.organization?.nome || d.titulo}</div>
                    {d.organization && <div className="text-[10px] text-muted-foreground">{d.titulo}</div>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{d.person?.nome || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{stageMap[d.stage_id] || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{d.owner_label || "—"}</td>
                  <td className="px-3 py-2 text-right text-primary font-medium">{fmt(Number(d.valor || 0))}</td>
                  <td className={`px-3 py-2 text-xs ${days >= 14 ? "text-red-400" : days >= 7 ? "text-amber-400" : "text-muted-foreground"}`}>
                    {days}d
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-6 text-muted-foreground text-xs">Nenhum deal encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {emailOpen && (
        <Composer open={emailOpen} onClose={() => setEmailOpen(false)} initialTo={emailPrefill} />
      )}
    </div>
  );
}
