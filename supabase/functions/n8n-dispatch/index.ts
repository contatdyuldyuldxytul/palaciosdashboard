// deno-lint-ignore-file no-explicit-any
// Dispara webhooks do n8n quando um evento do CRM acontece.
// Chamado pelo trigger Postgres (sem JWT) e também pode ser chamado manualmente.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_TOKEN = Deno.env.get("N8N_WEBHOOK_TOKEN") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json();
    const { event_type, deal_id, stage_id, pipeline_id, status, extra } = body;
    if (!event_type) throw new Error("event_type obrigatório");

    // Carrega bindings ativos pro evento
    const { data: bindings, error: bErr } = await sb
      .from("n8n_event_bindings")
      .select("*, workflow:n8n_workflows(id, n8n_workflow_id, nome)")
      .eq("event_type", event_type)
      .eq("ativo", true);
    if (bErr) throw bErr;

    if (!bindings || bindings.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_bindings", event_type }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carrega contexto do deal (se houver)
    let context: any = { event_type };
    if (deal_id) {
      const { data: deal } = await sb.from("crm_deals").select("*").eq("id", deal_id).maybeSingle();
      context.deal = deal;
      if (deal?.person_id) {
        const { data: person } = await sb.from("crm_persons").select("*").eq("id", deal.person_id).maybeSingle();
        context.person = person;
      }
      if (deal?.organization_id) {
        const { data: org } = await sb.from("crm_organizations").select("*").eq("id", deal.organization_id).maybeSingle();
        context.org = org;
      }
      if (deal?.stage_id) {
        const { data: stage } = await sb.from("crm_stages").select("*").eq("id", deal.stage_id).maybeSingle();
        context.stage = stage;
      }
    }
    if (extra) context.extra = extra;

    const results: any[] = [];
    for (const binding of bindings) {
      // Aplica filtro (ex: só dispara pra stage_id específico)
      const filter = binding.event_filter || {};
      if (filter.stage_id && stage_id && filter.stage_id !== stage_id) continue;
      if (filter.pipeline_id && pipeline_id && filter.pipeline_id !== pipeline_id) continue;
      if (filter.status && status && filter.status !== status) continue;

      // Registra execução pendente
      const { data: exec } = await sb.from("n8n_executions").insert({
        workflow_id: binding.workflow_id,
        n8n_workflow_id: (binding as any).workflow?.n8n_workflow_id || null,
        event_type,
        event_payload: { deal_id, stage_id, pipeline_id, status, extra },
        status: "running",
        crm_deal_id: deal_id || null,
      }).select("id").single();

      try {
        const res = await fetch(binding.webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Palacios-Token": WEBHOOK_TOKEN,
            "X-Execution-Id": exec?.id || "",
          },
          body: JSON.stringify({
            event_type,
            execution_id: exec?.id,
            callback_url: `${SUPABASE_URL}/functions/v1`,
            token: WEBHOOK_TOKEN,
            context,
          }),
        });
        const ok = res.ok;
        const respText = await res.text().catch(() => "");
        await sb.from("n8n_executions").update({
          status: ok ? "success" : "error",
          error: ok ? null : `${res.status}: ${respText.slice(0, 300)}`,
          finished_at: new Date().toISOString(),
        }).eq("id", exec!.id);
        results.push({ binding_id: binding.id, ok, status: res.status });
      } catch (err: any) {
        await sb.from("n8n_executions").update({
          status: "error",
          error: String(err?.message || err).slice(0, 500),
          finished_at: new Date().toISOString(),
        }).eq("id", exec!.id);
        results.push({ binding_id: binding.id, ok: false, error: String(err?.message || err) });
      }
    }

    return new Response(JSON.stringify({ ok: true, dispatched: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[n8n-dispatch]", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
