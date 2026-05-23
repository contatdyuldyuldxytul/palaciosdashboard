import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowLeft, Mail, Play, Clock } from "lucide-react";
import {
  useEmailSequences, useCreateSequence, useSequenceWithSteps,
  useUpdateSequence, useDeleteSequence, useSaveSteps, useProcessSequences,
  type EmailSequenceStep,
} from "@/hooks/useEmailSequences";
import { useCrmPipelines, useCrmStages } from "@/hooks/useCrm";
import { toast } from "sonner";

const VARS = [
  { key: "lead_nome", label: "Nome do lead" },
  { key: "lead_empresa", label: "Empresa" },
  { key: "lead_email", label: "E-mail do lead" },
  { key: "responsavel_nome", label: "Responsável" },
  { key: "deal_titulo", label: "Título do deal" },
];

export function SequencesView() {
  const [editing, setEditing] = useState<string | null>(null);
  const { data: sequences = [] } = useEmailSequences();
  const createSeq = useCreateSequence();
  const process = useProcessSequences();

  const handleCreate = async () => {
    const seq = await createSeq.mutateAsync({ nome: "Nova sequência" });
    setEditing(seq.id);
  };

  const handleProcess = async () => {
    try {
      const r: any = await process.mutateAsync();
      toast.success(`Rascunhos criados: ${r?.created || 0}`);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao processar");
    }
  };

  if (editing) return <SequenceEditor id={editing} onBack={() => setEditing(null)} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Sequências de follow-up</h2>
          <p className="text-sm text-white/50 mt-1">
            Crie sequências de e-mails automáticos. Rascunhos são gerados no Gmail para você revisar antes de enviar.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleProcess} disabled={process.isPending}>
            <Play className="w-4 h-4 mr-2" />
            {process.isPending ? "Processando..." : "Gerar rascunhos agora"}
          </Button>
          <Button onClick={handleCreate} className="bg-emerald-500 hover:bg-emerald-600">
            <Plus className="w-4 h-4 mr-2" /> Nova sequência
          </Button>
        </div>
      </div>

      {sequences.length === 0 ? (
        <Card className="p-12 text-center bg-white/5 border-white/10 backdrop-blur-xl">
          <Mail className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/60">Nenhuma sequência criada ainda.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sequences.map((s) => (
            <Card
              key={s.id}
              onClick={() => setEditing(s.id)}
              className="p-4 bg-white/5 border-white/10 backdrop-blur-xl hover:bg-white/10 cursor-pointer transition"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-white">{s.nome}</h3>
                <Badge variant={s.ativo ? "default" : "secondary"} className={s.ativo ? "bg-emerald-500/20 text-emerald-300" : ""}>
                  {s.ativo ? "Ativa" : "Pausada"}
                </Badge>
              </div>
              {s.descricao && <p className="text-xs text-white/50 mb-2">{s.descricao}</p>}
              <div className="flex items-center gap-1 text-[11px] text-white/40">
                <Clock className="w-3 h-3" />
                {s.trigger_type === "manual" ? "Atribuição manual" : "Gatilho por etapa"}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SequenceEditor({ id, onBack }: { id: string; onBack: () => void }) {
  const { data } = useSequenceWithSteps(id);
  const updateSeq = useUpdateSequence();
  const saveSteps = useSaveSteps();
  const deleteSeq = useDeleteSequence();
  const { data: pipelines = [] } = useCrmPipelines();
  const { data: stages = [] } = useCrmStages(pipelines[0]?.id);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(false);
  const [triggerType, setTriggerType] = useState<"manual" | "stage_enter">("manual");
  const [stageId, setStageId] = useState<string | null>(null);
  const [steps, setSteps] = useState<Array<Partial<EmailSequenceStep>>>([]);

  useEffect(() => {
    if (!data) return;
    setNome(data.sequence.nome);
    setDescricao(data.sequence.descricao || "");
    setAtivo(data.sequence.ativo);
    setTriggerType(data.sequence.trigger_type);
    setStageId(data.sequence.trigger_stage_id);
    setSteps(data.steps);
  }, [data]);

  const addStep = () => setSteps([...steps, {
    dia_offset: (steps[steps.length - 1]?.dia_offset ?? 0) + 3,
    subject_template: "",
    body_template: "",
  }]);

  const updateStep = (i: number, patch: Partial<EmailSequenceStep>) =>
    setSteps(steps.map((s, idx) => idx === i ? { ...s, ...patch } : s));

  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));

  const insertVar = (i: number, key: string) => {
    const cur = steps[i].body_template || "";
    updateStep(i, { body_template: cur + `{{${key}}}` });
  };

  const handleSave = async () => {
    try {
      await updateSeq.mutateAsync({
        id, patch: { nome, descricao, ativo, trigger_type: triggerType, trigger_stage_id: triggerType === "stage_enter" ? stageId : null } as any,
      });
      await saveSteps.mutateAsync({ sequence_id: id, steps });
      toast.success("Sequência salva");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao salvar");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Excluir esta sequência?")) return;
    await deleteSeq.mutateAsync(id);
    onBack();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDelete} className="text-red-400 hover:text-red-300">
            <Trash2 className="w-4 h-4 mr-2" /> Excluir
          </Button>
          <Button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600">Salvar</Button>
        </div>
      </div>

      <Card className="p-5 bg-white/5 border-white/10 backdrop-blur-xl space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-white/60">Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} className="bg-white/5 border-white/10" />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <Switch checked={ativo} onCheckedChange={setAtivo} />
            <Label className="text-sm text-white/80">Sequência ativa</Label>
          </div>
        </div>
        <div>
          <Label className="text-xs text-white/60">Descrição</Label>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} className="bg-white/5 border-white/10" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-white/60">Gatilho</Label>
            <Select value={triggerType} onValueChange={(v) => setTriggerType(v as any)}>
              <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Atribuição manual</SelectItem>
                <SelectItem value="stage_enter">Quando lead entra em etapa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {triggerType === "stage_enter" && (
            <div>
              <Label className="text-xs text-white/60">Etapa do funil</Label>
              <Select value={stageId || ""} onValueChange={(v) => setStageId(v)}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Passos da sequência</h3>
          <Button size="sm" variant="outline" onClick={addStep}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar passo
          </Button>
        </div>
        {steps.map((s, i) => (
          <Card key={i} className="p-4 bg-white/5 border-white/10 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 text-xs font-bold">
                  D{s.dia_offset ?? 0}
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-[100px_1fr_auto] gap-2 items-end">
                  <div>
                    <Label className="text-[11px] text-white/50">Dia</Label>
                    <Input
                      type="number" min={0}
                      value={s.dia_offset ?? 0}
                      onChange={(e) => updateStep(i, { dia_offset: parseInt(e.target.value || "0") })}
                      className="bg-white/5 border-white/10 h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-white/50">Assunto</Label>
                    <Input
                      value={s.subject_template || ""}
                      onChange={(e) => updateStep(i, { subject_template: e.target.value })}
                      className="bg-white/5 border-white/10 h-9"
                    />
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeStep(i)} className="text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-[11px] text-white/50">Corpo</Label>
                    <div className="flex flex-wrap gap-1">
                      {VARS.map((v) => (
                        <button
                          key={v.key}
                          onClick={() => insertVar(i, v.key)}
                          className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/20"
                        >
                          {`{{${v.key}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Textarea
                    rows={6}
                    value={s.body_template || ""}
                    onChange={(e) => updateStep(i, { body_template: e.target.value })}
                    className="bg-white/5 border-white/10 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
