import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function invoke(action: string, body: any = {}) {
  const { data, error } = await supabase.functions.invoke("n8n-proxy", { body: { action, ...body } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

export function useN8nTest() {
  return useMutation({ mutationFn: () => invoke("test") });
}

export function useN8nWorkflows() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["n8n_workflows"],
    queryFn: async () => {
      const { data, error } = await supabase.from("n8n_workflows" as any).select("*").order("nome");
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
  const sync = useMutation({
    mutationFn: () => invoke("sync"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["n8n_workflows"] }),
  });
  const toggle = useMutation({
    mutationFn: ({ n8n_workflow_id, ativo }: { n8n_workflow_id: string; ativo: boolean }) =>
      invoke(ativo ? "activate" : "deactivate", { n8n_workflow_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["n8n_workflows"] }),
  });
  return { ...query, sync, toggle };
}

export function useN8nBindings() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["n8n_bindings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("n8n_event_bindings" as any)
        .select("*, workflow:n8n_workflows(id, nome, n8n_workflow_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase.from("n8n_event_bindings" as any).upsert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["n8n_bindings"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("n8n_event_bindings" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["n8n_bindings"] }),
  });
  return { ...query, upsert, remove };
}

export function useN8nExecutions() {
  return useQuery({
    queryKey: ["n8n_executions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("n8n_executions" as any)
        .select("*, workflow:n8n_workflows(nome)")
        .order("started_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 15_000,
  });
}
