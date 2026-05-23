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

export function useFlows() {
  return useQuery({
    queryKey: ["flows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flows" as any)
        .select("*")
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

export function useCreateFlow() {
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
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as Flow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flows"] }),
  });
}

export function useUpdateFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Flow> }) => {
      const { error } = await supabase.from("flows" as any).update(patch as any).eq("id", id);
      if (error) throw error;
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
      const { error } = await supabase.from("flows" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flows"] }),
  });
}
