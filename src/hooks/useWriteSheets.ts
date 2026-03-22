import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface WriteBackParams {
  tab: string;
  action: "append" | "update" | "find_and_update";
  record: Record<string, any>;
  row_index?: number;
  match_field?: string;
  match_value?: string;
}

export async function writeToSheets(params: WriteBackParams) {
  try {
    const { data, error } = await supabase.functions.invoke("write-sheets", {
      body: params,
    });
    if (error) throw error;
    return data;
  } catch (err: any) {
    console.error("Write-back error:", err);
    toast({
      title: "Erro ao salvar na planilha",
      description: err.message || "Falha ao escrever no Google Sheets",
      variant: "destructive",
    });
    throw err;
  }
}
