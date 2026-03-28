import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PipedriveDeal } from "@/hooks/usePipedrive";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deals: PipedriveDeal[];
}

export function FollowUpModal({ open, onOpenChange, deals }: Props) {
  const sorted = useMemo(() => {
    return [...deals].sort((a, b) => b.days_in_stage - a.days_in_stage);
  }, [deals]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-white/10 max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">🔄 Follow-up com Decisores ({deals.length} contatos)</DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          {sorted.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum contato pendente.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-white/10">
                    <th className="text-left pb-2 font-medium">Empresa</th>
                    <th className="text-left pb-2 font-medium">Contato</th>
                    <th className="text-left pb-2 font-medium">Dias no funil</th>
                    <th className="text-left pb-2 font-medium">Último contato</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(d => (
                    <tr key={d.pipedrive_id} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className="py-2 text-foreground font-medium">{d.empresa}</td>
                      <td className="py-2 text-muted-foreground">{d.contato || "—"}</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${d.days_in_stage >= 10 ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>
                          {d.days_in_stage} dias
                        </span>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {d.data_atualizacao ? new Date(d.data_atualizacao).toLocaleDateString("pt-BR") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
