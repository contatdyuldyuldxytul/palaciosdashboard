import { useMemo, useState } from "react";
import { CrmDeal, CrmStage } from "@/hooks/useCrm";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

export function DealListView({ deals, stages }: { deals: CrmDeal[]; stages: CrmStage[] }) {
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("open");

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
            {["Aline","Milena","Felipe","Thiago"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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

      <div className="glass-card rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-white/10">
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
              return (
                <tr key={d.id} className="border-b border-white/5 hover:bg-white/[0.03]">
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
              <tr><td colSpan={6} className="text-center py-6 text-muted-foreground text-xs">Nenhum deal encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
