import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface FluxoCaixa {
  id: string; mes: string;
  recebimentos_clientes_proj: number; recebimentos_clientes_real: number;
  pagamentos_fornecedores_proj: number; pagamentos_fornecedores_real: number;
  pagamento_pessoal_proj: number; pagamento_pessoal_real: number;
  pagamento_despesas_proj: number; pagamento_despesas_real: number;
  impostos_proj: number; impostos_real: number;
  aquisicao_imobilizado_proj: number; aquisicao_imobilizado_real: number;
  venda_ativos_proj: number; venda_ativos_real: number;
  outros_investimentos_proj: number; outros_investimentos_real: number;
  captacao_emprestimos_proj: number; captacao_emprestimos_real: number;
  pagamento_emprestimos_proj: number; pagamento_emprestimos_real: number;
  aporte_capital_proj: number; aporte_capital_real: number;
  criado_em: string; atualizado_em: string;
}

export function useFluxoCaixa(mes?: string) {
  return useQuery({
    queryKey: ["fluxo_caixa", mes],
    queryFn: async () => {
      let q = supabase.from("fluxo_caixa" as any).select("*");
      if (mes) q = q.eq("mes", mes);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as FluxoCaixa[];
    },
  });
}

export function useUpsertFluxoCaixa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (f: Partial<FluxoCaixa> & { mes: string }) => {
      const { data, error } = await supabase
        .from("fluxo_caixa" as any)
        .upsert([{ ...f, atualizado_em: new Date().toISOString() }] as any, { onConflict: "mes" })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fluxo_caixa"] });
      toast({ title: "Fluxo de caixa salvo!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}
