import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useCallback } from "react";

export interface PipedriveDeal {
  pipedrive_id: number;
  empresa: string;
  contato: string | null;
  status: string;
  valor_estimado: number;
  responsavel_nome: string | null;
  origem: string;
  data_criacao: string;
  data_atualizacao: string;
  data_fechamento: string | null;
  motivo_perda: string | null;
  expected_close_date: string | null;
  pipedrive_stage: string;
  days_in_stage: number;
  notas: string | null;
}

export interface PipedriveSummary {
  total_deals: number;
  active_deals: number;
  won_this_month: number;
  won_value_this_month: number;
  total_pipeline_value: number;
  synced_at: string;
}

export interface PipedriveData {
  deals: PipedriveDeal[];
  summary: PipedriveSummary;
}

async function fetchPipedriveData(): Promise<PipedriveData> {
  const { data, error } = await supabase.functions.invoke('sync-pipedrive');
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Sync failed');
  return { deals: data.deals, summary: data.summary };
}

export function usePipedrive(autoSyncInterval = 2 * 60 * 1000) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const query = useQuery({
    queryKey: ["pipedrive"],
    queryFn: fetchPipedriveData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const manualSync = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["pipedrive"] });
  }, [queryClient]);

  // Auto-sync every 2 minutes
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["pipedrive"] });
    }, autoSyncInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [queryClient, autoSyncInterval]);

  const lastSync = query.data?.summary?.synced_at || null;
  const minutesAgo = lastSync
    ? Math.floor((Date.now() - new Date(lastSync).getTime()) / 60000)
    : null;

  return {
    ...query,
    deals: query.data?.deals || [],
    summary: query.data?.summary || null,
    manualSync,
    lastSync,
    minutesAgo,
    isSyncing: query.isFetching,
  };
}

export function usePipedriveDealsForOwner(ownerName: string) {
  const { deals, ...rest } = usePipedrive();
  const filtered = deals.filter(d =>
    d.responsavel_nome?.toLowerCase().includes(ownerName.toLowerCase())
  );
  return { deals: filtered, ...rest };
}
