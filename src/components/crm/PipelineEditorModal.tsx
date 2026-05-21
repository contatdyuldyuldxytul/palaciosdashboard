import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";
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
} from "@/hooks/useCrm";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipeline?: CrmPipeline | null;
}

const FLOW_TYPES: PipelineFlowType[] = ["cadencia_10_dias", "nutricao", "vendas", "personalizado"];
const STAGE_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#64748b", "#06b6d4"];

export function PipelineEditorModal({ open, onOpenChange, pipeline }: Props) {
  const isEdit = !!pipeline;
  const [nome, setNome] = useState("");
  const [flowType, setFlowType] = useState<PipelineFlowType>("personalizado");
  const [ownerId, setOwnerId] = useState<string>("__none__");
  const [stages, setStages] = useState<StageInput[]>([]);

  const collabsQ = useCollaborators();
  const create = useCreatePipeline();
  const update = useUpdatePipeline();
  const replace = useReplaceStages();
  const stagesQ = useCrmStages(isEdit ? pipeline?.id : undefined);

  useEffect(() => {
    if (!open) return;
    if (pipeline) {
      setNome(pipeline.nome);
      setFlowType(pipeline.flow_type);
      setOwnerId(pipeline.owner_user_id || "__none__");
    } else {
      setNome("");
      setFlowType("personalizado");
      setOwnerId("__none__");
      setStages(FLOW_TYPE_STAGE_TEMPLATES.personalizado.map((s) => ({ ...s })));
    }
  }, [open, pipeline]);

  useEffect(() => {
    if (isEdit && stagesQ.data) {
      setStages(stagesQ.data.map((s) => ({ id: s.id, nome: s.nome, ordem: s.ordem, cor: s.cor || "#3b82f6", is_won: s.is_won, is_lost: s.is_lost })));
    }
  }, [isEdit, stagesQ.data]);

  const handleFlowTypeChange = (v: PipelineFlowType) => {
    setFlowType(v);
    if (!isEdit) {
      setStages(FLOW_TYPE_STAGE_TEMPLATES[v].map((s) => ({ ...s })));
    }
  };

  const addStage = () => {
    setStages((arr) => [
      ...arr,
      { nome: "Nova Etapa", ordem: arr.length, cor: STAGE_COLORS[arr.length % STAGE_COLORS.length] },
    ]);
  };

  const updateStage = (idx: number, patch: Partial<StageInput>) => {
    setStages((arr) => arr.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeStage = (idx: number) => {
    setStages((arr) => arr.filter((_, i) => i !== idx).map((s, i) => ({ ...s, ordem: i })));
  };

  const moveStage = (idx: number, dir: -1 | 1) => {
    setStages((arr) => {
      const next = [...arr];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return next;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((s, i) => ({ ...s, ordem: i }));
    });
  };

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
      } else {
        await create.mutateAsync({
          nome: nome.trim(),
          flow_type: flowType,
          owner_user_id: ownerSel?.id ?? null,
          owner_label: ownerSel?.full_name || null,
          stages,
        });
        toast({ title: "Pipeline criado" });
      }
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const pending = create.isPending || update.isPending || replace.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{isEdit ? "Editar Pipeline" : "Novo Pipeline"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Pipeline de Vendas 2026" />
            </div>
            <div>
              <Label>Tipo de Fluxo *</Label>
              <Select value={flowType} onValueChange={(v) => handleFlowTypeChange(v as PipelineFlowType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FLOW_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{FLOW_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Responsável</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem responsável</SelectItem>
                {(collabsQ.data || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Etapas</Label>
              <Button size="sm" variant="outline" onClick={addStage}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
              </Button>
            </div>

            <div className="space-y-1.5">
              {stages.map((s, i) => (
                <div key={i} className="flex items-center gap-2 glass-card rounded-lg p-2">
                  <div className="flex flex-col">
                    <button className="text-muted-foreground hover:text-foreground text-xs" onClick={() => moveStage(i, -1)} disabled={i === 0}>▲</button>
                    <button className="text-muted-foreground hover:text-foreground text-xs" onClick={() => moveStage(i, 1)} disabled={i === stages.length - 1}>▼</button>
                  </div>
                  <GripVertical className="w-3 h-3 text-muted-foreground" />
                  <Input
                    value={s.nome}
                    onChange={(e) => updateStage(i, { nome: e.target.value })}
                    className="flex-1 h-8 text-sm"
                  />
                  <div className="flex gap-0.5">
                    {STAGE_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateStage(i, { cor: c })}
                        className={`w-4 h-4 rounded-full border-2 ${s.cor === c ? "border-white" : "border-transparent"}`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={!!s.is_won}
                      onChange={(e) => updateStage(i, { is_won: e.target.checked, is_lost: e.target.checked ? false : s.is_lost })}
                    />
                    Ganho
                  </label>
                  <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={!!s.is_lost}
                      onChange={(e) => updateStage(i, { is_lost: e.target.checked, is_won: e.target.checked ? false : s.is_won })}
                    />
                    Perda
                  </label>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeStage(i)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Salvando…" : isEdit ? "Salvar" : "Criar Pipeline"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
