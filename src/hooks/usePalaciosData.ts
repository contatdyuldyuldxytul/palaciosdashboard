import { useMemo } from "react";
import { useLancamentos } from "./useLancamentos";
import { useLeads } from "./useLeads";
import { useMetasComerciais } from "./useMetasComerciais";
import { format } from "date-fns";

function getMesAtual() {
  const now = new Date();
  return format(now, "MM/yyyy");
}

export function usePalaciosData() {
  const mes = getMesAtual();
  const lancamentos = useLancamentos(mes);
  const leads = useLeads();
  const metasQ = useMetasComerciais(mes);

  const data = useMemo(() => {
    const entries = lancamentos.data || [];
    const meta = metasQ.data?.[0];

    const entradas = entries.filter(e => e.classificacao === "Entrada");
    const saidas = entries.filter(e => e.classificacao === "Saída");

    const receita_mes = entradas.reduce((s, e) => s + Number(e.valor), 0);
    const despesas_mes = saidas.reduce((s, e) => s + Number(e.valor), 0);
    const resultado_mes = receita_mes - despesas_mes;

    const meta_receita = meta?.meta_receita || 0;
    const meta_demos = meta?.meta_demos || 0;
    const meta_contratos = meta?.meta_contratos || 0;
    const meta_leads = meta?.total_leads || 0;

    const perc_meta_receita = meta_receita > 0 ? (receita_mes / meta_receita) * 100 : 0;

    return {
      receita_mes,
      despesas_mes,
      resultado_mes,
      meta_receita,
      meta_demos,
      meta_contratos,
      meta_leads,
      perc_meta_receita,
      perc_meta_demos: 0,
    };
  }, [lancamentos.data, metasQ.data]);

  return {
    ...data,
    isLoading: lancamentos.isLoading || leads.isLoading || metasQ.isLoading,
  };
}
