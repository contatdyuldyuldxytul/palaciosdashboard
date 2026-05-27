// deno-lint-ignore-file no-explicit-any
// Endpoint chamado pelo n8n para criar tarefas para colaboradores.
// Auth: header X-Palacios-Token = N8N_WEBHOOK_TOKEN
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-palacios-token",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOKEN = Deno.env.get("N8N_WEBHOOK_TOKEN") || "";

function spDateISO(date?: string | null) {
  const base = date ? new Date(date) : new Date();
  const sp = new Date(base.getTime() - 3 * 60 * 60 * 1000);
  return sp.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const provided = req.headers.get("X-Palacios-Token");
  if (!TOKEN || provided !== TOKEN) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json();
    const {
      assignee_label,           // "Aline" | "Milena" | etc.
      task_description,         // texto da tarefa
      scheduled_date,           // YYYY-MM-DD (opcional, default = hoje SP)
      task_type = "custom",     // tipo
      priority = 6,             // 1-10
      related_deal_id,          // pipedrive id (bigint, opcional)
      crm_deal_id,              // uuid do crm_deals (opcional)
      execution_id,             // n8n_executions.id pra ligar
      n8n_workflow_id,
      n8n_node_id,
      callback_webhook_url,     // se quiser callback quando concluída
    } = body;

    if (!assignee_label || !task_description) {
      return new Response(JSON.stringify({ error: "assignee_label e task_description obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: act, error } = await sb.from("daily_activities").insert({
      assignee_label,
      scheduled_date: spDateISO(scheduled_date),
      task_type,
      task_description,
      related_deal_id: related_deal_id || null,
      priority: Math.max(1, Math.min(10, Number(priority) || 6)),
      source: "flow" as any,
      flow_run_id: execution_id || null,
      flow_node_id: n8n_node_id || null,
      notes: callback_webhook_url ? JSON.stringify({ callback: callback_webhook_url, n8n_workflow_id }) : null,
    }).select("id").single();

    if (error) throw error;

    if (execution_id) {
      await sb.from("n8n_executions").update({ related_activity_id: act.id }).eq("id", execution_id);
    }

    return new Response(JSON.stringify({ ok: true, activity_id: act.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[flow-task-create]", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
