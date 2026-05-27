// deno-lint-ignore-file no-explicit-any
// Endpoint chamado pelo n8n para ler contexto do CRM.
// Auth: header X-Palacios-Token = N8N_WEBHOOK_TOKEN
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-palacios-token",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOKEN = Deno.env.get("N8N_WEBHOOK_TOKEN") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const provided = req.headers.get("X-Palacios-Token") || new URL(req.url).searchParams.get("token");
  if (!TOKEN || provided !== TOKEN) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const url = new URL(req.url);
    const resource = url.searchParams.get("resource") || "deal";
    const id = url.searchParams.get("id");

    if (resource === "deal" && id) {
      const { data: deal } = await sb.from("crm_deals").select("*").eq("id", id).maybeSingle();
      if (!deal) return new Response(JSON.stringify({ error: "deal not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const [person, org, stage, pipeline] = await Promise.all([
        deal.person_id ? sb.from("crm_persons").select("*").eq("id", deal.person_id).maybeSingle().then((r) => r.data) : null,
        deal.organization_id ? sb.from("crm_organizations").select("*").eq("id", deal.organization_id).maybeSingle().then((r) => r.data) : null,
        sb.from("crm_stages").select("*").eq("id", deal.stage_id).maybeSingle().then((r) => r.data),
        sb.from("crm_pipelines").select("*").eq("id", deal.pipeline_id).maybeSingle().then((r) => r.data),
      ]);
      return new Response(JSON.stringify({ deal, person, org, stage, pipeline }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (resource === "pipeline" && id) {
      const { data: pipeline } = await sb.from("crm_pipelines").select("*").eq("id", id).maybeSingle();
      const { data: stages } = await sb.from("crm_stages").select("*").eq("pipeline_id", id).order("ordem");
      return new Response(JSON.stringify({ pipeline, stages }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (resource === "pipelines") {
      const { data: pipelines } = await sb.from("crm_pipelines").select("*").eq("ativo", true).order("ordem");
      const { data: stages } = await sb.from("crm_stages").select("*").order("ordem");
      return new Response(JSON.stringify({ pipelines, stages }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (resource === "team") {
      const { data: profiles } = await sb.from("profiles").select("id, full_name, email, status, colaborador_slug" as any).eq("status", "active");
      return new Response(JSON.stringify({ team: profiles || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: `resource desconhecido: ${resource}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
