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
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const TASK_TYPES = [
  { value: "custom", label: "📋 Manual" },
  { value: "strategic", label: "🎯 Estratégica" },
  { value: "followup", label: "🔄 Follow-up" },
  { value: "reactivation", label: "💫 Reativação" },
  { value: "cadence", label: "📅 Cadência" },
  { value: "meeting", label: "🤝 Reunião" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assigneeLabel: string;
  pipedriveUserId?: number | null;
}

export function AddDailyActivityModal({ open, onOpenChange, assigneeLabel, pipedriveUserId }: Props) {
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState("custom");
  const [date, setDate] = useState<Date>(new Date());
  const [priority, setPriority] = useState("5");
  const [notes, setNotes] = useState("");
  const qc = useQueryClient();

  const addTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("daily_activities").insert({
        assignee_label: assigneeLabel,
        user_pipedrive_id: pipedriveUserId ?? null,
        scheduled_date: format(date, "yyyy-MM-dd"),
        task_type: taskType as any,
        task_description: description.trim(),
        priority: parseInt(priority) || 5,
        source: "manual",
        notes: notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Tarefa criada!", description: `Atribuída para ${assigneeLabel}` });
      qc.invalidateQueries({ queryKey: ["daily_activities"] });
      setDescription("");
      setNotes("");
      setTaskType("custom");
      setPriority("5");
      setDate(new Date());
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Erro ao criar tarefa", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Nova Tarefa para {assigneeLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Descrição *</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Ligar para cliente X sobre proposta"
              className="bg-muted/20 border-white/10 min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger className="bg-muted/20 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Prioridade (1-10)</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="bg-muted/20 border-white/10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Data *</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-muted/20 border-white/10")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notas (opcional)</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-muted/20 border-white/10 min-h-[50px]" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => addTask.mutate()} disabled={!description.trim() || addTask.isPending}>
              {addTask.isPending ? "Criando..." : "Criar Tarefa"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
