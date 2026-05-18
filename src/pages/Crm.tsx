import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Plus, Download, TrendingUp, Target, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCrmPipelines, useCrmStages, useCrmDeals, useImportPipedrive } from "@/hooks/useCrm";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import { DealListView } from "@/components/crm/DealListView";
import { NewDealModal } from "@/components/crm/NewDealModal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

export default function Crm() {
  const { isFundador } = useAuth();
  const { data: pipelines = [], isLoading: pLoading } = useCrmPipelines();
  const [pipelineId, setPipelineId] = useState<string>("");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    if (!pipelineId && pipelines.length) setPipelineId(pipelines[0].id);
  }, [pipelines, pipelineId]);

  const { data: stages = [] } = useCrmStages(pipelineId);
  const { data: deals = [], isLoading: dLoading } = useCrmDeals(pipelineId);
  const importPd = useImportPipedrive();

  const kpis = useMemo(() => {
    const open = deals.filter(d => d.status === "open");
    const won = deals.filter(d => d.status === "won");
    const openValue = open.reduce((s, d) => s + Number(d.valor || 0), 0);
    const wonValue = won.reduce((s, d) => s + Number(d.valor || 0), 0);
    return { open: open.length, openValue, won: won.length, wonValue, ticket: open.length ? openValue / open.length : 0 };
  }, [deals]);

  const doImport = async () => {
    try {
      const r: any = await importPd.mutateAsync();
      if (r?.success) {
        const s = r.summary;
        toast({
          title: "Importação concluída",
          description: `${s.deals} deals · ${s.persons} pessoas · ${s.organizations} empresas`,
        });
      } else throw new Error(r?.error || "Falha");
    } catch (e: any) {
      toast({ title: "Erro ao importar", description: e.message, variant: "destructive" });
    }
  };

  if (pLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-40 bg-white/5 rounded-lg animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-20 glass-card rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center space-y-4 mt-20">
        <h1 className="text-2xl font-medium text-foreground">CRM</h1>
        <p className="text-sm text-muted-foreground">
          Nenhum pipeline ainda. Importe seus dados do Pipedrive para começar.
        </p>
        {isFundador && (
          <Button onClick={doImport} disabled={importPd.isPending}>
            <Download className="w-4 h-4 mr-2" />
            {importPd.isPending ? "Importando…" : "Importar do Pipedrive"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">CRM</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gestão integrada de deals e relacionamentos</p>
        </div>
        <div className="flex items-center gap-2">
          {isFundador && (
            <Button variant="ghost" size="sm" onClick={doImport} disabled={importPd.isPending} className="text-xs">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {importPd.isPending ? "Importando…" : "Importar Pipedrive"}
            </Button>
          )}
          <Button size="sm" onClick={() => setNewOpen(true)} className="shadow-lg shadow-primary/20">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo Deal
          </Button>
        </div>
      </div>

      {/* Pipeline pill tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {pipelines.map(p => (
          <button
            key={p.id}
            onClick={() => setPipelineId(p.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border ${
              pipelineId === p.id
                ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30"
                : "glass-card text-muted-foreground hover:text-foreground hover:border-white/20"
            }`}
          >
            {p.nome}
          </button>
        ))}

        <div className="ml-auto flex rounded-full border border-white/10 overflow-hidden glass-card p-0.5">
          <button
            onClick={() => setView("kanban")}
            className={`px-3 py-1 rounded-full text-[11px] flex items-center gap-1.5 transition-colors ${
              view === "kanban" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="w-3 h-3" /> Kanban
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1 rounded-full text-[11px] flex items-center gap-1.5 transition-colors ${
              view === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-3 h-3" /> Lista
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<Target className="w-4 h-4" />} label="Deals Abertos" value={String(kpis.open)} accent="primary" />
        <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Pipeline Total" value={fmt(kpis.openValue)} accent="primary" />
        <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Ticket Médio" value={fmt(kpis.ticket)} accent="info" />
        <KpiCard icon={<CheckCircle2 className="w-4 h-4" />} label="Ganhos (R$)" value={fmt(kpis.wonValue)} accent="success" />
      </div>

      {dLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {[1,2,3,4,5].map(i => <div key={i} className="w-[280px] h-96 glass-card rounded-xl animate-pulse flex-shrink-0" />)}
        </div>
      ) : view === "kanban" ? (
        <KanbanBoard stages={stages} deals={deals} />
      ) : (
        <DealListView stages={stages} deals={deals} />
      )}

      <NewDealModal open={newOpen} onOpenChange={setNewOpen} pipelineId={pipelineId} stages={stages} />
    </div>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: "primary" | "success" | "info" }) {
  const colorMap = {
    primary: "text-primary bg-primary/10",
    success: "text-emerald-400 bg-emerald-500/10",
    info: "text-sky-400 bg-sky-500/10",
  };
  return (
    <div className="glass-card rounded-xl p-3.5 flex items-center gap-3 hover:bg-white/[0.06] transition-colors">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[accent]}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-base font-semibold text-foreground tabular-nums truncate">{value}</div>
      </div>
    </div>
  );
}
