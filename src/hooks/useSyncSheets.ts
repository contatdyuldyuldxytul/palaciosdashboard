import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const SYNC_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MIN_SYNC_GAP_MS = 2 * 60 * 60 * 1000; // never auto-sync more than once every 2h

const SYNC_INVALIDATE_KEYS: string[][] = [
  ["lancamentos"],
  ["leads"],
  ["clientes_ativos"],
  ["balanco"],
  ["fluxo_caixa"],
  ["custos_config"],
  ["financeiro_empresa"],
  ["financeiro_clientes"],
  ["metas"],
  ["metas_mensais"],
  ["metas_comerciais"],
];

interface SyncResult {
  success: boolean;
  synced_at: string;
  results: Record<string, { success: boolean; count: number; error?: string }>;
}

export function useSyncSheets() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(
    localStorage.getItem("lastSheetSync")
  );
  const [autoSync, setAutoSync] = useState(
    localStorage.getItem("autoSyncEnabled") !== "false"
  );
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sync = useCallback(async (tabs?: string[], silent = false) => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-sheets", {
        body: tabs ? { tabs } : {},
      });

      if (error) throw error;

      const result = data as SyncResult;
      const syncTime = result.synced_at;
      setLastSync(syncTime);
      localStorage.setItem("lastSheetSync", syncTime);

      const failedTabs = Object.entries(result.results)
        .filter(([, r]) => !r.success)
        .map(([name, r]) => `${name}: ${r.error}`);

      const successCount = Object.values(result.results).filter((r) => r.success).length;
      const totalRows = Object.values(result.results).reduce((sum, r) => sum + r.count, 0);

      if (!silent) {
        if (failedTabs.length > 0) {
          toast({
            title: `Sincronizado parcialmente`,
            description: `${successCount} abas ok (${totalRows} registros). Erros: ${failedTabs.join("; ")}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sincronização concluída!",
            description: `${successCount} abas sincronizadas — ${totalRows} registros importados`,
          });
        }
      }

      SYNC_INVALIDATE_KEYS.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));
      return result;
    } catch (err: any) {
      if (!silent) {
        toast({
          title: "Erro na sincronização",
          description: err.message || "Falha ao conectar com Google Sheets",
          variant: "destructive",
        });
      }
      console.error("Auto-sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, queryClient]);

  const toggleAutoSync = useCallback((enabled: boolean) => {
    setAutoSync(enabled);
    localStorage.setItem("autoSyncEnabled", String(enabled));
  }, []);

  // Auto-sync interval — paused while tab is hidden
  useEffect(() => {
    if (!autoSync) return;
    intervalRef.current = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      const last = localStorage.getItem("lastSheetSync");
      if (last && Date.now() - new Date(last).getTime() < MIN_SYNC_GAP_MS) return;
      sync(undefined, true);
    }, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoSync, sync]);

  return { sync, isSyncing, lastSync, autoSync, toggleAutoSync };
}
