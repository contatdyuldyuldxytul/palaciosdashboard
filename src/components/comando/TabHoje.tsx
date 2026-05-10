import { useDailyActivities, useToggleActivity } from "@/hooks/useDailyActivities";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

const sourceColors: Record<string, string> = {
  auto: "bg-white/10 text-muted-foreground",
  manual: "bg-blue-500/20 text-blue-300",
  claude_briefing: "bg-emerald-500/20 text-emerald-300",
};

const sourceLabel: Record<string, string> = {
  auto: "cadência",
  manual: "manual",
  claude_briefing: "claude",
};

export function TabHoje({ assignee }: { assignee?: string }) {
  const { profile } = useAuth();
  // If no specific assignee, infer from profile (default Aline)
  const eff = assignee ?? guessAssignee(profile?.full_name ?? profile?.email ?? "");
  const { data: activities = [], isLoading } = useDailyActivities({ assignee: eff });
  const toggle = useToggleActivity();

  const total = activities.length;
  const done = activities.filter((a) => a.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-medium">{eff ? `Tarefas de ${eff}` : "Suas tarefas"}</p>
            <p className="text-xs text-muted-foreground">
              {done} de {total} concluídas hoje
            </p>
          </div>
          <span className="text-2xl font-semibold">{pct}%</span>
        </div>
        <Progress value={pct} />
      </Card>

      {total === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhuma tarefa para hoje. Importe uma estratégia ou aguarde a geração automática (23h).
        </Card>
      ) : (
        <ul className="space-y-2">
          {activities.slice(0, 10).map((a) => (
            <li key={a.id}>
              <Card className={`p-3 flex items-start gap-3 transition-opacity ${a.completed ? "opacity-50" : ""}`}>
                <Checkbox
                  className="mt-1 h-5 w-5"
                  checked={a.completed}
                  onCheckedChange={(v) => toggle.mutate({ id: a.id, completed: !!v })}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${a.completed ? "line-through" : ""}`}>{a.task_description}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] ${sourceColors[a.source]}`}>
                      {sourceLabel[a.source]}
                    </Badge>
                    {a.priority >= 8 && <Badge className="text-[10px] bg-red-500/20 text-red-300">alta</Badge>}
                    {a.related_deal_id && (
                      <a
                        href={`https://palacios3dstudio.pipedrive.com/deal/${a.related_deal_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Pipedrive <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function guessAssignee(s: string): string | undefined {
  const x = s.toLowerCase();
  if (x.includes("thiago")) return "Thiago";
  if (x.includes("aline")) return "Aline";
  if (x.includes("milena")) return "Milena";
  if (x.includes("felipe")) return "Felipe";
  return undefined;
}
