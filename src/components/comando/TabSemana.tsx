import { useDailyActivities } from "@/hooks/useDailyActivities";
import { useCampaigns } from "@/hooks/useStrategy";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function todayISO() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
    .toISOString().slice(0, 10);
}

export function TabSemana() {
  const { data: activities = [], isLoading } = useDailyActivities({ date: todayISO(), days: 5 });
  const { data: campaigns = [] } = useCampaigns();

  const byUser: Record<string, { done: number; total: number }> = {};
  const byDay: Record<string, number> = {};
  for (const a of activities) {
    const k = a.assignee_label || "—";
    byUser[k] ||= { done: 0, total: 0 };
    byUser[k].total++;
    if (a.completed) byUser[k].done++;
    byDay[a.scheduled_date] = (byDay[a.scheduled_date] || 0) + 1;
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3">Próximos 5 dias úteis · por pessoa</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(byUser).map(([u, v]) => {
            const pct = v.total ? Math.round((v.done / v.total) * 100) : 0;
            return (
              <div key={u} className="rounded-lg border border-white/10 p-3">
                <p className="text-xs text-muted-foreground">{u}</p>
                <p className="text-lg font-semibold">{v.done}/{v.total}</p>
                <Progress value={pct} className="mt-2 h-1.5" />
              </div>
            );
          })}
          {Object.keys(byUser).length === 0 && (
            <p className="text-xs text-muted-foreground col-span-full">Nenhuma tarefa planejada para a semana.</p>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3">Carga por dia</h3>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(byDay).slice(0, 5).map(([d, n]) => (
            <div key={d} className="text-center rounded-md border border-white/10 p-2">
              <p className="text-[10px] text-muted-foreground">{d.slice(5)}</p>
              <p className="text-base font-semibold">{n}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3">Campanhas ativas</h3>
        <div className="space-y-2">
          {campaigns.filter((c: any) => c.status === "active").map((c: any) => (
            <div key={c.id} className="rounded-lg border border-white/10 p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">{c.name}</p>
                <Badge variant="outline" className="text-[10px]">{c.playbook_type}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{c.target_description}</p>
            </div>
          ))}
          {campaigns.filter((c: any) => c.status === "active").length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma campanha ativa.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
