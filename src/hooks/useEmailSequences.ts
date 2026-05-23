import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmailSequence {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  trigger_type: "manual" | "stage_enter";
  trigger_stage_id: string | null;
  created_at: string;
}

export interface EmailSequenceStep {
  id: string;
  sequence_id: string;
  ordem: number;
  dia_offset: number;
  subject_template: string;
  body_template: string;
}

export interface SequenceEnrollment {
  id: string;
  sequence_id: string;
  deal_id: string | null;
  person_id: string | null;
  started_at: string;
  current_step: number;
  status: "active" | "completed" | "cancelled_replied" | "cancelled_manual";
  cancelled_reason: string | null;
}

export function useEmailSequences() {
  return useQuery({
    queryKey: ["email_sequences"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_sequences" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as EmailSequence[];
    },
  });
}

export function useSequenceWithSteps(id?: string) {
  return useQuery({
    queryKey: ["email_sequence", id],
    queryFn: async () => {
      if (!id) return null;
      const [seqR, stepsR] = await Promise.all([
        supabase.from("email_sequences" as any).select("*").eq("id", id).single(),
        supabase.from("email_sequence_steps" as any).select("*").eq("sequence_id", id).order("ordem"),
      ]);
      if (seqR.error) throw seqR.error;
      if (stepsR.error) throw stepsR.error;
      return { sequence: seqR.data as unknown as EmailSequence, steps: (stepsR.data || []) as unknown as EmailSequenceStep[] };
    },
    enabled: !!id,
  });
}

export function useCreateSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { nome: string; descricao?: string }) => {
      const { data, error } = await supabase.from("email_sequences" as any).insert({
        nome: payload.nome, descricao: payload.descricao || null, ativo: false, trigger_type: "manual",
      }).select("*").single();
      if (error) throw error;
      // seed one default step
      await supabase.from("email_sequence_steps" as any).insert({
        sequence_id: (data as any).id, ordem: 0, dia_offset: 0,
        subject_template: "Olá {{lead_nome}}",
        body_template: "Olá {{lead_nome}},\n\nEscrevo da {{responsavel_nome}}.\n\nAbraços",
      });
      return data as unknown as EmailSequence;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email_sequences"] }),
  });
}

export function useUpdateSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<EmailSequence> }) => {
      const { error } = await supabase.from("email_sequences" as any).update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["email_sequences"] });
      qc.invalidateQueries({ queryKey: ["email_sequence", vars.id] });
    },
  });
}

export function useDeleteSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_sequences" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email_sequences"] }),
  });
}

export function useSaveSteps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sequence_id, steps }: { sequence_id: string; steps: Array<Partial<EmailSequenceStep>> }) => {
      // Replace strategy
      await supabase.from("email_sequence_steps" as any).delete().eq("sequence_id", sequence_id);
      if (steps.length) {
        const rows = steps.map((s, i) => ({
          sequence_id,
          ordem: i,
          dia_offset: s.dia_offset ?? 0,
          subject_template: s.subject_template || "",
          body_template: s.body_template || "",
        }));
        const { error } = await supabase.from("email_sequence_steps" as any).insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["email_sequence", vars.sequence_id] }),
  });
}

export function useEnrollments(sequenceId?: string) {
  return useQuery({
    queryKey: ["sequence_enrollments", sequenceId],
    queryFn: async () => {
      let q = supabase.from("email_sequence_enrollments" as any).select("*").order("started_at", { ascending: false });
      if (sequenceId) q = q.eq("sequence_id", sequenceId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as SequenceEnrollment[];
    },
  });
}

export function useEnrollDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { sequence_id: string; deal_id: string; person_id?: string | null }) => {
      const { error } = await supabase.from("email_sequence_enrollments" as any).insert({
        sequence_id: payload.sequence_id,
        deal_id: payload.deal_id,
        person_id: payload.person_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequence_enrollments"] }),
  });
}

export function useProcessSequences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("process-email-sequences", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequence_enrollments"] }),
  });
}
