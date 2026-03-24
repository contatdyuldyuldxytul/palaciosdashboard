import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type LeadStatus = "lead" | "contatado" | "reuniao_agendada" | "reuniao_realizada" | "proposta" | "fechado" | "perdido";

export interface Lead {
  id: string;
  empresa: string;
  contato: string | null;
  cargo: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  status: LeadStatus;
  responsavel_nome: string | null;
  responsavel_id: string | null;
  origem: string | null;
  notas: string | null;
  valor_estimado: number;
  data_criacao: string;
  data_atualizacao: string;
  motivo_perda: string | null;
}

const statusDisplayMap: Record<LeadStatus, string> = {
  lead: "Entrada de Leads",
  contatado: "Tentando Contato",
  reuniao_agendada: "Demo Agendada",
  reuniao_realizada: "Porta Aberta",
  proposta: "Proposta",
  fechado: "Fechado",
  perdido: "Perdido",
};

export const getStatusDisplay = (status: LeadStatus) => statusDisplayMap[status] || status;

export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("data_criacao", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });
}

export function useAddLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lead: Partial<Lead>) => {
      const { data, error } = await supabase.from("leads").insert([lead as any]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead adicionado com sucesso!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao adicionar lead", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      const { data, error } = await supabase
        .from("leads")
        .update({ ...updates, data_atualizacao: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead atualizado!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    },
  });
}
