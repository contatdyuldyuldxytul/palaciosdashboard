import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EntradaFinanceira {
  id: string;
  tipo: string;
  categoria: string;
  subcategoria: string | null;
  descricao: string;
  valor: number;
  data: string;
  recorrente: boolean;
  notas: string | null;
}

export function useFinanceiroEmpresa() {
  return useQuery({
    queryKey: ["financeiro_empresa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro_empresa")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return data as EntradaFinanceira[];
    },
  });
}

export function useFinanceiroClientes(clienteId?: string) {
  return useQuery({
    queryKey: ["financeiro_clientes", clienteId],
    queryFn: async () => {
      let query = supabase.from("financeiro_clientes").select("*").order("data_vencimento", { ascending: true });
      if (clienteId) query = query.eq("cliente_id", clienteId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: clienteId !== undefined || true,
  });
}
