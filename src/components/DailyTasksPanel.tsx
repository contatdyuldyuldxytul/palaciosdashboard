import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ExternalLink, Plus, Workflow, AlertTriangle, Calendar, Mail, MessageCircle, CheckSquare, Sparkles, Flag, Webhook, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useDailyActivities,
  useToggleActivity,
  type DailyActivity,
} from "@/hooks/useDailyActivities";
import { useFlowActivities, useToggleFlowTask, type FlowActivity } from "@/hooks/useFlowActivities";
import { useAuth } from "@/contexts/AuthContext";
import { AddDailyActivityModal } from "@/components/AddDailyActivityModal";


type Mode =
  | { kind: "pipedrive"; pipedriveUserId: number }
  | { kind: "milena" }
  | { kind: "disabled"; emptyMessage: string };

type Props = {
  mode: Mode;
  title?: string;
  subtitle?: string;
  /** Label for who the task is assigned to (e.g. "Aline", "Felipe", "Milena", "Thiago"). Required to enable the CEO "+ Nova tarefa" button. */
  assigneeLabel?: string;
};

const TYPE_STYLES: Record<DailyActivity["task_type"], { label: string; bg: string; fg: string; bd: string }> = {
  cadence:      { label: "cadência",   bg: "rgba(148,163,184,0.12)", fg: "hsl(215,16%,70%)", bd: "rgba(148,163,184,0.25)" },
  custom:       { label: "manual",     bg: "rgba(249,115,22,0.12)",  fg: "hsl(20,90%,60%)",  bd: "rgba(249,115,22,0.3)"   },
  strategic:    { label: "estratégia", bg: "rgba(0,200,150,0.12)",   fg: "hsl(160,100%,42%)",bd: "rgba(0,200,150,0.3)"    },
  reactivation: { label: "reativação", bg: "rgba(168,85,247,0.12)",  fg: "hsl(280,60%,65%)", bd: "rgba(168,85,247,0.3)"   },
  followup:     { label: "follow-up",  bg: "rgba(59,130,246,0.12)",  fg: "hsl(210,80%,60%)", bd: "rgba(59,130,246,0.3)"   },
  meeting:      { label: "reunião",    bg: "rgba(236,72,153,0.12)",  fg: "hsl(330,75%,62%)", bd: "rgba(236,72,153,0.3)"   },
};

export function DailyTasksPanel({ mode, title = "Checklist", subtitle, assigneeLabel }: Props) {
  const { hasRole } = useAuth();
  const isFundador = hasRole("fundador");
  const [addOpen, setAddOpen] = useState(false);
  const canAdd = isFundador && !!assigneeLabel;
  const [tab, setTab] = useState<"hoje" | "semana">("hoje");

  // Detect weekend in São Paulo (UTC-3)
  const spNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const isWeekend = spNow.getDay() === 0 || spNow.getDay() === 6;
  const skipForWeekend = tab === "hoje" && isWeekend;

  const enabled = mode.kind !== "disabled" && !skipForWeekend;
  const { data: activities = [], isLoading } = useDailyActivities({
    enabled,
    pipedriveUserId: mode.kind === "pipedrive" ? mode.pipedriveUserId : undefined,
    milenaMode: mode.kind === "milena",
    days: tab === "semana" ? 7 : 1,
  });
  const toggle = useToggleActivity();

  // Flow tasks for this assignee
  const { grouped: flowGrouped } = useFlowActivities({ owner_label: assigneeLabel || null });
  const flowItems: FlowActivity[] =
    tab === "hoje"
      ? [...flowGrouped.atrasadas, ...flowGrouped.hoje]
      : [...flowGrouped.atrasadas, ...flowGrouped.hoje, ...flowGrouped.amanha, ...flowGrouped.proximos.filter((i) => i.days_until <= 7)];
  const toggleFlow = useToggleFlowTask();


  const today = new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex rounded-xl p-0.5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)" }}
          >
            {(["hoje", "semana"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  tab === k ? "text-foreground bg-white/[0.08]" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {k === "hoje" ? "Hoje" : "Semana"}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground hidden sm:block">
            {tab === "hoje"
              ? format(today, "EEEE, dd 'de' MMM", { locale: ptBR })
              : "Próximos 7 dias"}
          </span>
          {canAdd && (
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 transition-all"
              title={`Adicionar tarefa para ${assigneeLabel}`}
            >
              <Plus className="w-3 h-3" /> Nova
            </button>
          )}
        </div>
      </div>

      {flowItems.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Workflow className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] uppercase tracking-wider font-semibold text-primary">Tarefas do Fluxo</span>
            <span className="text-[10px] text-muted-foreground">{flowItems.length}</span>
          </div>
          <ul className="space-y-1.5">
            {flowItems.map((it) => (
              <FlowTaskItem key={it.key} item={it} onToggle={() => toggleFlow.mutate(it)} />
            ))}
          </ul>
          <div className="mt-3 border-t border-white/5" />
        </div>
      )}


      {mode.kind === "disabled" ? (
        <EmptyState message={mode.emptyMessage} />
      ) : skipForWeekend ? (
        <EmptyState
          message="Fim de semana — sem tarefas de cadência."
          hint="A cadência roda de segunda a sexta. Veja a 'Semana' para se preparar."
        />
      ) : isLoading ? (
        <p className="text-xs text-muted-foreground py-6 text-center">Carregando…</p>
      ) : activities.length === 0 ? (
        <EmptyState
          message={
            tab === "hoje"
              ? "Sem tarefas para hoje."
              : "Nenhuma tarefa nos próximos 7 dias."
          }
          hint={tab === "hoje" ? "Boa janela pra trabalhar o pipeline." : undefined}
        />
      ) : (
        <ul className="space-y-2 max-h-[520px] overflow-y-auto scrollbar-thin pr-1">
          {activities.map((a) => {
            const t = TYPE_STYLES[a.task_type] ?? TYPE_STYLES.cadence;
            return (
              <li
                key={a.id}
                className={`flex items-start gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.03] ${
                  a.completed ? "opacity-50" : ""
                }`}
                style={{ border: "1px solid var(--glass-border)" }}
              >
                <Checkbox
                  checked={a.completed}
                  onCheckedChange={(checked) =>
                    toggle.mutate({ id: a.id, completed: checked === true })
                  }
                  className="mt-0.5 h-5 w-5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ background: t.bg, color: t.fg, border: `1px solid ${t.bd}` }}
                    >
                      {t.label}
                    </span>
                    {tab === "semana" && (
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {format(new Date(a.scheduled_date + "T00:00:00"), "dd/MM")}
                      </span>
                    )}
                    {a.priority >= 8 && (
                      <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                        prioridade
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm text-foreground mt-1 ${
                      a.completed ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {a.task_description}
                  </p>
                  {a.related_deal_id && (
                    <a
                      href={`https://palacios3dstudio.pipedrive.com/deal/${a.related_deal_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      Pipedrive <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canAdd && assigneeLabel && (
        <AddDailyActivityModal
          open={addOpen}
          onOpenChange={setAddOpen}
          assigneeLabel={assigneeLabel}
          pipedriveUserId={mode.kind === "pipedrive" ? mode.pipedriveUserId : null}
        />
      )}
    </motion.div>
  );
}

function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="py-10 text-center">
      <CheckCircle2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-sm text-foreground font-medium">{message}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
    </div>
  );
}

const FLOW_KIND_META: Record<string, { icon: any; color: string; label: string }> = {
  task: { icon: CheckSquare, color: "#0ea5e9", label: "Tarefa" },
  email: { icon: Mail, color: "#3b82f6", label: "Email" },
  whatsapp: { icon: MessageCircle, color: "#10b981", label: "WhatsApp" },
  custom: { icon: Sparkles, color: "#a855f7", label: "Personalizada" },
  milestone: { icon: Flag, color: "#22c55e", label: "Marco" },
  webhook: { icon: Webhook, color: "#64748b", label: "Webhook" },
};

function FlowTaskItem({ item, onToggle }: { item: FlowActivity; onToggle: () => void }) {
  const meta = FLOW_KIND_META[item.node_kind] || FLOW_KIND_META.task;
  const Icon = meta.icon;
  const [y, m, d] = item.due_date.split("-");
  return (
    <li
      className={`flex items-start gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.03] ${item.concluido ? "opacity-50" : ""}`}
      style={{ border: "1px solid var(--glass-border)" }}
    >
      <Checkbox checked={item.concluido} onCheckedChange={onToggle} className="mt-0.5 h-5 w-5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}44` }}
          >
            <Icon className="w-3 h-3" /> {meta.label}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {d}/{m}/{y.slice(2)}
          </span>
          {item.days_until < 0 && (
            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
              <AlertTriangle className="w-3 h-3" /> {Math.abs(item.days_until)}d atraso
            </span>
          )}
        </div>
        <p className={`text-sm text-foreground mt-1 ${item.concluido ? "line-through text-muted-foreground" : ""}`}>
          {item.node_label}
        </p>
        <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
          <Building2 className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{item.deal_titulo}</span>
          <span className="text-muted-foreground/60">·</span>
          <span className="truncate">{item.pipeline_nome}</span>
        </div>
      </div>
    </li>
  );
}

