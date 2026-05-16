import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLancamentos } from "@/hooks/useLancamentos";
import { useClientesCEO, ClienteCEO, Parcela } from "@/hooks/useClientesCEO";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export interface MatchResult {
  unmatched: { id: string; data: string; descricao: string; valor: number }[];
  matchedCount: number;
}

/**
 * Auto-matches "Entrada" lançamentos (Receitas Palacios/BKV) to client parcelas.
 * Strategy: for each lançamento, find a client whose `apelidos` appear in `descricao`,
 * then a pending parcela whose percentual is referenced in the description, or whose
 * expected value matches the lançamento value (±5%).
 */
export function useParcelaMatcher(): MatchResult {
  const { data: clientes } = useClientesCEO();
  const { data: lancamentos } = useLancamentos();
  const qc = useQueryClient();

  const result = useMemo<MatchResult>(() => {
    const cls = clientes || [];
    const lcs = (lancamentos || []).filter(
      (l) =>
        l.classificacao === "Entrada" &&
        (l.categoria === "Receitas Palacios" || l.categoria === "Receitas BKV"),
    );

    const unmatched: MatchResult["unmatched"] = [];
    let matchedCount = 0;
    const updates: { id: string; parcelas: Parcela[] }[] = [];

    // Working copy of parcelas per client to avoid double-match
    const work = new Map<string, Parcela[]>();
    cls.forEach((c) => work.set(c.id, JSON.parse(JSON.stringify(c.parcelas || []))));

    for (const lc of lcs) {
      const desc = norm(lc.descricao || "");
      const pctMatch = desc.match(/(\d{1,3})\s*%/);
      const declaredPct = pctMatch ? Number(pctMatch[1]) : null;

      // find candidate client
      const cliente = cls.find((c) => {
        const aliases = [c.empresa, ...(c.apelidos || [])].filter(Boolean);
        return aliases.some((a) => desc.includes(norm(a)));
      });

      if (!cliente) {
        unmatched.push({ id: lc.id, data: lc.data, descricao: lc.descricao, valor: Number(lc.valor) });
        continue;
      }

      const parcelas = work.get(cliente.id)!;
      const total = Number(cliente.valor_total) || 0;

      // try percentual match first
      let target: Parcela | undefined;
      if (declaredPct !== null) {
        target = parcelas.find((p) => p.status === "pendente" && Math.round(p.percentual) === declaredPct);
      }
      // fallback: value match (±5%)
      if (!target && total > 0) {
        target = parcelas.find((p) => {
          if (p.status !== "pendente") return false;
          const expected = (p.percentual / 100) * total;
          return Math.abs(expected - Number(lc.valor)) / Math.max(expected, 1) < 0.05;
        });
      }
      // fallback: first pendente
      if (!target) {
        target = parcelas.find((p) => p.status === "pendente");
      }

      if (target) {
        target.status = "pago";
        target.valor_pago = Number(lc.valor);
        target.data_pagamento = lc.data;
        target.match_descricao = lc.descricao;
        matchedCount++;
      } else {
        unmatched.push({ id: lc.id, data: lc.data, descricao: lc.descricao, valor: Number(lc.valor) });
      }
    }

    // diff: only update clients whose parcelas changed
    for (const c of cls) {
      const newP = work.get(c.id)!;
      const oldJson = JSON.stringify(c.parcelas || []);
      const newJson = JSON.stringify(newP);
      if (oldJson !== newJson) updates.push({ id: c.id, parcelas: newP });
    }

    if (updates.length > 0) {
      Promise.all(
        updates.map((u) =>
          supabase.from("clientes_ativos").update({ parcelas: u.parcelas as any }).eq("id", u.id),
        ),
      ).then(() => qc.invalidateQueries({ queryKey: ["clientes_ceo"] }));
    }

    return { unmatched, matchedCount };
  }, [clientes, lancamentos, qc]);

  return result;
}
