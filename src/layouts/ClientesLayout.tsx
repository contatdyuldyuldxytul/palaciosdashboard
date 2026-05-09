import { Outlet } from "react-router-dom";
import { SectionTabs } from "@/components/SectionTabs";

const tabs = [
  { label: "Clientes Ativos", path: "/clientes" },
  { label: "Clientes Anteriores", path: "/clientes/anteriores" },
  { label: "Comissões", path: "/clientes/comissoes" },
];

export function ClientesLayout() {
  return (
    <div className="flex flex-col flex-1">
      <SectionTabs tabs={tabs} />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
