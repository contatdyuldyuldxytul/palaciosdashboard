import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Plus, Download, TrendingUp, Target, CheckCircle2, Search, Upload, FileSpreadsheet, ChevronDown, Workflow } from "lucide-react";
import { FlowsList } from "@/components/crm/projects/FlowsList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCrmPipelines, useCrmStages, useCrmDeals, useImportPipedrive, FLOW_TYPE_LABELS } from "@/hooks/useCrm";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import { DealListView } from "@/components/crm/DealListView";
import { NewDealModal } from "@/components/crm/NewDealModal";
import { PipelineSwitcher } from "@/components/crm/PipelineSwitcher";
import { PipelineEditorScreen } from "@/components/crm/PipelineEditorScreen";
import { ImportCsvModal } from "@/components/crm/ImportCsvModal";
import { ImportSheetsModal } from "@/components/crm/ImportSheetsModal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

export default function Crm() {
  const { isFundador } = useAuth();
  const { data: pipelines = [], isLoading: pLoading } = useCrmPipelines();
  const [pipelineId, setPipelineId] = useState<string>("");
  const [tab, setTab] = useState<"deals" | "fluxos">("deals");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [newOpen, setNewOpen] = useState(false);
  const [editor, setEditor] = useState<{ mode: "new" | "edit"; pipelineId?: string } | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [sheetsOpen, setSheetsOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!pipelineId && pipelines.length) setPipelineId(pipelines[0].id);
  }, [pipelines, pipelineId]);

  const { data: stages = [] } = useCrmStages(pipelineId);
  const { data: deals = [], isLoading: dLoading } = useCrmDeals(pipelineId);
  const importPd = useImportPipedrive();

  const currentPipeline = pipelines.find((p) => p.id === pipelineId);

  const filteredDeals = useMemo(() => {
    if (!search.trim()) return deals;
    const q = search.toLowerCase();
    return deals.filter((d) =>
      d.titulo.toLowerCase().includes(q) ||
      d.organization?.nome?.toLowerCase().includes(q) ||
      d.person?.nome?.toLowerCase().includes(q) ||
      d.person?.email?.toLowerCase().includes(q) ||
      String(d.valor).includes(q),
    );
  }, [deals, search]);

  const kpis = useMemo(() => {
    const open = filteredDeals.filter(d => d.status === "open");
    const won = filteredDeals.filter(d => d.status === "won");
    const openValue = open.reduce((s, d) => s + Number(d.valor || 0), 0);
    const wonValue = won.reduce((s, d) => s + Number(d.valor || 0), 0);
    return { open: open.length, openValue, won: won.length, wonValue, ticket: open.length ? openValue / open.length : 0 };
  }, [filteredDeals]);

  const doImport = async () => {
    try {
      const r: any = await importPd.mutateAsync();
      if (r?.success) {
        const s = r.summary;
        toast({ title: "Importação concluída", description: `${s.deals} deals · ${s.persons} pessoas · ${s.organizations} empresas` });
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
      <>
        <div className="p-6 max-w-xl mx-auto text-center space-y-4 mt-20">
          <h1 className="text-2xl font-medium text-foreground">CRM</h1>
          <p className="text-sm text-muted-foreground">
            Nenhum pipeline ainda. Crie seu primeiro pipeline ou importe dados.
          </p>
          <div className="flex justify-center gap-2">
            <Button onClick={() => setEditor({ mode: "new" })}>
              <Plus className="w-4 h-4 mr-2" /> Criar Pipeline
            </Button>
            {isFundador && (
              <Button variant="outline" onClick={doImport} disabled={importPd.isPending}>
                <Download className="w-4 h-4 mr-2" />
                {importPd.isPending ? "Importando…" : "Importar Pipedrive"}
              </Button>
            )}
          </div>
        </div>
        {editor && (
          <PipelineEditorScreen
            mode={editor.mode}
            pipelineId={editor.pipelineId}
            onClose={() => setEditor(null)}
            onSaved={(id) => setPipelineId(id)}
          />
        )}
      </>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div className="flex items-center gap-3">
          <PipelineSwitcher
            pipelines={pipelines}
            currentId={pipelineId}
            onSelect={setPipelineId}
            onEdit={(id) => setEditor({ mode: "edit", pipelineId: id })}
            onCreate={() => setEditor({ mode: "new" })}
          />
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none">Deals</h1>
            <p className="text-[11px] text-muted-foreground mt-1">
              {currentPipeline
                ? `${FLOW_TYPE_LABELS[currentPipeline.flow_type]}${currentPipeline.owner_label ? ` · ${currentPipeline.owner_label}` : ""}`
                : "Gestão integrada de deals e relacionamentos"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {tab === "deals" && (
            <div className="relative w-64 hidden md:block">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar deals…"
                className="h-9 pl-9 bg-white/5 border-white/10 text-sm"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs">
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> Importar <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border-white/10">
                <DropdownMenuItem onClick={() => setCsvOpen(true)}>
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-2" /> Arquivo CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSheetsOpen(true)}>
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-2" /> Google Sheets
                </DropdownMenuItem>
                {isFundador && (
                  <DropdownMenuItem onClick={doImport} disabled={importPd.isPending}>
                    <Download className="w-3.5 h-3.5 mr-2" /> {importPd.isPending ? "Importando…" : "Pipedrive"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" onClick={() => setNewOpen(true)} className="shadow-lg shadow-primary/20">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo Deal
            </Button>
          </div>
        </div>
      </div>

      {/* Sub-tabs: Deals / Fluxos */}
      <div className="flex rounded-full border border-white/10 overflow-hidden glass-card p-0.5 w-fit">
        <button
          onClick={() => setTab("deals")}
          className={`px-3.5 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-colors ${
            tab === "deals" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutGrid className="w-3 h-3" /> Deals
        </button>
        <button
          onClick={() => setTab("fluxos")}
          className={`px-3.5 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-colors ${
            tab === "fluxos" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Workflow className="w-3 h-3" /> Fluxos
        </button>
      </div>

      {tab === "deals" ? (
        <>
          {/* View toggle */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex rounded-full border border-white/10 overflow-hidden glass-card p-0.5 md:ml-auto">
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
            <KanbanBoard stages={stages} deals={filteredDeals} />
          ) : (
            <DealListView stages={stages} deals={filteredDeals} />
          )}
        </>
      ) : (
        <FlowsList
          scope="deals"
          title="Fluxos de Deals"
          description="Automatize emails, WhatsApp e movimentações de deals por etapa do pipeline de vendas."
        />
      )}


      <NewDealModal open={newOpen} onOpenChange={setNewOpen} pipelineId={pipelineId} stages={stages} />
      {editor && (
        <PipelineEditorScreen
          mode={editor.mode}
          pipelineId={editor.pipelineId}
          onClose={() => setEditor(null)}
          onSaved={(id) => setPipelineId(id)}
        />
      )}
      <ImportCsvModal open={csvOpen} onOpenChange={setCsvOpen} pipelineId={pipelineId} stages={stages} />
      <ImportSheetsModal
        open={sheetsOpen}
        onOpenChange={setSheetsOpen}
        pipelineId={pipelineId}
        stages={stages}
        initialUrl={currentPipeline?.sheet_id ? `https://docs.google.com/spreadsheets/d/${currentPipeline.sheet_id}/edit` : null}
        initialTab={currentPipeline?.sheet_tab}
      />
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
