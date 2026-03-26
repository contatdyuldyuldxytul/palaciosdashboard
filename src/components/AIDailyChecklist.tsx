import { useState, useEffect, useCallback } from "react";
import { useChecklistChecks, useToggleChecklistCheck } from "@/hooks/useMetasMensais";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Mail, Phone, RotateCw, HeartCrack, Target as TargetIcon, FileText, X } from "lucide-react";

interface AITask {
  tipo: string;
  titulo: string;
  quantidade?: number;
  descricao: string;
  prioridade: "alta" | "media" | "baixa";
  leads_relacionados?: Array<{
    id: string;
    empresa: string;
    contato: string;
    dias_sem_contato: number;
    ultimo_contato: string;
  }>;
}

const typeIcons: Record<string, typeof Mail> = {
  email: Mail,
  ligacao: Phone,
  followup: RotateCw,
  breakup: HeartCrack,
  demo: TargetIcon,
  proposta: FileText,
};

const typeLabels: Record<string, string> = {
  email: "E-mail",
  ligacao: "Ligação",
  followup: "Follow-up",
  breakup: "Break-up",
  demo: "Demo",
  proposta: "Proposta",
};

const priorityConfig = {
  alta: { label: "🔴 Alta", bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
  media: { label: "🟡 Média", bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
  baixa: { label: "🟢 Baixa", bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
};

interface Props {
  colaborador: string;
  accentColor?: string;
}

export function AIDailyChecklist({ colaborador, accentColor = "hsl(160,100%,39%)" }: Props) {
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLeads, setShowLeads] = useState<string | null>(null);

  const { data: checks = [] } = useChecklistChecks(colaborador);
  const toggleCheck = useToggleChecklistCheck();

  const fetchChecklist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-checklist", {
        body: { colaborador },
      });
      if (fnError) throw fnError;
      setTasks(data?.tarefas || []);
    } catch (e: any) {
      setError(e.message || "Erro ao gerar checklist");
    } finally {
      setLoading(false);
    }
  }, [colaborador]);

  // Generate on first load and cache for the day
  useEffect(() => {
    const cacheKey = `checklist_${colaborador}_${new Date().toISOString().split("T")[0]}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setTasks(JSON.parse(cached));
        setLoading(false);
        return;
      } catch { /* ignore */ }
    }
    fetchChecklist().then(() => {
      // Cache after load
    });
  }, [colaborador, fetchChecklist]);

  // Cache tasks when they change
  useEffect(() => {
    if (tasks.length > 0) {
      const cacheKey = `checklist_${colaborador}_${new Date().toISOString().split("T")[0]}`;
      localStorage.setItem(cacheKey, JSON.stringify(tasks));
    }
  }, [tasks, colaborador]);

  const isChecked = (taskId: string) => checks.some(c => c.tarefa_id === taskId && c.concluido);
  const completedCount = tasks.filter((_, i) => isChecked(`task_${i}`)).length;
  const allDone = tasks.length > 0 && completedCount === tasks.length;

  const handleToggle = (task: AITask, index: number) => {
    const taskId = `task_${index}`;
    const checked = isChecked(taskId);
    toggleCheck.mutate({
      colaborador,
      tarefa_id: taskId,
      tarefa_titulo: task.titulo,
      tarefa_tipo: task.tipo,
      concluido: !checked,
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" style={{ color: accentColor }} />
          <h2 className="text-sm font-semibold text-foreground">Checklist do Dia</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{completedCount} de {tasks.length} concluídas</span>
          <button onClick={fetchChecklist} disabled={loading}
            className="text-muted-foreground hover:text-foreground transition-all disabled:opacity-50">
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {tasks.length > 0 && (
        <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }}
            transition={{ duration: 0.8 }}
            className="h-full rounded-full"
            style={{ background: accentColor }}
          />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: accentColor }} />
          <p className="text-xs text-muted-foreground">🤖 Gerando checklist do dia...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-4">
          <p className="text-xs text-destructive mb-2">{error}</p>
          <button onClick={fetchChecklist} className="text-xs text-primary hover:underline">Tentar novamente</button>
        </div>
      )}

      {/* Celebration */}
      {allDone && !loading && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center py-4 mb-4 rounded-xl" style={{ background: `${accentColor}10` }}>
          <p className="text-sm font-medium text-foreground">🎉 Parabéns {colaborador}!</p>
          <p className="text-xs text-muted-foreground">Todas as tarefas do dia concluídas!</p>
        </motion.div>
      )}

      {/* Tasks */}
      {!loading && !error && tasks.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
          {tasks.map((task, i) => {
            const taskId = `task_${i}`;
            const checked = isChecked(taskId);
            const priority = priorityConfig[task.prioridade] || priorityConfig.media;
            const Icon = typeIcons[task.tipo] || FileText;

            return (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl p-3 transition-all ${checked ? "opacity-50" : ""}`}
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggle(task, i)}
                    className={`w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center mt-0.5 transition-all ${
                      checked ? "border-transparent" : "border-muted-foreground/30 hover:border-white/30"
                    }`}
                    style={checked ? { background: accentColor } : {}}
                  >
                    {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md ${priority.bg} ${priority.text}`}>
                        {priority.label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-muted/30 text-muted-foreground">
                        <Icon className="w-3 h-3" /> {typeLabels[task.tipo] || task.tipo}
                      </span>
                      {task.quantidade && task.quantidade > 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/30 text-muted-foreground">
                          ×{task.quantidade}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-medium ${checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {task.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{task.descricao}</p>

                    {task.leads_relacionados && task.leads_relacionados.length > 0 && (
                      <button
                        onClick={() => setShowLeads(showLeads === taskId ? null : taskId)}
                        className="text-xs mt-1.5 hover:underline transition-all"
                        style={{ color: accentColor }}
                      >
                        Ver contatos ({task.leads_relacionados.length}) →
                      </button>
                    )}
                  </div>
                </div>

                {/* Leads Detail Panel */}
                <AnimatePresence>
                  {showLeads === taskId && task.leads_relacionados && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="mt-3 rounded-lg bg-muted/20 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-foreground">Contatos Relacionados</span>
                          <button onClick={() => setShowLeads(null)} className="text-muted-foreground hover:text-foreground">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-muted-foreground border-b border-white/5">
                                <th className="text-left py-1.5 pr-3">Empresa</th>
                                <th className="text-left py-1.5 pr-3">Contato</th>
                                <th className="text-left py-1.5 pr-3">Dias s/ contato</th>
                                <th className="text-left py-1.5">Último contato</th>
                              </tr>
                            </thead>
                            <tbody>
                              {task.leads_relacionados.map((lead, li) => (
                                <tr key={li} className="border-b border-white/5 last:border-0">
                                  <td className="py-1.5 pr-3 text-foreground">{lead.empresa}</td>
                                  <td className="py-1.5 pr-3 text-muted-foreground">{lead.contato}</td>
                                  <td className="py-1.5 pr-3">
                                    <span className="text-red-400">{lead.dias_sem_contato}d</span>
                                  </td>
                                  <td className="py-1.5 text-muted-foreground">{lead.ultimo_contato}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {!loading && !error && tasks.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">Nenhuma tarefa gerada para hoje</p>
      )}
    </motion.div>
  );
}
