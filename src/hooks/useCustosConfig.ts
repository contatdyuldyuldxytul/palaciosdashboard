import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CustosConfig {
  id: string; mes: string;
  pessoal: number; aluguel: number; condominio_iptu: number;
  energia_agua_telefone: number; internet_ti: number;
  marketing_publicidade: number; contabilidade_juridico: number;
  financeiro_bancario: number; depreciacao: number; seguros: number;
  veiculos: number; diretoria_prolabore: number; outros_fixos: number;
  preco_venda_unitario: number; gastos_variaveis_unitarios: number;
  volume_vendas: number;
  criado_em: string; atualizado_em: string;
}

export function useCustosConfig(mes?: string) {
  return useQuery({
    queryKey: ["custos_config", mes],
    queryFn: async () => {
      let q = supabase.from("custos_config" as any).select("*");
      if (mes) q = q.eq("mes", mes);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as CustosConfig[];
    },
  });
}

export function useUpsertCustosConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Partial<CustosConfig> & { mes: string }) => {
      const { data, error } = await supabase
        .from("custos_config" as any)
        .upsert([{ ...c, atualizado_em: new Date().toISOString() }] as any, { onConflict: "mes" })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custos_config"] });
      toast({ title: "Custos salvos!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}
