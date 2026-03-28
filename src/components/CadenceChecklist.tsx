import { useState } from "react";
import { usePlanejamentoHoje } from "@/hooks/usePlanejamento";
import { useChecklistChecks, useToggleChecklistCheck } from "@/hooks/useMetasMensais";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, X, Mail, Phone, Globe, MessageSquare, HeartCrack, Target as TargetIcon, FileText, Sun, Sunset } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const typeIcons: Record<string, typeof Mail> = {
  Email: Mail, WhatsApp: MessageSquare, LinkedIn: Globe, "Ligação": Phone,
  email: Mail, ligacao: Phone, followup: Globe, breakup: HeartCrack, demo: TargetIcon, proposta: FileText,
  "Geração de Leads": TargetIcon,
};

const typeEmoji: Record<string, string> = {
  Email: "📧", WhatsApp: "📱", LinkedIn: "💼", "Ligação": "📞", "Geração de Leads": "🎯",
};

interface Props {
  colaborador: string;
  accentColor?: string;
}

export function CadenceChecklist({ colaborador, accentColor = "hsl(160,100%,39%)" }: Props) {
  const { data: planDias = [], isLoading } = usePlanejamentoHoje(colaborador);
  const { data: checks = [] } = useChecklistChecks(colaborador);
  const toggleCheck = useToggleChecklistCheck();
  const [showLeadsModal, setShowLeadsModal] = useState(false);

  const isAline = colaborador.toLowerCase().includes("aline");
  const isMilena = colaborador.toLowerCase().includes("milena");

  const allTasks: Array<{ id: string; periodo: string; tipo: string; grupo: string; quantidade: number; descricao: string; priority?: string }> = [];

  planDias.forEach((dia, di) => {
    const tarefas = dia.tarefas_json || {};
    if (isAline && tarefas.aline_tarefas) {
      tarefas.aline_tarefas.forEach((t: any, ti: number) => {
        allTasks.push({
          id: `plan_${di}_aline_${ti}`,
          periodo: t.periodo || "Manhã",
          tipo: t.tipo || "Email",
          grupo: t.grupo || dia.grupo || "A",
          quantidade: t.quantidade || 0,
          descricao: t.descricao || "",
        });
      });
    }
    if (isMilena && tarefas.milena_tarefas) {
      tarefas.milena_tarefas.forEach((t: any, ti: number) => {
        allTasks.push({
          id: `plan_${di}_milena_${ti}`,
          periodo: "Manhã",
          tipo: t.tipo || "Geração de Leads",
          grupo: dia.grupo || "",
          quantidade: t.quantidade || 0,
          descricao: t.descricao || "",
        });
      });
    }
  });

  const manhaTasks = allTasks.filter(t => t.periodo === "Manhã" || t.periodo?.toLowerCase().includes("manhã"));
  const tardeTasks = allTasks.filter(t => t.periodo === "Tarde" || t.periodo?.toLowerCase().includes("tarde"));
  const otherTasks = allTasks.filter(t => !manhaTasks.includes(t) && !tardeTasks.includes(t));

  const isChecked = (taskId: string) => checks.some(c => c.tarefa_id === taskId && c.concluido);
  const completedCount = allTasks.filter(t => isChecked(t.id)).length;
  const allDone = allTasks.length > 0 && completedCount === allTasks.length;

  const handleToggle = (task: typeof allTasks[0]) => {
    const checked = isChecked(task.id);
    toggleCheck.mutate({
      colaborador,
      tarefa_id: task.id,
      tarefa_titulo: `${task.tipo} - ${task.descricao}`,
      tarefa_tipo: task.tipo,
      concluido: !checked,
    });
  };

  const currentGroup = planDias[0]?.grupo;

  const renderTaskItem = (task: typeof allTasks[0]) => {
    const checked = isChecked(task.id);
    const Icon = typeIcons[task.tipo] || FileText;
    const groupColor = task.grupo === "A" ? "hsl(45,100%,55%)" : "hsl(160,100%,39%)";

    return (
      <motion.div key={task.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
        className={`rounded-xl p-3 transition-all ${checked ? "opacity-50" : ""}`}
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-start gap-3">
          <button onClick={() => handleToggle(task)}
            className={`w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center mt-0.5 transition-all ${
              checked ? "border-transparent" : "border-muted-foreground/30 hover:border-white/30"
            }`}
            style={checked ? { background: accentColor } : {}}>
            {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-muted/30 text-muted-foreground">
                <Icon className="w-3 h-3" /> {task.tipo}
              </span>
              {task.grupo && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md"
                  style={{ background: task.grupo === "A" ? "rgba(245,158,11,0.15)" : "rgba(0,200,150,0.15)", color: groupColor }}>
                  Grupo {task.grupo}
                </span>
              )}
              {task.quantidade > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/30 text-muted-foreground">
                  ×{task.quantidade}
                </span>
              )}
            </div>
            <p className={`text-sm font-medium ${checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {typeEmoji[task.tipo] || "📋"} {task.tipo} para Grupo {task.grupo} — {task.quantidade} contatos
            </p>
            {task.descricao && (
              <p className="text-xs text-muted-foreground mt-0.5">{task.descricao}</p>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4" style={{ color: accentColor }} />
          <h2 className="text-sm font-semibold text-foreground">Checklist do Dia</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: accentColor }} />
          <p className="text-xs text-muted-foreground">Carregando planejamento...</p>
        </div>
      </motion.div>
    );
  }

  if (allTasks.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4" style={{ color: accentColor }} />
          <h2 className="text-sm font-semibold text-foreground">Checklist do Dia</h2>
        </div>
        <p className="text-xs text-muted-foreground text-center py-4">
          Nenhum planejamento aprovado para hoje. Aguardando aprovação do CEO.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" style={{ color: accentColor }} />
          <h2 className="text-sm font-semibold text-foreground">Checklist do Dia</h2>
          {currentGroup && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${currentGroup === "A" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`}>
              Grupo {currentGroup}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{completedCount} de {allTasks.length} concluídas</span>
      </div>

      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden mb-4">
        <motion.div initial={{ width: 0 }} animate={{ width: `${allTasks.length > 0 ? (completedCount / allTasks.length) * 100 : 0}%` }}
          transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ background: accentColor }} />
      </div>

      {allDone && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center py-4 mb-4 rounded-xl" style={{ background: `${accentColor}10` }}>
          <p className="text-sm font-medium text-foreground">🎉 Parabéns {colaborador}!</p>
          <p className="text-xs text-muted-foreground">Todas as tarefas do dia concluídas!</p>
        </motion.div>
      )}

      <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin">
        {manhaTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">MANHÃ</span>
            </div>
            <div className="space-y-1.5">
              {manhaTasks.map(renderTaskItem)}
            </div>
          </div>
        )}

        {tardeTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sunset className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs font-semibold text-orange-400">TARDE</span>
            </div>
            <div className="space-y-1.5">
              {tardeTasks.map(renderTaskItem)}
            </div>
          </div>
        )}

        {otherTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TargetIcon className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span className="text-xs font-semibold" style={{ color: accentColor }}>TAREFAS</span>
            </div>
            <div className="space-y-1.5">
              {otherTasks.map(renderTaskItem)}
            </div>
          </div>
        )}

        {isMilena && planDias.length > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-muted/20 border border-white/5">
            <p className="text-xs text-muted-foreground">
              ⏰ Planejamento do dia ativo. Mantenha o ritmo de prospecção!
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
