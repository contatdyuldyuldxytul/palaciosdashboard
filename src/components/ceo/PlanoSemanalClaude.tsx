import { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { Plus, X, CheckCircle2, Sparkles, Calendar as CalendarIcon, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  backdropFilter: "blur(20px)",
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "white",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
  width: "100%",
  outline: "none",
};

const ALINE_ID = 24578358;
const FELIPE_ID = 26351800;

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

type Periodo = "manha" | "tarde";
type Pessoa = "aline" | "felipe";
type DiaCadencia = Record<Pessoa, Record<Periodo, string[]>>;
type CadenciaSemana = Record<string, DiaCadencia>;

const PESSOAS: { key: Pessoa; label: string; color: string }[] = [
  { key: "aline", label: "Aline", color: "hsl(200,90%,60%)" },
  { key: "felipe", label: "Felipe", color: "hsl(280,80%,65%)" },
];

const emptyDia = (): DiaCadencia => ({
  aline: { manha: [], tarde: [] },
  felipe: { manha: [], tarde: [] },
});

const EMPTY_CADENCIA: CadenciaSemana = DIAS.reduce((acc, _, i) => {
  acc[`d${i}`] = emptyDia();
  return acc;
}, {} as CadenciaSemana);

function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function getMondayISO(): string {
  const now = new Date();
  const sp = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const dow = sp.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(sp);
  mon.setUTCDate(sp.getUTCDate() + diff);
  return mon.toISOString().slice(0, 10);
}

/** Normaliza cadência antiga (sem aline/felipe) para a nova estrutura */
function normalizeCadencia(raw: any): CadenciaSemana {
  const out = JSON.parse(JSON.stringify(EMPTY_CADENCIA)) as CadenciaSemana;
  if (!raw || typeof raw !== "object") return out;
  for (let i = 0; i < 5; i++) {
    const key = `d${i}`;
    const day = raw[key];
    if (!day) continue;
    if (day.aline || day.felipe) {
      out[key] = {
        aline: {
          manha: Array.isArray(day.aline?.manha) ? day.aline.manha : [],
          tarde: Array.isArray(day.aline?.tarde) ? day.aline.tarde : [],
        },
        felipe: {
          manha: Array.isArray(day.felipe?.manha) ? day.felipe.manha : [],
          tarde: Array.isArray(day.felipe?.tarde) ? day.felipe.tarde : [],
        },
      };
    } else {
      // formato antigo: { manha:[], tarde:[] } compartilhado — duplica p/ ambos
      const m = Array.isArray(day.manha) ? day.manha : [];
      const t = Array.isArray(day.tarde) ? day.tarde : [];
      out[key] = {
        aline: { manha: [...m], tarde: [...t] },
        felipe: { manha: [...m], tarde: [...t] },
      };
    }
  }
  return out;
}

export default function PlanoSemanalClaude() {
  const [plan, setPlan] = useState<any | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const criarPlanoManual = async () => {
    setCreating(true);
    try {
      const week_start = getMondayISO();
      const week_end = addDaysISO(week_start, 4);
      const { error } = await (supabase as any).from("weekly_plans").insert({
        week_start,
        week_end,
        status: "draft",
        estrategia_semana: "",
        prioridades: [],
        extras_aline: [],
        extras_felipe: [],
        extras_milena: [],
        estrategias_fora_da_caixa: [],
        meta_milena_dia: 15,
        cadencia_semana: {},
      });
      if (error) throw error;
      toast.success("Plano da semana criado");
      setPlan(undefined);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar plano");
    } finally {
      setCreating(false);
    }
  };

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from("weekly_plans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) {
      console.error("[PlanoSemanalClaude] erro:", error);
      return setPlan(null);
    }
    const plano = data?.[0] ?? null;
    if (!plano) return setPlan(null);

    let cadencia = normalizeCadencia(plano.cadencia_semana);
    const isEmpty = DIAS.every((_, i) => {
      const d = cadencia[`d${i}`];
      return (
        d.aline.manha.length === 0 &&
        d.aline.tarde.length === 0 &&
        d.felipe.manha.length === 0 &&
        d.felipe.tarde.length === 0
      );
    });

    if (isEmpty) {
      const { data: templates } = await (supabase as any)
        .from("cadence_templates")
        .select("*")
        .eq("playbook_type", "cadence_2_0")
        .gte("day_in_flow", 1)
        .lte("day_in_flow", 5);
      (templates || []).forEach((t: any) => {
        const key = `d${t.day_in_flow - 1}`;
        const per = String(t.period).toLowerCase().includes("tarde") ? "tarde" : "manha";
        if (!cadencia[key]) cadencia[key] = emptyDia();
        cadencia[key].aline[per as Periodo].push(t.task_template);
        cadencia[key].felipe[per as Periodo].push(t.task_template);
      });
    }

    setPlan({
      ...plano,
      cadencia_semana: cadencia,
      meta_milena_dia: plano.meta_milena_dia ?? 15,
      estrategias_fora_da_caixa: plano.estrategias_fora_da_caixa ?? [],
    });
  };

  useEffect(() => {
    load();
  }, []);

  const updateField = (key: string, value: any) =>
    setPlan((p: any) => ({ ...p, [key]: value }));

  const updateList = (key: string, idx: number, value: string) => {
    const arr = [...(plan?.[key] || [])];
    arr[idx] = value;
    updateField(key, arr);
  };
  const addItem = (key: string) => updateField(key, [...(plan?.[key] || []), ""]);
  const removeItem = (key: string, idx: number) => {
    const arr = [...(plan?.[key] || [])];
    arr.splice(idx, 1);
    updateField(key, arr);
  };

  const updateCadencia = (
    dayKey: string,
    pessoa: Pessoa,
    per: Periodo,
    idx: number,
    value: string,
  ) => {
    const cad: CadenciaSemana = JSON.parse(
      JSON.stringify(plan.cadencia_semana || EMPTY_CADENCIA),
    );
    if (!cad[dayKey]) cad[dayKey] = emptyDia();
    const arr = [...(cad[dayKey][pessoa][per] || [])];
    arr[idx] = value;
    cad[dayKey][pessoa][per] = arr;
    updateField("cadencia_semana", cad);
  };
  const addCadencia = (dayKey: string, pessoa: Pessoa, per: Periodo) => {
    const cad: CadenciaSemana = JSON.parse(
      JSON.stringify(plan.cadencia_semana || EMPTY_CADENCIA),
    );
    if (!cad[dayKey]) cad[dayKey] = emptyDia();
    cad[dayKey][pessoa][per] = [...cad[dayKey][pessoa][per], ""];
    updateField("cadencia_semana", cad);
  };
  const removeCadencia = (
    dayKey: string,
    pessoa: Pessoa,
    per: Periodo,
    idx: number,
  ) => {
    const cad: CadenciaSemana = JSON.parse(
      JSON.stringify(plan.cadencia_semana || EMPTY_CADENCIA),
    );
    const arr = [...(cad[dayKey][pessoa][per] || [])];
    arr.splice(idx, 1);
    cad[dayKey][pessoa][per] = arr;
    updateField("cadencia_semana", cad);
  };

  const handleWeekStartChange = (iso: string) => {
    if (!iso) return;
    updateField("week_start", iso);
    updateField("week_end", addDaysISO(iso, 4));
  };

  const totalSemanaMilena = useMemo(
    () => (Number(plan?.meta_milena_dia) || 0) * 5,
    [plan?.meta_milena_dia],
  );

  const criarProximaSemana = async () => {
    setCreating(true);
    try {
      const week_start = getMondayISO();
      const week_end = addDaysISO(week_start, 4);
      const cadenciaSrc = plan?.cadencia_semana || EMPTY_CADENCIA;
      const { error } = await (supabase as any).from("weekly_plans").insert({
        week_start,
        week_end,
        status: "draft",
        estrategia_semana: "",
        prioridades: [],
        extras_aline: [],
        extras_felipe: [],
        extras_milena: [],
        estrategias_fora_da_caixa: [],
        meta_milena_dia: Number(plan?.meta_milena_dia) || 15,
        cadencia_semana: cadenciaSrc,
      });
      if (error) throw error;
      toast.success("Plano criado para a semana atual");
      setPlan(undefined);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar plano");
    } finally {
      setCreating(false);
    }
  };

  const approveAndDistribute = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      // Auto-realinhar para a semana atual se o plano for de uma semana passada
      const todayMonday = getMondayISO();
      const originalStart = plan.week_start;
      const originalEnd = plan.week_end;
      let weekStart = plan.week_start;
      let weekEnd = plan.week_end;
      let realigned = false;
      if (weekStart < todayMonday) {
        weekStart = todayMonday;
        weekEnd = addDaysISO(todayMonday, 4);
        realigned = true;
      }

      const { error: upErr } = await (supabase as any)
        .from("weekly_plans")
        .update({
          week_start: weekStart,
          week_end: weekEnd,
          estrategia_semana: plan.estrategia_semana || "",
          prioridades: plan.prioridades || [],
          estrategias_fora_da_caixa: plan.estrategias_fora_da_caixa || [],
          extras_aline: plan.extras_aline || [],
          extras_felipe: plan.extras_felipe || [],
          extras_milena: plan.extras_milena || [],
          cadencia_semana: plan.cadencia_semana || {},
          meta_milena_dia: Number(plan.meta_milena_dia) || 0,
          status: "aprovado",
          approved_at: new Date().toISOString(),
        })
        .eq("id", plan.id);
      if (upErr) throw upErr;

      // Idempotência: apaga atividades 'claude_briefing' já distribuídas para a janela
      // do plano (antiga + nova) antes de re-inserir, evitando duplicação ao re-aprovar
      // ou linhas órfãs em semanas passadas após realinhamento.
      const delStart = originalStart < weekStart ? originalStart : weekStart;
      const delEnd =
        addDaysISO(originalEnd, 0) > addDaysISO(weekEnd, 0) ? originalEnd : weekEnd;
      await (supabase as any)
        .from("daily_activities")
        .delete()
        .eq("source", "claude_briefing")
        .gte("scheduled_date", delStart)
        .lte("scheduled_date", delEnd)
        .in("assignee_label", ["Aline", "Felipe", "Milena"]);

      const rows: any[] = [];
      const metaMilena = Number(plan.meta_milena_dia) || 0;

      for (let i = 0; i < 5; i++) {
        const dayISO = addDaysISO(weekStart, i);
        const dia = plan.cadencia_semana?.[`d${i}`] || emptyDia();

        const pushFor = (pessoaId: number, pessoaLabel: string, tasks: string[], per: Periodo) => {
          tasks
            .filter((t) => t?.trim())
            .forEach((task) =>
              rows.push({
                user_pipedrive_id: pessoaId,
                assignee_label: pessoaLabel,
                scheduled_date: dayISO,
                task_type: "cadence",
                task_description: task,
                source: "claude_briefing",
                // Manhã (6) ordena antes de Tarde (5) no DailyTasksPanel
                priority: per === "manha" ? 6 : 5,
                notes: per,
              }),
            );
        };

        pushFor(ALINE_ID, "Aline", dia.aline.manha, "manha");
        pushFor(ALINE_ID, "Aline", dia.aline.tarde, "tarde");
        pushFor(FELIPE_ID, "Felipe", dia.felipe.manha, "manha");
        pushFor(FELIPE_ID, "Felipe", dia.felipe.tarde, "tarde");

        if (metaMilena > 0) {
          rows.push({
            user_pipedrive_id: null,
            assignee_label: "Milena",
            scheduled_date: dayISO,
            task_type: "custom",
            task_description: `Gerar ${metaMilena} leads qualificados`,
            source: "claude_briefing",
            priority: 7,
          });
        }
      }

      const extrasDate = weekStart;
      (plan.extras_aline || []).filter((s: string) => s?.trim()).forEach((s: string) =>
        rows.push({
          user_pipedrive_id: ALINE_ID,
          assignee_label: "Aline",
          scheduled_date: extrasDate,
          task_type: "strategic",
          task_description: s,
          source: "claude_briefing",
          priority: 7,
        }),
      );
      (plan.extras_felipe || []).filter((s: string) => s?.trim()).forEach((s: string) =>
        rows.push({
          user_pipedrive_id: FELIPE_ID,
          assignee_label: "Felipe",
          scheduled_date: extrasDate,
          task_type: "strategic",
          task_description: s,
          source: "claude_briefing",
          priority: 7,
        }),
      );
      (plan.extras_milena || []).filter((s: string) => s?.trim()).forEach((s: string) =>
        rows.push({
          user_pipedrive_id: null,
          assignee_label: "Milena",
          scheduled_date: extrasDate,
          task_type: "strategic",
          task_description: `Milena: ${s}`,
          source: "claude_briefing",
          priority: 7,
        }),
      );

      if (rows.length > 0) {
        const { error: insErr } = await (supabase as any)
          .from("daily_activities")
          .insert(rows);
        if (insErr) throw insErr;
      }

      setPlan({ ...plan, week_start: weekStart, week_end: weekEnd, status: "aprovado" });
      if (realigned) {
        toast.success(`Plano realocado para ${fmtDate(weekStart)}–${fmtDate(weekEnd)} e atividades distribuídas`);
      } else {
        toast.success("Plano aprovado e atividades distribuídas");
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao aprovar plano");
    } finally {
      setSaving(false);
    }
  };

  if (plan === undefined) {
    return (
      <div style={card} className="p-6 text-sm text-muted-foreground">
        Carregando plano semanal…
      </div>
    );
  }

  if (plan === null) {
    return (
      <div style={card} className="p-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Plano Semanal Claude
        </div>
        <p className="text-sm text-muted-foreground">
          Nenhum plano disponível. O briefing de sexta-feira gerará automaticamente.
        </p>
        <button
          onClick={criarPlanoManual}
          disabled={creating}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, hsl(160,100%,38%), hsl(160,100%,45%))",
            color: "white",
            boxShadow: "0 4px 20px rgba(0,200,150,0.25)",
          }}
        >
          <Plus className="w-4 h-4" />
          {creating ? "Criando…" : "Criar plano da semana atual"}
        </button>
      </div>
    );
  }

  const aprovado = plan.status === "aprovado";

  return (
    <div style={card} className="p-6 space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              Plano Semanal Claude
            </div>
            <h3 className="text-lg font-semibold text-white mt-1">
              Semana de {fmtDate(plan.week_start)} a {fmtDate(plan.week_end)}
            </h3>
          </div>
          <label
            className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg px-3 py-2"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wide">Início:</span>
            <input
              type="date"
              value={plan.week_start || ""}
              onChange={(e) => handleWeekStartChange(e.target.value)}
              className="bg-transparent text-white outline-none text-sm"
            />
          </label>
        </div>
        <span
          className="text-[11px] px-2.5 py-1 rounded-full font-medium"
          style={
            aprovado
              ? {
                  background: "rgba(0,200,150,0.15)",
                  color: "hsl(160,100%,55%)",
                  border: "1px solid rgba(0,200,150,0.3)",
                }
              : {
                  background: "rgba(234,179,8,0.15)",
                  color: "hsl(45,100%,60%)",
                  border: "1px solid rgba(234,179,8,0.3)",
                }
          }
        >
          {aprovado ? "Aprovado" : "Aguardando aprovação"}
        </span>
      </div>

      {/* Estratégia */}
      <Field label="Estratégia da semana">
        <textarea
          value={plan.estrategia_semana || ""}
          onChange={(e) => updateField("estrategia_semana", e.target.value)}
          rows={4}
          style={inputStyle}
          placeholder="Descreva o foco estratégico desta semana…"
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <EditableList
          title="Prioridades"
          items={plan.prioridades || []}
          onChange={(i, v) => updateList("prioridades", i, v)}
          onAdd={() => addItem("prioridades")}
          onRemove={(i) => removeItem("prioridades", i)}
        />
        <EditableList
          title="Estratégias fora da caixa"
          items={plan.estrategias_fora_da_caixa || []}
          onChange={(i, v) => updateList("estrategias_fora_da_caixa", i, v)}
          onAdd={() => addItem("estrategias_fora_da_caixa")}
          onRemove={(i) => removeItem("estrategias_fora_da_caixa", i)}
        />
      </div>

      {/* Cadência separada por pessoa — tabs por dia */}
      <CadenciaSection
        plan={plan}
        onUpdate={updateCadencia}
        onAdd={addCadencia}
        onRemove={removeCadencia}
      />

      {/* Meta Milena */}
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Meta Milena (leads/dia)" className="flex-1 min-w-[200px] max-w-[280px]">
          <input
            type="number"
            value={plan.meta_milena_dia ?? 15}
            onChange={(e) => updateField("meta_milena_dia", Number(e.target.value) || 0)}
            style={inputStyle}
          />
        </Field>
        <div
          className="px-4 py-2.5 rounded-lg text-sm"
          style={{
            background: "rgba(0,200,150,0.10)",
            border: "1px solid rgba(0,200,150,0.25)",
            color: "hsl(160,100%,60%)",
          }}
        >
          Total semana: {Number(plan.meta_milena_dia) || 0}×5 = {totalSemanaMilena}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ExtrasCard
          title="Extras Aline"
          items={plan.extras_aline || []}
          onChange={(i, v) => updateList("extras_aline", i, v)}
          onAdd={() => addItem("extras_aline")}
          onRemove={(i) => removeItem("extras_aline", i)}
        />
        <ExtrasCard
          title="Extras Felipe"
          items={plan.extras_felipe || []}
          onChange={(i, v) => updateList("extras_felipe", i, v)}
          onAdd={() => addItem("extras_felipe")}
          onRemove={(i) => removeItem("extras_felipe", i)}
        />
        <ExtrasCard
          title="Extras Milena"
          items={plan.extras_milena || []}
          onChange={(i, v) => updateList("extras_milena", i, v)}
          onAdd={() => addItem("extras_milena")}
          onRemove={(i) => removeItem("extras_milena", i)}
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={approveAndDistribute}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, hsl(160,100%,38%), hsl(160,100%,45%))",
            color: "white",
            boxShadow: "0 4px 20px rgba(0,200,150,0.25)",
          }}
        >
          <CheckCircle2 className="w-4 h-4" />
          {saving ? "Salvando…" : aprovado ? "Reaprovar e Redistribuir" : "Aprovar e Distribuir"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}

/** Textarea que cresce conforme o conteúdo, sem scroll interno */
function AutoTextarea({
  value,
  onChange,
  placeholder,
  minRows = 1,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={minRows}
      className="w-full resize-none outline-none leading-relaxed"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "white",
        borderRadius: 8,
        padding: "8px 10px",
        fontSize: 13,
        overflow: "hidden",
      }}
    />
  );
}

function CadenciaSection({
  plan,
  onUpdate,
  onAdd,
  onRemove,
}: {
  plan: any;
  onUpdate: (dayKey: string, pessoa: Pessoa, per: Periodo, idx: number, v: string) => void;
  onAdd: (dayKey: string, pessoa: Pessoa, per: Periodo) => void;
  onRemove: (dayKey: string, pessoa: Pessoa, per: Periodo, idx: number) => void;
}) {
  const [activeDay, setActiveDay] = useState(0);
  const dayKey = `d${activeDay}`;
  const dia = plan.cadencia_semana?.[dayKey] || emptyDia();
  const dataDia = fmtDate(addDaysISO(plan.week_start, activeDay));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Cadência da semana
        </p>
        <span className="text-xs text-muted-foreground">{dataDia}</span>
      </div>

      {/* Tabs dos dias */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {DIAS.map((d, i) => {
          const active = i === activeDay;
          const count =
            (plan.cadencia_semana?.[`d${i}`]?.aline?.manha?.length || 0) +
            (plan.cadencia_semana?.[`d${i}`]?.aline?.tarde?.length || 0) +
            (plan.cadencia_semana?.[`d${i}`]?.felipe?.manha?.length || 0) +
            (plan.cadencia_semana?.[`d${i}`]?.felipe?.tarde?.length || 0);
          return (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
              style={
                active
                  ? {
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "white",
                    }
                  : {
                      background: "transparent",
                      color: "rgba(255,255,255,0.55)",
                    }
              }
            >
              <span>{d}</span>
              {count > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                    color: active ? "white" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Aline x Felipe lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PESSOAS.map((p) => (
          <div
            key={p.key}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${p.color}33`,
              borderRadius: 14,
            }}
            className="p-4 space-y-4"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: p.color, boxShadow: `0 0 12px ${p.color}` }}
              />
              <h4 className="text-sm font-semibold text-white">{p.label}</h4>
            </div>

            <PeriodoBlock
              label="Manhã"
              icon={<Sun className="w-3.5 h-3.5" />}
              accent={p.color}
              items={dia[p.key]?.manha || []}
              onChange={(idx, v) => onUpdate(dayKey, p.key, "manha", idx, v)}
              onAdd={() => onAdd(dayKey, p.key, "manha")}
              onRemove={(idx) => onRemove(dayKey, p.key, "manha", idx)}
            />
            <PeriodoBlock
              label="Tarde"
              icon={<Moon className="w-3.5 h-3.5" />}
              accent={p.color}
              items={dia[p.key]?.tarde || []}
              onChange={(idx, v) => onUpdate(dayKey, p.key, "tarde", idx, v)}
              onAdd={() => onAdd(dayKey, p.key, "tarde")}
              onRemove={(idx) => onRemove(dayKey, p.key, "tarde", idx)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function PeriodoBlock({
  label,
  icon,
  accent,
  items,
  onChange,
  onAdd,
  onRemove,
}: {
  label: string;
  icon?: React.ReactNode;
  accent?: string;
  items: string[];
  onChange: (i: number, v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          {icon}
          {label}
        </p>
        <button
          onClick={onAdd}
          aria-label={`Adicionar tarefa ${label}`}
          className="text-xs px-2 py-1 rounded-md text-white/80 hover:text-white flex items-center gap-1 transition-colors"
          style={{
            background: accent ? `${accent}1a` : "rgba(255,255,255,0.06)",
            border: `1px solid ${accent ? `${accent}40` : "rgba(255,255,255,0.1)"}`,
          }}
        >
          <Plus className="w-3 h-3" /> Adicionar
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-2">Nenhuma tarefa.</p>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1">
                <AutoTextarea value={it} onChange={(v) => onChange(i, v)} />
              </div>
              <button
                onClick={() => onRemove(i)}
                aria-label="Remover tarefa"
                className="text-white/50 hover:text-destructive p-2 rounded-md transition-colors"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditableList({
  title,
  items,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  items: string[];
  onChange: (i: number, v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
        <button
          onClick={onAdd}
          className="text-[11px] px-2 py-1 rounded-md text-white/80 hover:text-white flex items-center gap-1 transition-colors"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Plus className="w-3 h-3" /> Adicionar
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nenhum item.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={it || ""}
                onChange={(e) => onChange(i, e.target.value)}
                style={inputStyle}
              />
              <button
                onClick={() => onRemove(i)}
                aria-label="Remover item"
                className="text-xs px-2 py-2 rounded-md text-white/60 hover:text-destructive transition-colors"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExtrasCard({
  title,
  items,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  items: string[];
  onChange: (i: number, v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
      }}
      className="p-4"
    >
      <EditableList
        title={title}
        items={items}
        onChange={onChange}
        onAdd={onAdd}
        onRemove={onRemove}
      />
    </div>
  );
}
