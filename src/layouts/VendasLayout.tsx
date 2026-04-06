import { Outlet } from "react-router-dom";
import { SectionTabs } from "@/components/SectionTabs";

const tabs = [
  { label: "Funil de Vendas", path: "/vendas/funil" },
  
  { label: "Meus Leads", path: "/vendas" },
  { label: "Scripts", path: "/vendas/scripts" },
  { label: "Ligações", path: "/vendas/ligacoes" },
  { label: "Assistente de Vendas", path: "/vendas/assistente" },
];

export function VendasLayout() {
  return (
    <div className="flex flex-col flex-1">
      <SectionTabs tabs={tabs} />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
