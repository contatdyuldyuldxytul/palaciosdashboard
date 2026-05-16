import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Parcela {
  numero: number;
  percentual: number;
  dias_apos_inicio: number;
  data_prevista: string;
  status: "pendente" | "pago";
  valor_pago?: number;
  data_pagamento?: string;
  match_descricao?: string;
}

export interface ClienteCEO {
  id: string;
  empresa: string;
  projeto: string;
  valor_total: number;
  data_inicio: string | null;
  parcelas: Parcela[];
  tem_imagens: boolean;
  qtd_imagens: number;
  tem_animacao: boolean;
  segundos_animacao: number;
  tem_tour_virtual: boolean;
  valor_tour_virtual: number;
  servicos_adicionais: string | null;
  valor_servicos_adicionais: number;
  tem_software: boolean;
  plano_software: string | null;
  apelidos: string[];
  concluido_em: string | null;
  notas: string | null;
  status: string;
  recorrente: boolean;
  vendedor_id: string | null;
  created_at: string;
}

export function useClientesCEO() {
  return useQuery({
    queryKey: ["clientes_ceo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes_ativos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ClienteCEO[];
    },
  });
}

export function useAddClienteCEO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cliente: Partial<ClienteCEO>) => {
      const { data, error } = await supabase
        .from("clientes_ativos")
        .insert([cliente as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes_ceo"] });
      toast({ title: "Cliente cadastrado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateClienteCEO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ClienteCEO> }) => {
      const { error } = await supabase.from("clientes_ativos").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes_ceo"] }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpsertClienteCEO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id?: string; patch: Partial<ClienteCEO> }) => {
      if (id) {
        const { error } = await supabase.from("clientes_ativos").update(patch as any).eq("id", id);
        if (error) throw error;
        return { id };
      } else {
        const { data, error } = await supabase.from("clientes_ativos").insert([patch as any]).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["clientes_ceo"] });
      toast({ title: vars.id ? "Cliente atualizado!" : "Cliente cadastrado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteClienteCEO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes_ativos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes_ceo"] });
      toast({ title: "Cliente removido" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export interface VendedorOption { id: string; nome: string; }
export function useVendedores() {
  return useQuery({
    queryKey: ["vendedores_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name");
      if (error) throw error;
      return (data || []).map((p: any) => ({ id: p.id, nome: p.full_name })) as VendedorOption[];
    },
  });
}
