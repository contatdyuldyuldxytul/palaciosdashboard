import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface PlanejamentoDia {
  id: string;
  mes_ano: string;
  data: string;
  dia_semana: string;
  ciclo_dia: number;
  grupo: string | null;
  responsavel: string;
  tarefas_json: any;
  aprovado: boolean;
  aprovado_em: string | null;
  editado: boolean;
  criado_em: string;
}

function getCurrentMesAno() {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}

export function usePlanejamentoMensal(mesAno?: string) {
  const key = mesAno || getCurrentMesAno();
  return useQuery({
    queryKey: ["planejamento_mensal", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planejamento_mensal" as any)
        .select("*")
        .eq("mes_ano", key)
        .order("data", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as PlanejamentoDia[];
    },
  });
}

export function usePlanejamentoHoje(colaborador: string) {
  const today = new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["planejamento_hoje", colaborador, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planejamento_mensal" as any)
        .select("*")
        .eq("data", today)
        .eq("aprovado", true);
      if (error) throw error;
      const all = (data || []) as unknown as PlanejamentoDia[];
      // Filter by responsavel containing the colaborador name
      return all.filter(d => 
        (d.responsavel || "").toLowerCase().includes(colaborador.toLowerCase()) ||
        d.responsavel === "Ambas"
      );
    },
  });
}

export function useSavePlanejamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dias: Array<Omit<PlanejamentoDia, "id" | "criado_em">>) => {
      if (dias.length === 0) return;
      const mesAno = dias[0].mes_ano;
      // Delete existing plan for this month
      await supabase.from("planejamento_mensal" as any).delete().eq("mes_ano", mesAno);
      // Insert new plan
      const { error } = await supabase.from("planejamento_mensal" as any).insert(dias as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planejamento_mensal"] });
      qc.invalidateQueries({ queryKey: ["planejamento_hoje"] });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar planejamento", description: err.message, variant: "destructive" });
    },
  });
}

export function useApprovePlanejamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mesAno: string) => {
      const { error } = await supabase
        .from("planejamento_mensal" as any)
        .update({ aprovado: true, aprovado_em: new Date().toISOString() } as any)
        .eq("mes_ano", mesAno);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planejamento_mensal"] });
      qc.invalidateQueries({ queryKey: ["planejamento_hoje"] });
      toast({ title: "✅ Planejamento aprovado!", description: "O checklist do time foi ativado." });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao aprovar", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdatePlanejamentoDia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tarefas_json }: { id: string; tarefas_json: any }) => {
      const { error } = await supabase
        .from("planejamento_mensal" as any)
        .update({ tarefas_json, editado: true } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planejamento_mensal"] });
    },
  });
}
