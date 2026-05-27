// deno-lint-ignore-file no-explicit-any
// Quando uma daily_activity criada pelo n8n é completada, chama o webhook
// de callback (armazenado em notes) pra continuar o workflow no n8n.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOKEN = Deno.env.get("N8N_WEBHOOK_TOKEN") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json();
    const { activity_id } = body;
    if (!activity_id) throw new Error("activity_id obrigatório");

    const { data: act } = await sb.from("daily_activities").select("*").eq("id", activity_id).maybeSingle();
    if (!act) return new Response(JSON.stringify({ ok: false, error: "activity not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let callback: string | null = null;
    let n8n_workflow_id: string | null = null;
    try {
      const parsed = act.notes ? JSON.parse(act.notes) : null;
      callback = parsed?.callback || null;
      n8n_workflow_id = parsed?.n8n_workflow_id || null;
    } catch { /* ignore */ }

    if (!callback) {
      return new Response(JSON.stringify({ ok: true, skipped: "no callback url" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const res = await fetch(callback, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Palacios-Token": TOKEN },
      body: JSON.stringify({
        event_type: "activity_completed",
        token: TOKEN,
        activity: {
          id: act.id,
          assignee_label: act.assignee_label,
          task_description: act.task_description,
          completed_at: act.completed_at,
          related_deal_id: act.related_deal_id,
          execution_id: act.flow_run_id,
          n8n_node_id: act.flow_node_id,
          n8n_workflow_id,
        },
      }),
    });
    const ok = res.ok;
    const txt = await res.text().catch(() => "");

    if (act.flow_run_id) {
      await sb.from("n8n_executions").update({
        status: ok ? "success" : "error",
        error: ok ? null : `callback ${res.status}: ${txt.slice(0, 300)}`,
        finished_at: new Date().toISOString(),
      }).eq("id", act.flow_run_id);
    }

    return new Response(JSON.stringify({ ok, status: res.status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
