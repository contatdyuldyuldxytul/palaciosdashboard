import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function currentMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function useMonthlyStrategy(month?: string) {
  const m = month ?? currentMonthISO();
  return useQuery({
    queryKey: ["monthly_strategy", m],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_strategies")
        .select("*")
        .eq("month", m)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAllMonthlyStrategies() {
  return useQuery({
    queryKey: ["monthly_strategies_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_strategies")
        .select("*")
        .order("month", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCampaigns(strategyId?: string | null) {
  return useQuery({
    queryKey: ["campaigns", strategyId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("campaigns").select("*, campaign_leads(count)").order("start_date", { ascending: false });
      if (strategyId) q = q.eq("monthly_strategy_id", strategyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCadenceTemplates(playbook = "cadence_2_0") {
  return useQuery({
    queryKey: ["cadence_templates", playbook],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cadence_templates")
        .select("*")
        .eq("playbook_type", playbook as any)
        .order("day_in_flow")
        .order("period")
        .order("channel");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWeeklyReports() {
  return useQuery({
    queryKey: ["weekly_reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_reports")
        .select("*")
        .order("week_start", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useImportStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.functions.invoke("import-monthly-strategy", { body: payload });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly_strategy"] });
      qc.invalidateQueries({ queryKey: ["monthly_strategies_all"] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}
