import { useState } from "react";
import { LayoutGrid, Workflow, Shield } from "lucide-react";
import { ProjectsKanban } from "@/components/crm/projects/ProjectsKanban";
import { N8nAutomations } from "@/components/crm/projects/N8nAutomations";
import { AdminPlaceholder } from "@/components/crm/projects/AdminPlaceholder";

type Tab = "kanban" | "fluxos" | "admin";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "kanban", label: "Kanban", icon: LayoutGrid },
  { id: "fluxos", label: "Automações N8N", icon: Workflow },
  { id: "admin", label: "Admin", icon: Shield },
];

export default function Projects() {
  const [tab, setTab] = useState<Tab>("kanban");

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-5">
      <div>
        <h1 className="text-lg md:text-xl font-semibold text-foreground tracking-tight">Projects</h1>
        <p className="text-[11px] text-muted-foreground mt-1">
          Acompanhamento de projetos, fluxos automatizados e painel administrativo.
        </p>
      </div>

      <div className="flex rounded-full border border-white/10 overflow-x-auto glass-card p-0.5 w-fit max-w-full [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap flex-shrink-0 ${
                tab === t.id ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3 h-3" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "kanban" && <ProjectsKanban />}
      {tab === "fluxos" && <FlowsList />}
      {tab === "admin" && <AdminPlaceholder />}
    </div>
  );
}
