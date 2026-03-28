import { useState, useMemo } from "react";
import { useChecklistChecks, useToggleChecklistCheck } from "@/hooks/useMetasMensais";
import { useMetasMensais } from "@/hooks/useMetasMensais";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Mail, Phone, Globe, MessageSquare, Target as TargetIcon, FileText, Sun, Sunset } from "lucide-react";
import { getCycleDayInfo, todaySP, CycleActivity } from "@/lib/cadenceEngine";

const typeIcons: Record<string, typeof Mail> = {
  Email: Mail, WhatsApp: MessageSquare, LinkedIn: Globe, Ligação: Phone,
  "Geração de Leads": TargetIcon,
};

const typeEmoji: Record<string, string> = {
  Email: "📧", WhatsApp: "📱", LinkedIn: "💼", Ligação: "📞", "Geração de Leads": "🎯",
};

interface Props {
  colaborador: string;
  accentColor?: string;
}

export function CadenceChecklist({ colaborador, accentColor = "hsl(160,100%,39%)" }: Props) {
  const { data: checks = [], isLoading: checksLoading } = useChecklistChecks(colaborador);
  const toggleCheck = useToggleChecklistCheck();

  const isAline = colaborador.toLowerCase().includes("aline");
  const isMilena = colaborador.toLowerCase().includes("milena");

  const todayStr = todaySP();
  const todayInfo = useMemo(() => getCycleDayInfo(todayStr), [todayStr]);

  // Build tasks from cycle engine
  const allTasks = useMemo(() => {
    if (!todayInfo?.isWorkingDay) return [];

    const tasks: Array<{ id: string; periodo: string; periodoLabel: string; tipo: string; grupo: string; descricao: string }> = [];

    if (isAline) {
      todayInfo.activities.forEach((a, i) => {
        tasks.push({
          id: `cadence_${todayStr}_aline_${i}`,
          periodo: a.periodo,
          periodoLabel: a.periodoLabel,
          tipo: a.tipo,
          grupo: a.grupo,
          descricao: `${a.tipo} Grupo ${a.grupo}`,
        });
      });
    }

    if (isMilena) {
      tasks.push({
        id: `cadence_${todayStr}_milena_0`,
        periodo: "Manhã 1",
        periodoLabel: "Manhã",
        tipo: "Geração de Leads",
        grupo: todayInfo.group,
        descricao: "Geração de Leads",
      });
    }

    return tasks;
  }, [todayInfo, todayStr, isAline, isMilena]);

  const manhaTasks = allTasks.filter(t => t.periodoLabel === "Manhã");
  const tardeTasks = allTasks.filter(t => t.periodoLabel === "Tarde");

  const isChecked = (taskId: string) => checks.some(c => c.tarefa_id === taskId && c.concluido);
  const completedCount = allTasks.filter(t => isChecked(t.id)).length;
  const allDone = allTasks.length > 0 && completedCount === allTasks.length;

  const handleToggle = (task: typeof allTasks[0]) => {
    const checked = isChecked(task.id);
    toggleCheck.mutate({
      colaborador,
      tarefa_id: task.id,
      tarefa_titulo: task.descricao,
      tarefa_tipo: task.tipo,
      concluido: !checked,
    });
  };

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
              <span className="text-[10px] px-1.5 py-0.5 rounded-md"
                style={{ background: task.grupo === "A" ? "rgba(245,158,11,0.15)" : "rgba(0,200,150,0.15)", color: groupColor }}>
                Grupo {task.grupo}
              </span>
              <span className="text-[8px] text-muted-foreground">{task.periodo}</span>
            </div>
            <p className={`text-sm font-medium ${checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {typeEmoji[task.tipo] || "📋"} {task.descricao}
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  if (checksLoading) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4" style={{ color: accentColor }} />
          <h2 className="text-sm font-semibold text-foreground">Checklist do Dia</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: accentColor }} />
          <p className="text-xs text-muted-foreground">Carregando...</p>
        </div>
      </motion.div>
    );
  }

  if (!todayInfo?.isWorkingDay) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4" style={{ color: accentColor }} />
          <h2 className="text-sm font-semibold text-foreground">Checklist do Dia</h2>
        </div>
        <p className="text-xs text-muted-foreground text-center py-4">
          Fim de semana — sem tarefas de cadência.
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
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${todayInfo.group === "A" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`}>
            Grupo {todayInfo.group}
          </span>
          <span className="text-[9px] text-muted-foreground">Ciclo {todayInfo.cycleNumber} · Dia {todayInfo.cycleDay}</span>
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
      </div>
    </motion.div>
  );
}
