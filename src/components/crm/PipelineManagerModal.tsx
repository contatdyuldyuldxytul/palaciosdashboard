import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Plus, User } from "lucide-react";
import {
  useCrmPipelines,
  useDeletePipeline,
  FLOW_TYPE_LABELS,
  CrmPipeline,
} from "@/hooks/useCrm";
import { PipelineEditorModal } from "./PipelineEditorModal";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function PipelineManagerModal({ open, onOpenChange }: Props) {
  const { data: pipelines = [] } = useCrmPipelines();
  const del = useDeletePipeline();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CrmPipeline | null>(null);

  const startNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const startEdit = (p: CrmPipeline) => {
    setEditing(p);
    setEditorOpen(true);
  };
  const handleDelete = async (p: CrmPipeline) => {
    if (!confirm(`Desativar pipeline "${p.nome}"? Os deals serão preservados.`)) return;
    try {
      await del.mutateAsync(p.id);
      toast({ title: "Pipeline desativado" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-background border-white/10 max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center justify-between">
              <span>Gerenciar Pipelines</span>
              <Button size="sm" onClick={startNew}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Novo
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {pipelines.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum pipeline ativo.</p>
            )}
            {pipelines.map((p) => (
              <div key={p.id} className="glass-card rounded-lg p-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">{p.nome}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{FLOW_TYPE_LABELS[p.flow_type]}</span>
                    {p.owner_label && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {p.owner_label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(p)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(p)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <PipelineEditorModal open={editorOpen} onOpenChange={setEditorOpen} pipeline={editing} />
    </>
  );
}
