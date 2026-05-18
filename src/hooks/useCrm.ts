import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface CrmPipeline {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
}

export interface CrmStage {
  id: string;
  pipeline_id: string;
  nome: string;
  ordem: number;
  cor: string | null;
  is_won: boolean;
  is_lost: boolean;
}

export interface CrmDeal {
  id: string;
  pipeline_id: string;
  stage_id: string;
  organization_id: string | null;
  person_id: string | null;
  titulo: string;
  valor: number;
  owner_user_id: string | null;
  owner_label: string | null;
  status: "open" | "won" | "lost";
  motivo_perda: string | null;
  expected_close_date: string | null;
  data_fechamento: string | null;
  stage_entered_at: string;
  pipedrive_id: number | null;
  origem: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  organization?: { id: string; nome: string } | null;
  person?: { id: string; nome: string; email: string | null; telefone: string | null } | null;
}

export function useCrmPipelines() {
  return useQuery({
    queryKey: ["crm", "pipelines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_pipelines")
        .select("*")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return (data || []) as CrmPipeline[];
    },
  });
}

export function useCrmStages(pipelineId?: string) {
  return useQuery({
    queryKey: ["crm", "stages", pipelineId],
    queryFn: async () => {
      if (!pipelineId) return [];
      const { data, error } = await supabase
        .from("crm_stages")
        .select("*")
        .eq("pipeline_id", pipelineId)
        .order("ordem");
      if (error) throw error;
      return (data || []) as CrmStage[];
    },
    enabled: !!pipelineId,
  });
}

export function useCrmDeals(pipelineId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["crm", "deals", pipelineId],
    queryFn: async () => {
      if (!pipelineId) return [];
      const { data, error } = await supabase
        .from("crm_deals")
        .select(
          "*, organization:crm_organizations(id,nome), person:crm_persons(id,nome,email,telefone)"
        )
        .eq("pipeline_id", pipelineId)
        .order("updated_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data || []) as CrmDeal[];
    },
    enabled: !!pipelineId,
  });

  // Realtime sync
  useEffect(() => {
    if (!pipelineId) return;
    const ch = supabase
      .channel(`crm-deals-${pipelineId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crm_deals", filter: `pipeline_id=eq.${pipelineId}` },
        () => qc.invalidateQueries({ queryKey: ["crm", "deals", pipelineId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [pipelineId, qc]);

  return query;
}

export function useMoveDealStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dealId, stageId }: { dealId: string; stageId: string }) => {
      const { error } = await supabase.from("crm_deals").update({ stage_id: stageId }).eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm", "deals"] }),
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      pipeline_id: string;
      stage_id: string;
      titulo: string;
      valor: number;
      owner_label?: string | null;
      organization_nome?: string | null;
      person_nome?: string | null;
      person_email?: string | null;
      person_telefone?: string | null;
    }) => {
      let organization_id: string | null = null;
      let person_id: string | null = null;

      if (payload.organization_nome) {
        const { data: org } = await supabase
          .from("crm_organizations")
          .insert({ nome: payload.organization_nome })
          .select("id")
          .single();
        organization_id = org?.id ?? null;
      }

      if (payload.person_nome) {
        const { data: pers } = await supabase
          .from("crm_persons")
          .insert({
            nome: payload.person_nome,
            email: payload.person_email || null,
            telefone: payload.person_telefone || null,
            organization_id,
          })
          .select("id")
          .single();
        person_id = pers?.id ?? null;
      }

      const { data, error } = await supabase
        .from("crm_deals")
        .insert({
          pipeline_id: payload.pipeline_id,
          stage_id: payload.stage_id,
          titulo: payload.titulo,
          valor: payload.valor,
          owner_label: payload.owner_label || null,
          organization_id,
          person_id,
          origem: "manual",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm", "deals"] }),
  });
}

export function useImportPipedrive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("import-pipedrive-once", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm"] });
    },
  });
}
