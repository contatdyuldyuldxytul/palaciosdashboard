import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface MetaComercial {
  id: string; mes: string;
  total_leads: number; grupo_a_leads: number; grupo_b_leads: number;
  meta_demos: number; meta_contratos: number; meta_receita: number;
  minimo_viavel: number; criado_em: string;
  aprovado: boolean; aprovado_em: string | null;
}

export function useMetasComerciais(mes?: string) {
  return useQuery({
    queryKey: ["metas_comerciais", mes],
    queryFn: async () => {
      let q = supabase.from("metas_comerciais" as any).select("*");
      if (mes) q = q.eq("mes", mes);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as MetaComercial[];
    },
  });
}

export function useUpsertMetaComercial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Partial<MetaComercial> & { mes: string }) => {
      const { data, error } = await supabase
        .from("metas_comerciais" as any)
        .upsert([m] as any, { onConflict: "mes" })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metas_comerciais"] });
      toast({ title: "Meta comercial salva!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}
