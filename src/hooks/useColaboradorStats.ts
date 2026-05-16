import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLeads } from "@/hooks/useLeads";
import { useMetasComerciais } from "@/hooks/useMetasComerciais";
import { useComissaoVendedorByName } from "@/hooks/useComissaoVendedor";

export type ColabKind = "sdr" | "ldr";

export interface ColabStats {
  kind: ColabKind;
  metaDemos: number;
  metaReceita: number;
  metaLeads: number;            // total_leads (Milena)
  meetingsAgendadas: number;
  meetingsRealized: number;
  leadsThisMonth: number;       // sheet leads count (Milena)
  closedValue: number;
  // % shown in the "META" big card on each member's dashboard
  primaryPct: number;
  // commission as displayed in the dashboard
  commission: number;
  fixedSalary: number;
  status: "excelente" | "no_caminho" | "atencao";
}

const FIXED_SALARY: Record<string, number> = {
  Aline: 2000,
  Felipe: 2000,
  Milena: 1500,
  Thiago: 0,
};

const KIND: Record<string, ColabKind> = {
  Aline: "sdr",
  Felipe: "sdr",
  Thiago: "sdr",
  Milena: "ldr",
};

function statusFromPct(pct: number): ColabStats["status"] {
  if (pct >= 80) return "excelente";
  if (pct >= 50) return "no_caminho";
  return "atencao";
}

export function useColaboradorStats(memberName: string): ColabStats {
  const kind = KIND[memberName] || "sdr";
  const mesMMYYYY = (() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  })();

  const { data: metasComerciais = [] } = useMetasComerciais(mesMMYYYY);
  const meta = metasComerciais[0] || null;
  const metaDemos = meta ? Number(meta.meta_demos) || 0 : 0;
  const metaReceita = meta ? Number(meta.meta_receita) || 0 : 0;
  const metaLeads = meta ? Number(meta.total_leads) || 0 : 0;

  // Leads from DB (used by SDRs)
  const { data: allLeads = [] } = useLeads();
  const myLeads = allLeads.filter(
    (l) => (l.responsavel_nome || "").toLowerCase().trim() === memberName.toLowerCase().trim(),
  );
  const closedValue = myLeads
    .filter((l) => l.status === "fechado")
    .reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0);

  // Meeting checks (used by SDRs for % meta)
  const [meetingsAgendadas, setMeetingsAgendadas] = useState(0);
  const [meetingsRealized, setMeetingsRealized] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function fetchChecks() {
      const { data } = await supabase
        .from("meeting_checks")
        .select("agendada, realizada")
        .eq("colaborador", memberName)
        .eq("mes", mesMMYYYY);
      if (cancelled) return;
      const rows = data || [];
      setMeetingsAgendadas(rows.filter((r: any) => r.agendada).length);
      setMeetingsRealized(rows.filter((r: any) => r.realizada).length);
    }
    fetchChecks();
    const ch = supabase
      .channel("meeting-checks-stats-" + memberName)
      .on("postgres_changes", { event: "*", schema: "public", table: "meeting_checks" }, fetchChecks)
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [memberName, mesMMYYYY]);

  // Sheet leads (used by Milena for % meta + commission)
  const { data: sheetLeads = [] } = useQuery({
    queryKey: ["milena-leads-sheets"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("milena-leads-sheets");
      if (error) throw error;
      if (!data?.success) return [];
      return (data.leads || []) as any[];
    },
    staleTime: 2 * 60 * 1000,
    enabled: kind === "ldr",
  });

  const leadsThisMonth = sheetLeads.length;
  const ldrClosedContractsValue = sheetLeads
    .filter((l) => (l.status || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === "fechado")
    .reduce((sum, l) => {
      const v = parseFloat((l.valor_contrato || "").toString().replace(/[^\d.,]/g, "").replace(",", "."));
      return sum + (isNaN(v) ? 0 : v);
    }, 0);

  const projetos = useComissaoVendedorByName(memberName);

  let commission = 0;
  let primaryPct = 0;
  if (kind === "sdr") {
    // EXACT formula from TeamMemberDashboard.tsx
    commission = 2000 + meetingsRealized * 30 + closedValue * 0.04 + projetos.comissao;
    primaryPct = metaDemos > 0 ? (meetingsAgendadas / metaDemos) * 100 : 0;
  } else {
    // EXACT formula from LdrMemberDashboard.tsx
    const leadCommission = leadsThisMonth * 1;
    const contractCommission = ldrClosedContractsValue * 0.01;
    commission = leadCommission + contractCommission + projetos.comissao;
    primaryPct = metaLeads > 0 ? (leadsThisMonth / metaLeads) * 100 : 0;
  }

  return {
    kind,
    metaDemos,
    metaReceita,
    metaLeads,
    meetingsAgendadas,
    meetingsRealized,
    leadsThisMonth,
    closedValue,
    primaryPct,
    commission,
    fixedSalary: FIXED_SALARY[memberName] ?? 0,
    status: statusFromPct(primaryPct),
  };
}
