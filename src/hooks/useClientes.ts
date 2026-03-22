import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Cliente {
  id: string;
  empresa: string;
  projeto: string;
  contato: string | null;
  email: string | null;
  telefone: string | null;
  status: string;
  data_inicio: string | null;
  data_previsao: string | null;
  valor_total: number;
  qtd_imagens: number;
  inclui_modelagem: boolean;
  segundos_animacao: number;
  progresso: number;
  notas: string | null;
}

export function useClientes() {
  return useQuery({
    queryKey: ["clientes_ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes_ativos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Cliente[];
    },
  });
}

export function useAddCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cliente: Partial<Cliente>) => {
      const { data, error } = await supabase.from("clientes_ativos").insert(cliente).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes_ativos"] });
      toast({ title: "Cliente adicionado!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });
}
