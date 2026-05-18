import { useEffect, useState } from "react";
import { LayoutGrid, List, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCrmPipelines, useCrmStages, useCrmDeals, useImportPipedrive } from "@/hooks/useCrm";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import { DealListView } from "@/components/crm/DealListView";
import { NewDealModal } from "@/components/crm/NewDealModal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

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

  const doImport = async () => {
    try {
      const r: any = await importPd.mutateAsync();
      if (r?.success) {
        const s = r.summary;
        toast({
          title: "Importação concluída",
          description: `${s.deals} deals · ${s.persons} pessoas · ${s.organizations} empresas · ${s.activities} atividades`,
        });
      } else {
        throw new Error(r?.error || "Falha");
      }
    } catch (e: any) {
      toast({ title: "Erro ao importar", description: e.message, variant: "destructive" });
    }
  };

  if (pLoading) {
    return <div className="p-6 text-muted-foreground text-sm">Carregando CRM…</div>;
  }

  if (pipelines.length === 0) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center space-y-4">
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
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-medium text-foreground mr-2">CRM</h1>

        <Select value={pipelineId} onValueChange={setPipelineId}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          <button
            onClick={() => setView("kanban")}
            className={`px-3 py-1.5 text-xs flex items-center gap-1.5 ${view === "kanban" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Kanban
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 text-xs flex items-center gap-1.5 ${view === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <List className="w-3.5 h-3.5" /> Lista
          </button>
        </div>

        <div className="ml-auto flex gap-2">
          {isFundador && (
            <Button variant="ghost" size="sm" onClick={doImport} disabled={importPd.isPending}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {importPd.isPending ? "Importando…" : "Reimportar Pipedrive"}
            </Button>
          )}
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo Deal
          </Button>
        </div>
      </div>

      {dLoading ? (
        <div className="text-muted-foreground text-sm">Carregando deals…</div>
      ) : view === "kanban" ? (
        <KanbanBoard stages={stages} deals={deals} />
      ) : (
        <DealListView stages={stages} deals={deals} />
      )}

      <NewDealModal open={newOpen} onOpenChange={setNewOpen} pipelineId={pipelineId} stages={stages} />
    </div>
  );
}
