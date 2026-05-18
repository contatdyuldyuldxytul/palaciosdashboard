import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ExternalLink, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useDailyActivities,
  useToggleActivity,
  type DailyActivity,
} from "@/hooks/useDailyActivities";
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
        </div>
      </div>

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
}
