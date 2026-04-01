import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMetasComerciais } from "@/hooks/useMetasComerciais";
import { motion } from "framer-motion";
import { Target, CalendarCheck, DollarSign, AlertTriangle, PartyPopper } from "lucide-react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MeetingCheck {
  id: string;
  mes: string;
  numero_reuniao: number;
  colaborador: string;
  agendada: boolean;
  agendada_em: string | null;
  realizada: boolean;
  realizada_em: string | null;
}

interface MeetingTrackerProps {
  colaborador: string;
  onCommissionChange?: (meetingsRealized: number) => void;
}

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

export function MeetingTracker({ colaborador, onCommissionChange }: MeetingTrackerProps) {
  const [checks, setChecks] = useState<MeetingCheck[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMes = useMemo(() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  }, []);

  const { data: metasComerciais = [] } = useMetasComerciais(currentMes);
  const meta = metasComerciais[0] || null;
  const metaDemos = meta ? Number(meta.meta_demos) || 0 : 0;
  const hasGoals = !!meta && metaDemos > 0;

  // Fetch checks from Supabase
  const fetchChecks = useCallback(async () => {
    if (!hasGoals) { setLoading(false); return; }
    const { data } = await supabase
      .from("meeting_checks" as any)
      .select("*")
      .eq("colaborador", colaborador)
      .eq("mes", currentMes);
    setChecks((data as any as MeetingCheck[]) || []);
    setLoading(false);
  }, [colaborador, currentMes, hasGoals]);

  useEffect(() => { fetchChecks(); }, [fetchChecks]);

  // Notify parent of commission changes
  const realizedCount = checks.filter(c => c.realizada).length;
  const scheduledCount = checks.filter(c => c.agendada).length;

  useEffect(() => {
    onCommissionChange?.(realizedCount);
  }, [realizedCount, onCommissionChange]);

  const commissionMeetings = realizedCount * 30;

  const handleToggle = async (reuniao: number, field: "agendada" | "realizada") => {
    const existing = checks.find(c => c.numero_reuniao === reuniao);

    if (field === "realizada" && (!existing || !existing.agendada)) return;

    const now = new Date().toISOString();

    if (existing) {
      const newVal = !existing[field];
      const updates: any = { [field]: newVal, [`${field}_em`]: newVal ? now : null };
      // If unchecking agendada, also uncheck realizada
      if (field === "agendada" && !newVal) {
        updates.realizada = false;
        updates.realizada_em = null;
      }

      setChecks(prev => prev.map(c => c.numero_reuniao === reuniao ? { ...c, ...updates } : c));
      await supabase.from("meeting_checks" as any).update(updates).eq("id", existing.id);
    } else {
      const newRow: any = {
        mes: currentMes,
        numero_reuniao: reuniao,
        colaborador,
        agendada: field === "agendada",
        agendada_em: field === "agendada" ? now : null,
        realizada: false,
        realizada_em: null,
      };
      setChecks(prev => [...prev, { ...newRow, id: "temp-" + reuniao }]);
      const { data } = await supabase.from("meeting_checks" as any).upsert([newRow] as any, { onConflict: "mes,numero_reuniao,colaborador" }).select().single();
      if (data) {
        setChecks(prev => prev.map(c => c.numero_reuniao === reuniao ? (data as any as MeetingCheck) : c));
      }
    }
  };

  if (!hasGoals) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }} className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-foreground">🎯 Reuniões do Mês</h2>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">⚠️ Metas não definidas pelo CEO ainda.</p>
        </div>
      </motion.div>
    );
  }

  const allRealized = realizedCount >= metaDemos;
  const progressScheduled = (scheduledCount / metaDemos) * 100;
  const progressRealized = (realizedCount / metaDemos) * 100;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }} className="glass-card p-5">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">🎯 Reuniões do Mês</h2>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Meta: {metaDemos} reuniões | R$30 por realizada</p>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-lg p-3 text-center" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
          <p className="text-lg font-bold text-amber-400"><AnimatedNumber value={scheduledCount} /></p>
          <p className="text-[10px] text-amber-400/70">Agendadas</p>
          <p className="text-[9px] text-muted-foreground">/ {metaDemos}</p>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.15)" }}>
          <p className="text-lg font-bold text-primary"><AnimatedNumber value={realizedCount} /></p>
          <p className="text-[10px] text-primary/70">Realizadas</p>
          <p className="text-[9px] text-muted-foreground">/ {metaDemos}</p>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
          <p className="text-lg font-bold text-emerald-400"><AnimatedNumber value={commissionMeetings} formatAsCurrency /></p>
          <p className="text-[10px] text-emerald-400/70">Comissão reuniões</p>
          <p className="text-[9px] text-muted-foreground">{realizedCount}×R$30</p>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-2 mb-4">
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-amber-400">Agendadas</span>
            <span className="text-muted-foreground">{scheduledCount}/{metaDemos}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(progressScheduled, 100)}%` }}
              transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ background: "#F59E0B" }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-primary">Realizadas</span>
            <span className="text-muted-foreground">{realizedCount}/{metaDemos}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(progressRealized, 100)}%` }}
              transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ background: "#00C896" }} />
          </div>
        </div>
      </div>

      {allRealized && (
        <div className="flex items-center gap-2 p-3 rounded-lg mb-4" style={{ background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.25)" }}>
          <PartyPopper className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-primary">🎉 Meta de reuniões atingida!</span>
        </div>
      )}

      {/* Meeting List */}
      <div className="space-y-1.5 max-h-[280px] overflow-y-auto scrollbar-thin">
        <TooltipProvider>
          {Array.from({ length: metaDemos }, (_, i) => {
            const num = i + 1;
            const check = checks.find(c => c.numero_reuniao === num);
            const isScheduled = check?.agendada || false;
            const isRealized = check?.realizada || false;

            return (
              <div key={num} className="flex items-center justify-between px-3 py-2 rounded-lg transition-all hover:bg-white/[0.03]"
                style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                <span className="text-xs text-foreground font-medium">Reunião #{num}</span>
                <div className="flex items-center gap-3">
                  {/* Agendada checkbox */}
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" checked={isScheduled}
                      onChange={() => handleToggle(num, "agendada")}
                      className="sr-only peer" />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      isScheduled ? "border-amber-500 bg-amber-500/20" : "border-white/20 bg-white/5"
                    }`}>
                      {isScheduled && <span className="text-amber-400 text-[10px]">✓</span>}
                    </div>
                    <span className="text-[10px] text-amber-400/80">📅 Agendada</span>
                  </label>

                  {/* Realizada checkbox */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label className={`flex items-center gap-1.5 select-none ${isScheduled ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}>
                        <input type="checkbox" checked={isRealized} disabled={!isScheduled}
                          onChange={() => handleToggle(num, "realizada")}
                          className="sr-only peer" />
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isRealized ? "border-emerald-500 bg-emerald-500/20" : "border-white/20 bg-white/5"
                        }`}>
                          {isRealized && <span className="text-emerald-400 text-[10px]">✓</span>}
                        </div>
                        <span className="text-[10px] text-emerald-400/80">✅ Realizada</span>
                      </label>
                    </TooltipTrigger>
                    {!isScheduled && (
                      <TooltipContent side="top">
                        <p className="text-xs">Marque como agendada primeiro</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </TooltipProvider>
      </div>
    </motion.div>
  );
}
