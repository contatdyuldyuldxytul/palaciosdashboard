import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCrmPipelines, useCrmStages } from "@/hooks/useCrm";

interface Props {
  dealId: string | null;
  currentPipelineId?: string | null;
  onClose: () => void;
  onMoved?: () => void;
}

export function MoveToPipelineDialog({ dealId, currentPipelineId, onClose, onMoved }: Props) {
  const { data: pipelines = [] } = useCrmPipelines();
  const [targetPipelineId, setTargetPipelineId] = useState<string | null>(null);
  const { data: targetStages = [] } = useCrmStages(targetPipelineId || undefined);
  const qc = useQueryClient();

  const handleMove = async (stageId: string, pipelineName: string, stageName: string) => {
    if (!dealId) return;
    try {
      const { error } = await supabase
        .from("crm_deals")
        .update({
          pipeline_id: targetPipelineId,
          stage_id: stageId,
          stage_entered_at: new Date().toISOString(),
        })
        .eq("id", dealId);
      if (error) throw error;
      toast({ title: `Movido para ${pipelineName} · ${stageName}` });
      qc.invalidateQueries({ queryKey: ["crm"] });
      qc.invalidateQueries({ queryKey: ["crm", "deal", dealId] });
      onMoved?.();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setTargetPipelineId(null);
      onClose();
    }
  };

  const visiblePipelines = currentPipelineId
    ? pipelines.filter((p) => p.id !== currentPipelineId)
    : pipelines;

  return (
    <Dialog
      open={!!dealId}
      onOpenChange={(o) => {
        if (!o) {
          setTargetPipelineId(null);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {targetPipelineId ? "Escolher etapa…" : "Mover para qual pipeline?"}
          </DialogTitle>
        </DialogHeader>

        {!targetPipelineId ? (
          <div className="grid grid-cols-1 gap-1.5 mt-2">
            {visiblePipelines.map((p) => (
              <button
                key={p.id}
                onClick={() => setTargetPipelineId(p.id)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left text-sm border border-white/5"
              >
                <span className="text-foreground font-medium">{p.nome}</span>
                {p.owner_label && (
                  <span className="text-[10px] text-muted-foreground">{p.owner_label}</span>
                )}
              </button>
            ))}
            {visiblePipelines.length === 0 && (
              <div className="text-xs text-muted-foreground py-4 text-center">
                Nenhum outro pipeline disponível.
              </div>
            )}
          </div>
        ) : (
          <>
            <button
              onClick={() => setTargetPipelineId(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors mb-1"
            >
              ← Voltar aos pipelines
            </button>
            <div className="grid grid-cols-1 gap-1.5">
              {targetStages.map((s) => {
                const pipelineName = pipelines.find((p) => p.id === targetPipelineId)?.nome || "";
                return (
                  <button
                    key={s.id}
                    onClick={() => handleMove(s.id, pipelineName, s.nome)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left text-sm"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.cor || "#3b82f6" }} />
                    <span className="text-foreground">{s.nome}</span>
                  </button>
                );
              })}
              {targetStages.length === 0 && (
                <div className="text-xs text-muted-foreground py-4 text-center">Carregando etapas…</div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
