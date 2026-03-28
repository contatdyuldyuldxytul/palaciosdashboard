import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CustomActivity {
  id: string;
  titulo: string;
  tipo: string;
  data: string;
  responsavel: string;
  descricao: string | null;
  quantidade: number | null;
  criado_por: string | null;
  criado_em: string;
  concluido: boolean;
  concluido_em: string | null;
}

export function useCustomActivities(responsavel?: string, date?: string) {
  return useQuery({
    queryKey: ["custom_activities", responsavel, date],
    queryFn: async () => {
      let q = supabase.from("custom_activities" as any).select("*");
      if (responsavel) q = q.eq("responsavel", responsavel);
      if (date) q = q.eq("data", date);
      const { data, error } = await q.order("criado_em", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as CustomActivity[];
    },
  });
}

export function useCustomActivitiesForMonth(year: number, month: number) {
  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  
  return useQuery({
    queryKey: ["custom_activities_month", year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_activities" as any)
        .select("*")
        .gte("data", startDate)
        .lte("data", endDate)
        .order("criado_em", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as CustomActivity[];
    },
  });
}

export function useAddCustomActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (activity: {
      titulo: string;
      tipo: string;
      data: string;
      responsavel: string;
      descricao?: string;
      quantidade?: number;
      criado_por?: string;
    }) => {
      const { data, error } = await supabase
        .from("custom_activities" as any)
        .insert([activity] as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom_activities"] });
      qc.invalidateQueries({ queryKey: ["custom_activities_month"] });
      toast({ title: "✅ Atividade adicionada!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao adicionar atividade", description: err.message, variant: "destructive" });
    },
  });
}

export function useToggleCustomActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, concluido }: { id: string; concluido: boolean }) => {
      const { error } = await supabase
        .from("custom_activities" as any)
        .update({ concluido, concluido_em: concluido ? new Date().toISOString() : null } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom_activities"] });
      qc.invalidateQueries({ queryKey: ["custom_activities_month"] });
    },
  });
}
