import { Check, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CrmPipeline, FLOW_TYPE_LABELS, useDeletePipeline } from "@/hooks/useCrm";
import { toast } from "@/hooks/use-toast";

interface Props {
  pipelines: CrmPipeline[];
  currentId: string;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onCreate: () => void;
}

export function PipelineSwitcher({ pipelines, currentId, onSelect, onEdit, onCreate }: Props) {
  const del = useDeletePipeline();
  const current = pipelines.find((p) => p.id === currentId);

  const handleDelete = async () => {
    if (!current) return;
    if (!confirm(`Desativar pipeline "${current.nome}"? Os deals serão preservados.`)) return;
    try {
      await del.mutateAsync(current.id);
      toast({ title: "Pipeline desativado" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="group flex items-center gap-2 px-3.5 py-2 rounded-xl glass-card border border-white/10 hover:border-primary/40 transition-all">
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">
              Pipeline
            </div>
            <div className="text-sm font-semibold text-foreground mt-0.5 leading-none">
              {current?.nome || "Selecionar"}
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-72 bg-background border-white/10">
        <DropdownMenuLabel className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Pipeline ativo</span>
          {current && (
            <button
              onClick={() => onEdit(current.id)}
              className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
              title="Editar pipeline atual"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-white/10" />

        <div className="max-h-72 overflow-y-auto">
          {pipelines.map((p) => {
            const active = p.id === currentId;
            return (
              <DropdownMenuItem
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="flex items-start gap-2 cursor-pointer focus:bg-white/5"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{p.nome}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {FLOW_TYPE_LABELS[p.flow_type]}
                    {p.owner_label ? ` · ${p.owner_label}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {active && <Check className="w-4 h-4 text-primary" />}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(p.id);
                    }}
                    className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
                    title="Editar"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem onClick={onCreate} className="cursor-pointer text-primary focus:text-primary focus:bg-primary/10">
          <Plus className="w-4 h-4 mr-2" /> Novo pipeline
        </DropdownMenuItem>
        {current && (
          <DropdownMenuItem onClick={handleDelete} className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10">
            <Trash2 className="w-4 h-4 mr-2" /> Desativar pipeline atual
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
