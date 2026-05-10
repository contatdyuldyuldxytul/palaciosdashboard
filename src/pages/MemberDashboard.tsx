import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabHoje } from "@/components/comando/TabHoje";
import { useDailyActivities } from "@/hooks/useDailyActivities";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Props {
  memberName: string;
  initials: string;
  color: string;
  role?: string;
}

function todayISO() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
    .toISOString().slice(0, 10);
}

export default function MemberDashboard({ memberName, initials, color, role }: Props) {
  const { data: weekActivities = [] } = useDailyActivities({ assignee: memberName, date: todayISO(), days: 5 });
  const total = weekActivities.length;
  const done = weekActivities.filter((a) => a.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <header className="mb-6 flex items-center gap-3">
        <span
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
          style={{ background: color }}
        >
          {initials}
        </span>
        <div>
          <h1 className="text-2xl font-semibold">{memberName}</h1>
          {role && <p className="text-xs text-muted-foreground">{role}</p>}
        </div>
      </header>

      <Tabs defaultValue="hoje">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="hoje">Hoje</TabsTrigger>
          <TabsTrigger value="semana">Semana</TabsTrigger>
        </TabsList>
        <TabsContent value="hoje"><TabHoje assignee={memberName} /></TabsContent>
        <TabsContent value="semana">
          <Card className="p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Próximos 5 dias úteis</p>
              <span className="text-xl font-semibold">{done}/{total}</span>
            </div>
            <Progress value={pct} />
          </Card>
          <div className="space-y-2">
            {weekActivities.map((a) => (
              <Card key={a.id} className={`p-3 text-sm ${a.completed ? "opacity-50" : ""}`}>
                <p>{a.task_description}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{a.scheduled_date}</p>
              </Card>
            ))}
            {total === 0 && <p className="text-xs text-muted-foreground text-center py-6">Sem tarefas planejadas.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
