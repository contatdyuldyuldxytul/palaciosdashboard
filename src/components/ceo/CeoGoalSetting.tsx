import { useState, useEffect, useMemo } from "react";
import { useMetaMensal, useSaveMetaMensal, useMetasDistribuidas, useSaveMetasDistribuidas, useRelatoriosMeta, useSaveRelatorio } from "@/hooks/useMetasMensais";
import { useLeads } from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Target, AlertTriangle, CheckCircle2, FileText, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const AMBER = "hsl(45, 100%, 55%)";

function getCurrentMesAno() {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}

function getMonthName(mesAno: string) {
  const [m, y] = mesAno.split("/");
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function getWorkingDaysInMonth(date: Date) {
  const year = date.getFullYear(), month = date.getMonth();
  let count = 0;
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) { if (d.getDay() !== 0 && d.getDay() !== 6) count++; d.setDate(d.getDate() + 1); }
  return count;
}

function getWorkingDaysPassed(date: Date) {
  const year = date.getFullYear(), month = date.getMonth();
  let count = 0;
  const d = new Date(year, month, 1);
  while (d <= date) { if (d.getDay() !== 0 && d.getDay() !== 6) count++; d.setDate(d.getDate() + 1); }
  return count;
}

export function CeoGoalSetting() {
  const mesAno = getCurrentMesAno();
  const { data: metaMensal, isLoading: loadingMeta } = useMetaMensal(mesAno);
  const { data: metasDistribuidas } = useMetasDistribuidas(mesAno);
  const { data: relatorios = [], isLoading: loadingRelatorios } = useRelatoriosMeta(mesAno);
  const { data: allLeads = [] } = useLeads();
  const saveMeta = useSaveMetaMensal();
  const saveDistribuidas = useSaveMetasDistribuidas();
  const saveRelatorio = useSaveRelatorio();

  const [form, setForm] = useState({
    leads_milena: 300,
    leads_contatados_aline: 100,
    demos_aline: 15,
    contratos: 2,
    minimo_viavel: 70,
    receita_esperada: 20000,
  });
  const [distributing, setDistributing] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  // Pre-fill form when data loads
  useEffect(() => {
    if (metaMensal) {
      setForm({
        leads_milena: metaMensal.leads_milena,
        leads_contatados_aline: metaMensal.leads_contatados_aline,
        demos_aline: metaMensal.demos_aline,
        contratos: metaMensal.contratos,
        minimo_viavel: metaMensal.minimo_viavel,
        receita_esperada: metaMensal.receita_esperada,
      });
    }
  }, [metaMensal]);

  // Compute progress
  const now = new Date();
  const diasUteis = getWorkingDaysInMonth(now);
  const diasPassados = getWorkingDaysPassed(now);
  const pctTempo = diasUteis > 0 ? diasPassados / diasUteis : 0;

  const milenaLeads = allLeads.filter(l => (l.responsavel_nome || "").toLowerCase().includes("milena"));
  const milenaThisMonth = milenaLeads.filter(l => {
    const d = new Date(l.data_criacao);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const alineLeads = allLeads.filter(l => (l.responsavel_nome || "").toLowerCase().includes("aline"));
  const alineContatados = alineLeads.filter(l => l.status !== "lead").length;
  const alineDemos = alineLeads.filter(l => ["reuniao_agendada", "reuniao_realizada", "proposta", "fechado"].includes(l.status)).length;
  const closedContracts = allLeads.filter(l => {
    const d = new Date(l.data_criacao);
    return l.status === "fechado" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const metrics = metaMensal ? [
    { label: "Leads Milena", icon: "👥", meta: metaMensal.leads_milena, realizado: milenaThisMonth },
    { label: "Leads Contatados Aline", icon: "📞", meta: metaMensal.leads_contatados_aline, realizado: alineContatados },
    { label: "Demos Aline", icon: "🎯", meta: metaMensal.demos_aline, realizado: alineDemos },
    { label: "Contratos", icon: "📝", meta: metaMensal.contratos, realizado: closedContracts },
  ] : [];

  const getStatus = (meta: number, realizado: number) => {
    if (meta === 0) return { label: "N/A", color: "text-muted-foreground", bg: "bg-muted/30" };
    const pace = realizado / (meta * pctTempo);
    const minViavel = (metaMensal?.minimo_viavel || 70) / 100;
    if (pace >= 1) return { label: "🟢 Excelente", color: "text-green-400", bg: "bg-green-500/10" };
    if (pace >= minViavel) return { label: "🟡 Atenção", color: "text-yellow-400", bg: "bg-yellow-500/10" };
    return { label: "🔴 Em Risco", color: "text-red-400", bg: "bg-red-500/10" };
  };

  const handleSaveAndDistribute = async () => {
    setDistributing(true);
    try {
      await saveMeta.mutateAsync({ mes_ano: mesAno, ...form });

      const { data, error } = await supabase.functions.invoke("distribute-goals", {
        body: { mes_ano: mesAno, ...form },
      });

      if (error) throw error;
      if (data?.distribution?.dias) {
        await saveDistribuidas.mutateAsync({
          mesAno,
          dias: data.distribution.dias.map((d: any) => ({
            data: d.data,
            leads_milena: d.leads_milena,
            leads_contatados: d.leads_contatados,
            demos: d.demos,
          })),
        });
      }

      toast({ title: "✅ Metas salvas e distribuídas!", description: "O checklist do time foi atualizado." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setDistributing(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!metaMensal) return;
    setGeneratingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke("goal-report", {
        body: {
          mes_ano: mesAno,
          dia_atual: diasPassados,
          dias_uteis: diasUteis,
          meta_leads_milena: metaMensal.leads_milena,
          realizado_leads_milena: milenaThisMonth,
          meta_demos: metaMensal.demos_aline,
          realizado_demos: alineDemos,
          meta_contratos: metaMensal.contratos,
          realizado_contratos: closedContracts,
        },
      });

      if (error) throw error;
      if (data?.report) {
        await saveRelatorio.mutateAsync({ mes_ano: mesAno, conteudo: data.report, tipo: "atraso_meta" });
        toast({ title: "📋 Relatório gerado!" });
      }
    } catch (e: any) {
      toast({ title: "Erro ao gerar relatório", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loadingMeta) {
    return <div className="glass-card p-6"><div className="h-8 w-48 bg-muted/30 rounded animate-pulse" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Banner if no goals set */}
      {!metaMensal && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 border-amber-500/30" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.03))" }}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">⚠️ Metas de {getMonthName(mesAno)} ainda não definidas.</p>
              <p className="text-xs text-muted-foreground">Defina agora para ativar o checklist do time.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Goal Setting Form */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4" style={{ color: AMBER }} />
          <h2 className="text-sm font-semibold" style={{ color: AMBER }}>
            {metaMensal ? "Editar" : "Definir"} Metas — {getMonthName(mesAno)}
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {[
            { key: "leads_milena", label: "Leads Milena (LDR)", icon: "👥" },
            { key: "leads_contatados_aline", label: "Leads Contatados (Aline)", icon: "📞" },
            { key: "demos_aline", label: "Demos Agendadas (Aline)", icon: "🎯" },
            { key: "contratos", label: "Contratos Fechados", icon: "📝" },
            { key: "minimo_viavel", label: "Mínimo Viável (%)", icon: "📊" },
            { key: "receita_esperada", label: "Receita Esperada (R$)", icon: "💰" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-muted-foreground mb-1 block">{f.icon} {f.label}</label>
              <input
                type="number"
                value={(form as any)[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-white/10 text-sm text-foreground focus:outline-none focus:border-amber-500/50 transition-all"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSaveAndDistribute}
          disabled={distributing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-50"
          style={{ background: AMBER, color: "hsl(225,15%,10%)" }}
        >
          {distributing ? <><Loader2 className="w-4 h-4 animate-spin" /> Distribuindo com IA...</> : "Salvar Metas e Gerar Distribuição"}
        </button>
      </motion.div>

      {/* Goal Progress */}
      {metaMensal && metrics.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map((m, i) => {
            const pct = m.meta > 0 ? (m.realizado / m.meta) * 100 : 0;
            const status = getStatus(m.meta, m.realizado);
            return (
              <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{m.icon} {m.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>{status.label}</span>
                </div>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-xl font-bold tabular-nums" style={{ color: AMBER }}>{m.realizado}</span>
                  <span className="text-xs text-muted-foreground mb-0.5">/ {m.meta}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted/30 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full"
                    style={{ background: pct >= 80 ? "hsl(160,100%,39%)" : pct >= 50 ? AMBER : "hsl(0,70%,50%)" }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{pct.toFixed(0)}% da meta</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Reports Section */}
      {metaMensal && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: AMBER }} />
              <h2 className="text-sm font-semibold" style={{ color: AMBER }}>📋 Relatórios</h2>
            </div>
            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/30 hover:bg-muted/50 transition-all disabled:opacity-50 text-foreground"
            >
              {generatingReport ? <><Loader2 className="w-3 h-3 animate-spin" /> Gerando...</> : "Gerar Relatório"}
            </button>
          </div>

          {relatorios.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum relatório gerado ainda</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
              {relatorios.map(r => (
                <div key={r.id} className="rounded-xl bg-muted/20 overflow-hidden">
                  <button
                    onClick={() => setExpandedReport(expandedReport === r.id ? null : r.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                        {r.tipo === "atraso_meta" ? "Atraso" : r.tipo}
                      </span>
                      <span className="text-xs text-foreground">
                        {new Date(r.data_geracao).toLocaleDateString("pt-BR")} às {new Date(r.data_geracao).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {expandedReport === r.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <AnimatePresence>
                    {expandedReport === r.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                        className="overflow-hidden">
                        <div className="px-4 pb-4 prose prose-sm prose-invert max-w-none">
                          <ReactMarkdown>{r.conteudo}</ReactMarkdown>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
