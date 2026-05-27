// deno-lint-ignore-file no-explicit-any
// Proxy autenticado para a REST API do n8n Cloud.
// Endpoints expostos: list_workflows, activate, deactivate, run, list_executions, sync, test
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const N8N_BASE_URL = (Deno.env.get("N8N_BASE_URL") || "").replace(/\/$/, "");
const N8N_API_KEY = Deno.env.get("N8N_API_KEY") || "";

function n8nHeaders() {
  return {
    "X-N8N-API-KEY": N8N_API_KEY,
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
}

async function n8nFetch(path: string, init: RequestInit = {}) {
  const url = `${N8N_BASE_URL}/api/v1${path}`;
  const res = await fetch(url, { ...init, headers: { ...n8nHeaders(), ...(init.headers || {}) } });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`n8n ${res.status}: ${typeof json === "object" ? JSON.stringify(json).slice(0, 400) : text.slice(0, 400)}`);
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth: precisa estar logado como fundador
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (!claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (!N8N_BASE_URL || !N8N_API_KEY) {
    return new Response(JSON.stringify({ error: "n8n não configurado", missing: { base: !N8N_BASE_URL, key: !N8N_API_KEY } }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action || new URL(req.url).searchParams.get("action") || "test";

    if (action === "test") {
      const r = await n8nFetch("/workflows?limit=1");
      return new Response(JSON.stringify({ ok: true, n8n_reachable: true, sample_count: (r?.data || r || []).length ?? 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync" || action === "list_workflows") {
      // Lista todos os workflows (paginado) e atualiza cache local
      const all: any[] = [];
      let cursor: string | null = null;
      do {
        const path: string = `/workflows?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
        const r: any = await n8nFetch(path);
        const items = r?.data || r || [];
        all.push(...items);
        cursor = r?.nextCursor || null;
      } while (cursor);

      // upsert cache
      const rows = all.map((w: any) => ({
        n8n_workflow_id: String(w.id),
        nome: w.name || "Sem nome",
        ativo: !!w.active,
        tags: (w.tags || []).map((t: any) => t.name || t).filter(Boolean),
        descricao: w.meta?.description || null,
        last_synced_at: new Date().toISOString(),
        webhook_url: null,
      }));
      if (rows.length > 0) {
        await sb.from("n8n_workflows").upsert(rows, { onConflict: "n8n_workflow_id" });
      }
      const { data: cached } = await sb.from("n8n_workflows").select("*").order("nome");
      return new Response(JSON.stringify({ ok: true, workflows: cached || [], synced: rows.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "activate" || action === "deactivate") {
      const id = body.n8n_workflow_id;
      if (!id) throw new Error("n8n_workflow_id obrigatório");
      const path = action === "activate" ? `/workflows/${id}/activate` : `/workflows/${id}/deactivate`;
      await n8nFetch(path, { method: "POST" });
      await sb.from("n8n_workflows").update({ ativo: action === "activate" }).eq("n8n_workflow_id", String(id));
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list_executions") {
      const wfId = body.n8n_workflow_id;
      const path = `/executions?limit=20${wfId ? `&workflowId=${wfId}` : ""}`;
      const r = await n8nFetch(path);
      return new Response(JSON.stringify({ ok: true, executions: r?.data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "open_url") {
      const id = body.n8n_workflow_id;
      return new Response(JSON.stringify({ ok: true, url: `${N8N_BASE_URL}/workflow/${id}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: `ação desconhecida: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[n8n-proxy]", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
