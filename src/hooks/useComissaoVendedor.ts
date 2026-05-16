import { useMemo } from "react";
import { useClientesCEO } from "@/hooks/useClientesCEO";
import { useLancamentos } from "@/hooks/useLancamentos";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function profileIdByName(profiles: { id: string; full_name: string }[], name: string): string | null {
  const n = norm(name);
  const found = profiles.find((p) => norm(p.full_name || "").includes(n));
  return found?.id || null;
}

/**
 * Computes 4% commission on payments received this month for clients
 * where vendedor_id matches the given seller. Includes parcela payments
 * (clientes normais) and matched lançamentos (clientes recorrentes).
 */
export function useComissaoVendedorByName(memberName: string, mes?: string) {
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles_min"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name");
      return (data || []) as { id: string; full_name: string }[];
    },
  });
  const { data: clientes = [] } = useClientesCEO();
  const { data: lancamentos = [] } = useLancamentos();

  return useMemo(() => {
    const userId = profileIdByName(profiles, memberName);
    if (!userId) return { totalRecebido: 0, comissao: 0, clientesCount: 0 };

    const mine = clientes.filter((c) => c.vendedor_id === userId);
    if (mine.length === 0) return { totalRecebido: 0, comissao: 0, clientesCount: 0 };

    const monthFilter = mes || new Date().toISOString().slice(0, 7); // YYYY-MM

    // Parcelas pagas no mês (clientes normais)
    let total = 0;
    for (const c of mine.filter((c) => !c.recorrente)) {
      for (const p of c.parcelas || []) {
        if (p.status === "pago" && p.data_pagamento && p.data_pagamento.startsWith(monthFilter)) {
          total += Number(p.valor_pago) || 0;
        }
      }
    }

    // Lançamentos para clientes recorrentes no mês
    const recurrents = mine.filter((c) => c.recorrente);
    if (recurrents.length > 0) {
      const entradas = lancamentos.filter(
        (l) =>
          l.classificacao === "Entrada" &&
          (l.categoria === "Receitas Palacios" || l.categoria === "Receitas BKV") &&
          (l.data || "").startsWith(monthFilter),
      );
      for (const lc of entradas) {
        const desc = norm(lc.descricao || "");
        const hit = recurrents.find((c) => {
          const aliases = [c.empresa, ...(c.apelidos || [])].filter(Boolean);
          return aliases.some((a) => {
            const na = norm(a);
            return na && new RegExp(`\\b${escapeRegex(na)}\\b`).test(desc);
          });
        });
        if (hit) total += Number(lc.valor) || 0;
      }
    }

    return { totalRecebido: total, comissao: total * 0.04, clientesCount: mine.length };
  }, [profiles, clientes, lancamentos, memberName, mes]);
}
