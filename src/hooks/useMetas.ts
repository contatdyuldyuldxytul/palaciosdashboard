import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Meta {
  id: string;
  periodo: string;
  mes: string | null;
  ano: number;
  meta_receita: number;
  realizado_receita: number;
  meta_leads: number;
  realizado_leads: number;
  meta_reunioes: number;
  realizado_reunioes: number;
  meta_contratos: number;
  realizado_contratos: number;
}

export function useMetas() {
  return useQuery({
    queryKey: ["metas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas")
        .select("*")
        .order("ano", { ascending: false });
      if (error) throw error;
      return data as Meta[];
    },
  });
}
