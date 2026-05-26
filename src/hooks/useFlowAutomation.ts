import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIntegrationSetting<T = any>(key: string) {
  return useQuery({
    queryKey: ["integration_settings", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_settings" as any)
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.value as T | undefined;
    },
  });
}

export function useUpsertIntegrationSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from("integration_settings" as any)
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["integration_settings", vars.key] }),
  });
}

export function useFlowRuns(flowId?: string) {
  return useQuery({
    queryKey: ["flow_runs", flowId || "__all__"],
    queryFn: async () => {
      let q = supabase.from("flow_runs" as any).select("*").order("started_at", { ascending: false }).limit(100);
      if (flowId) q = q.eq("flow_id", flowId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 15_000,
  });
}

export function useFlowActiveRunsCount(flowIds: string[]) {
  return useQuery({
    queryKey: ["flow_runs_active_count", flowIds.sort().join(",")],
    queryFn: async () => {
      if (flowIds.length === 0) return {} as Record<string, number>;
      const { data, error } = await supabase
        .from("flow_runs" as any)
        .select("flow_id, status")
        .in("flow_id", flowIds)
        .in("status", ["pending", "waiting_human"]);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const r of (data as any[]) || []) counts[r.flow_id] = (counts[r.flow_id] || 0) + 1;
      return counts;
    },
    refetchInterval: 30_000,
  });
}
