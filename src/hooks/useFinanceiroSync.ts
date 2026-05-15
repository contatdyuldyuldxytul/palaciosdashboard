import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const LS_KEY = "lastFinanceiroSync";

export function useFinanceiroSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem(LS_KEY));
  const queryClient = useQueryClient();

  const sync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-financeiro-sheets", { body: {} });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha na sincronização");

      const now = new Date().toISOString();
      setLastSync(now);
      localStorage.setItem(LS_KEY, now);

      toast({
        title: "Planilha financeira sincronizada",
        description: `${data.entradaSaidas ?? 0} lançamentos + ${data.salarioThiago ?? 0} salário Thiago`,
      });

      queryClient.invalidateQueries();
      return data;
    } catch (err: any) {
      toast({
        title: "Erro ao sincronizar planilha",
        description: err?.message || "Tente novamente em instantes",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, queryClient]);

  return { sync, isSyncing, lastSync };
}
