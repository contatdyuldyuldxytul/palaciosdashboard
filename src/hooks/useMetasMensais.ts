import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface MetaMensal {
  id: string;
  mes_ano: string;
  leads_milena: number;
  leads_contatados_aline: number;
  demos_aline: number;
  contratos: number;
  minimo_viavel: number;
  receita_esperada: number;
  criado_em: string;
}

export interface MetaDistribuida {
  id: string;
  mes_ano: string;
  data: string;
  leads_milena_dia: number;
  leads_contatados_dia: number;
  demos_dia: number;
  criado_em: string;
}

export interface ChecklistCheck {
  id: string;
  data: string;
  colaborador: string;
  tarefa_id: string;
  tarefa_titulo: string;
  tarefa_tipo: string | null;
  concluido: boolean;
  concluido_em: string | null;
}

export interface RelatorioMeta {
  id: string;
  mes_ano: string;
  data_geracao: string;
  conteudo: string;
  tipo: string;
}

function getCurrentMesAno() {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}

export function useMetaMensal(mesAno?: string) {
  const key = mesAno || getCurrentMesAno();
  return useQuery({
    queryKey: ["metas_mensais", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas_mensais" as any)
        .select("*")
        .eq("mes_ano", key)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as MetaMensal | null;
    },
  });
}

export function useSaveMetaMensal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (meta: Omit<MetaMensal, "id" | "criado_em">) => {
      // Upsert by mes_ano
      const { data: existing } = await supabase
        .from("metas_mensais" as any)
        .select("id")
        .eq("mes_ano", meta.mes_ano)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("metas_mensais" as any)
          .update(meta as any)
          .eq("id", (existing as any).id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("metas_mensais" as any)
          .insert([meta] as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metas_mensais"] });
      toast({ title: "Metas salvas com sucesso!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar metas", description: err.message, variant: "destructive" });
    },
  });
}

export function useMetasDistribuidas(mesAno?: string) {
  const key = mesAno || getCurrentMesAno();
  return useQuery({
    queryKey: ["metas_distribuidas", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas_distribuidas" as any)
        .select("*")
        .eq("mes_ano", key)
        .order("data", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as MetaDistribuida[];
    },
  });
}

export function useSaveMetasDistribuidas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mesAno, dias }: { mesAno: string; dias: Array<{ data: string; leads_milena: number; leads_contatados: number; demos: number }> }) => {
      // Delete existing for this month
      await supabase.from("metas_distribuidas" as any).delete().eq("mes_ano", mesAno);
      
      const rows = dias.map(d => ({
        mes_ano: mesAno,
        data: d.data,
        leads_milena_dia: d.leads_milena,
        leads_contatados_dia: d.leads_contatados,
        demos_dia: d.demos,
      }));

      const { error } = await supabase.from("metas_distribuidas" as any).insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metas_distribuidas"] });
    },
  });
}

export function useChecklistChecks(colaborador: string) {
  const today = new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["checklist_checks", colaborador, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_checks" as any)
        .select("*")
        .eq("colaborador", colaborador)
        .eq("data", today);
      if (error) throw error;
      return (data || []) as unknown as ChecklistCheck[];
    },
  });
}

export function useToggleChecklistCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ colaborador, tarefa_id, tarefa_titulo, tarefa_tipo, concluido }: {
      colaborador: string; tarefa_id: string; tarefa_titulo: string; tarefa_tipo: string; concluido: boolean;
    }) => {
      const today = new Date().toISOString().split("T")[0];
      
      if (concluido) {
        const { error } = await supabase.from("checklist_checks" as any).insert([{
          data: today,
          colaborador,
          tarefa_id,
          tarefa_titulo,
          tarefa_tipo,
          concluido: true,
          concluido_em: new Date().toISOString(),
        }] as any);
        if (error) throw error;
      } else {
        await supabase.from("checklist_checks" as any)
          .delete()
          .eq("colaborador", colaborador)
          .eq("tarefa_id", tarefa_id)
          .eq("data", today);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist_checks"] });
    },
  });
}

export function useRelatoriosMeta(mesAno?: string) {
  const key = mesAno || getCurrentMesAno();
  return useQuery({
    queryKey: ["relatorios_meta", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relatorios_meta" as any)
        .select("*")
        .eq("mes_ano", key)
        .order("data_geracao", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as RelatorioMeta[];
    },
  });
}

export function useSaveRelatorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: { mes_ano: string; conteudo: string; tipo: string }) => {
      const { error } = await supabase.from("relatorios_meta" as any).insert([r] as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["relatorios_meta"] });
    },
  });
}
