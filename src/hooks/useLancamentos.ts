import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Lancamento {
  id: string;
  data: string;
  mes: string;
  classificacao: "Entrada" | "Saída";
  descricao: string;
  categoria: string;
  valor: number;
  criado_em: string;
}

export function useLancamentos(mes?: string) {
  return useQuery({
    queryKey: ["lancamentos", mes],
    queryFn: async () => {
      let q = supabase.from("lancamentos" as any).select("*").order("data", { ascending: false });
      if (mes) q = q.eq("mes", mes);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as Lancamento[];
    },
  });
}

export function useAddLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (l: Omit<Lancamento, "id" | "criado_em">) => {
      const { data, error } = await supabase
        .from("lancamentos" as any)
        .insert([l] as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lancamentos"] });
      toast({ title: "Lançamento adicionado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lancamentos" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lancamentos"] });
      toast({ title: "Lançamento removido" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}
