import { Outlet } from "react-router-dom";
import { SectionTabs } from "@/components/SectionTabs";

const tabs = [
  { label: "Financeiro", path: "/ceo" },
  { label: "Metas Comerciais", path: "/ceo/metas" },
  { label: "Saúde da Empresa", path: "/ceo/saude" },
  { label: "Pipeline & Forecast", path: "/ceo/pipeline" },
  { label: "Jurídico & Contratos", path: "/ceo/juridico" },
  { label: "Processos & Operacional", path: "/ceo/processos" },
  { label: "Memória Estratégica", path: "/ceo/memoria" },
];

export function CeoLayout() {
  return (
    <div className="flex flex-col flex-1">
      <SectionTabs tabs={tabs} />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
