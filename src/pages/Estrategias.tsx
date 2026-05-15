import { useEffect, useMemo, useState } from "react";
import { Rocket, Target, Users2, BookOpen, TrendingUp, Save, Calendar, Download, ChevronRight, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { useLeads } from "@/hooks/useLeads";
import { useMonthlyStrategy, useCampaigns, useImportStrategy } from "@/hooks/useStrategy";
import { supabase } from "@/integrations/supabase/client";

type TabKey = "estrategia_mes" | "metas_comerciais" | "previsibilidade" | "leads" | "playbook" | "equipe";

interface ContratoLS { vendedor: string; valor: number; comissao: number; data: string; }
interface MetaEquipe { vendedor: string; meta: number; }

const STORAGE_KEY = "palacios_estrategias_v1";
const COMISSOES_KEY = "palacios_comissoes_v1";
const COMISSAO_PCT = 0.04;

interface EstrategiasState {
  metaMensalRS: number;
  metaLeadsMes: number;
  metasEquipe: MetaEquipe[];
}

const defaultState: EstrategiasState = {
  metaMensalRS: 200000,
  metaLeadsMes: 200,
  metasEquipe: [
    { vendedor: "Thiago Palacios", meta: 100000 },
    { vendedor: "Cristine", meta: 100000 },
  ],
};

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (yyyymm: string) => {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^./, (c) => c.toUpperCase());
};

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  backdropFilter: "blur(20px)",
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10,
  padding: "8px 12px",
  color: "white",
  fontSize: 14,
  width: "100%",
};

export default function Estrategias() {
  const [tab, setTab] = useState<TabKey>("estrategia_mes");
  const [state, setState] = useState<EstrategiasState>(defaultState);
  const leadsQ = useLeads();

  const monthIso = currentMonthKey();
  const { data: strategy } = useMonthlyStrategy(`${monthIso}-01`);
  const { data: campaigns = [] } = useCampaigns(strategy?.id ?? null);

  // Load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...defaultState, ...JSON.parse(raw) });
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Contratos do mês
  const contratosMes = useMemo<ContratoLS[]>(() => {
    try {
      const raw = localStorage.getItem(COMISSOES_KEY);
      if (!raw) return [];
      const all: ContratoLS[] = JSON.parse(raw);
      return all.filter((c) => c.data?.startsWith(currentMonthKey()));
    } catch {
      return [];
    }
  }, [state]);

  const realizadoMes = contratosMes.reduce((s, c) => s + Number(c.valor || 0), 0);

  // Override meta de receita pela estratégia mensal quando existir
  const cashTarget = strategy?.cash_target ? Number(strategy.cash_target) : null;
  const metaReceitaEfetiva = cashTarget ?? state.metaMensalRS;
  const pctMeta = metaReceitaEfetiva > 0 ? (realizadoMes / metaReceitaEfetiva) * 100 : 0;

  const proj = useMemo(() => {
    const now = new Date();
    const dia = now.getDate();
    const ultimoDia = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projecao = dia > 0 ? (realizadoMes / dia) * ultimoDia : 0;
    return { projecao, dia, ultimoDia };
  }, [realizadoMes]);

  const leadsMes = useMemo(() => {
    const list = leadsQ.data || [];
    const mk = currentMonthKey();
    return list.filter((l: any) => (l.data_criacao || "").startsWith(mk)).length;
  }, [leadsQ.data]);

  const fechadosMes = contratosMes.length;
  const taxaConv = leadsMes > 0 ? (fechadosMes / leadsMes) * 100 : 0;
  const semanasRestantes = Math.max(1, Math.ceil((proj.ultimoDia - proj.dia + 1) / 7));
  const leadsFaltam = Math.max(0, state.metaLeadsMes - leadsMes);
  const leadsPorSemana = Math.ceil(leadsFaltam / semanasRestantes);

  const realizadoPorVendedor = useMemo(() => {
    const map = new Map<string, number>();
    contratosMes.forEach((c) => map.set(c.vendedor, (map.get(c.vendedor) || 0) + Number(c.valor || 0)));
    return map;
  }, [contratosMes]);

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "estrategia_mes", label: "Estratégia do Mês", icon: Calendar },
    { key: "previsibilidade", label: "Previsibilidade", icon: TrendingUp },
    { key: "leads", label: "Volume de Leads", icon: Users2 },
    { key: "playbook", label: "Playbook", icon: BookOpen },
    { key: "equipe", label: "Metas da Equipe", icon: Target },
  ];

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ background: "transparent" }}>
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(0,200,150,0.12)", border: "1px solid rgba(0,200,150,0.3)" }}
        >
          <Rocket className="w-5 h-5" style={{ color: "hsl(160,100%,45%)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Estratégias Comerciais</h1>
          <p className="text-sm text-muted-foreground">Estratégia mensal, previsibilidade, playbook e metas da equipe</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
              style={{
                background: active ? "rgba(0,200,150,0.14)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${active ? "rgba(0,200,150,0.4)" : "rgba(255,255,255,0.08)"}`,
                color: active ? "hsl(160,100%,55%)" : "rgba(255,255,255,0.7)",
              }}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-5">
        {tab === "estrategia_mes" && <EstrategiaDoMes />}

        {tab === "previsibilidade" && (
          <div style={card} className="p-6 space-y-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[220px]">
                <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  Meta mensal de receita (R$)
                  {cashTarget !== null && <Lock className="w-3 h-3" style={{ color: "hsl(160,100%,55%)" }} />}
                </label>
                <input
                  type="number"
                  value={metaReceitaEfetiva}
                  disabled={cashTarget !== null}
                  onChange={(e) => setState({ ...state, metaMensalRS: Number(e.target.value) || 0 })}
                  style={{ ...inputStyle, opacity: cashTarget !== null ? 0.7 : 1 }}
                  className="mt-1.5"
                />
                {cashTarget !== null && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Definido na estratégia importada de {monthLabel(monthIso)}.
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <Stat label="Realizado" value={fmtBRL(realizadoMes)} accent="hsl(160,100%,45%)" />
                <Stat label="Projeção do mês" value={fmtBRL(proj.projecao)} accent="hsl(45,100%,55%)" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progresso vs meta</span>
                <span className="text-white font-semibold">{pctMeta.toFixed(1)}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(100, pctMeta)}%`,
                    background: "linear-gradient(90deg, hsl(160,100%,45%), hsl(160,100%,55%))",
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Dia {proj.dia} de {proj.ultimoDia} — projeção linear baseada no ritmo atual.
              </p>
            </div>
          </div>
        )}

        {tab === "leads" && (
          <div style={card} className="p-6 space-y-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[220px]">
                <label className="text-xs text-muted-foreground">Meta de leads no mês</label>
                <input
                  type="number"
                  value={state.metaLeadsMes}
                  onChange={(e) => setState({ ...state, metaLeadsMes: Number(e.target.value) || 0 })}
                  style={inputStyle}
                  className="mt-1.5"
                />
              </div>
              <Stat label="Leads no mês" value={String(leadsMes)} accent="hsl(160,100%,45%)" />
              <Stat label="Fechados" value={String(fechadosMes)} accent="hsl(45,100%,55%)" />
              <Stat label="Conversão" value={`${taxaConv.toFixed(1)}%`} accent="hsl(238,80%,70%)" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div style={card} className="p-5">
                <p className="text-xs text-muted-foreground mb-1">Leads ainda necessários</p>
                <p className="text-2xl font-semibold text-white">{leadsFaltam}</p>
              </div>
              <div style={card} className="p-5">
                <p className="text-xs text-muted-foreground mb-1">Leads necessários por semana</p>
                <p className="text-2xl font-semibold" style={{ color: "hsl(160,100%,55%)" }}>
                  {leadsPorSemana}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {semanasRestantes} semana(s) restante(s) no mês
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === "playbook" && <Playbook campaigns={campaigns} />}

        {tab === "equipe" && (
          <MetasEquipe
            state={state}
            setState={setState}
            campaigns={campaigns}
            realizadoPorVendedor={realizadoPorVendedor}
          />
        )}
      </motion.div>
    </div>
  );
}

/* ===== Sub-aba: Estratégia do Mês ===== */

const ImportSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "month deve ser YYYY-MM"),
  monthly_strategy: z.object({
    cash_target: z.number({ invalid_type_error: "cash_target deve ser número" }),
    operational_minimum: z.number().optional(),
    key_priorities: z.array(z.string()).optional(),
    strategic_focus: z.string().optional(),
    allocation: z.record(z.any()).optional(),
    session_notes: z.string().optional(),
  }),
  campaigns: z.array(z.object({
    name: z.string().min(1, "campaign.name obrigatório"),
    description: z.string().optional(),
    owner_user_id: z.union([z.number(), z.string()]).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    playbook_type: z.enum(["cadence_2_0", "reactivation", "custom"]).optional(),
    target_description: z.string().optional(),
    kpis: z.record(z.any()).optional(),
    current_day_in_flow: z.number().optional(),
    custom_templates: z.record(z.any()).optional(),
    leads: z.array(z.object({
      pipedrive_deal_id: z.union([z.number(), z.string()]).optional(),
      lead_name: z.string().optional(),
      lead_company: z.string().optional(),
      group: z.enum(["A", "B"]).optional(),
    })).optional(),
  })).default([]),
});

function EstrategiaDoMes() {
  return (
    <div className="space-y-5">
      <WeeklyPlanSection />
    </div>
  );
}

function WeeklyPlanSection() {
  const [plan, setPlan] = useState<any | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("weekly_plans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setPlan(data ?? null);
  };

  useEffect(() => { load(); }, []);

  const updateField = (key: string, value: any) =>
    setPlan((p: any) => ({ ...p, [key]: value }));

  const updateListItem = (key: string, idx: number, value: string) => {
    const arr = [...(plan?.[key] || [])];
    arr[idx] = value;
    updateField(key, arr);
  };
  const addItem = (key: string) =>
    updateField(key, [...(plan?.[key] || []), ""]);
  const removeItem = (key: string, idx: number) => {
    const arr = [...(plan?.[key] || [])];
    arr.splice(idx, 1);
    updateField(key, arr);
  };

  const approveAndDistribute = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const { error: upErr } = await (supabase as any)
        .from("weekly_plans")
        .update({
          estrategia_semana: plan.estrategia_semana || "",
          prioridades: plan.prioridades || [],
          extras_aline: plan.extras_aline || [],
          extras_felipe: plan.extras_felipe || [],
          extras_milena: plan.extras_milena || [],
          status: "aprovado",
          approved_at: new Date().toISOString(),
        })
        .eq("id", plan.id);
      if (upErr) throw upErr;

      const rows: any[] = [];
      const base = {
        task_type: "strategic" as const,
        source: "claude_briefing" as const,
        scheduled_date: plan.week_start,
        priority: 7,
      };
      (plan.extras_aline || []).filter((s: string) => s?.trim()).forEach((s: string) =>
        rows.push({ ...base, user_pipedrive_id: 24578358, task_description: s })
      );
      (plan.extras_felipe || []).filter((s: string) => s?.trim()).forEach((s: string) =>
        rows.push({ ...base, user_pipedrive_id: 26351800, task_description: s })
      );
      (plan.extras_milena || []).filter((s: string) => s?.trim()).forEach((s: string) =>
        rows.push({ ...base, user_pipedrive_id: null, task_description: `Milena: ${s}` })
      );
      if (rows.length > 0) {
        const { error: insErr } = await supabase.from("daily_activities").insert(rows);
        if (insErr) throw insErr;
      }

      setPlan({ ...plan, status: "aprovado" });
      toast.success("Plano aprovado e atividades distribuídas para o time");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao aprovar plano");
    } finally {
      setSaving(false);
    }
  };

  const fmt = (iso?: string) => {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
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

  if (plan === undefined) {
    return <div style={card} className="p-6 text-sm text-muted-foreground">Carregando plano semanal…</div>;
  }

  return (
    <div style={card} className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
            <Calendar className="w-3.5 h-3.5" />
            Plano Semanal do Claude
          </div>
          {plan && (
            <h3 className="text-lg font-semibold text-white mt-1">
              Plano da semana de {fmt(plan.week_start)} a {fmt(plan.week_end)}
            </h3>
          )}
        </div>
        {plan && (
          <span
            className="text-[11px] px-2.5 py-1 rounded-full font-medium"
            style={
              plan.status === "aprovado"
                ? { background: "rgba(0,200,150,0.15)", color: "hsl(160,100%,55%)", border: "1px solid rgba(0,200,150,0.3)" }
                : { background: "rgba(234,179,8,0.15)", color: "hsl(45,100%,60%)", border: "1px solid rgba(234,179,8,0.3)" }
            }
          >
            {plan.status === "aprovado" ? "Aprovado" : "Aguardando aprovação"}
          </span>
        )}
      </div>

      {!plan && (
        <p className="text-sm text-muted-foreground">
          Nenhum plano disponível. O briefing de sexta-feira gerará o plano automaticamente.
        </p>
      )}

      {plan && (
        <>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Estratégia da semana</p>
            <textarea
              value={plan.estrategia_semana || ""}
              onChange={(e) => updateField("estrategia_semana", e.target.value)}
              rows={4}
              style={inputStyle}
            />
          </div>

          <EditableList title="Prioridades" items={plan.prioridades || []}
            onChange={(i, v) => updateListItem("prioridades", i, v)}
            onAdd={() => addItem("prioridades")} onRemove={(i) => removeItem("prioridades", i)}
            inputStyle={inputStyle} />

          <EditableList title="Atividades Aline" items={plan.extras_aline || []}
            onChange={(i, v) => updateListItem("extras_aline", i, v)}
            onAdd={() => addItem("extras_aline")} onRemove={(i) => removeItem("extras_aline", i)}
            inputStyle={inputStyle} />

          <EditableList title="Atividades Felipe" items={plan.extras_felipe || []}
            onChange={(i, v) => updateListItem("extras_felipe", i, v)}
            onAdd={() => addItem("extras_felipe")} onRemove={(i) => removeItem("extras_felipe", i)}
            inputStyle={inputStyle} />

          <EditableList title="Atividades Milena" items={plan.extras_milena || []}
            onChange={(i, v) => updateListItem("extras_milena", i, v)}
            onAdd={() => addItem("extras_milena")} onRemove={(i) => removeItem("extras_milena", i)}
            inputStyle={inputStyle} />

          <div className="flex justify-end">
            <button
              onClick={approveAndDistribute}
              disabled={saving || plan.status === "aprovado"}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, hsl(160,100%,38%), hsl(160,100%,45%))",
                color: "white",
                boxShadow: "0 4px 20px rgba(0,200,150,0.25)",
              }}
            >
              {plan.status === "aprovado" ? "Plano aprovado" : saving ? "Aprovando…" : "Aprovar e Distribuir"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function EditableList({
  title, items, onChange, onAdd, onRemove, inputStyle,
}: {
  title: string;
  items: string[];
  onChange: (i: number, v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  inputStyle: React.CSSProperties;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
        <button
          onClick={onAdd}
          className="text-[11px] px-2 py-0.5 rounded-md text-white/80 hover:text-white"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          + Adicionar
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nenhum item.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={item || ""}
                onChange={(e) => onChange(i, e.target.value)}
                style={inputStyle}
              />
              <button
                onClick={() => onRemove(i)}
                className="text-xs px-2 py-1 rounded-md text-white/60 hover:text-destructive"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ campaign, expanded, onToggle }: { campaign: any; expanded: boolean; onToggle: () => void }) {
  const kpis = campaign.kpis || {};
  const leadsTarget = Number(kpis.leads_target || 0);
  const meetingsTarget = Number(kpis.meetings_target || 0);
  const proposalsTarget = Number(kpis.proposals_target || 0);
  const wonTarget = Number(kpis.won_target || 0);
  const leadCount = campaign.campaign_leads?.[0]?.count ?? 0;
  const pctLeads = leadsTarget ? Math.min(100, Math.round((leadCount / leadsTarget) * 100)) : 0;

  const dayCurrent = Number(campaign.current_day_in_flow || 0);
  const totalDays = (() => {
    if (!campaign.start_date || !campaign.end_date) return 0;
    const s = new Date(campaign.start_date), e = new Date(campaign.end_date);
    return Math.max(1, Math.ceil((+e - +s) / (1000 * 60 * 60 * 24)) + 1);
  })();
  const elapsedDays = (() => {
    if (!campaign.start_date) return 0;
    const s = new Date(campaign.start_date);
    return Math.max(0, Math.ceil((+new Date() - +s) / (1000 * 60 * 60 * 24)));
  })();

  return (
    <div style={card} className="overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-base font-semibold text-white">{campaign.name}</h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(0,200,150,0.15)", color: "hsl(160,100%,55%)" }}>
                {campaign.playbook_type}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}>
                {campaign.status}
              </span>
            </div>
            {campaign.description && <p className="text-xs text-muted-foreground">{campaign.description}</p>}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              {campaign.owner_user_id && <span>Owner: {campaign.owner_user_id}</span>}
              {campaign.start_date && (
                <span>{campaign.start_date} → {campaign.end_date || "—"}</span>
              )}
              {totalDays > 0 && <span>Dia {Math.min(elapsedDays, totalDays)} de {totalDays}</span>}
            </div>
          </div>
          <button
            onClick={onToggle}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
          >
            {expanded ? "Ocultar" : "Ver detalhes"}
          </button>
        </div>

        {(leadsTarget > 0 || meetingsTarget > 0 || proposalsTarget > 0 || wonTarget > 0) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <KpiBar label="Leads tocados" current={leadCount} target={leadsTarget} />
            <KpiBar label="Reuniões" current={Number(kpis.meetings_done || 0)} target={meetingsTarget} />
            <KpiBar label="Propostas" current={Number(kpis.proposals_done || 0)} target={proposalsTarget} />
            <KpiBar label="Fechados" current={Number(kpis.won_done || 0)} target={wonTarget} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
          >
            <CampaignLeadsList campaignId={campaign.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CampaignLeadsList({ campaignId }: { campaignId: string }) {
  const [leads, setLeads] = useState<any[] | null>(null);
  useEffect(() => {
    let mounted = true;
    supabase
      .from("campaign_leads")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("entered_flow_at", { ascending: false })
      .limit(200)
      .then(({ data }) => { if (mounted) setLeads(data || []); });
    return () => { mounted = false; };
  }, [campaignId]);

  if (leads === null) return <div className="p-4 text-xs text-muted-foreground">Carregando…</div>;
  if (leads.length === 0) return <div className="p-4 text-xs text-muted-foreground">Sem leads associados.</div>;

  return (
    <div className="p-4 space-y-1">
      {leads.map((l) => (
        <div key={l.id} className="flex items-center justify-between gap-3 text-xs py-1.5 px-2 rounded-md hover:bg-white/[0.03]">
          <div className="flex-1 min-w-0">
            <p className="text-white truncate">{l.lead_company || l.lead_name || `Deal ${l.pipedrive_deal_id || ""}`}</p>
            {l.lead_name && l.lead_company && <p className="text-muted-foreground truncate">{l.lead_name}</p>}
          </div>
          {l.group_label && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}>
              Grupo {l.group_label}
            </span>
          )}
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(0,200,150,0.10)", color: "hsl(160,100%,55%)" }}>
            D{l.current_day_in_flow}
          </span>
          <span className="text-[10px] text-muted-foreground">{l.status}</span>
        </div>
      ))}
    </div>
  );
}

function KpiBar({ label, current, target }: { label: string; current: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
        <span>{label}</span>
        <span className="text-white font-medium">{current}/{target}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: "linear-gradient(90deg, hsl(160,100%,45%), hsl(160,100%,55%))" }} />
      </div>
    </div>
  );
}

function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const importMut = useImportStrategy();
  const [jsonText, setJsonText] = useState(SAMPLE_JSON);
  const [validation, setValidation] = useState<{ ok: boolean; preview?: string; errors?: string[] }>({ ok: false });

  if (!open) return null;

  function validate() {
    try {
      const parsed = JSON.parse(jsonText);
      const r = ImportSchema.safeParse(parsed);
      if (!r.success) {
        setValidation({ ok: false, errors: r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) });
        return;
      }
      const totalLeads = r.data.campaigns.reduce((s, c) => s + (c.leads?.length || 0), 0);
      const newCount = r.data.campaigns.length;
      setValidation({
        ok: true,
        preview: `Mês ${r.data.month} · ${newCount} campanha(s) (upsert) · ${totalLeads} lead(s)`,
      });
    } catch (e: any) {
      setValidation({ ok: false, errors: [`JSON inválido: ${e.message}`] });
    }
  }

  async function confirmImport() {
    try {
      const payload = JSON.parse(jsonText);
      const result: any = await importMut.mutateAsync(payload);
      toast.success("Estratégia importada", {
        description: `${result?.campaigns ?? 0} campanhas · ${result?.leads ?? 0} leads`,
      });
      onClose();
      setValidation({ ok: false });
    } catch (e: any) {
      toast.error("Erro ao importar", { description: e.message });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 720, width: "100%" }} className="p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">📥 Importar Estratégia (JSON)</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-white text-2xl leading-none">×</button>
        </div>
        <textarea
          value={jsonText}
          onChange={(e) => { setJsonText(e.target.value); setValidation({ ok: false }); }}
          className="w-full font-mono text-xs h-72 p-3 rounded-lg"
          style={inputStyle}
        />
        {validation.errors && (
          <div className="rounded-lg p-3 text-xs" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.3)", color: "hsl(0,80%,75%)" }}>
            {validation.errors.map((e, i) => <p key={i}>• {e}</p>)}
          </div>
        )}
        {validation.ok && validation.preview && (
          <div className="rounded-lg p-3 text-xs" style={{ background: "rgba(0,200,150,0.10)", border: "1px solid rgba(0,200,150,0.3)", color: "hsl(160,100%,65%)" }}>
            ✓ {validation.preview}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={validate} className="px-4 py-2 rounded-lg text-sm" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
            Validar
          </button>
          <button
            onClick={confirmImport}
            disabled={!validation.ok || importMut.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: "hsl(160,100%,40%)", color: "white" }}
          >
            {importMut.isPending ? "Importando..." : "Confirmar Importação"}
          </button>
        </div>
      </div>
    </div>
  );
}

const SAMPLE_JSON = `{
  "month": "${currentMonthKey()}",
  "monthly_strategy": {
    "cash_target": 200000,
    "operational_minimum": 70000,
    "key_priorities": ["Reativar relacionamentos", "Validar hunter freela"],
    "strategic_focus": "Caixa via reativação",
    "allocation": {"thiago": {"hunting": 60}, "aline": {"cadencia": 100}},
    "session_notes": "Sessão estratégica do mês"
  },
  "campaigns": [
    {
      "name": "Reativação Q2",
      "description": "Reativar leads frios dos últimos 6 meses",
      "owner_user_id": 23830611,
      "start_date": "2026-05-01",
      "end_date": "2026-05-31",
      "playbook_type": "reactivation",
      "target_description": "50 leads do CRM",
      "kpis": {"leads_target": 50, "meetings_target": 10, "proposals_target": 4, "won_target": 1},
      "leads": []
    }
  ]
}`;

/* ===== Stat ===== */
function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="px-4 py-3 rounded-xl min-w-[140px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold mt-0.5" style={{ color: accent }}>{value}</p>
    </div>
  );
}

/* ===== Playbook (templates da cadência) ===== */
function Playbook({ campaigns }: { campaigns: any[] }) {
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={card} className="p-5">
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
      <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">{children}</div>
    </div>
  );

  const camWithTemplates = campaigns.filter((c: any) => c.custom_templates && Object.keys(c.custom_templates).length > 0);

  return (
    <div className="space-y-4">
      {camWithTemplates.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white px-1 mb-2">Templates por campanha ativa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {camWithTemplates.map((c: any) => (
              <div key={c.id} style={card} className="p-5">
                <h4 className="text-sm font-semibold text-white mb-3">{c.name}</h4>
                <div className="space-y-2">
                  {Object.entries(c.custom_templates as Record<string, any>).map(([k, v]) => (
                    <div key={k} className="text-xs">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">{k}</p>
                      <p className="text-white/80 whitespace-pre-wrap">{typeof v === "string" ? v : JSON.stringify(v, null, 2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Funil ideal (benchmark)">
          <ul className="space-y-1.5 list-disc pl-5">
            <li>100 leads qualificados → 40 contatos efetivos</li>
            <li>40 contatos → 20 reuniões agendadas</li>
            <li>20 reuniões → 10 demos realizadas</li>
            <li>10 demos → 4 propostas enviadas</li>
            <li>4 propostas → 1–2 contratos fechados (R$20k cada)</li>
          </ul>
        </Section>

        <Section title="Roteiro de abordagem — Construtoras">
          <ol className="space-y-1.5 list-decimal pl-5">
            <li><b>Abertura:</b> apresente-se e mencione um lançamento ou obra recente da construtora.</li>
            <li><b>Diagnóstico:</b> "Como vocês estão materializando os projetos para o cliente final hoje?"</li>
            <li><b>Dor:</b> conecte com prazos de venda na planta, taxa de conversão do stand e diferenciação.</li>
            <li><b>Prova:</b> cite cases (tour 3D, plantas humanizadas, vídeos) com resultado.</li>
            <li><b>CTA:</b> agendar demo de 30 min com decisor (marketing/comercial/incorporador).</li>
          </ol>
        </Section>

        <Section title="Checklist BANT">
          <ul className="space-y-1.5">
            <li>✅ <b>Budget:</b> ticket compatível com R$15k–R$60k por projeto?</li>
            <li>✅ <b>Authority:</b> falando com decisor (sócio, diretor de marketing/comercial)?</li>
            <li>✅ <b>Need:</b> existe lançamento, VGV ou projeto ativo nos próximos 90 dias?</li>
            <li>✅ <b>Timing:</b> material precisa estar pronto em até 60 dias?</li>
          </ul>
        </Section>

        <Section title="Scripts de follow-up">
          <p><b>D+1 (sem resposta):</b> "Oi [nome], passando rapidinho aqui — tudo bem? Consegue me dar 10 min essa semana pra eu te mostrar como reduzimos o ciclo de venda em obras como a [empreendimento]?"</p>
          <p><b>D+3:</b> envie um case relevante (link/vídeo) e pergunte: "Faz sentido pra realidade da [construtora]?"</p>
          <p><b>D+7:</b> "Quero respeitar seu tempo — prefere que eu retome em [mês que vem] ou encerro o assunto por aqui?"</p>
          <p><b>Pós-demo:</b> "Resumo do que combinamos + próximos passos + data de retorno."</p>
        </Section>
      </div>
    </div>
  );
}

/* ===== Metas da Equipe (com KPIs por owner) ===== */
function MetasEquipe({ state, setState, campaigns, realizadoPorVendedor }: {
  state: EstrategiasState;
  setState: (s: EstrategiasState) => void;
  campaigns: any[];
  realizadoPorVendedor: Map<string, number>;
}) {
  // Agregar kpis por owner_user_id
  const kpisPorOwner = useMemo(() => {
    const map = new Map<string, { leads: number; meetings: number; proposals: number; won: number }>();
    campaigns.forEach((c: any) => {
      const owner = String(c.owner_user_id || "—");
      const cur = map.get(owner) || { leads: 0, meetings: 0, proposals: 0, won: 0 };
      const k = c.kpis || {};
      cur.leads += Number(k.leads_target || 0);
      cur.meetings += Number(k.meetings_target || 0);
      cur.proposals += Number(k.proposals_target || 0);
      cur.won += Number(k.won_target || 0);
      map.set(owner, cur);
    });
    return map;
  }, [campaigns]);

  return (
    <div className="space-y-5">
      {kpisPorOwner.size > 0 && (
        <div style={card} className="p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Metas das campanhas ativas (por owner)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <th className="py-2 px-2">Owner ID</th>
                  <th className="py-2 px-2">Leads</th>
                  <th className="py-2 px-2">Reuniões</th>
                  <th className="py-2 px-2">Propostas</th>
                  <th className="py-2 px-2">Fechados</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(kpisPorOwner.entries()).map(([owner, k]) => (
                  <tr key={owner} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td className="py-2 px-2 text-white font-medium">{owner}</td>
                    <td className="py-2 px-2 text-white/80">{k.leads}</td>
                    <td className="py-2 px-2 text-white/80">{k.meetings}</td>
                    <td className="py-2 px-2 text-white/80">{k.proposals}</td>
                    <td className="py-2 px-2" style={{ color: "hsl(160,100%,55%)" }}>{k.won}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={card} className="p-6">
        <h3 className="text-sm font-semibold text-white mb-3">Metas individuais de receita (R$)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <th className="py-3 px-2">Vendedor</th>
                <th className="py-3 px-2">Meta (R$)</th>
                <th className="py-3 px-2">Realizado</th>
                <th className="py-3 px-2">% Atingido</th>
                <th className="py-3 px-2">Comissão projetada (4%)</th>
              </tr>
            </thead>
            <tbody>
              {state.metasEquipe.map((m, idx) => {
                const realizado = realizadoPorVendedor.get(m.vendedor) || 0;
                const pct = m.meta > 0 ? (realizado / m.meta) * 100 : 0;
                const comissaoProj = realizado * COMISSAO_PCT;
                return (
                  <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td className="py-3 px-2">
                      <input
                        value={m.vendedor}
                        onChange={(e) => {
                          const arr = [...state.metasEquipe];
                          arr[idx] = { ...arr[idx], vendedor: e.target.value };
                          setState({ ...state, metasEquipe: arr });
                        }}
                        style={inputStyle}
                      />
                    </td>
                    <td className="py-3 px-2 w-[180px]">
                      <input
                        type="number"
                        value={m.meta}
                        onChange={(e) => {
                          const arr = [...state.metasEquipe];
                          arr[idx] = { ...arr[idx], meta: Number(e.target.value) || 0 };
                          setState({ ...state, metasEquipe: arr });
                        }}
                        style={inputStyle}
                      />
                    </td>
                    <td className="py-3 px-2 text-white">{fmtBRL(realizado)}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-1 rounded-md text-xs font-medium" style={{
                        color: pct >= 100 ? "hsl(160,100%,55%)" : pct >= 60 ? "hsl(45,100%,60%)" : "hsl(0,80%,65%)",
                        background: pct >= 100 ? "rgba(0,200,150,0.12)" : pct >= 60 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)",
                      }}>
                        {pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-2" style={{ color: "hsl(160,100%,55%)" }}>{fmtBRL(comissaoProj)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setState({ ...state, metasEquipe: [...state.metasEquipe, { vendedor: "Novo Vendedor", meta: 0 }] })}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "white" }}
          >
            + Adicionar vendedor
          </button>
          {state.metasEquipe.length > 0 && (
            <button
              onClick={() => setState({ ...state, metasEquipe: state.metasEquipe.slice(0, -1) })}
              className="px-3 py-2 rounded-lg text-sm text-muted-foreground"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              Remover último
            </button>
          )}
          <div className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ color: "hsl(160,100%,55%)" }}>
            <Save className="w-3.5 h-3.5" /> Salvo automaticamente
          </div>
        </div>
      </div>
    </div>
  );
}
