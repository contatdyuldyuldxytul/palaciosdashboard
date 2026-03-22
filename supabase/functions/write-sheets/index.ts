import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );
  const signInput = `${header}.${payload}`;
  const pemContents = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(signInput));
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${header}.${payload}.${sig}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!tokenRes.ok) throw new Error(`Google auth failed [${tokenRes.status}]: ${await tokenRes.text()}`);
  return (await tokenRes.json()).access_token;
}

async function writeSheet(accessToken: string, spreadsheetId: string, sheetName: string, values: string[][]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error(`Write failed [${res.status}]: ${await res.text()}`);
  return res.json();
}

async function appendSheet(accessToken: string, spreadsheetId: string, sheetName: string, values: string[][]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error(`Append failed [${res.status}]: ${await res.text()}`);
  return res.json();
}

async function updateSheetRow(accessToken: string, spreadsheetId: string, sheetName: string, rowIndex: number, values: string[]) {
  const range = `${sheetName}!A${rowIndex}:${String.fromCharCode(64 + values.length)}${rowIndex}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [values] }),
  });
  if (!res.ok) throw new Error(`Update row failed [${res.status}]: ${await res.text()}`);
  return res.json();
}

async function readSheet(accessToken: string, spreadsheetId: string, sheetName: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Read failed [${res.status}]: ${await res.text()}`);
  return (await res.json()).values || [];
}

// Column mappings per table
const COLUMN_MAP: Record<string, string[]> = {
  leads: ["empresa", "contato", "cargo", "telefone", "email", "cidade", "estado", "status", "responsavel_nome", "origem", "notas", "valor_estimado", "motivo_perda"],
  reunioes_realizadas: ["data_reuniao", "vendedor_nome", "duracao_minutos", "resultado", "gerou_proposta", "valor_proposta", "notas"],
  comissoes: ["vendedor_nome", "mes_referencia", "salario_fixo", "leads_gerados", "valor_leads", "reunioes_realizadas", "valor_reunioes", "contratos_indicados", "valor_contratos", "comissao_contratos", "total_comissao"],
  metas: ["periodo", "mes", "trimestre", "ano", "meta_receita", "realizado_receita", "meta_leads", "realizado_leads", "meta_reunioes", "realizado_reunioes", "meta_contratos", "realizado_contratos"],
  clientes_ativos: ["empresa", "projeto", "contato", "email", "telefone", "status", "valor_total", "qtd_imagens", "inclui_modelagem", "segundos_animacao", "progresso", "notas"],
  financeiro_clientes: ["cliente_id", "descricao", "valor", "data_vencimento", "data_pagamento", "status", "forma_pagamento", "notas"],
  financeiro_empresa: ["tipo", "categoria", "subcategoria", "descricao", "valor", "data", "recorrente", "notas"],
  checklist_projetos: ["cliente_id", "etapa", "nome_etapa", "concluida", "data_conclusao", "responsavel", "notas"],
};

function recordToRow(record: Record<string, any>, columns: string[]): string[] {
  return columns.map((col) => {
    const val = record[col];
    if (val === null || val === undefined) return "";
    if (typeof val === "boolean") return val ? "true" : "false";
    return String(val);
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sheetsId = Deno.env.get("GOOGLE_SHEETS_ID");
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!sheetsId || !serviceAccountJson) {
      return new Response(JSON.stringify({ error: "Google Sheets credentials not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action, tab, record, row_index } = body;

    const accessToken = await getAccessToken(serviceAccountJson);
    const columns = COLUMN_MAP[tab];

    if (!columns) {
      return new Response(JSON.stringify({ error: `Unknown tab: ${tab}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let result: any;

    if (action === "append") {
      const row = recordToRow(record, columns);
      result = await appendSheet(accessToken, sheetsId, tab, [row]);
    } else if (action === "update" && row_index) {
      const row = recordToRow(record, columns);
      result = await updateSheetRow(accessToken, sheetsId, tab, row_index, row);
    } else if (action === "find_and_update") {
      // Read all rows, find by matching field, update
      const rows = await readSheet(accessToken, sheetsId, tab);
      if (rows.length < 2) {
        return new Response(JSON.stringify({ error: "Sheet is empty" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const headers = rows[0].map((h: string) => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const matchField = body.match_field || "empresa";
      const matchValue = body.match_value;
      const matchCol = headers.indexOf(matchField);

      if (matchCol === -1) {
        return new Response(JSON.stringify({ error: `Column ${matchField} not found` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let foundRow = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][matchCol] === matchValue) { foundRow = i + 1; break; }
      }

      if (foundRow === -1) {
        return new Response(JSON.stringify({ error: "Row not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const row = recordToRow(record, columns);
      result = await updateSheetRow(accessToken, sheetsId, tab, foundRow, row);
    } else {
      return new Response(JSON.stringify({ error: "Invalid action. Use: append, update, find_and_update" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, result }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Write-back error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
