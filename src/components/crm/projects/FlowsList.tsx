import { useState } from "react";
import { Plus, Trash2, Workflow, Pencil, Circle } from "lucide-react";
import { useFlows, useCreateFlow, useDeleteFlow, useUpdateFlow, type Flow } from "@/hooks/useFlows";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FlowEditor } from "./FlowEditor";
import { toast } from "@/hooks/use-toast";

export function FlowsList() {
  const { data: flows = [], isLoading } = useFlows();
  const create = useCreateFlow();
  const del = useDeleteFlow();
  const update = useUpdateFlow();
  const [newOpen, setNewOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const submit = async () => {
    if (!nome.trim()) return;
    try {
      const f = await create.mutateAsync({ nome: nome.trim(), descricao: descricao.trim() });
      setNome(""); setDescricao(""); setNewOpen(false);
      setEditingId(f.id);
    } catch (e: any) {
      toast({ title: "Erro ao criar fluxo", description: e.message, variant: "destructive" });
    }
  };

  if (editingId) {
    return <FlowEditor flowId={editingId} onClose={() => setEditingId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Fluxos do Processo</h2>
          <p className="text-xs text-muted-foreground">Automatize emails, WhatsApp e atualizações por etapa do projeto.</p>
        </div>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo Fluxo
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-32 glass-card rounded-xl animate-pulse" />)}
        </div>
      ) : flows.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground">
          <Workflow className="w-10 h-10 mx-auto mb-3 opacity-40" />
          Nenhum fluxo ainda. Crie seu primeiro fluxo automatizado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {flows.map((f: Flow) => (
            <div key={f.id} className="glass-card rounded-xl p-4 space-y-3 border border-white/10 hover:bg-white/[0.06] transition">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{f.nome}</div>
                  {f.descricao && <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{f.descricao}</div>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Switch
                    checked={f.ativo}
                    onCheckedChange={async (v) => {
                      try { await update.mutateAsync({ id: f.id, patch: { ativo: v } as any }); } catch {}
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Circle className={`w-2 h-2 ${f.ativo ? "fill-emerald-400 text-emerald-400" : "fill-muted text-muted"}`} />
                  {f.ativo ? "Ativo" : "Pausado"}
                </span>
                <span>{(f.nodes?.length || 0)} nodes</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="flex-1" onClick={() => setEditingId(f.id)}>
                  <Pencil className="w-3 h-3 mr-1.5" /> Editar
                </Button>
                <Button
                  size="sm" variant="ghost"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => { if (confirm("Excluir fluxo?")) del.mutate(f.id); }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo fluxo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Onboarding cliente" className="bg-white/5 border-white/10" />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} className="bg-white/5 border-white/10" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setNewOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={submit} disabled={!nome.trim() || create.isPending}>Criar e abrir editor</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
