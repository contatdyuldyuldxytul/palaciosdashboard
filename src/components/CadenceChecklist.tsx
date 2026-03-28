import { useState, useMemo } from "react";
import { useChecklistChecks, useToggleChecklistCheck } from "@/hooks/useMetasMensais";
import { useCustomActivities, useToggleCustomActivity } from "@/hooks/useCustomActivities";
import { usePipedrive } from "@/hooks/usePipedrive";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Mail, Phone, Globe, MessageSquare, Target as TargetIcon, FileText, Sun, Sunset, Plus, RefreshCw, Star, Eye } from "lucide-react";
import { getCycleDayInfo, todaySP, CycleActivity, isFollowUpDay, getGroupLeadCounts } from "@/lib/cadenceEngine";
import { AddActivityModal } from "@/components/AddActivityModal";
import { FollowUpModal } from "@/components/FollowUpModal";

const typeIcons: Record<string, typeof Mail> = {
  Email: Mail, WhatsApp: MessageSquare, LinkedIn: Globe, Ligação: Phone,
  "Geração de Leads": TargetIcon, "Follow-up": RefreshCw,
};

const typeEmoji: Record<string, string> = {
  Email: "📧", WhatsApp: "📱", LinkedIn: "💼", Ligação: "📞", "Geração de Leads": "🎯", "Follow-up": "🔄",
};

interface Props {
  colaborador: string;
  accentColor?: string;
}

export function CadenceChecklist({ colaborador, accentColor = "hsl(160,100%,39%)" }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);

  const { data: checks = [], isLoading: checksLoading } = useChecklistChecks(colaborador);
  const toggleCheck = useToggleChecklistCheck();

  const todayStr = todaySP();
  const { data: customActivities = [] } = useCustomActivities(colaborador, todayStr);
  const toggleCustom = useToggleCustomActivity();
  const { deals } = usePipedrive();

  const isAline = colaborador.toLowerCase().includes("aline");
  const isMilena = colaborador.toLowerCase().includes("milena");

  const todayInfo = useMemo(() => getCycleDayInfo(todayStr), [todayStr]);
  const leadCounts = useMemo(() => getGroupLeadCounts(deals), [deals]);

  // Follow-up deals
  const followUpDeals = useMemo(() => {
    return deals.filter(d =>
      d.status === "open" &&
      (d.pipedrive_stage === "Contato com o Decisor" || d.pipedrive_stage === "Porta Aberta Decisores")
    );
  }, [deals]);
  const isFollowUp = isAline && isFollowUpDay(todayStr);

  const getLeadCountLabel = (grupo: "A" | "B") => {
    const count = grupo === "A" ? leadCounts.groupA : leadCounts.groupB;
    return count > 0 ? `(${count} leads)` : "(—)";
  };

  // Build tasks from cycle engine
  const allTasks = useMemo(() => {
    if (!todayInfo?.isWorkingDay) return [];

    const tasks: Array<{ id: string; periodo: string; periodoLabel: string; tipo: string; grupo: string; descricao: string; isCustom?: boolean; isFollowUp?: boolean; customActivityId?: string; leadCount?: string; criadoPor?: string }> = [];

    if (isAline) {
      todayInfo.activities.forEach((a, i) => {
        tasks.push({
          id: `cadence_${todayStr}_aline_${i}`,
          periodo: a.periodo,
          periodoLabel: a.periodoLabel,
          tipo: a.tipo,
          grupo: a.grupo,
          descricao: `${a.tipo} Grupo ${a.grupo}`,
          leadCount: getLeadCountLabel(a.grupo),
        });
      });

      // Follow-up task
      if (isFollowUp) {
        tasks.push({
          id: `followup_${todayStr}_aline`,
          periodo: "Tarde",
          periodoLabel: "Tarde",
          tipo: "Follow-up",
          grupo: "",
          descricao: `Follow-up com Decisores`,
          isFollowUp: true,
          leadCount: `(${followUpDeals.length} contatos)`,
        });
      }
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

    // Custom activities
    customActivities.forEach(ca => {
      tasks.push({
        id: `custom_${ca.id}`,
        periodo: "",
        periodoLabel: "Tarde",
        tipo: ca.tipo,
        grupo: "",
        descricao: ca.titulo,
        isCustom: true,
        customActivityId: ca.id,
        criadoPor: ca.criado_por || undefined,
      });
    });

    return tasks;
  }, [todayInfo, todayStr, isAline, isMilena, customActivities, isFollowUp, followUpDeals.length, leadCounts]);

  const manhaTasks = allTasks.filter(t => t.periodoLabel === "Manhã");
  const tardeTasks = allTasks.filter(t => t.periodoLabel === "Tarde");

  const isChecked = (task: typeof allTasks[0]) => {
    if (task.isCustom && task.customActivityId) {
      return customActivities.find(ca => ca.id === task.customActivityId)?.concluido || false;
    }
    return checks.some(c => c.tarefa_id === task.id && c.concluido);
  };

  const completedCount = allTasks.filter(t => isChecked(t)).length;
  const allDone = allTasks.length > 0 && completedCount === allTasks.length;

  const handleToggle = (task: typeof allTasks[0]) => {
    if (task.isCustom && task.customActivityId) {
      const ca = customActivities.find(c => c.id === task.customActivityId);
      if (ca) toggleCustom.mutate({ id: ca.id, concluido: !ca.concluido });
      return;
    }
    const checked = isChecked(task);
    toggleCheck.mutate({
      colaborador,
      tarefa_id: task.id,
      tarefa_titulo: task.descricao,
      tarefa_tipo: task.tipo,
      concluido: !checked,
    });
  };

  const renderTaskItem = (task: typeof allTasks[0]) => {
    const checked = isChecked(task);
    const Icon = typeIcons[task.tipo] || FileText;
    const groupColor = task.grupo === "A" ? "hsl(45,100%,55%)" : task.grupo === "B" ? "hsl(160,100%,39%)" : "hsl(210,80%,60%)";

    return (
      <motion.div key={task.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
        className={`rounded-xl p-3 transition-all ${checked ? "opacity-50" : ""}`}
        style={{
          background: task.isFollowUp ? "rgba(59,130,246,0.05)" : task.isCustom ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
          border: task.isFollowUp ? "1px solid rgba(59,130,246,0.15)" : task.isCustom ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.06)",
        }}>
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
              {task.isCustom && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-white/80">
                  <Star className="w-3 h-3" /> Personalizada
                </span>
              )}
              {task.isFollowUp && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400">
                  <RefreshCw className="w-3 h-3" /> Follow-up
                </span>
              )}
              {!task.isCustom && !task.isFollowUp && (
                <>
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-muted/30 text-muted-foreground">
                    <Icon className="w-3 h-3" /> {task.tipo}
                  </span>
                  {task.grupo && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md"
                      style={{ background: task.grupo === "A" ? "rgba(245,158,11,0.15)" : "rgba(0,200,150,0.15)", color: groupColor }}>
                      Grupo {task.grupo}
                    </span>
                  )}
                </>
              )}
              {task.periodo && <span className="text-[8px] text-muted-foreground">{task.periodo}</span>}
            </div>
            <div className="flex items-center gap-2">
              <p className={`text-sm font-medium ${checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {task.isCustom ? "⭐" : typeEmoji[task.tipo] || "📋"} {task.descricao}
              </p>
              {task.leadCount && (
                <span className="text-[10px] text-muted-foreground">{task.leadCount}</span>
              )}
            </div>
            {task.isFollowUp && (
              <button onClick={() => setShowFollowUpModal(true)}
                className="text-[10px] text-blue-400 hover:underline mt-0.5 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Ver contatos →
              </button>
            )}
            {task.criadoPor && (
              <p className="text-[9px] text-muted-foreground mt-0.5">criado por {task.criadoPor}</p>
            )}
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
        <button onClick={() => setShowAddModal(true)}
          className="w-full mt-2 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all flex items-center justify-center gap-2 border border-dashed border-white/10">
          <Plus className="w-3.5 h-3.5" /> Adicionar Atividade
        </button>
        <AddActivityModal open={showAddModal} onOpenChange={setShowAddModal} defaultResponsavel={colaborador} />
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

      {/* Add Activity Button */}
      <button onClick={() => setShowAddModal(true)}
        className="w-full mt-4 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all flex items-center justify-center gap-2 border border-dashed border-white/10">
        <Plus className="w-3.5 h-3.5" /> Adicionar Atividade
      </button>

      <AddActivityModal open={showAddModal} onOpenChange={setShowAddModal} defaultResponsavel={colaborador} />
      <FollowUpModal open={showFollowUpModal} onOpenChange={setShowFollowUpModal} deals={followUpDeals} />
    </motion.div>
  );
}
