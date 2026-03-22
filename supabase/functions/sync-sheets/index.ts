import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Google Sheets API helpers
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

  // Import the private key
  const pemContents = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signInput)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${header}.${payload}.${sig}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    throw new Error(`Failed to get Google access token [${tokenRes.status}]: ${errBody}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function readSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Failed to read sheet "${sheetName}" [${res.status}]: ${errBody}`);
  }
  const data = await res.json();
  return data.values || [];
}

function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] || "";
    });
    return obj;
  });
}

// Tab-specific mappers
function mapLeads(rows: Record<string, string>[]) {
  return rows.map((r) => ({
    empresa: r.empresa || "Sem nome",
    contato: r.contato || null,
    cargo: r.cargo || null,
    telefone: r.telefone || null,
    email: r.email || null,
    cidade: r.cidade || null,
    estado: r.estado || null,
    status: r.status || "lead",
    responsavel_nome: r.responsavel_nome || r.responsavel || null,
    origem: r.origem || null,
    notas: r.notas || null,
    valor_estimado: parseFloat(r.valor_estimado) || 0,
    motivo_perda: r.motivo_perda || null,
  }));
}

function mapReunioes(rows: Record<string, string>[]) {
  return rows.map((r) => ({
    data_reuniao: r.data_reuniao || new Date().toISOString(),
    vendedor_nome: r.vendedor_nome || r.vendedor || null,
    duracao_minutos: parseInt(r.duracao_minutos) || null,
    resultado: r.resultado || null,
    gerou_proposta: r.gerou_proposta === "true" || r.gerou_proposta === "sim" || r.gerou_proposta === "1",
    valor_proposta: parseFloat(r.valor_proposta) || null,
    notas: r.notas || null,
  }));
}

function mapComissoes(rows: Record<string, string>[]) {
  return rows.map((r) => ({
    vendedor_id: r.vendedor_id || crypto.randomUUID(),
    vendedor_nome: r.vendedor_nome || r.vendedor || null,
    mes_referencia: r.mes_referencia || r.mes || "",
    salario_fixo: parseFloat(r.salario_fixo) || 0,
    leads_gerados: parseInt(r.leads_gerados) || 0,
    valor_leads: parseFloat(r.valor_leads) || 0,
    reunioes_realizadas: parseInt(r.reunioes_realizadas) || 0,
    valor_reunioes: parseFloat(r.valor_reunioes) || 0,
    contratos_indicados: parseInt(r.contratos_indicados) || 0,
    valor_contratos: parseFloat(r.valor_contratos) || 0,
    comissao_contratos: parseFloat(r.comissao_contratos) || 0,
    total_comissao: parseFloat(r.total_comissao) || 0,
  }));
}

function mapMetas(rows: Record<string, string>[]) {
  return rows.map((r) => ({
    periodo: r.periodo || "mensal",
    mes: r.mes || null,
    trimestre: r.trimestre || null,
    ano: parseInt(r.ano) || new Date().getFullYear(),
    meta_receita: parseFloat(r.meta_receita) || 0,
    realizado_receita: parseFloat(r.realizado_receita) || 0,
    meta_leads: parseInt(r.meta_leads) || 0,
    realizado_leads: parseInt(r.realizado_leads) || 0,
    meta_reunioes: parseInt(r.meta_reunioes) || 0,
    realizado_reunioes: parseInt(r.realizado_reunioes) || 0,
    meta_contratos: parseInt(r.meta_contratos) || 0,
    realizado_contratos: parseInt(r.realizado_contratos) || 0,
  }));
}

function mapClientesAtivos(rows: Record<string, string>[]) {
  return rows.map((r) => ({
    empresa: r.empresa || "Sem nome",
    projeto: r.projeto || "Projeto",
    contato: r.contato || null,
    email: r.email || null,
    telefone: r.telefone || null,
    status: r.status || "ativo",
    valor_total: parseFloat(r.valor_total) || 0,
    qtd_imagens: parseInt(r.qtd_imagens) || 0,
    inclui_modelagem: r.inclui_modelagem === "true" || r.inclui_modelagem === "sim" || r.inclui_modelagem === "1",
    segundos_animacao: parseInt(r.segundos_animacao) || 0,
    progresso: parseInt(r.progresso) || 0,
    notas: r.notas || null,
  }));
}

function mapFinanceiroClientes(rows: Record<string, string>[]) {
  return rows.map((r) => ({
    cliente_id: r.cliente_id || r.id_cliente || crypto.randomUUID(),
    descricao: r.descricao || "",
    valor: parseFloat(r.valor) || 0,
    data_vencimento: r.data_vencimento || null,
    data_pagamento: r.data_pagamento || null,
    status: r.status || "pendente",
    forma_pagamento: r.forma_pagamento || null,
    notas: r.notas || null,
  }));
}

function mapFinanceiroEmpresa(rows: Record<string, string>[]) {
  return rows.map((r) => ({
    tipo: r.tipo || "despesa",
    categoria: r.categoria || "Outros",
    subcategoria: r.subcategoria || null,
    descricao: r.descricao || "",
    valor: parseFloat(r.valor) || 0,
    data: r.data || new Date().toISOString().split("T")[0],
    recorrente: r.recorrente === "true" || r.recorrente === "sim" || r.recorrente === "1",
    notas: r.notas || null,
  }));
}

function mapChecklist(rows: Record<string, string>[]) {
  return rows.map((r) => ({
    cliente_id: r.cliente_id || r.id_cliente || crypto.randomUUID(),
    etapa: parseInt(r.etapa) || 1,
    nome_etapa: r.nome_etapa || "",
    concluida: r.concluida === "true" || r.concluida === "sim" || r.concluida === "1",
    data_conclusao: r.data_conclusao || null,
    responsavel: r.responsavel || null,
    notas: r.notas || null,
  }));
}

const TAB_CONFIG: Record<string, { table: string; mapper: (rows: Record<string, string>[]) => any[] }> = {
  leads: { table: "leads", mapper: mapLeads },
  reunioes_realizadas: { table: "reunioes_realizadas", mapper: mapReunioes },
  comissoes: { table: "comissoes", mapper: mapComissoes },
  metas: { table: "metas", mapper: mapMetas },
  clientes_ativos: { table: "clientes_ativos", mapper: mapClientesAtivos },
  financeiro_clientes: { table: "financeiro_clientes", mapper: mapFinanceiroClientes },
  financeiro_empresa: { table: "financeiro_empresa", mapper: mapFinanceiroEmpresa },
  checklist_projetos: { table: "checklist_projetos", mapper: mapChecklist },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sheetsId = Deno.env.get("GOOGLE_SHEETS_ID");
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");

    if (!sheetsId || !serviceAccountJson) {
      return new Response(
        JSON.stringify({ error: "Google Sheets credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body for optional tab filter and debug mode
    let tabsToSync: string[] = Object.keys(TAB_CONFIG);
    let debugMode = false;
    try {
      const body = await req.json();
      if (body.tabs && Array.isArray(body.tabs)) {
        tabsToSync = body.tabs.filter((t: string) => TAB_CONFIG[t]);
      }
      if (body.debug) debugMode = true;
    } catch {
      // No body or invalid JSON — sync all tabs
    }

    const accessToken = await getAccessToken(serviceAccountJson);

    const results: Record<string, { success: boolean; count: number; error?: string }> = {};
    const debugData: Record<string, { headers?: string[]; sample?: Record<string, string> }> = {};

    for (const tabName of tabsToSync) {
      const config = TAB_CONFIG[tabName];
      try {
        const rows = await readSheet(accessToken, sheetsId, tabName);
        
        if (debugMode && rows.length > 0) {
          debugData[tabName] = { 
            headers: rows[0],
            sample: rows.length > 1 ? Object.fromEntries(rows[0].map((h: string, i: number) => [h, rows[1][i] || ""])) : undefined
          };
        }
        
        const objects = rowsToObjects(rows);

        if (objects.length === 0) {
          results[tabName] = { success: true, count: 0 };
          continue;
        }

        if (!debugMode) {
          const mapped = config.mapper(objects);

          // Clear existing data and insert fresh (full sync)
          const { error: deleteError } = await supabase.from(config.table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
          if (deleteError) {
            console.error(`Delete error for ${tabName}:`, deleteError);
          }

          const { error: insertError } = await supabase.from(config.table).insert(mapped);
          if (insertError) {
            results[tabName] = { success: false, count: 0, error: insertError.message };
          } else {
            results[tabName] = { success: true, count: mapped.length };
          }
        } else {
          results[tabName] = { success: true, count: objects.length };
        }
      } catch (err) {
        results[tabName] = { success: false, count: 0, error: err instanceof Error ? err.message : String(err) };
      }
    }

    const responseBody: any = {
      success: true,
      synced_at: new Date().toISOString(),
      results,
    };
    if (debugMode) responseBody.debug = debugData;

    return new Response(
      JSON.stringify(responseBody),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
