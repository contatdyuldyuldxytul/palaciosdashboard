import { useEffect, useMemo, useState } from "react";
import { Calendar, Plus, X, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  backdropFilter: "blur(20px)",
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "white",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13,
  width: "100%",
};

const ALINE_ID = 24578358;
const FELIPE_ID = 26351800;

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

type Periodo = "manha" | "tarde";
type CadenciaSemana = Record<string, { manha: string[]; tarde: string[] }>;

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

const EMPTY_CADENCIA: CadenciaSemana = DIAS.reduce((acc, _, i) => {
  acc[`d${i}`] = { manha: [], tarde: [] };
  return acc;
}, {} as CadenciaSemana);

export default function PlanoSemanalClaude() {
  const [plan, setPlan] = useState<any | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from("weekly_plans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);
    console.log("[PlanoSemanalClaude] weekly_plans result:", { data, error });
    if (error) {
      console.error("[PlanoSemanalClaude] erro ao buscar weekly_plans:", error);
      return setPlan(null);
    }
    const plano = data?.[0] ?? null;
    if (!plano) return setPlan(null);

    // Default cadência: load from cadence_templates if empty
    let cadencia: CadenciaSemana = data.cadencia_semana;
    if (!cadencia || Object.keys(cadencia).length === 0) {
      const { data: templates } = await (supabase as any)
        .from("cadence_templates")
        .select("*")
        .eq("playbook_type", "cadence_2_0")
        .gte("day_in_flow", 1)
        .lte("day_in_flow", 5);
      cadencia = JSON.parse(JSON.stringify(EMPTY_CADENCIA));
      (templates || []).forEach((t: any) => {
        const key = `d${t.day_in_flow - 1}`;
        const per = String(t.period).toLowerCase().includes("tarde") ? "tarde" : "manha";
        if (cadencia[key]) cadencia[key][per as Periodo].push(t.task_template);
      });
    }

    setPlan({
      ...data,
      cadencia_semana: cadencia,
      meta_milena_dia: data.meta_milena_dia ?? 15,
      estrategias_fora_da_caixa: data.estrategias_fora_da_caixa ?? [],
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

  const updateCadencia = (dayKey: string, per: Periodo, idx: number, value: string) => {
    const cad = { ...(plan.cadencia_semana || EMPTY_CADENCIA) };
    const arr = [...(cad[dayKey]?.[per] || [])];
    arr[idx] = value;
    cad[dayKey] = { ...cad[dayKey], [per]: arr };
    updateField("cadencia_semana", cad);
  };
  const addCadencia = (dayKey: string, per: Periodo) => {
    const cad = { ...(plan.cadencia_semana || EMPTY_CADENCIA) };
    cad[dayKey] = {
      manha: cad[dayKey]?.manha || [],
      tarde: cad[dayKey]?.tarde || [],
    };
    cad[dayKey][per] = [...cad[dayKey][per], ""];
    updateField("cadencia_semana", cad);
  };
  const removeCadencia = (dayKey: string, per: Periodo, idx: number) => {
    const cad = { ...(plan.cadencia_semana || EMPTY_CADENCIA) };
    const arr = [...(cad[dayKey]?.[per] || [])];
    arr.splice(idx, 1);
    cad[dayKey] = { ...cad[dayKey], [per]: arr };
    updateField("cadencia_semana", cad);
  };

  const totalSemanaMilena = useMemo(
    () => (Number(plan?.meta_milena_dia) || 0) * 5,
    [plan?.meta_milena_dia],
  );

  const approveAndDistribute = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const { error: upErr } = await (supabase as any)
        .from("weekly_plans")
        .update({
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

      const rows: any[] = [];
      const metaMilena = Number(plan.meta_milena_dia) || 0;

      for (let i = 0; i < 5; i++) {
        const dayISO = addDaysISO(plan.week_start, i);
        const cad = plan.cadencia_semana?.[`d${i}`] || { manha: [], tarde: [] };
        const tasks = [...(cad.manha || []), ...(cad.tarde || [])].filter((t: string) =>
          t?.trim(),
        );

        tasks.forEach((task: string) => {
          rows.push({
            user_pipedrive_id: ALINE_ID,
            assignee_label: "Aline",
            scheduled_date: dayISO,
            task_type: "cadence",
            task_description: task,
            source: "claude_briefing",
            priority: 5,
          });
          rows.push({
            user_pipedrive_id: FELIPE_ID,
            assignee_label: "Felipe",
            scheduled_date: dayISO,
            task_type: "cadence",
            task_description: task,
            source: "claude_briefing",
            priority: 5,
          });
        });

        if (metaMilena > 0) {
          rows.push({
            user_pipedrive_id: null,
            assignee_label: "Milena",
            scheduled_date: dayISO,
            task_type: "custom",
            task_description: `Gerar ${metaMilena} leads qualificados`,
            source: "claude_briefing",
            priority: 6,
          });
        }
      }

      // Extras só no primeiro dia (week_start)
      const extrasDate = plan.week_start;
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

      setPlan({ ...plan, status: "aprovado" });
      toast.success("Plano aprovado e atividades distribuídas");
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
      </div>
    );
  }

  const aprovado = plan.status === "aprovado";

  return (
    <div style={card} className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            Plano Semanal Claude
          </div>
          <h3 className="text-lg font-semibold text-white mt-1">
            Semana de {fmtDate(plan.week_start)} a {fmtDate(plan.week_end)}
          </h3>
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

      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Estratégia da semana
        </p>
        <textarea
          value={plan.estrategia_semana || ""}
          onChange={(e) => updateField("estrategia_semana", e.target.value)}
          rows={4}
          style={inputStyle}
        />
      </div>

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

      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
          Cadência da semana (Aline + Felipe)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {DIAS.map((label, i) => {
            const key = `d${i}`;
            const dia = plan.cadencia_semana?.[key] || { manha: [], tarde: [] };
            return (
              <div
                key={key}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                }}
                className="p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-white">{label}</p>
                  <span className="text-[10px] text-muted-foreground">
                    {fmtDate(addDaysISO(plan.week_start, i))}
                  </span>
                </div>
                <PeriodoBlock
                  label="Manhã"
                  items={dia.manha || []}
                  onChange={(idx, v) => updateCadencia(key, "manha", idx, v)}
                  onAdd={() => addCadencia(key, "manha")}
                  onRemove={(idx) => removeCadencia(key, "manha", idx)}
                />
                <PeriodoBlock
                  label="Tarde"
                  items={dia.tarde || []}
                  onChange={(idx, v) => updateCadencia(key, "tarde", idx, v)}
                  onAdd={() => addCadencia(key, "tarde")}
                  onRemove={(idx) => removeCadencia(key, "tarde", idx)}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px] max-w-[280px]">
          <label className="text-xs uppercase tracking-wide text-muted-foreground">
            Meta Milena (leads/dia)
          </label>
          <input
            type="number"
            value={plan.meta_milena_dia ?? 15}
            onChange={(e) => updateField("meta_milena_dia", Number(e.target.value) || 0)}
            style={inputStyle}
            className="mt-1.5"
          />
        </div>
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
          disabled={saving || aprovado}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, hsl(160,100%,38%), hsl(160,100%,45%))",
            color: "white",
            boxShadow: "0 4px 20px rgba(0,200,150,0.25)",
          }}
        >
          <CheckCircle2 className="w-4 h-4" />
          {aprovado ? "Plano aprovado" : saving ? "Aprovando…" : "Aprovar e Distribuir"}
        </button>
      </div>
    </div>
  );
}

function PeriodoBlock({
  label,
  items,
  onChange,
  onAdd,
  onRemove,
}: {
  label: string;
  items: string[];
  onChange: (i: number, v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <button
          onClick={onAdd}
          className="text-[10px] px-1.5 py-0.5 rounded text-white/80 hover:text-white"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">—</p>
      ) : (
        <div className="space-y-1">
          {items.map((it, i) => (
            <div key={i} className="flex items-start gap-1">
              <textarea
                value={it || ""}
                onChange={(e) => onChange(i, e.target.value)}
                rows={2}
                style={{ ...inputStyle, fontSize: 11, padding: "5px 7px" }}
              />
              <button
                onClick={() => onRemove(i)}
                className="text-white/50 hover:text-destructive p-1"
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
          className="text-[11px] px-2 py-0.5 rounded-md text-white/80 hover:text-white flex items-center gap-1"
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
                className="text-xs px-2 py-1 rounded-md text-white/60 hover:text-destructive"
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
