import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAddCustomActivity } from "@/hooks/useCustomActivities";

const TIPOS = [
  { value: "Email", label: "📧 Email" },
  { value: "WhatsApp", label: "📱 WhatsApp" },
  { value: "LinkedIn", label: "💼 LinkedIn" },
  { value: "Ligação", label: "📞 Ligação" },
  { value: "Follow-up", label: "🔄 Follow-up" },
  { value: "Outro", label: "📋 Outro" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultResponsavel?: string;
}

export function AddActivityModal({ open, onOpenChange, defaultResponsavel = "Aline" }: Props) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("Outro");
  const [date, setDate] = useState<Date>(new Date());
  const [responsavel, setResponsavel] = useState(defaultResponsavel);
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const addActivity = useAddCustomActivity();

  const handleSave = () => {
    if (!titulo.trim()) return;
    const dateStr = format(date, "yyyy-MM-dd");
    addActivity.mutate({
      titulo: titulo.trim(),
      tipo,
      data: dateStr,
      responsavel,
      descricao: descricao.trim() || undefined,
      quantidade: quantidade ? parseInt(quantidade) : undefined,
      criado_por: defaultResponsavel,
    }, {
      onSuccess: () => {
        setTitulo("");
        setTipo("Outro");
        setDate(new Date());
        setDescricao("");
        setQuantidade("");
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Nova Atividade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Título da atividade *</label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Ligar para cliente X" className="bg-muted/20 border-white/10" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="bg-muted/20 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Responsável</label>
              <Select value={responsavel} onValueChange={setResponsavel}>
                <SelectTrigger className="bg-muted/20 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aline">Aline</SelectItem>
                  <SelectItem value="Milena">Milena</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Data *</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-muted/20 border-white/10", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy") : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={d => d && setDate(d)}
                  disabled={d => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <p className="text-[10px] text-muted-foreground mt-1">Esta atividade aparecerá no checklist do dia selecionado</p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Descrição (opcional)</label>
            <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhes adicionais..." className="bg-muted/20 border-white/10 min-h-[60px]" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Quantidade (opcional)</label>
            <Input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)} placeholder="Ex: 10" className="bg-muted/20 border-white/10" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!titulo.trim() || addActivity.isPending}>
              {addActivity.isPending ? "Salvando..." : "Salvar Atividade"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
