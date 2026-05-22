import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CrmPipeline,
  PipelineFlowType,
  StageInput,
  FLOW_TYPE_LABELS,
  FLOW_TYPE_STAGE_TEMPLATES,
  useCollaborators,
  useCreatePipeline,
  useUpdatePipeline,
  useReplaceStages,
  useCrmStages,
  useCrmPipelines,
} from "@/hooks/useCrm";
import { toast } from "@/hooks/use-toast";

interface Props {
  mode: "new" | "edit";
  pipelineId?: string;
  onClose: () => void;
  onSaved?: (pipelineId: string) => void;
}

const FLOW_TYPES: PipelineFlowType[] = ["cadencia_10_dias", "nutricao", "vendas", "personalizado"];
const STAGE_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#64748b", "#06b6d4"];

export function PipelineEditorScreen({ mode, pipelineId, onClose, onSaved }: Props) {
  const isEdit = mode === "edit";
  const pipelinesQ = useCrmPipelines();
  const pipeline: CrmPipeline | undefined = isEdit
    ? pipelinesQ.data?.find((p) => p.id === pipelineId)
    : undefined;

  const [nome, setNome] = useState("");
  const [flowType, setFlowType] = useState<PipelineFlowType>("personalizado");
  const [ownerId, setOwnerId] = useState<string>("__none__");
  const [stages, setStages] = useState<StageInput[]>([]);

  const collabsQ = useCollaborators();
  const create = useCreatePipeline();
  const update = useUpdatePipeline();
  const replace = useReplaceStages();
  const stagesQ = useCrmStages(isEdit ? pipelineId : undefined);

  useEffect(() => {
    if (pipeline) {
      setNome(pipeline.nome);
      setFlowType(pipeline.flow_type);
      setOwnerId(pipeline.owner_user_id || "__none__");
    } else if (!isEdit) {
      setNome("");
      setFlowType("personalizado");
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

  const handleFlowTypeChange = (v: PipelineFlowType) => {
    setFlowType(v);
    if (!isEdit) setStages(FLOW_TYPE_STAGE_TEMPLATES[v].map((s) => ({ ...s })));
  };

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
      if (isEdit && pipeline) {
        await update.mutateAsync({
          id: pipeline.id,
          nome: nome.trim(),
          flow_type: flowType,
          owner_user_id: ownerSel?.id ?? null,
          owner_label: ownerSel?.full_name || null,
        });
        await replace.mutateAsync({ pipeline_id: pipeline.id, stages });
        toast({ title: "Pipeline atualizado" });
        onSaved?.(pipeline.id);
      } else {
        const created = await create.mutateAsync({
          nome: nome.trim(),
          flow_type: flowType,
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

  const pending = create.isPending || update.isPending || replace.isPending;

  return (
    <div className="fixed inset-0 z-[200] bg-background/98 backdrop-blur-2xl flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex flex-wrap items-center gap-4 bg-background/80">
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {isEdit ? "Editar Pipeline" : "Novo Pipeline"}
          </span>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do pipeline"
            className="h-9 w-80 mt-1 bg-white/5 border-white/10 text-base font-semibold"
          />
        </div>

        <div className="flex items-center gap-2">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tipo</Label>
            <Select value={flowType} onValueChange={(v) => handleFlowTypeChange(v as PipelineFlowType)}>
              <SelectTrigger className="h-9 w-52 mt-1 bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FLOW_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {FLOW_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending} className="shadow-lg shadow-primary/20">
            {pending ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar pipeline"}
          </Button>
        </div>
      </div>

      {/* Stage columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex gap-3 h-full min-w-max">
          {stages.map((s, i) => (
            <div
              key={i}
              className="w-72 flex-shrink-0 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 flex flex-col"
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
    </div>
  );
}
