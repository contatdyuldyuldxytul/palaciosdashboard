import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLancamentos } from "@/hooks/useLancamentos";
import { useClientesCEO, ClienteCEO, Parcela } from "@/hooks/useClientesCEO";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface MatchResult {
  unmatched: { id: string; data: string; descricao: string; valor: number }[];
  matchedCount: number;
}

/**
 * Matches "Entrada" lançamentos (Receitas Palacios/BKV) to parcelas of NON-recurring clients.
 * Strict rules:
 *  - Apelido must match as a whole token (word boundary).
 *  - Among candidates, the longest matching alias wins (more specific).
 *  - A pending parcela is marked "pago" only if (a) explicit percentual matches, or
 *    (b) the lançamento value matches the expected value within ±2%.
 *  - Recurring clients are skipped (they aggregate elsewhere).
 *  - Parcelas are recomputed from scratch each run (resets stale matches).
 */
export function useParcelaMatcher(): MatchResult {
  const { data: clientes } = useClientesCEO();
  const { data: lancamentos } = useLancamentos();
  const qc = useQueryClient();

  return useMemo<MatchResult>(() => {
    const cls = (clientes || []).filter((c) => !c.recorrente);
    const lcs = (lancamentos || []).filter(
      (l) =>
        l.classificacao === "Entrada" &&
        (l.categoria === "Receitas Palacios" || l.categoria === "Receitas BKV"),
    );

    const unmatched: MatchResult["unmatched"] = [];
    let matchedCount = 0;

    // Fresh working copy: reset all parcelas to pendente
    const work = new Map<string, Parcela[]>();
    cls.forEach((c) =>
      work.set(
        c.id,
        (c.parcelas || []).map((p) => ({
          numero: p.numero,
          percentual: p.percentual,
          dias_apos_inicio: p.dias_apos_inicio,
          data_prevista: p.data_prevista,
          status: "pendente" as const,
        })),
      ),
    );

    for (const lc of lcs) {
      const desc = norm(lc.descricao || "");
      const pctMatch = desc.match(/(\d{1,3})\s*%/);
      const declaredPct = pctMatch ? Number(pctMatch[1]) : null;

      // Find candidate clients by word-boundary alias match; pick most specific (longest alias)
      let best: { cliente: ClienteCEO; aliasLen: number; alias: string } | null = null;
      for (const c of cls) {
        const aliases = [c.empresa, ...(c.apelidos || [])].filter(Boolean);
        for (const a of aliases) {
          const na = norm(a);
          if (!na) continue;
          const re = new RegExp(`\\b${escapeRegex(na)}\\b`);
          if (re.test(desc)) {
            if (!best || na.length > best.aliasLen) {
              best = { cliente: c, aliasLen: na.length, alias: na };
            }
          }
        }
      }

      if (!best) {
        unmatched.push({ id: lc.id, data: lc.data, descricao: lc.descricao, valor: Number(lc.valor) });
        continue;
      }

      const cliente = best.cliente;
      const parcelas = work.get(cliente.id)!;
      const total = Number(cliente.valor_total) || 0;

      let target: Parcela | undefined;
      if (declaredPct !== null) {
        target = parcelas.find((p) => p.status === "pendente" && Math.round(p.percentual) === declaredPct);
      }
      if (!target && total > 0) {
        target = parcelas.find((p) => {
          if (p.status !== "pendente") return false;
          const expected = (p.percentual / 100) * total;
          if (expected <= 0) return false;
          return Math.abs(expected - Number(lc.valor)) / expected < 0.02;
        });
      }
      if (!target && declaredPct === null && best.aliasLen >= 5) {
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

    // Persist only when parcelas changed
    const updates: { id: string; parcelas: Parcela[] }[] = [];
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
}
