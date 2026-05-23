import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectPipeline {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  is_default: boolean;
}

export interface ProjectStage {
  id: string;
  pipeline_id: string;
  nome: string;
  ordem: number;
  cor: string | null;
  is_final: boolean;
}

export interface ProjectDeal {
  id: string;
  pipeline_id: string;
  stage_id: string;
  cliente_ativo_id: string | null;
  crm_deal_id: string | null;
  titulo: string;
  valor: number;
  progresso: number | null;
  responsavel_user_id: string | null;
  responsavel_label: string | null;
  status: string;
  stage_entered_at: string;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export function useProjectPipelines() {
  return useQuery({
    queryKey: ["projects", "pipelines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_pipelines" as any)
        .select("*")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return (data || []) as unknown as ProjectPipeline[];
    },
  });
}

export function useProjectStages(pipelineId?: string) {
  return useQuery({
    queryKey: ["projects", "stages", pipelineId],
    queryFn: async () => {
      if (!pipelineId) return [];
      const { data, error } = await supabase
        .from("project_stages" as any)
        .select("*")
        .eq("pipeline_id", pipelineId)
        .order("ordem");
      if (error) throw error;
      return (data || []) as unknown as ProjectStage[];
    },
    enabled: !!pipelineId,
  });
}

export function useProjectDeals(pipelineId?: string) {
  return useQuery({
    queryKey: ["projects", "deals", pipelineId],
    queryFn: async () => {
      if (!pipelineId) return [];
      const { data, error } = await supabase
        .from("project_deals" as any)
        .select("*")
        .eq("pipeline_id", pipelineId)
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as ProjectDeal[];
    },
    enabled: !!pipelineId,
  });
}

export function useMoveProjectStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stageId }: { id: string; stageId: string }) => {
      const { error } = await supabase
        .from("project_deals" as any)
        .update({ stage_id: stageId })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects", "deals"] }),
  });
}

export function useCreateProjectDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      pipeline_id: string;
      stage_id: string;
      titulo: string;
      valor?: number;
      cliente_ativo_id?: string | null;
      responsavel_label?: string | null;
    }) => {
      const { error } = await supabase.from("project_deals" as any).insert({
        pipeline_id: payload.pipeline_id,
        stage_id: payload.stage_id,
        titulo: payload.titulo,
        valor: payload.valor || 0,
        cliente_ativo_id: payload.cliente_ativo_id || null,
        responsavel_label: payload.responsavel_label || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects", "deals"] }),
  });
}

export function useDeleteProjectDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_deals" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects", "deals"] }),
  });
}

// Clientes ativos for "import existing" dropdown
export function useClientesAtivosLite() {
  return useQuery({
    queryKey: ["projects", "clientes-ativos-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes_ativos")
        .select("id, empresa, projeto, valor_total, status")
        .order("data_inicio", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
