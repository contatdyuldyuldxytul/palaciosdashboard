import { supabase } from "@/integrations/supabase/client";

const PAGE = 1000;

type Table = Parameters<typeof supabase.from>[0];

/**
 * Busca TODAS as linhas de uma tabela, contornando o limite de 1000 linhas do PostgREST.
 * Percorre em blocos de 1000 usando .range() até esgotar os registros.
 */
export async function fetchAll<T = any>(
  table: Table,
  select: string,
  build?: (q: any) => any,
  maxRows = 50000,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  while (from < maxRows) {
    let q: any = supabase.from(table as any).select(select as any);
    if (build) q = build(q);
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data || []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return out;
}
