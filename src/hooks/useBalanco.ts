import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Balanco {
  id: string;
  mes: string;
  caixa: number; banco: number;
  duplicatas_receber: number; estoques: number; outros_circulante: number;
  titulos_receber_lp: number; imobilizado: number; instalacoes: number;
  equipamentos: number; depreciacao: number;
  fornecedores_pagar: number; salarios_pagar: number; aluguel_pagar: number;
  impostos_recolher: number; emprestimos_cp: number;
  emprestimos_lp: number; financiamentos_lp: number;
  capital_social: number; resultado_acumulado: number;
  criado_em: string; atualizado_em: string;
}

export function useBalanco(mes?: string) {
  return useQuery({
    queryKey: ["balanco", mes],
    queryFn: async () => {
      let q = supabase.from("balanco" as any).select("*");
      if (mes) q = q.eq("mes", mes);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as Balanco[];
    },
  });
}

export function useUpsertBalanco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: Partial<Balanco> & { mes: string }) => {
      const { data, error } = await supabase
        .from("balanco" as any)
        .upsert([{ ...b, atualizado_em: new Date().toISOString() }] as any, { onConflict: "mes" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["balanco"] });
      toast({ title: "Balanço salvo!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}
