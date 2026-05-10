import { useState } from "react";
import { useWeeklyReports } from "@/hooks/useStrategy";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw } from "lucide-react";

export function TabRelatorios() {
  const { data: reports = [], refetch } = useWeeklyReports();
  const [open, setOpen] = useState<string | null>(null);

  async function generate() {
    const { data, error } = await supabase.functions.invoke("generate-weekly-report");
    if (error) toast.error("Falha", { description: error.message });
    else { toast.success("Relatório gerado"); refetch(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={generate}>
          <RefreshCw className="w-4 h-4 mr-1" /> Gerar relatório da semana
        </Button>
      </div>
      {reports.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhum relatório ainda. Os relatórios são gerados automaticamente toda sexta às 17h.
        </Card>
      ) : (
        <div className="space-y-2">
          {reports.map((r: any) => (
            <Card key={r.id} className="p-3">
              <button
                className="w-full text-left"
                onClick={() => setOpen(open === r.id ? null : r.id)}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Semana {r.week_start} → {r.week_end}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {new Date(r.generated_at).toLocaleDateString("pt-BR")}
                  </Badge>
                </div>
                {r.narrative_text && <p className="text-xs text-muted-foreground mt-1">{r.narrative_text}</p>}
              </button>
              {open === r.id && (
                <pre className="mt-3 text-[10px] bg-black/30 rounded p-2 overflow-auto max-h-64">
                  {JSON.stringify(r.metrics, null, 2)}
                </pre>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
