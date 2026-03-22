import { Outlet } from "react-router-dom";
import { SectionTabs } from "@/components/SectionTabs";

const tabs = [
  { label: "Visão Estratégica", path: "/gestao" },
  { label: "Financeiro", path: "/gestao/financeiro" },
  { label: "Metas & Forecast", path: "/gestao/metas-forecast" },
  { label: "Documentos & Reuniões", path: "/gestao/documentos" },
  { label: "Assistente do Fundador", path: "/gestao/assistente" },
];

export function GestaoLayout() {
  return (
    <div className="flex flex-col flex-1">
      <SectionTabs tabs={tabs} />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
