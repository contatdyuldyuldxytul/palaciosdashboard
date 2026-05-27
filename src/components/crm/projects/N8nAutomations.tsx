import { useState } from "react";
import { RefreshCw, ExternalLink, Plus, Trash2, Power, CheckCircle2, XCircle, Clock, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useN8nWorkflows, useN8nBindings, useN8nExecutions, useN8nTest } from "@/hooks/useN8n";
import { useCrmPipelines, useCrmStages } from "@/hooks/useCrm";
import { toast } from "@/hooks/use-toast";

const EVENT_TYPES = [
  { value: "crm_deal_created", label: "Deal criado" },
  { value: "crm_stage_enter", label: "Deal entra em etapa" },
  { value: "crm_deal_won", label: "Deal ganho" },
  { value: "crm_deal_lost", label: "Deal perdido" },
  { value: "activity_completed", label: "Atividade concluída" },
];

export function N8nAutomations() {
  const wfs = useN8nWorkflows();
  const bindings = useN8nBindings();
  const execs = useN8nExecutions();
  const test = useN8nTest();
  const { data: pipelines } = useCrmPipelines();
  const { data: stages } = useCrmStages();

  const [newBinding, setNewBinding] = useState({ event_type: "crm_stage_enter", workflow_id: "", webhook_url: "", stage_id: "", descricao: "" });

  const handleTest = async () => {
    try { const r = await test.mutateAsync(); toast({ title: "Conexão ok", description: `n8n acessível (${r.sample_count} workflow)` }); }
    catch (e: any) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
  };

  const handleSync = async () => {
    try { const r = await wfs.sync.mutateAsync(); toast({ title: "Sincronizado", description: `${r.synced} workflow(s)` }); }
    catch (e: any) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
  };

  const handleCreate = async () => {
    if (!newBinding.workflow_id || !newBinding.webhook_url) {
      toast({ title: "Faltam dados", description: "Selecione workflow e cole o webhook URL", variant: "destructive" });
      return;
    }
    try {
      const filter: any = {};
      if (newBinding.event_type === "crm_stage_enter" && newBinding.stage_id) filter.stage_id = newBinding.stage_id;
      await bindings.upsert.mutateAsync({
        event_type: newBinding.event_type,
        workflow_id: newBinding.workflow_id,
        webhook_url: newBinding.webhook_url,
        event_filter: filter,
        descricao: newBinding.descricao || null,
        ativo: true,
      });
      setNewBinding({ event_type: "crm_stage_enter", workflow_id: "", webhook_url: "", stage_id: "", descricao: "" });
      toast({ title: "Regra criada" });
    } catch (e: any) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header / status */}
      <div className="glass-card rounded-xl p-5 border border-white/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <Workflow className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Automações via n8n</div>
            <div className="text-[11px] text-muted-foreground">
              {wfs.data?.length || 0} workflow(s) sincronizados · {wfs.data?.filter((w: any) => w.ativo).length || 0} ativos
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleTest} disabled={test.isPending}>
            {test.isPending ? "Testando…" : "Testar conexão"}
          </Button>
          <Button size="sm" onClick={handleSync} disabled={wfs.sync.isPending}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${wfs.sync.isPending ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Workflows */}
      <div className="glass-card rounded-xl p-5 border border-white/10 space-y-3">
        <div className="text-sm font-semibold text-foreground">Workflows na sua conta n8n</div>
        {!wfs.data?.length && (
          <div className="text-xs text-muted-foreground py-6 text-center">
            Nenhum workflow ainda. Clique em "Sincronizar" para puxar do n8n.
          </div>
        )}
        <div className="space-y-1.5">
          {wfs.data?.map((w: any) => (
            <div key={w.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
              <Switch
                checked={w.ativo}
                onCheckedChange={(v) => wfs.toggle.mutate({ n8n_workflow_id: w.n8n_workflow_id, ativo: v })}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">{w.nome}</div>
                <div className="text-[10px] text-muted-foreground">ID: {w.n8n_workflow_id}</div>
              </div>
              <a
                href={`${import.meta.env.VITE_N8N_BASE_URL || ""}/workflow/${w.n8n_workflow_id}`}
                target="_blank" rel="noreferrer"
                className="text-[10px] text-primary hover:underline flex items-center gap-1"
              >
                Abrir no n8n <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Bindings */}
      <div className="glass-card rounded-xl p-5 border border-white/10 space-y-3">
        <div className="text-sm font-semibold text-foreground">Regras de disparo (eventos → workflows)</div>
        <p className="text-[11px] text-muted-foreground">
          Quando o evento acontecer no CRM, a plataforma chama o webhook do n8n com o contexto do deal.
        </p>

        <div className="space-y-1.5">
          {bindings.data?.map((b: any) => (
            <div key={b.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-xs">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {EVENT_TYPES.find(e => e.value === b.event_type)?.label || b.event_type} → {b.workflow?.nome || "?"}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{b.webhook_url}</div>
              </div>
              <Switch
                checked={b.ativo}
                onCheckedChange={(v) => bindings.upsert.mutate({ ...b, ativo: v, workflow: undefined })}
              />
              <Button size="sm" variant="ghost" onClick={() => bindings.remove.mutate(b.id)}>
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          ))}
          {!bindings.data?.length && <div className="text-[11px] text-muted-foreground py-3 text-center">Sem regras ainda.</div>}
        </div>

        {/* Form nova regra */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-3 border-t border-white/5">
          <div>
            <Label className="text-xs">Evento</Label>
            <Select value={newBinding.event_type} onValueChange={(v) => setNewBinding({ ...newBinding, event_type: v })}>
              <SelectTrigger className="h-9 text-xs bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>{EVENT_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {newBinding.event_type === "crm_stage_enter" && (
            <div>
              <Label className="text-xs">Etapa (opcional)</Label>
              <Select value={newBinding.stage_id} onValueChange={(v) => setNewBinding({ ...newBinding, stage_id: v })}>
                <SelectTrigger className="h-9 text-xs bg-white/5 border-white/10"><SelectValue placeholder="Qualquer etapa" /></SelectTrigger>
                <SelectContent>
                  {stages?.map((s: any) => {
                    const p = pipelines?.find((p: any) => p.id === s.pipeline_id);
                    return <SelectItem key={s.id} value={s.id}>{p?.nome || ""} → {s.nome}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Workflow</Label>
            <Select value={newBinding.workflow_id} onValueChange={(v) => setNewBinding({ ...newBinding, workflow_id: v })}>
              <SelectTrigger className="h-9 text-xs bg-white/5 border-white/10"><SelectValue placeholder="Escolha…" /></SelectTrigger>
              <SelectContent>{wfs.data?.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Webhook URL (do trigger Webhook no n8n)</Label>
            <Input
              value={newBinding.webhook_url}
              onChange={(e) => setNewBinding({ ...newBinding, webhook_url: e.target.value })}
              placeholder="https://palacios.app.n8n.cloud/webhook/..."
              className="h-9 text-xs bg-white/5 border-white/10"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Descrição (opcional)</Label>
            <Input
              value={newBinding.descricao}
              onChange={(e) => setNewBinding({ ...newBinding, descricao: e.target.value })}
              className="h-9 text-xs bg-white/5 border-white/10"
            />
          </div>
          <Button size="sm" onClick={handleCreate} className="md:col-span-2 w-fit">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar regra
          </Button>
        </div>
      </div>

      {/* Execuções */}
      <div className="glass-card rounded-xl p-5 border border-white/10 space-y-3">
        <div className="text-sm font-semibold text-foreground">Últimas execuções</div>
        <div className="space-y-1">
          {execs.data?.map((e: any) => (
            <div key={e.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-xs">
              {e.status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              {e.status === "error" && <XCircle className="w-3.5 h-3.5 text-destructive" />}
              {(e.status === "pending" || e.status === "running") && <Clock className="w-3.5 h-3.5 text-amber-400" />}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">{e.workflow?.nome || e.n8n_workflow_id || "—"}</div>
                <div className="text-[10px] text-muted-foreground truncate">{e.event_type} · {new Date(e.started_at).toLocaleString("pt-BR")}</div>
                {e.error && <div className="text-[10px] text-destructive truncate">{e.error}</div>}
              </div>
            </div>
          ))}
          {!execs.data?.length && <div className="text-[11px] text-muted-foreground py-3 text-center">Sem execuções ainda.</div>}
        </div>
      </div>

      {/* Setup guide */}
      <div className="glass-card rounded-xl p-5 border border-white/10 text-[11px] text-muted-foreground space-y-1">
        <div className="text-xs font-semibold text-foreground mb-1">Como criar um workflow no n8n</div>
        <div>1. No n8n, novo workflow. Comece com o trigger <strong>"Webhook"</strong>.</div>
        <div>2. Copie a URL do webhook (Production) e cole na regra acima.</div>
        <div>3. Para ler dados do CRM: nó <strong>HTTP Request</strong> GET <code>{import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-context?resource=deal&id={'{{ $json.context.deal.id }}'}</code> com header <code>X-Palacios-Token: {'{{ $json.token }}'}</code></div>
        <div>4. Para criar tarefa: HTTP POST <code>{import.meta.env.VITE_SUPABASE_URL}/functions/v1/flow-task-create</code> com mesmo header e body <code>{`{ assignee_label, task_description, callback_webhook_url }`}</code></div>
        <div>5. Ative o workflow e o toggle aqui.</div>
      </div>
    </div>
  );
}
