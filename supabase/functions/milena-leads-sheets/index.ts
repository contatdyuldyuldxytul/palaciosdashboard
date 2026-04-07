import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
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
  if (!tokenRes.ok) throw new Error(`Google auth failed: ${await tokenRes.text()}`);
  return (await tokenRes.json()).access_token;
}

function normalize(str: string): string {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SERVICE_ACCOUNT = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    const SHEET_ID = Deno.env.get("GOOGLE_SHEETS_ID");
    if (!SERVICE_ACCOUNT || !SHEET_ID) throw new Error("Google Sheets not configured");

    // Parse request body for optional filter
    let filterStatusOnly = false;
    try {
      const body = await req.json();
      filterStatusOnly = body?.filter_status === "lead";
    } catch { /* no body = return all */ }

    const accessToken = await getAccessToken(SERVICE_ACCOUNT);

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent("leads")}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`Failed to read sheet: ${await res.text()}`);
    const data = await res.json();
    const rows: string[][] = data.values || [];

    // Row 1 = title, Row 2 = headers, data starts Row 3
    if (rows.length < 3) {
      return new Response(JSON.stringify({ success: true, leads: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use row index 1 (0-based) as headers (row 2 in sheet)
    const headers = rows[1].map((h: string) => normalize(h));
    const findCol = (names: string[]) => headers.findIndex(h => names.some(n => h.includes(n)));

    const colId = findCol(["id"]);
    const colResponsavel = findCol(["responsavel", "responsável"]);
    const colStatus = findCol(["status"]);
    const colContatoNome = findCol(["contato_nome", "contato", "nome_contato"]);
    const colEmpresa = findCol(["empresa", "company"]);
    const colEmail = findCol(["email", "e-mail"]);
    const colTelefone = findCol(["telefone", "phone", "tel"]);
    const colCidade = findCol(["cidade", "city"]);
    const colCargo = findCol(["cargo"]);
    const colDataPrimeiroContato = findCol(["data_primeiro_contato", "data_descoberta", "data_criacao"]);
    const colDataUltimaInteracao = findCol(["data_ultima_interacao", "data_atualizacao"]);
    const colDataReuniao = findCol(["data_reuniao"]);
    const colValorContrato = findCol(["valor_contrato", "valor_estimado", "valor"]);
    const colObservacoes = findCol(["observacoes", "notas", "obs"]);
    const colOrigemLead = findCol(["origem_lead", "origem"]);
    const colPerdidoMotivo = findCol(["perdido_motivo", "motivo_perda"]);

    const leads = [];
    // Data starts from row index 2 (0-based) = row 3 in sheet
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      const status = normalize(row[colStatus] || "");

      if (filterStatusOnly && status !== "lead") continue;

      const getVal = (col: number) => col >= 0 ? (row[col] || "") : "";

      leads.push({
        id: getVal(colId) || `row-${i}`,
        empresa: getVal(colEmpresa),
        contato_nome: getVal(colContatoNome),
        cargo: getVal(colCargo),
        telefone: getVal(colTelefone),
        email: getVal(colEmail),
        cidade: getVal(colCidade),
        status: getVal(colStatus) || "Lead",
        data_primeiro_contato: getVal(colDataPrimeiroContato),
        data_ultima_interacao: getVal(colDataUltimaInteracao),
        data_reuniao: getVal(colDataReuniao),
        valor_contrato: getVal(colValorContrato),
        observacoes: getVal(colObservacoes),
        origem_lead: getVal(colOrigemLead),
        perdido_motivo: getVal(colPerdidoMotivo),
        responsavel: getVal(colResponsavel),
        row_index: i + 1, // 1-indexed for sheet updates
        _raw: row.map((c: string) => c || ""),
      });
    }

    return new Response(JSON.stringify({ success: true, leads, headers: rows[1] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("milena-leads-sheets error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
