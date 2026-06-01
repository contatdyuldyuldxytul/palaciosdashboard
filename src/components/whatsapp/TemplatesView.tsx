import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Zap } from "lucide-react";
import { useWhatsAppTemplates, useTemplateActions } from "@/hooks/useWhatsApp";
import { toast } from "@/hooks/use-toast";

export default function TemplatesView() {
  const { data: templates } = useWhatsAppTemplates();
  const { create, update, remove } = useTemplateActions();
  const [editing, setEditing] = useState<{ id?: string; nome: string; conteudo: string } | null>(null);

  const save = () => {
    if (!editing?.nome.trim() || !editing.conteudo.trim()) return toast({ title: "Preencha nome e conteúdo", variant: "destructive" });
    const mutation = editing.id
      ? update.mutate({ id: editing.id, nome: editing.nome, conteudo: editing.conteudo }, { onSuccess: () => { setEditing(null); toast({ title: "Salvo" }); } })
      : create.mutate({ nome: editing.nome, conteudo: editing.conteudo }, { onSuccess: () => { setEditing(null); toast({ title: "Template criado" }); } });
    return mutation;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="glass-card rounded-xl border border-white/10 p-4 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Seus templates</h3>
          <Button size="sm" onClick={() => setEditing({ nome: "", conteudo: "" })}><Plus className="w-3.5 h-3.5 mr-1" /> Novo</Button>
        </div>
        {!templates?.length && <p className="text-xs text-muted-foreground py-4 text-center">Nenhum template ainda.</p>}
        <div className="space-y-1">
          {templates?.map((t) => (
            <div key={t.id} className="rounded-lg p-3 border border-white/10 bg-white/[0.02] flex items-start gap-2">
              <button onClick={() => setEditing({ id: t.id, nome: t.nome, conteudo: t.conteudo })} className="flex-1 text-left">
                <div className="text-xs font-semibold text-foreground">{t.nome}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-2">{t.conteudo}</div>
              </button>
              <Button size="sm" variant="ghost" className="text-red-400" onClick={() => { if (confirm("Excluir?")) remove.mutate(t.id); }}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-xl border border-white/10 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{editing?.id ? "Editar template" : editing ? "Novo template" : "Selecione um template"}</h3>
        {editing ? (
          <>
            <div>
              <Label className="text-[11px]">Nome</Label>
              <Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} className="bg-white/5 border-white/10 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-[11px]">Conteúdo (use {"{{nome}}"}, {"{{primeiro_nome}}"}, {"{{empresa}}"})</Label>
              <Textarea rows={8} value={editing.conteudo} onChange={(e) => setEditing({ ...editing, conteudo: e.target.value })} className="bg-white/5 border-white/10 text-sm" />
            </div>
            <div className="flex gap-2">
              <Button onClick={save}>Salvar</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Clique em um template à esquerda ou crie um novo.</p>
        )}
      </div>
    </div>
  );
}
