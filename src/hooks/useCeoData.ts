import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFinanceiroEmpresa, useFinanceiroClientes } from "./useFinanceiro";
import { useLeads } from "./useLeads";
import { useMetas } from "./useMetas";
import { useClientes } from "./useClientes";
import { toast } from "@/hooks/use-toast";

export interface StrategicDecision {
  id: string;
  user_id: string;
  data: string;
  tipo: string;
  titulo: string;
  descricao: string;
  resultado_esperado: string | null;
  tags: string[];
  arquivado: boolean;
  created_at: string;
  updated_at: string;
}

export function useStrategicDecisions() {
  return useQuery({
    queryKey: ["strategic_decisions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategic_decisions" as any)
        .select("*")
        .eq("arquivado", false)
        .order("data", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as StrategicDecision[];
    },
  });
}

export function useAddStrategicDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (decision: Partial<StrategicDecision>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("strategic_decisions" as any)
        .insert([{ ...decision, user_id: user.id }] as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategic_decisions"] });
      toast({ title: "Registro salvo com sucesso!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });
}

export function useChecklist() {
  return useQuery({
    queryKey: ["checklist_projetos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_projetos")
        .select("*")
        .order("etapa", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useComissoes() {
  return useQuery({
    queryKey: ["comissoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comissoes")
        .select("*")
        .order("mes_referencia", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useReunioes() {
  return useQuery({
    queryKey: ["reunioes_realizadas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reunioes_realizadas")
        .select("*")
        .order("data_reuniao", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

// Aggregation helpers
export function useCeoFinanceiro() {
  const finEmpresa = useFinanceiroEmpresa();
  const finClientes = useFinanceiroClientes();
  return { finEmpresa, finClientes };
}

export function useCeoComercial() {
  const leads = useLeads();
  const metas = useMetas();
  return { leads, metas };
}

export function useCeoOperacional() {
  const clientes = useClientes();
  const checklist = useChecklist();
  return { clientes, checklist };
}

export { useFinanceiroEmpresa, useFinanceiroClientes, useLeads, useMetas, useClientes };
