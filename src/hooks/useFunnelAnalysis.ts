import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FunnelData {
  entrada: number;
  tentando: number;
  contatoRealizado: number;
  decisor: number;
  demo: number;
  conv1: string;
  conv2: string;
  conv3: string;
  conv4: string;
  hold: number;
  reciclaveis: number;
  portaAberta: number;
  demoGoal: number;
  dayOfMonth: number;
}

export function useFunnelAnalysis(funnelData: FunnelData | null) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (!funnelData) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("funnel-analysis", {
        body: { funnelData },
      });
      if (error) throw error;
      if (data?.analysis) {
        setAnalysis(data.analysis);
        setUpdatedAt(new Date());
      }
    } catch (e) {
      console.error("Funnel analysis error:", e);
      setAnalysis("Não foi possível gerar a análise no momento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [funnelData]);

  // Initial fetch only — user can refresh via `refresh()`
  useEffect(() => {
    if (!funnelData) return;
    if (!analysis) fetchAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnelData !== null]);

  return { analysis, loading, updatedAt, refresh: fetchAnalysis };
}
