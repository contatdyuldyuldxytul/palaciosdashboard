import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Flow {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  trigger_config: any;
  nodes: any[];
  edges: any[];
  created_at: string;
  updated_at: string;
}

export type FlowScope = "projects" | "deals";

export function useFlows(scope: FlowScope = "projects") {
  return useQuery({
    queryKey: ["flows", scope],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flows" as any)
        .select("*")
        .eq("scope", scope)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Flow[];
    },
  });
}

export function useFlow(id?: string) {
  return useQuery({
    queryKey: ["flows", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("flows" as any)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as Flow;
    },
    enabled: !!id,
  });
}

export function useCreateFlow(scope: FlowScope = "projects") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { nome: string; descricao?: string }) => {
      const { data, error } = await supabase
        .from("flows" as any)
        .insert({
          nome: payload.nome,
          descricao: payload.descricao || null,
          ativo: false,
          nodes: [],
          edges: [],
          trigger_config: {},
          scope,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as Flow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flows", scope] }),
  });
}

export function useUpdateFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Flow> }) => {
      // Auto-sync trigger_config from the trigger node so the DB enrollment trigger can match it.
      let finalPatch: any = { ...patch };
      const nodes = (patch as any).nodes;
      if (Array.isArray(nodes)) {
        const triggerNode = nodes.find((n: any) => n?.data?.kind === "trigger");
        const cfg = triggerNode?.data?.config || {};
        if (cfg.event === "stage_enter" && cfg.pipeline_id && cfg.stage_id) {
          finalPatch.trigger_config = { type: "crm_stage_enter", pipeline_id: cfg.pipeline_id, stage_id: cfg.stage_id };
        } else if (cfg.event) {
          finalPatch.trigger_config = { type: cfg.event };
        }
      }
      const { data, error } = await supabase
        .from("flows" as any)
        .update(finalPatch as any)
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Sem permissão para salvar este fluxo ou o registro não foi encontrado.");
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      qc.invalidateQueries({ queryKey: ["flows", vars.id] });
    },
  });
}

export function useDeleteFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("flows" as any).delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Sem permissão para excluir este fluxo.");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flows"] }),
  });
}
