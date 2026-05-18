import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateDeal, CrmStage } from "@/hooks/useCrm";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineId: string;
  stages: CrmStage[];
}

const OWNERS = ["Aline", "Milena", "Felipe", "Thiago"];

export function NewDealModal({ open, onOpenChange, pipelineId, stages }: Props) {
  const [titulo, setTitulo] = useState("");
  const [valor, setValor] = useState("");
  const [stageId, setStageId] = useState<string>("");
  const [owner, setOwner] = useState<string>("");
  const [empresa, setEmpresa] = useState("");
  const [contato, setContato] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  const create = useCreateDeal();

  const reset = () => {
    setTitulo(""); setValor(""); setStageId(""); setOwner("");
    setEmpresa(""); setContato(""); setEmail(""); setTelefone("");
  };

  const submit = async () => {
    if (!titulo.trim() || !stageId) {
      toast({ title: "Preencha título e estágio", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({
        pipeline_id: pipelineId,
        stage_id: stageId,
        titulo: titulo.trim(),
        valor: parseFloat(valor.replace(",", ".")) || 0,
        owner_label: owner || null,
        organization_nome: empresa.trim() || null,
        person_nome: contato.trim() || null,
        person_email: email.trim() || null,
        person_telefone: telefone.trim() || null,
      });
      toast({ title: "Deal criado" });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao criar deal", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Novo Deal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Construtora ABC - Projeto residencial" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$)</Label>
              <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="20000" />
            </div>
            <div>
              <Label>Estágio *</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Responsável</Label>
            <Select value={owner} onValueChange={setOwner}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {OWNERS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Empresa</Label>
            <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contato</Label>
              <Input value={contato} onChange={(e) => setContato(e.target.value)} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>E-mail</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? "Criando..." : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
