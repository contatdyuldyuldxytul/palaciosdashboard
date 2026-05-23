import { Outlet, Navigate, useLocation } from "react-router-dom";
import { SectionTabs } from "@/components/SectionTabs";

const TABS = [
  { label: "Núcleo Operacional", path: "/crm/atividades/nucleo" },
  { label: "Inteligência Comercial", path: "/crm/atividades/inteligencia" },
  { label: "Visão do Gestor", path: "/crm/atividades/gestor" },
];

export default function Atividades() {
  const loc = useLocation();
  if (loc.pathname === "/crm/atividades" || loc.pathname === "/crm/atividades/") {
    return <Navigate to="/crm/atividades/nucleo" replace />;
  }
  return (
    <div className="flex flex-col flex-1">
      <SectionTabs tabs={TABS} />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
