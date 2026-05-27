import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Plus, Trash2, X, Workflow, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CrmPipeline,
  StageInput,
  FLOW_TYPE_STAGE_TEMPLATES,
  useCollaborators,
  useCreatePipeline,
  useUpdatePipeline,
  useReplaceStages,
  useCrmStages,
  useCrmPipelines,
} from "@/hooks/useCrm";
import { useFlows } from "@/hooks/useFlows";
import { FlowEditor } from "@/components/crm/projects/FlowEditor";
import { toast } from "@/hooks/use-toast";

interface Props {
  mode: "new" | "edit";
  pipelineId?: string;
  onClose: () => void;
  onSaved?: (pipelineId: string) => void;
}

const STAGE_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#64748b", "#06b6d4"];

export function PipelineEditorScreen({ mode, pipelineId, onClose, onSaved }: Props) {
  const isEdit = mode === "edit";
  const pipelinesQ = useCrmPipelines();
  const pipeline: CrmPipeline | undefined = isEdit
    ? pipelinesQ.data?.find((p) => p.id === pipelineId)
    : undefined;

  const [nome, setNome] = useState("");
  const [flowId, setFlowId] = useState<string>("__none__");
  const [ownerId, setOwnerId] = useState<string>("__none__");
  const [stages, setStages] = useState<StageInput[]>([]);
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);

  const collabsQ = useCollaborators();
  const flowsQ = useFlows("deals");
  const create = useCreatePipeline();
  const update = useUpdatePipeline();
  const replace = useReplaceStages();
  const stagesQ = useCrmStages(isEdit ? pipelineId : undefined);

  useEffect(() => {
    if (pipeline) {
      setNome(pipeline.nome);
      setFlowId(pipeline.flow_id || "__none__");
      setOwnerId(pipeline.owner_user_id || "__none__");
    } else if (!isEdit) {
      setNome("");
      setFlowId("__none__");
      setOwnerId("__none__");
      setStages(FLOW_TYPE_STAGE_TEMPLATES.personalizado.map((s) => ({ ...s })));
    }
  }, [pipeline, isEdit]);

  useEffect(() => {
    if (isEdit && stagesQ.data) {
      setStages(
        stagesQ.data.map((s) => ({
          id: s.id,
          nome: s.nome,
          ordem: s.ordem,
          cor: s.cor || "#3b82f6",
          is_won: s.is_won,
          is_lost: s.is_lost,
        })),
      );
    }
  }, [isEdit, stagesQ.data]);


  const addStage = () =>
    setStages((arr) => [
      ...arr,
      { nome: "Nova Etapa", ordem: arr.length, cor: STAGE_COLORS[arr.length % STAGE_COLORS.length] },
    ]);

  const updateStage = (idx: number, patch: Partial<StageInput>) =>
    setStages((arr) => arr.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const removeStage = (idx: number) =>
    setStages((arr) => arr.filter((_, i) => i !== idx).map((s, i) => ({ ...s, ordem: i })));

  const moveStage = (idx: number, dir: -1 | 1) =>
    setStages((arr) => {
      const next = [...arr];
      const t = idx + dir;
      if (t < 0 || t >= next.length) return next;
      [next[idx], next[t]] = [next[t], next[idx]];
      return next.map((s, i) => ({ ...s, ordem: i }));
    });

  const submit = async () => {
    if (!nome.trim()) {
      toast({ title: "Informe o nome do pipeline", variant: "destructive" });
      return;
    }
    if (stages.length === 0) {
      toast({ title: "Adicione pelo menos uma etapa", variant: "destructive" });
      return;
    }
    const ownerSel = ownerId !== "__none__" ? collabsQ.data?.find((c) => c.id === ownerId) : null;
    try {
      const flowSel = flowId !== "__none__" ? flowId : null;
      if (isEdit && pipeline) {
        await update.mutateAsync({
          id: pipeline.id,
          nome: nome.trim(),
          flow_id: flowSel,
          owner_user_id: ownerSel?.id ?? null,
          owner_label: ownerSel?.full_name || null,
        });
        await replace.mutateAsync({ pipeline_id: pipeline.id, stages });
        toast({ title: "Pipeline atualizado" });
        onSaved?.(pipeline.id);
      } else {
        const created = await create.mutateAsync({
          nome: nome.trim(),
          flow_type: "personalizado",
          flow_id: flowSel,
          owner_user_id: ownerSel?.id ?? null,
          owner_label: ownerSel?.full_name || null,
          stages,
        });
        toast({ title: "Pipeline criado" });
        if (created?.id) onSaved?.(created.id);
      }
      onClose();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const duplicate = async () => {
    if (!isEdit) return;
    if (stages.length === 0) {
      toast({ title: "Nada para duplicar", variant: "destructive" });
      return;
    }
    const baseName = nome.trim() || pipeline?.nome || "Pipeline";
    try {
      const created = await create.mutateAsync({
        nome: `${baseName} (cópia)`,
        flow_type: "personalizado",
        flow_id: null,
        owner_user_id: null,
        owner_label: null,
        stages: stages.map((s, i) => ({
          nome: s.nome,
          ordem: i,
          cor: s.cor,
          is_won: !!s.is_won,
          is_lost: !!s.is_lost,
        })),
      });
      toast({ title: "Pipeline duplicado", description: "Apenas as etapas foram copiadas." });
      if (created?.id) onSaved?.(created.id);
      onClose();
    } catch (e: any) {
      toast({ title: "Erro ao duplicar", description: e.message, variant: "destructive" });
    }
  };

  const pending = create.isPending || update.isPending || replace.isPending;
  const [sidebarOffset, setSidebarOffset] = useState(0);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const sidebar = document.querySelector("aside.glass-sidebar");
    const updateOffset = () => {
      const rect = sidebar?.getBoundingClientRect();
      setSidebarOffset(rect ? Math.max(0, Math.round(rect.right)) : 0);
    };

    updateOffset();
    window.addEventListener("resize", updateOffset);

    const resizeObserver = sidebar ? new ResizeObserver(updateOffset) : null;
    if (sidebar) resizeObserver?.observe(sidebar);

    return () => {
      window.removeEventListener("resize", updateOffset);
      resizeObserver?.disconnect();
    };
  }, []);

  const editor = (
    <div
      className="fixed bottom-0 right-0 top-0 z-[9999] h-dvh max-h-dvh min-h-0 bg-background/98 backdrop-blur-2xl grid grid-rows-[auto_minmax(0,1fr)] animate-in fade-in duration-200"
      style={{ left: sidebarOffset }}
    >
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 bg-background/95 px-4 py-3 shadow-2xl shadow-background/40 lg:px-6">
        <div className="flex min-w-0 flex-wrap items-end gap-3 lg:gap-4">
        <button
          onClick={onClose}
          className="mb-0.5 p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex min-w-[240px] flex-1 flex-col sm:max-w-sm">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {isEdit ? "Editar Pipeline" : "Novo Pipeline"}
          </span>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do pipeline"
            className="h-9 w-full mt-1 bg-white/5 border-white/10 text-base font-semibold"
          />
        </div>

        <div className="flex min-w-0 flex-wrap items-end gap-2">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Workflow className="w-3 h-3" /> Fluxo aplicado
            </Label>
            <div className="flex items-center gap-1.5 mt-1">
              <Select value={flowId} onValueChange={setFlowId}>
                <SelectTrigger className="h-9 w-56 bg-white/5 border-white/10">
                  <SelectValue placeholder="Sem fluxo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem fluxo</SelectItem>
                  {(flowsQ.data || []).map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {flowId !== "__none__" && (
                <button
                  type="button"
                  onClick={() => setEditingFlowId(flowId)}
                  className="h-9 px-2 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                  title="Editar fluxo"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Responsável</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger className="h-9 w-52 mt-1 bg-white/5 border-white/10">
                <SelectValue placeholder="Sem responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem responsável</SelectItem>
                {(collabsQ.data || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name || c.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isEdit && (
            <Button
              variant="outline"
              onClick={duplicate}
              disabled={pending}
              className="gap-2 border-white/10 bg-white/5 hover:bg-white/10"
              title="Duplicar pipeline (apenas etapas)"
            >
              <Copy className="w-4 h-4" /> Duplicar
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending} className="shadow-lg shadow-primary/20">
            {pending ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar pipeline"}
          </Button>
        </div>
        </div>
      </div>

      {/* Stage columns */}
      <div className="min-h-0 overflow-auto p-4 lg:p-6">
        <div className="flex min-h-full min-w-max items-stretch gap-3 pb-2">
          {stages.map((s, i) => (
            <div
              key={i}
              className="w-72 max-h-full min-h-[360px] flex-shrink-0 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 flex flex-col overflow-hidden"
              style={{ borderTopColor: s.cor, borderTopWidth: 3 }}
            >
              <div className="p-3 border-b border-white/5 flex items-center gap-1">
                <button
                  onClick={() => moveStage(i, -1)}
                  disabled={i === 0}
                  className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveStage(i, 1)}
                  disabled={i === stages.length - 1}
                  className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                  Etapa {i + 1}
                </span>
              </div>

              <div className="p-4 space-y-4 flex-1">
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nome</Label>
                  <Input
                    value={s.nome}
                    onChange={(e) => updateStage(i, { nome: e.target.value })}
                    className="h-9 mt-1 bg-white/5 border-white/10 font-medium"
                  />
                </div>

                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Cor</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {STAGE_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateStage(i, { cor: c })}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          s.cor === c ? "border-white scale-110" : "border-transparent hover:scale-105"
                        }`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!s.is_won}
                      onChange={(e) =>
                        updateStage(i, {
                          is_won: e.target.checked,
                          is_lost: e.target.checked ? false : s.is_lost,
                        })
                      }
                      className="rounded"
                    />
                    Etapa de Ganho
                  </label>
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!s.is_lost}
                      onChange={(e) =>
                        updateStage(i, {
                          is_lost: e.target.checked,
                          is_won: e.target.checked ? false : s.is_won,
                        })
                      }
                      className="rounded"
                    />
                    Etapa de Perda
                  </label>
                </div>
              </div>

              <button
                onClick={() => removeStage(i)}
                className="border-t border-white/5 p-3 text-xs text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-2 rounded-b-2xl transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir etapa
              </button>
            </div>
          ))}

          {/* Add stage column */}
          <button
            onClick={addStage}
            className="w-72 flex-shrink-0 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all flex flex-col items-center justify-center gap-2 min-h-[300px]"
          >
            <Plus className="w-6 h-6" />
            <span className="text-sm font-medium">Adicionar etapa</span>
          </button>
        </div>
      </div>

      {editingFlowId && (
        <div className="fixed inset-0 z-[10000] bg-background/95 backdrop-blur-2xl">
          <FlowEditor flowId={editingFlowId} scope="deals" onClose={() => setEditingFlowId(null)} />
        </div>
      )}
    </div>
  );

  return createPortal(editor, document.body);
}
