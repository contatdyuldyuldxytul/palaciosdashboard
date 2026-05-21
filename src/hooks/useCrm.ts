import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export type PipelineFlowType = "cadencia_10_dias" | "nutricao" | "vendas" | "personalizado";

export interface CrmPipeline {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  flow_type: PipelineFlowType;
  owner_user_id: string | null;
  owner_label: string | null;
  sheet_id: string | null;
  sheet_tab: string | null;
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

export function useCrmOrganizations() {
  return useQuery({
    queryKey: ["crm", "organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_organizations")
        .select("id,nome")
        .limit(5000);
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useCrmPersons() {
  return useQuery({
    queryKey: ["crm", "persons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_persons")
        .select("id,nome,email,telefone")
        .limit(5000);
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useCrmDeals(pipelineId?: string) {
  const orgsQ = useCrmOrganizations();
  const personsQ = useCrmPersons();

  const query = useQuery({
    queryKey: ["crm", "deals", pipelineId],
    queryFn: async () => {
      if (!pipelineId) return [];
      const { data, error } = await supabase
        .from("crm_deals")
        .select("*")
        .eq("pipeline_id", pipelineId)
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as CrmDeal[];
    },
    enabled: !!pipelineId,
    staleTime: 60_000,
  });

  const deals = useMemo(() => {
    const orgMap = new Map((orgsQ.data || []).map((o: any) => [o.id, o]));
    const personMap = new Map((personsQ.data || []).map((p: any) => [p.id, p]));
    return (query.data || []).map((d) => ({
      ...d,
      organization: d.organization_id ? (orgMap.get(d.organization_id) as any) || null : null,
      person: d.person_id ? (personMap.get(d.person_id) as any) || null : null,
    })) as CrmDeal[];
  }, [query.data, orgsQ.data, personsQ.data]);

  return { ...query, data: deals };
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

// ============ Pipeline CRUD ============

export interface StageInput {
  id?: string;
  nome: string;
  ordem: number;
  cor: string;
  is_won?: boolean;
  is_lost?: boolean;
}

export const FLOW_TYPE_LABELS: Record<PipelineFlowType, string> = {
  cadencia_10_dias: "Fluxo de Cadência 10 Dias",
  nutricao: "Fluxo de Nutrição",
  vendas: "Fluxo de Vendas",
  personalizado: "Fluxo Personalizado",
};

export const FLOW_TYPE_STAGE_TEMPLATES: Record<PipelineFlowType, StageInput[]> = {
  cadencia_10_dias: [
    { nome: "Dia 1 – Contato", ordem: 0, cor: "#3b82f6" },
    { nome: "Dia 3 – Follow-up", ordem: 1, cor: "#8b5cf6" },
    { nome: "Dia 5 – Material", ordem: 2, cor: "#ec4899" },
    { nome: "Dia 7 – Call", ordem: 3, cor: "#f59e0b" },
    { nome: "Dia 10 – Decisão", ordem: 4, cor: "#10b981" },
  ],
  nutricao: [
    { nome: "Frio", ordem: 0, cor: "#64748b" },
    { nome: "Engajado", ordem: 1, cor: "#3b82f6" },
    { nome: "Quente", ordem: 2, cor: "#f59e0b" },
    { nome: "Pronto p/ Vendas", ordem: 3, cor: "#10b981" },
  ],
  vendas: [
    { nome: "Lead", ordem: 0, cor: "#3b82f6" },
    { nome: "Qualificado", ordem: 1, cor: "#8b5cf6" },
    { nome: "Proposta", ordem: 2, cor: "#f59e0b" },
    { nome: "Negociação", ordem: 3, cor: "#ec4899" },
    { nome: "Ganho", ordem: 4, cor: "#10b981", is_won: true },
    { nome: "Perdido", ordem: 5, cor: "#ef4444", is_lost: true },
  ],
  personalizado: [
    { nome: "Nova Etapa", ordem: 0, cor: "#3b82f6" },
  ],
};

export function useCollaborators() {
  return useQuery({
    queryKey: ["crm", "collaborators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, colaborador_slug, status")
        .eq("status", "approved")
        .order("full_name");
      if (error) throw error;
      return (data || []) as Array<{ id: string; full_name: string; email: string | null; colaborador_slug: string | null; status: string }>;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      nome: string;
      flow_type: PipelineFlowType;
      owner_user_id?: string | null;
      owner_label?: string | null;
      stages: StageInput[];
    }) => {
      const { data: maxRow } = await supabase
        .from("crm_pipelines")
        .select("ordem")
        .order("ordem", { ascending: false })
        .limit(1)
        .maybeSingle();
      const ordem = (maxRow?.ordem ?? -1) + 1;

      const { data: pipe, error } = await supabase
        .from("crm_pipelines")
        .insert({
          nome: payload.nome,
          ordem,
          ativo: true,
          flow_type: payload.flow_type,
          owner_user_id: payload.owner_user_id ?? null,
          owner_label: payload.owner_label ?? null,
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      if (payload.stages.length > 0) {
        const { error: sErr } = await supabase.from("crm_stages").insert(
          payload.stages.map((s) => ({
            pipeline_id: pipe.id,
            nome: s.nome,
            ordem: s.ordem,
            cor: s.cor,
            is_won: !!s.is_won,
            is_lost: !!s.is_lost,
          })),
        );
        if (sErr) throw sErr;
      }
      return pipe;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm"] }),
  });
}

export function useUpdatePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      nome?: string;
      flow_type?: PipelineFlowType;
      owner_user_id?: string | null;
      owner_label?: string | null;
      ativo?: boolean;
      sheet_id?: string | null;
      sheet_tab?: string | null;
    }) => {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("crm_pipelines").update(rest as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm"] }),
  });
}

export function useDeletePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // soft-delete: set ativo=false to preserve deals
      const { error } = await supabase.from("crm_pipelines").update({ ativo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm"] }),
  });
}

export function useReplaceStages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pipeline_id, stages }: { pipeline_id: string; stages: StageInput[] }) => {
      // Upsert existing + insert new + delete removed
      const { data: current } = await supabase.from("crm_stages").select("id").eq("pipeline_id", pipeline_id);
      const currentIds = new Set((current || []).map((s: any) => s.id));
      const keepIds = new Set(stages.filter((s) => s.id).map((s) => s.id!));
      const toDelete = [...currentIds].filter((id) => !keepIds.has(id as string));

      for (const s of stages) {
        if (s.id) {
          await supabase.from("crm_stages").update({
            nome: s.nome, ordem: s.ordem, cor: s.cor, is_won: !!s.is_won, is_lost: !!s.is_lost,
          }).eq("id", s.id);
        } else {
          await supabase.from("crm_stages").insert({
            pipeline_id, nome: s.nome, ordem: s.ordem, cor: s.cor, is_won: !!s.is_won, is_lost: !!s.is_lost,
          });
        }
      }
      if (toDelete.length) {
        await supabase.from("crm_stages").delete().in("id", toDelete as string[]);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm"] }),
  });
}

export function useImportCrmCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      pipeline_id: string;
      default_stage_id: string;
      rows: Array<{
        titulo: string;
        valor?: number;
        empresa?: string;
        contato?: string;
        email?: string;
        telefone?: string;
        owner?: string;
        stage_nome?: string;
      }>;
      stages: CrmStage[];
    }) => {
      const stageByName = new Map(payload.stages.map((s) => [s.nome.toLowerCase(), s.id]));
      let ok = 0;
      for (const r of payload.rows) {
        if (!r.titulo?.trim()) continue;
        let organization_id: string | null = null;
        let person_id: string | null = null;

        if (r.empresa?.trim()) {
          const { data: org } = await supabase
            .from("crm_organizations")
            .insert({ nome: r.empresa.trim() })
            .select("id")
            .single();
          organization_id = org?.id ?? null;
        }
        if (r.contato?.trim()) {
          const { data: per } = await supabase
            .from("crm_persons")
            .insert({
              nome: r.contato.trim(),
              email: r.email?.trim() || null,
              telefone: r.telefone?.trim() || null,
              organization_id,
            })
            .select("id")
            .single();
          person_id = per?.id ?? null;
        }

        const stage_id = (r.stage_nome && stageByName.get(r.stage_nome.toLowerCase())) || payload.default_stage_id;

        const { error } = await supabase.from("crm_deals").insert({
          pipeline_id: payload.pipeline_id,
          stage_id,
          titulo: r.titulo.trim(),
          valor: r.valor || 0,
          owner_label: r.owner || null,
          organization_id,
          person_id,
          origem: "csv",
        });
        if (!error) ok++;
      }
      return { imported: ok, total: payload.rows.length };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm"] }),
  });
}

