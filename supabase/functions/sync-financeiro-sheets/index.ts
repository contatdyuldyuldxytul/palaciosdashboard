import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ----- Google auth -----
async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));
  const signInput = `${header}.${payload}`;
  const pemContents = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(signInput)
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${header}.${payload}.${sig}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!tokenRes.ok) throw new Error(`Google token failed [${tokenRes.status}]: ${await tokenRes.text()}`);
  return (await tokenRes.json()).access_token;
}

async function readRange(token: string, spreadsheetId: string, range: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Read "${range}" failed [${res.status}]: ${await res.text()}`);
  const data = await res.json();
  return (data.values || []) as string[][];
}

// ----- Helpers -----
const norm = (s: any) => String(s ?? "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().trim();

function parseBRNumber(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  let s = String(v).trim();
  s = s.replace(/[R$\s]/g, "");
  // If it has both . and , → . is thousand sep
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  s = s.replace(/[^\d.\-]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseBRDate(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim();
  // DD/MM/YYYY or DD/MM/YY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let [_, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // ISO?
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, janeiro: 1, fev: 2, fevereiro: 2, mar: 3, marco: 3,
  abr: 4, abril: 4, mai: 5, maio: 5, jun: 6, junho: 6,
  jul: 7, julho: 7, ago: 8, agosto: 8, set: 9, setembro: 9,
  out: 10, outubro: 10, nov: 11, novembro: 11, dez: 12, dezembro: 12,
};

function detectMonth(text: string): { month: number; year?: number } | null {
  const n = norm(text);
  for (const key of Object.keys(MONTH_MAP)) {
    if (n.includes(key)) {
      const yMatch = n.match(/(20\d{2})/);
      return { month: MONTH_MAP[key], year: yMatch ? parseInt(yMatch[1]) : undefined };
    }
  }
  return null;
}

// ----- Parsing logic -----

interface ParsedLancamento {
  data: string;
  tipo: "receita" | "despesa";
  categoria: string;
  subcategoria?: string | null;
  descricao: string;
  valor: number;
  notas: string;
}

function parseEntradaSaidas(rows: string[][]): { items: ParsedLancamento[]; debug: any } {
  const items: ParsedLancamento[] = [];
  const debug: any = { totalRows: rows.length, headerRow: -1, columns: {}, sampleSkipped: [] };
  if (rows.length === 0) return { items, debug };

  // Find header row: row that contains "categoria" + ("valor" or "data")
  let headerIdx = -1;
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const r = rows[i].map(norm);
    if (r.includes("categoria") && (r.includes("valor") || r.includes("data"))) {
      headerIdx = i; break;
    }
  }
  if (headerIdx < 0) { debug.error = "header_not_found"; return { items, debug }; }
  debug.headerRow = headerIdx;

  const headers = rows[headerIdx].map(norm);
  const findCol = (...candidates: string[]) => {
    for (const c of candidates) {
      const i = headers.findIndex(h => h === c || h.includes(c));
      if (i >= 0) return i;
    }
    return -1;
  };
  // User confirmed: dates are always in column C (index 2). Fallback to header detection.
  const colData = 2;
  const colDesc = findCol("descricao", "historico", "descrição");
  const colCat = findCol("categoria");
  const colValor = findCol("valor");
  const colTipo = findCol("tipo", "classificacao", "entrada/saida", "e/s");
  debug.columns = { colData, colDesc, colCat, colValor, colTipo };

  if (colCat < 0 || colValor < 0) { debug.error = "missing_required_columns"; return { items, debug }; }

  // DEBUG: collect all unique cat+tipo combos
  const uniqCats = new Map<string, { count: number; sampleValor: number; sampleDesc: string }>();
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const cat = String(row[colCat] ?? "").trim();
    const tipo = colTipo >= 0 ? String(row[colTipo] ?? "").trim() : "";
    if (!cat) continue;
    const key = `${tipo} || ${cat}`;
    const cur = uniqCats.get(key) || { count: 0, sampleValor: 0, sampleDesc: "" };
    cur.count++;
    if (!cur.sampleDesc) {
      cur.sampleDesc = String(row[colDesc] ?? "");
      cur.sampleValor = parseBRNumber(row[colValor]);
    }
    uniqCats.set(key, cur);
  }
  debug.uniqueCategorias = Array.from(uniqCats.entries()).map(([k, v]) => ({ key: k, ...v }));

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const cat = String(row[colCat] ?? "").trim();
    if (!cat) continue;
    // Filter: only P3DS company
    if (!norm(cat).includes("p3ds")) continue;

    const valor = parseBRNumber(row[colValor]);
    if (valor === 0) continue;

    const dataRaw = colData >= 0 ? row[colData] : null;
    const data = parseBRDate(dataRaw) || new Date().toISOString().slice(0, 10);
    const desc = colDesc >= 0 ? String(row[colDesc] ?? "").trim() : cat;

    let tipo: "receita" | "despesa";
    if (colTipo >= 0) {
      const t = norm(row[colTipo]);
      if (t.includes("entr") || t.includes("rec")) tipo = "receita";
      else if (t.includes("sai") || t.includes("desp")) tipo = "despesa";
      else tipo = valor < 0 ? "despesa" : "receita";
    } else {
      tipo = valor < 0 ? "despesa" : "receita";
    }

    items.push({
      data,
      tipo,
      categoria: cat.replace(/\s*-\s*p3ds\s*$/i, "").trim() || cat,
      subcategoria: null,
      descricao: desc || cat,
      valor: Math.abs(valor),
      notas: "sync:entradas-saidas",
    });
  }
  debug.imported = items.length;
  return { items, debug };
}

function parseSalarioThiago(rows: string[][]): { items: ParsedLancamento[]; debug: any } {
  const items: ParsedLancamento[] = [];
  const debug: any = { totalRows: rows.length, monthCols: [], realizadoCols: [] };
  if (rows.length < 51) { debug.error = "less_than_51_rows"; return { items, debug }; }

  // Find month-header row (contains words like Janeiro, Fevereiro... or JAN/FEV)
  let monthRowIdx = -1;
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const detected = rows[i].map(c => detectMonth(String(c ?? ""))).filter(Boolean).length;
    if (detected >= 2) { monthRowIdx = i; break; }
  }
  if (monthRowIdx < 0) { debug.error = "month_header_not_found"; return { items, debug }; }
  debug.monthRowIdx = monthRowIdx;

  // Build map of column -> {month, year}. A merged month header may only appear in the first of its 2 cols.
  const monthByCol: Record<number, { month: number; year: number }> = {};
  const currentYear = new Date().getFullYear();
  let lastMonth: { month: number; year: number } | null = null;
  for (let c = 0; c < rows[monthRowIdx].length; c++) {
    const m = detectMonth(String(rows[monthRowIdx][c] ?? ""));
    if (m) {
      lastMonth = { month: m.month, year: m.year ?? currentYear };
      monthByCol[c] = lastMonth;
    } else if (lastMonth) {
      // continuation of merged cell — only fill 1 next col (Realizado)
      monthByCol[c] = lastMonth;
    }
  }
  debug.monthCols = Object.entries(monthByCol).map(([c, v]) => ({ col: +c, ...v }));

  // Find subheader row with Projetado/Realizado labels — search rows immediately after monthRow
  let subRowIdx = -1;
  for (let i = monthRowIdx + 1; i < Math.min(monthRowIdx + 5, rows.length); i++) {
    const r = (rows[i] || []).map(norm);
    if (r.some(x => x.includes("realiz")) && r.some(x => x.includes("proj"))) {
      subRowIdx = i; break;
    }
  }

  // Collect Realizado columns
  const realizadoCols: number[] = [];
  if (subRowIdx >= 0) {
    const sub = rows[subRowIdx];
    for (let c = 0; c < sub.length; c++) {
      if (norm(sub[c]).includes("realiz")) realizadoCols.push(c);
    }
  } else {
    // Fallback: assume "every 2 columns = new month, 2nd col is Realizado"
    // Pair starts at first month col
    const firstMonthCol = Math.min(...Object.keys(monthByCol).map(Number));
    for (let c = firstMonthCol + 1; c < rows[monthRowIdx].length; c += 2) {
      realizadoCols.push(c);
    }
  }
  debug.subRowIdx = subRowIdx;
  debug.realizadoCols = realizadoCols;

  const targetRow = rows[50]; // line 51 is index 50
  if (!targetRow) { debug.error = "row_51_missing"; return { items, debug }; }
  debug.row51Sample = targetRow.slice(0, 30);

  for (const c of realizadoCols) {
    const monthInfo = monthByCol[c] || monthByCol[c - 1];
    if (!monthInfo) continue;
    const valor = parseBRNumber(targetRow[c]);
    if (valor === 0) continue;
    const data = `${monthInfo.year}-${String(monthInfo.month).padStart(2, "0")}-01`;
    items.push({
      data,
      tipo: "despesa",
      categoria: "Pessoas",
      subcategoria: "Pró-labore",
      descricao: "Salário Thiago",
      valor: Math.abs(valor),
      notas: "sync:orcamento-salario-thiago",
    });
  }
  debug.imported = items.length;
  return { items, debug };
}

// ----- Main handler -----
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  try {
    const SHEETS_ID = Deno.env.get("FINANCEIRO_SHEETS_ID");
    const SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!SHEETS_ID) throw new Error("FINANCEIRO_SHEETS_ID not configured");
    if (!SA_JSON) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = await getAccessToken(SA_JSON);

    // Read both tabs (entire range to be flexible)
    const [entradasRows, orcamentoRows] = await Promise.all([
      readRange(token, SHEETS_ID, "Entrada e Saídas!A1:Z2000").catch(async () =>
        // try alternative tab name spellings
        await readRange(token, SHEETS_ID, "Entradas e Saídas!A1:Z2000")
      ),
      readRange(token, SHEETS_ID, "Orçamento!A1:ZZ60"),
    ]);

    const entradasResult = parseEntradaSaidas(entradasRows);
    const salarioResult = parseSalarioThiago(orcamentoRows);

    const allItems = [...entradasResult.items, ...salarioResult.items];

    if (dryRun) {
      return new Response(JSON.stringify({
        success: true,
        dryRun: true,
        synced_at: new Date().toISOString(),
        debug: {
          entradaSaidas: entradasResult.debug,
          salarioThiago: salarioResult.debug,
        },
        sample: allItems.slice(0, 20),
        total: allItems.length,
      }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map to lancamentos schema (the table the CEO panel reads from)
    const lancamentosRows = allItems.map((it) => {
      const [y, m] = it.data.split("-");
      return {
        data: it.data,
        valor: it.valor,
        descricao: it.descricao,
        categoria: it.categoria,
        classificacao: it.tipo === "receita" ? "Entrada" : "Saída",
        mes: `${m}/${y}`,
        notas: it.notas,
      };
    });

    // Wipe previous synced records (keep manual entries intact)
    const { error: delErr } = await supabase
      .from("lancamentos")
      .delete()
      .in("notas", ["sync:entradas-saidas", "sync:orcamento-salario-thiago"]);
    if (delErr) console.error("delete lancamentos error", delErr);

    // Also clean up old data we accidentally pushed to financeiro_empresa earlier
    await supabase
      .from("financeiro_empresa")
      .delete()
      .in("notas", ["sync:entradas-saidas", "sync:orcamento-salario-thiago"]);

    // Insert in batches
    let inserted = 0;
    if (lancamentosRows.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < lancamentosRows.length; i += batchSize) {
        const batch = lancamentosRows.slice(i, i + batchSize);
        const { error } = await supabase.from("lancamentos").insert(batch);
        if (error) throw new Error(`Insert failed: ${error.message}`);
        inserted += batch.length;
      }
    }


    return new Response(JSON.stringify({
      success: true,
      synced_at: new Date().toISOString(),
      inserted,
      entradaSaidas: entradasResult.debug.imported ?? 0,
      salarioThiago: salarioResult.debug.imported ?? 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-financeiro-sheets error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
