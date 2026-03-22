import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();

  const sync = async (tabs?: string[]) => {
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

      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();

      return result;
    } catch (err: any) {
      toast({
        title: "Erro na sincronização",
        description: err.message || "Falha ao conectar com Google Sheets",
        variant: "destructive",
      });
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  return { sync, isSyncing, lastSync };
}
