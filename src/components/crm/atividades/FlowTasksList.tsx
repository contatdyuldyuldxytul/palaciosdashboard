import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail, MessageCircle, CheckSquare, Sparkles, Flag, Webhook, AlertTriangle,
  Calendar, Workflow, Building2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useFlowActivities, useToggleFlowTask, type FlowActivity } from "@/hooks/useFlowActivities";

const KIND_META: Record<string, { icon: any; color: string; label: string }> = {
  task: { icon: CheckSquare, color: "#0ea5e9", label: "Tarefa" },
  email: { icon: Mail, color: "#3b82f6", label: "Email" },
  whatsapp: { icon: MessageCircle, color: "#10b981", label: "WhatsApp" },
  custom: { icon: Sparkles, color: "#a855f7", label: "Personalizada" },
  milestone: { icon: Flag, color: "#22c55e", label: "Marco" },
  webhook: { icon: Webhook, color: "#64748b", label: "Webhook" },
};

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

function TaskRow({ item }: { item: FlowActivity }) {
  const meta = KIND_META[item.node_kind] || KIND_META.task;
  const Icon = meta.icon;
  const toggle = useToggleFlowTask();
  const navigate = useNavigate();

  return (
    <div
      className="group flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
    >
      <Checkbox
        checked={item.concluido}
        onCheckedChange={() => toggle.mutate(item)}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: `${meta.color}25` }}
          >
            <Icon className="w-3 h-3" style={{ color: meta.color }} />
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{meta.label}</span>
          <span className="text-[10px] text-muted-foreground">·</span>
          <span className="text-[10px] text-muted-foreground">Dia {item.dia_offset + 1}</span>
        </div>
        <div className="text-sm font-medium text-foreground leading-tight">{item.node_label}</div>
        {item.node_description && (
          <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{item.node_description}</div>
        )}
        <button
          onClick={() => navigate(`/crm/deal/${item.deal_id}`)}
          className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors"
        >
          <Building2 className="w-3 h-3" />
          <span className="truncate max-w-[220px]">{item.deal_titulo}</span>
          <span className="text-muted-foreground/60">·</span>
          <Workflow className="w-3 h-3" />
          <span>{item.pipeline_nome}</span>
        </button>
      </div>
      <div className="flex flex-col items-end gap-1 text-[10px] text-muted-foreground flex-shrink-0">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {fmtDate(item.due_date)}
        </span>
        {item.days_until < 0 && (
          <span className="flex items-center gap-1 text-red-300 font-semibold">
            <AlertTriangle className="w-3 h-3" /> {Math.abs(item.days_until)}d atraso
          </span>
        )}
      </div>
    </div>
  );
}

function Section({ title, items, tone }: { title: string; items: FlowActivity[]; tone: "danger" | "primary" | "info" | "muted" }) {
  if (items.length === 0) return null;
  const toneColor =
    tone === "danger" ? "text-red-300"
    : tone === "primary" ? "text-primary"
    : tone === "info" ? "text-sky-300"
    : "text-muted-foreground";
  return (
    <div className="space-y-2">
      <div className={`text-[11px] uppercase tracking-wider font-semibold ${toneColor} flex items-center gap-2`}>
        {title}
        <span className="text-[10px] text-muted-foreground font-normal">{items.length}</span>
      </div>
      <div className="space-y-1.5">
        {items.map((it) => <TaskRow key={it.key} item={it} />)}
      </div>
    </div>
  );
}

export function FlowTasksList({ ownerLabel }: { ownerLabel?: string | null }) {
  const { grouped, isLoading, data } = useFlowActivities({ owner_label: ownerLabel || null });
  const [view, setView] = useState<"dia" | "semana">("dia");

  const weekGroups = useMemo(() => {
    const all = [
      ...grouped.atrasadas,
      ...grouped.hoje,
      ...grouped.amanha,
      ...grouped.proximos,
    ];
    const map = new Map<number, FlowActivity[]>();
    for (const item of all) {
      const week = Math.floor(item.dia_offset / 7) + 1;
      if (!map.has(week)) map.set(week, []);
      map.get(week)!.push(item);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [grouped]);

  if (isLoading) {
    return <div className="h-32 glass-card rounded-xl animate-pulse" />;
  }

  const total = grouped.atrasadas.length + grouped.hoje.length + grouped.amanha.length + grouped.proximos.length;

  return (
    <div className="glass-card rounded-2xl p-4 space-y-4 border border-white/10">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Workflow className="w-4 h-4 text-primary" />
            Tarefas do Fluxo
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Distribuídas automaticamente pelos fluxos aplicados em cada pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center rounded-full bg-white/5 border border-white/10 p-0.5">
            <button
              onClick={() => setView("dia")}
              className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full transition ${
                view === "dia" ? "bg-primary/30 text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dia
            </button>
            <button
              onClick={() => setView("semana")}
              className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full transition ${
                view === "semana" ? "bg-primary/30 text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semana
            </button>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-white/5 px-2 py-1 rounded-full">
            {total} pendente{total === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {total === 0 ? (
        <div className="text-center py-8 text-xs text-muted-foreground">
          {(data || []).length === 0
            ? "Nenhum fluxo com tarefas vinculadas a este colaborador ainda."
            : "Tudo em dia 🎉"}
        </div>
      ) : view === "dia" ? (
        <>
          <Section title="Atrasadas" items={grouped.atrasadas} tone="danger" />
          <Section title="Hoje" items={grouped.hoje} tone="primary" />
          <Section title="Amanhã" items={grouped.amanha} tone="info" />
          <Section title="Próximos dias" items={grouped.proximos} tone="muted" />
        </>
      ) : (
        <>
          {weekGroups.map(([week, items]) => (
            <Section
              key={week}
              title={`Semana ${week} (D${(week - 1) * 7 + 1}–D${week * 7})`}
              items={items}
              tone={week === 1 ? "primary" : "muted"}
            />
          ))}
        </>
      )}
    </div>
  );
}
