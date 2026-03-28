import { useState, useMemo } from "react";
import { usePlanejamentoMensal, useSavePlanejamento, useApprovePlanejamento, useUpdatePlanejamentoDia } from "@/hooks/usePlanejamento";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CheckCircle2, Loader2, Edit3, X, Eye, List } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AMBER = "hsl(45, 100%, 55%)";
const GREEN = "hsl(160, 100%, 39%)";

function getCurrentMesAno() {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}

function getMonthName(mesAno: string) {
  const [m, y] = mesAno.split("/");
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

const typeIcons: Record<string, string> = {
  Email: "📧", WhatsApp: "📱", LinkedIn: "💼", "Ligação": "📞", "Geração de Leads": "🎯",
};

export function CeoCadencePlanning() {
  const mesAno = getCurrentMesAno();
  const { data: planejamento = [], isLoading } = usePlanejamentoMensal(mesAno);
  const savePlan = useSavePlanejamento();
  const approvePlan = useApprovePlanejamento();
  const updateDia = useUpdatePlanejamentoDia();

  const [form, setForm] = useState({
    total_leads: 600,
    meta_demos: 15,
    meta_contratos: 2,
    meta_receita: 20000,
    minimo_viavel: 70,
  });
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [editingDay, setEditingDay] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ edgeFunction: "success" | "error" | null; ai: "success" | "error" | null }>({ edgeFunction: null, ai: null });

  const isApproved = planejamento.length > 0 && planejamento[0].aprovado;
  const hasPlan = planejamento.length > 0 || generatedPlan;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cadence-plan", {
        body: form,
      });
      if (error) {
        const errorMsg = typeof error === "object" && error.message ? error.message : JSON.stringify(error);
        throw new Error(errorMsg);
      }
      if (data?.error) throw new Error(data.error);
      if (data?.plan) {
        setGeneratedPlan(data.plan);
        toast({ title: "🤖 Planejamento gerado!", description: "Revise e aprove abaixo." });
      }
    } catch (e: any) {
      toast({ title: "Erro ao gerar planejamento", description: e.message || "Erro desconhecido", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult({ edgeFunction: null, ai: null });
    try {
      const { data, error } = await supabase.functions.invoke("generate-cadence-plan", {
        body: { total_leads: 10, meta_demos: 1, meta_contratos: 1, meta_receita: 1000, minimo_viavel: 70 },
      });
      if (error) {
        setTestResult({ edgeFunction: "error", ai: "error" });
        toast({ title: "❌ Edge Function inacessível", description: error.message, variant: "destructive" });
      } else if (data?.error) {
        setTestResult({ edgeFunction: "success", ai: "error" });
        toast({ title: "⚠️ Edge Function OK, mas AI falhou", description: data.error, variant: "destructive" });
      } else if (data?.plan) {
        setTestResult({ edgeFunction: "success", ai: "success" });
        toast({ title: "✅ Tudo funcionando!", description: "Edge Function e AI estão conectados." });
      }
    } catch (e: any) {
      setTestResult({ edgeFunction: "error", ai: "error" });
      toast({ title: "❌ Erro de conexão", description: e.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAndApprove = async () => {
    const plan = generatedPlan;
    if (!plan?.dias?.length) return;

    try {
      const dias = plan.dias.map((d: any) => ({
        mes_ano: mesAno,
        data: d.data,
        dia_semana: d.dia_semana,
        ciclo_dia: d.ciclo_dia || 0,
        grupo: d.grupo || null,
        responsavel: d.responsavel || "Aline",
        tarefas_json: {
          aline_tarefas: d.aline_tarefas || [],
          milena_tarefas: d.milena_tarefas || [],
        },
        aprovado: false,
        aprovado_em: null,
        editado: false,
      }));

      await savePlan.mutateAsync(dias);
      await approvePlan.mutateAsync(mesAno);
      setGeneratedPlan(null);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveWithoutApproval = async () => {
    const plan = generatedPlan;
    if (!plan?.dias?.length) return;

    try {
      const dias = plan.dias.map((d: any) => ({
        mes_ano: mesAno,
        data: d.data,
        dia_semana: d.dia_semana,
        ciclo_dia: d.ciclo_dia || 0,
        grupo: d.grupo || null,
        responsavel: d.responsavel || "Aline",
        tarefas_json: {
          aline_tarefas: d.aline_tarefas || [],
          milena_tarefas: d.milena_tarefas || [],
        },
        aprovado: false,
        aprovado_em: null,
        editado: false,
      }));

      await savePlan.mutateAsync(dias);
      toast({ title: "Planejamento salvo", description: "Aguardando aprovação." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleApproveExisting = async () => {
    await approvePlan.mutateAsync(mesAno);
  };

  // Calendar data
  const calendarDays = useMemo(() => {
    if (generatedPlan?.dias) return generatedPlan.dias;
    return planejamento.map(p => ({
      data: p.data,
      dia_semana: p.dia_semana,
      ciclo_dia: p.ciclo_dia,
      grupo: p.grupo,
      responsavel: p.responsavel,
      aline_tarefas: p.tarefas_json?.aline_tarefas || [],
      milena_tarefas: p.tarefas_json?.milena_tarefas || [],
      _id: p.id,
    }));
  }, [generatedPlan, planejamento]);

  // Build calendar grid
  const calendarGrid = useMemo(() => {
    if (calendarDays.length === 0) return [];
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Adjust to start on Monday (1=Mon, 0=Sun->6)
    let startPad = firstDay.getDay() - 1;
    if (startPad < 0) startPad = 6;
    
    const grid: Array<{ date: number | null; dayData: any }> = [];
    
    for (let i = 0; i < startPad; i++) grid.push({ date: null, dayData: null });
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayData = calendarDays.find((cd: any) => cd.data === dateStr);
      grid.push({ date: d, dayData });
    }
    
    return grid;
  }, [calendarDays]);

  if (isLoading) {
    return <div className="glass-card p-6"><div className="h-8 w-48 bg-muted/30 rounded animate-pulse" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5" style={{ color: AMBER }} />
          <h2 className="text-lg font-semibold" style={{ color: AMBER }}>📅 Planejamento Mensal</h2>
        </div>
        {isApproved && (
          <span className="text-xs px-3 py-1 rounded-full bg-green-500/10 text-green-400">
            ✅ Aprovado
          </span>
        )}
      </div>

      {/* Goal Setting Form */}
      {!isApproved && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Definir Metas — {getMonthName(mesAno)}</h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Total de leads para prospectar</label>
              <input type="number" value={form.total_leads} onChange={e => setForm(p => ({ ...p, total_leads: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-white/10 text-sm text-foreground focus:outline-none focus:border-amber-500/50" />
              <p className="text-[10px] text-muted-foreground mt-1">Serão divididos 50% Grupo A e 50% Grupo B</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Meta de demos agendadas</label>
              <input type="number" value={form.meta_demos} onChange={e => setForm(p => ({ ...p, meta_demos: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-white/10 text-sm text-foreground focus:outline-none focus:border-amber-500/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Meta de contratos fechados</label>
              <input type="number" value={form.meta_contratos} onChange={e => setForm(p => ({ ...p, meta_contratos: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-white/10 text-sm text-foreground focus:outline-none focus:border-amber-500/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Meta de receita (R$)</label>
              <input type="number" value={form.meta_receita} onChange={e => setForm(p => ({ ...p, meta_receita: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-white/10 text-sm text-foreground focus:outline-none focus:border-amber-500/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Mínimo viável %</label>
              <input type="number" value={form.minimo_viavel} onChange={e => setForm(p => ({ ...p, minimo_viavel: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-white/10 text-sm text-foreground focus:outline-none focus:border-amber-500/50" />
              <p className="text-[10px] text-muted-foreground mt-1">% mínimo para considerar meta no caminho</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-50"
              style={{ background: AMBER, color: "hsl(225,15%,10%)" }}>
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando fluxo de cadência...</> : "🤖 Gerar Planejamento com I.A"}
            </button>
            <button onClick={handleTestConnection} disabled={testing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-muted/30 border border-white/10 text-muted-foreground hover:text-foreground transition-all disabled:opacity-50">
              {testing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Testando...</> : "🔌 Testar Conexão"}
            </button>
            {testResult.edgeFunction && (
              <div className="flex items-center gap-2 text-xs">
                <span>{testResult.edgeFunction === "success" ? "✅" : "❌"} Edge Function</span>
                <span>{testResult.ai === "success" ? "✅" : "❌"} AI Gateway</span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Approval Panel */}
      {(generatedPlan || (planejamento.length > 0 && !isApproved)) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 border-amber-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              📅 Planejamento de {getMonthName(mesAno)} — Aguardando Aprovação
            </h3>
            <div className="flex gap-2">
              {generatedPlan ? (
                <>
                  <button onClick={handleSaveAndApprove}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar Planejamento
                  </button>
                  <button onClick={handleGenerate} disabled={generating}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-muted/30 text-muted-foreground hover:text-foreground transition-all">
                    🔄 Gerar Novo
                  </button>
                </>
              ) : (
                <button onClick={handleApproveExisting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar Planejamento
                </button>
              )}
            </div>
          </div>

          {/* Summary */}
          {generatedPlan?.resumo && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-muted/20 text-center">
                <p className="text-lg font-bold" style={{ color: AMBER }}>{generatedPlan.resumo.grupo_a_leads}</p>
                <p className="text-[10px] text-muted-foreground">🟡 Grupo A Leads</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 text-center">
                <p className="text-lg font-bold" style={{ color: GREEN }}>{generatedPlan.resumo.grupo_b_leads}</p>
                <p className="text-[10px] text-muted-foreground">🟢 Grupo B Leads</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 text-center">
                <p className="text-xs text-muted-foreground">Ciclo 1</p>
                <p className="text-sm font-medium text-foreground">{generatedPlan.resumo.ciclo1_inicio}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 text-center">
                <p className="text-xs text-muted-foreground">Ciclo 2</p>
                <p className="text-sm font-medium text-foreground">{generatedPlan.resumo.ciclo2_inicio}</p>
              </div>
            </div>
          )}

          {/* View Toggle */}
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${viewMode === "calendar" ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground hover:text-foreground"}`}>
              <Calendar className="w-3.5 h-3.5" /> Calendário
            </button>
            <button onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${viewMode === "list" ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground hover:text-foreground"}`}>
              <List className="w-3.5 h-3.5" /> Lista
            </button>
          </div>

          {/* Calendar View */}
          {viewMode === "calendar" && (
            <div className="grid grid-cols-7 gap-1">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(d => (
                <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
              ))}
              {calendarGrid.map((cell, i) => (
                <div key={i}
                  className={`min-h-[60px] rounded-lg p-1.5 text-center transition-all ${
                    cell.date ? (cell.dayData ? "cursor-pointer hover:bg-white/[0.05]" : "") : ""
                  }`}
                  style={{
                    background: cell.dayData?.grupo === "A" ? "rgba(245,158,11,0.08)" : cell.dayData?.grupo === "B" ? "rgba(0,200,150,0.08)" : "rgba(255,255,255,0.02)",
                    border: cell.dayData ? `1px solid ${cell.dayData.grupo === "A" ? "rgba(245,158,11,0.2)" : "rgba(0,200,150,0.2)"}` : "1px solid transparent",
                  }}
                  onClick={() => cell.dayData && setSelectedDay(cell.dayData)}
                >
                  {cell.date && (
                    <>
                      <p className="text-xs font-medium text-foreground">{cell.date}</p>
                      {cell.dayData && (
                        <>
                          <span className={`text-[9px] px-1 rounded ${cell.dayData.grupo === "A" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`}>
                            {cell.dayData.grupo === "A" ? "🟡 A" : "🟢 B"}
                          </span>
                          <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
                            {(cell.dayData.aline_tarefas || []).slice(0, 4).map((t: any, ti: number) => (
                              <span key={ti} className="text-[8px]">{typeIcons[t.tipo] || "📋"}</span>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* List View */}
          {viewMode === "list" && (
            <div className="space-y-1 max-h-[400px] overflow-y-auto scrollbar-thin">
              {calendarDays.map((day: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-all"
                  style={{ borderLeft: `3px solid ${day.grupo === "A" ? "hsl(45,100%,55%)" : "hsl(160,100%,39%)"}` }}>
                  <div className="w-20 flex-shrink-0">
                    <p className="text-xs font-medium text-foreground">{day.data?.split("-").reverse().join("/")}</p>
                    <p className="text-[10px] text-muted-foreground">{day.dia_semana}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${day.grupo === "A" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`}>
                    {day.grupo === "A" ? "🟡 A" : "🟢 B"}
                  </span>
                  <div className="flex-1 flex flex-wrap gap-1">
                    {(day.aline_tarefas || []).map((t: any, ti: number) => (
                      <span key={ti} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground">
                        {typeIcons[t.tipo] || "📋"} {t.tipo}
                      </span>
                    ))}
                  </div>
                  <button onClick={() => setEditingDay(day)} className="text-muted-foreground hover:text-foreground">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setSelectedDay(day)} className="text-muted-foreground hover:text-foreground">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Approved Plan View */}
      {isApproved && planejamento.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Planejamento Ativo — {getMonthName(mesAno)}</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setViewMode("calendar")}
                className={`px-2 py-1 rounded text-[10px] ${viewMode === "calendar" ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground"}`}>
                Calendário
              </button>
              <button onClick={() => setViewMode("list")}
                className={`px-2 py-1 rounded text-[10px] ${viewMode === "list" ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground"}`}>
                Lista
              </button>
            </div>
          </div>

          {viewMode === "calendar" && (
            <div className="grid grid-cols-7 gap-1">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(d => (
                <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
              ))}
              {calendarGrid.map((cell, i) => (
                <div key={i}
                  className={`min-h-[60px] rounded-lg p-1.5 text-center transition-all ${cell.dayData ? "cursor-pointer hover:bg-white/[0.05]" : ""}`}
                  style={{
                    background: cell.dayData?.grupo === "A" ? "rgba(245,158,11,0.08)" : cell.dayData?.grupo === "B" ? "rgba(0,200,150,0.08)" : "rgba(255,255,255,0.02)",
                    border: cell.dayData ? `1px solid ${cell.dayData.grupo === "A" ? "rgba(245,158,11,0.2)" : "rgba(0,200,150,0.2)"}` : "1px solid transparent",
                  }}
                  onClick={() => cell.dayData && setSelectedDay(cell.dayData)}
                >
                  {cell.date && (
                    <>
                      <p className="text-xs font-medium text-foreground">{cell.date}</p>
                      {cell.dayData && (
                        <>
                          <span className={`text-[9px] px-1 rounded ${cell.dayData.grupo === "A" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`}>
                            {cell.dayData.grupo === "A" ? "🟡 A" : "🟢 B"}
                          </span>
                          <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
                            {(cell.dayData.aline_tarefas || []).slice(0, 4).map((t: any, ti: number) => (
                              <span key={ti} className="text-[8px]">{typeIcons[t.tipo] || "📋"}</span>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {viewMode === "list" && (
            <div className="space-y-1 max-h-[400px] overflow-y-auto scrollbar-thin">
              {calendarDays.map((day: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-all"
                  style={{ borderLeft: `3px solid ${day.grupo === "A" ? "hsl(45,100%,55%)" : "hsl(160,100%,39%)"}` }}>
                  <div className="w-20 flex-shrink-0">
                    <p className="text-xs font-medium text-foreground">{day.data?.split("-").reverse().join("/")}</p>
                    <p className="text-[10px] text-muted-foreground">{day.dia_semana}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${day.grupo === "A" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`}>
                    {day.grupo === "A" ? "🟡 A" : "🟢 B"}
                  </span>
                  <div className="flex-1 flex flex-wrap gap-1">
                    {(day.aline_tarefas || []).map((t: any, ti: number) => (
                      <span key={ti} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground">
                        {typeIcons[t.tipo] || "📋"} {t.tipo}
                      </span>
                    ))}
                  </div>
                  <button onClick={() => setSelectedDay(day)} className="text-muted-foreground hover:text-foreground">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* No Plan Yet */}
      {!hasPlan && !isLoading && (
        <div className="glass-card p-8 text-center">
          <Calendar className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum planejamento gerado para {getMonthName(mesAno)}.</p>
          <p className="text-xs text-muted-foreground mt-1">Defina as metas acima e clique em "Gerar Planejamento".</p>
        </div>
      )}

      {/* Day Detail Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="bg-background border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              {selectedDay?.dia_semana} — {selectedDay?.data?.split("-").reverse().join("/")}
              {selectedDay?.grupo && (
                <span className={`text-xs px-2 py-0.5 rounded ${selectedDay.grupo === "A" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`}>
                  Grupo {selectedDay.grupo}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDay?.aline_tarefas?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-2">Aline (SDR)</h4>
              <div className="space-y-1.5">
                {selectedDay.aline_tarefas.map((t: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20">
                    <span className="text-sm">{typeIcons[t.tipo] || "📋"}</span>
                    <div className="flex-1">
                      <p className="text-xs text-foreground font-medium">{t.tipo}</p>
                      <p className="text-[10px] text-muted-foreground">{t.descricao}</p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground">{t.periodo}</span>
                    {t.quantidade > 0 && <span className="text-[10px] text-amber-400">×{t.quantidade}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {selectedDay?.milena_tarefas?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-2">Milena (LDR)</h4>
              <div className="space-y-1.5">
                {selectedDay.milena_tarefas.map((t: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20">
                    <span className="text-sm">🎯</span>
                    <div className="flex-1">
                      <p className="text-xs text-foreground font-medium">{t.tipo}</p>
                      <p className="text-[10px] text-muted-foreground">{t.descricao}</p>
                    </div>
                    {t.quantidade > 0 && <span className="text-[10px] text-green-400">×{t.quantidade}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Day Dialog */}
      <Dialog open={!!editingDay} onOpenChange={() => setEditingDay(null)}>
        <DialogContent className="bg-background border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Editar — {editingDay?.dia_semana} {editingDay?.data?.split("-").reverse().join("/")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Edição detalhada do dia. Após salvar, o planejamento será atualizado.</p>
          {editingDay?.aline_tarefas?.map((t: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm">{typeIcons[t.tipo] || "📋"}</span>
              <input 
                value={t.descricao || ""} 
                onChange={e => {
                  const updated = { ...editingDay };
                  updated.aline_tarefas[i] = { ...t, descricao: e.target.value };
                  setEditingDay(updated);
                }}
                className="flex-1 px-2 py-1 rounded bg-muted/30 border border-white/10 text-xs text-foreground" />
              <input 
                type="number" value={t.quantidade || 0}
                onChange={e => {
                  const updated = { ...editingDay };
                  updated.aline_tarefas[i] = { ...t, quantidade: Number(e.target.value) };
                  setEditingDay(updated);
                }}
                className="w-16 px-2 py-1 rounded bg-muted/30 border border-white/10 text-xs text-foreground" />
            </div>
          ))}
          <button onClick={() => {
            if (editingDay?._id) {
              updateDia.mutate({ id: editingDay._id, tarefas_json: { aline_tarefas: editingDay.aline_tarefas, milena_tarefas: editingDay.milena_tarefas } });
            }
            setEditingDay(null);
            toast({ title: "Dia atualizado!" });
          }}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all">
            Salvar Alterações
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
