import { Outlet, Navigate, useLocation } from "react-router-dom";
import { SectionTabs } from "@/components/SectionTabs";

const TABS = [
  { label: "Instagram", path: "/crm/geracao-leads/instagram" },
  { label: "Pipedrive", path: "/crm/geracao-leads/pipedrive" },
  { label: "Hunter", path: "/crm/geracao-leads/hunter" },
];

export default function GeracaoLeads() {
  const loc = useLocation();
  if (loc.pathname === "/crm/geracao-leads" || loc.pathname === "/crm/geracao-leads/") {
    return <Navigate to="/crm/geracao-leads/instagram" replace />;
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
