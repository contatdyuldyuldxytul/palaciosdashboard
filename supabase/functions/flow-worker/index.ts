// deno-lint-ignore-file no-explicit-any
// Flow execution worker. Processes flow_runs in the pending queue.
// Triggered by pg_cron every 5 minutes, or manually with ?dry_run=1&run_id=...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY") || "";

// ---------- Helpers ----------
function renderTemplate(tpl: string, ctx: Record<string, any>): string {
  if (!tpl) return "";
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const parts = String(path).split(".");
    let v: any = ctx;
    for (const p of parts) v = v?.[p];
    return v == null ? "" : String(v);
  });
}

function findNode(nodes: any[], id: string | null) {
  if (!id) return null;
  return nodes.find((n) => n.id === id) || null;
}

function nextNodeId(edges: any[], fromId: string, handle?: string): string | null {
  const candidates = edges.filter((e) =>
    e.source === fromId && (!handle || (e.sourceHandle || null) === handle || !e.sourceHandle)
  );
  if (handle) {
    const exact = edges.find((e) => e.source === fromId && e.sourceHandle === handle);
    if (exact) return exact.target;
  }
  return candidates[0]?.target ?? null;
}

function evalCondition(op: string, lhs: any, rhs: any): boolean {
  const L = lhs == null ? "" : String(lhs).toLowerCase();
  const R = rhs == null ? "" : String(rhs).toLowerCase();
  const Ln = Number(lhs);
  const Rn = Number(rhs);
  switch (op) {
    case "=": case "eq": return L === R;
    case "!=": case "neq": return L !== R;
    case "contains": return L.includes(R);
    case ">": case "gt": return Ln > Rn;
    case "<": case "lt": return Ln < Rn;
    case ">=": case "gte": return Ln >= Rn;
    case "<=": case "lte": return Ln <= Rn;
    default: return true;
  }
}

// ---------- Node executors ----------
async function execEmail(sb: any, node: any, ctx: any, dryRun: boolean) {
  const cfg = node.data?.config || {};
  const to = renderTemplate(cfg.to || ctx.person?.email || "", ctx);
  const subject = renderTemplate(cfg.subject || "", ctx);
  const body = renderTemplate(cfg.body || "", ctx);
  if (!to) return { status: "failed", error: "destinatário ausente (config.to ou person.email)" };
  if (dryRun) return { status: "ok", output: { dry_run: true, to, subject, body_preview: body.slice(0, 120) } };

  const res = await fetch(`${SUPABASE_URL}/functions/v1/gmail-send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ to, subject, html: body.replace(/\n/g, "<br/>") }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) return { status: "failed", error: `gmail-send ${res.status}: ${JSON.stringify(j)}` };
  return { status: "ok", output: { gmail_id: j.id, to, subject } };
}

async function execWhatsapp(sb: any, node: any, ctx: any, dryRun: boolean) {
  const cfg = node.data?.config || {};
  const rawTo = renderTemplate(cfg.to || ctx.person?.whatsapp || ctx.org?.whatsapp || ctx.person?.telefone || "", ctx);
  const body = renderTemplate(cfg.body || cfg.template_text || "", ctx);
  if (!rawTo) return { status: "failed", error: "telefone WhatsApp ausente" };
  if (!body) return { status: "failed", error: "corpo da mensagem vazio" };

  const digits = rawTo.replace(/\D/g, "");
  const to = digits.startsWith("whatsapp:") ? rawTo : `whatsapp:+${digits.startsWith("55") ? digits : "55" + digits}`;

  if (dryRun) return { status: "ok", output: { dry_run: true, to, body_preview: body.slice(0, 120) } };

  if (!TWILIO_API_KEY || !LOVABLE_API_KEY) {
    return { status: "failed", error: "Twilio não conectado — adicione o conector em Connectors" };
  }
  // Get From number from integration_settings
  const { data: setting } = await sb.from("integration_settings").select("value").eq("key", "twilio_whatsapp").maybeSingle();
  const fromNumber = setting?.value?.from_number;
  if (!fromNumber) return { status: "failed", error: "número From WhatsApp não configurado (Admin → Integrações)" };

  const form = new URLSearchParams({
    To: to,
    From: fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`,
    Body: body,
  });

  const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TWILIO_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) return { status: "failed", error: `twilio ${res.status}: ${JSON.stringify(j).slice(0, 300)}` };
  return { status: "ok", output: { sid: j.sid, to } };
}

async function execHumanTask(sb: any, node: any, ctx: any, runId: string, dryRun: boolean) {
  const cfg = node.data?.config || {};
  const kind = node.data?.kind;
  const titulo = renderTemplate(cfg.titulo || node.data?.label || `${kind} — ${ctx.deal?.titulo || ""}`, ctx);
  const descricao = renderTemplate(cfg.descricao || cfg.description || "", ctx);
  const assignee = renderTemplate(cfg.assignee || ctx.deal?.owner_label || "", ctx) || "Aline";
  const priority = Math.max(1, Math.min(10, Number(cfg.priority) || 6));
  const dealPipedriveId = ctx.deal?.pipedrive_id || null;

  if (dryRun) return { status: "ok", output: { dry_run: true, would_create_task: titulo, assignee } };

  const { data: act, error } = await sb.from("daily_activities").insert({
    assignee_label: assignee,
    scheduled_date: new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).toISOString().slice(0, 10),
    task_type: "custom",
    task_description: descricao ? `${titulo}\n\n${descricao}` : titulo,
    related_deal_id: dealPipedriveId,
    priority,
    source: "flow" as any,
    flow_run_id: runId,
    flow_node_id: node.id,
  }).select("id").single();
  if (error) return { status: "failed", error: `daily_activities: ${error.message}` };
  return { status: "ok", waiting: true, activity_id: act.id, output: { activity_id: act.id, assignee, titulo } };
}

async function execUpdate(sb: any, node: any, ctx: any, dryRun: boolean) {
  const cfg = node.data?.config || {};
  const patch = cfg.patch || {};
  if (!ctx.deal?.id) return { status: "failed", error: "deal ausente" };
  if (dryRun) return { status: "ok", output: { dry_run: true, patch } };
  const { error } = await sb.from("crm_deals").update(patch).eq("id", ctx.deal.id);
  if (error) return { status: "failed", error: error.message };
  return { status: "ok", output: { patch } };
}

function execCondition(node: any, ctx: any): { status: "ok"; handle: "yes" | "no" | "else"; output: any } {
  const cfg = node.data?.config || {};
  const fieldPath = cfg.field || "deal.valor";
  const op = cfg.op || "gt";
  const rhs = cfg.value;
  const parts = String(fieldPath).split(".");
  let lhs: any = ctx;
  for (const p of parts) lhs = lhs?.[p];
  const result = evalCondition(op, lhs, rhs);
  const handle = node.data?.kind === "decision" ? (result ? "yes" : "no") : (result ? undefined as any : "else");
  return { status: "ok", handle: handle || "yes", output: { lhs, op, rhs, result } };
}

// ---------- Run processor ----------
async function loadContext(sb: any, run: any) {
  const ctx: any = { run_id: run.id };
  if (run.crm_deal_id) {
    const { data: deal } = await sb.from("crm_deals").select("*").eq("id", run.crm_deal_id).maybeSingle();
    ctx.deal = deal;
    if (deal?.person_id) {
      const { data: person } = await sb.from("crm_persons").select("*").eq("id", deal.person_id).maybeSingle();
      ctx.person = person;
    }
    if (deal?.organization_id) {
      const { data: org } = await sb.from("crm_organizations").select("*").eq("id", deal.organization_id).maybeSingle();
      ctx.org = org;
    }
  }
  ctx.owner = { label: ctx.deal?.owner_label || null };
  return ctx;
}

async function processRun(sb: any, run: any, dryRun: boolean) {
  const { data: flow } = await sb.from("flows").select("nodes, edges, ativo").eq("id", run.flow_id).maybeSingle();
  if (!flow) {
    await sb.from("flow_runs").update({ status: "error", error: "fluxo não encontrado", finished_at: new Date().toISOString() }).eq("id", run.id);
    return;
  }
  const nodes: any[] = flow.nodes || [];
  const edges: any[] = flow.edges || [];
  const ctx = await loadContext(sb, run);

  let currentId = run.current_node_id;
  let safety = 30; // max nodes per worker tick

  while (currentId && safety-- > 0) {
    const node = findNode(nodes, currentId);
    if (!node) {
      await sb.from("flow_runs").update({ status: "error", error: `nó ${currentId} não encontrado`, finished_at: new Date().toISOString() }).eq("id", run.id);
      return;
    }
    const kind = node.data?.kind;

    // Skip purely visual nodes
    if (kind === "note" || kind === "section") {
      currentId = nextNodeId(edges, currentId);
      continue;
    }

    // Trigger: just advance
    if (kind === "trigger") {
      currentId = nextNodeId(edges, currentId);
      continue;
    }

    // Delay
    if (kind === "delay") {
      const cfg = node.data?.config || {};
      const dias = Number(cfg.dias || 0);
      const horas = Number(cfg.horas || 0);
      const minutos = Number(cfg.minutos || 0);
      const ms = ((dias * 24 + horas) * 60 + minutos) * 60 * 1000;
      const nextAt = new Date(Date.now() + ms).toISOString();
      const after = nextNodeId(edges, currentId);
      await sb.from("flow_run_steps").insert({ run_id: run.id, node_id: node.id, node_type: kind, status: "ok", output: { resume_at: nextAt, next: after } });
      await sb.from("flow_runs").update({ status: "pending", resume_at: nextAt, current_node_id: after }).eq("id", run.id);
      return;
    }

    // Condition / decision
    if (kind === "condition" || kind === "decision") {
      const r = execCondition(node, ctx);
      await sb.from("flow_run_steps").insert({ run_id: run.id, node_id: node.id, node_type: kind, status: "ok", output: r.output });
      currentId = nextNodeId(edges, currentId, r.handle);
      continue;
    }

    // Human tasks: stop and wait
    if (kind === "task" || kind === "custom" || kind === "milestone") {
      const r = await execHumanTask(sb, node, ctx, run.id, dryRun);
      await sb.from("flow_run_steps").insert({ run_id: run.id, node_id: node.id, node_type: kind, status: r.status, output: r.output, error: (r as any).error });
      if (r.status === "failed") {
        await sb.from("flow_runs").update({ status: "error", error: (r as any).error, finished_at: new Date().toISOString() }).eq("id", run.id);
        return;
      }
      if ((r as any).waiting && !dryRun) {
        const after = nextNodeId(edges, currentId);
        await sb.from("flow_runs").update({ status: "waiting_human", current_node_id: after, waiting_activity_id: (r as any).activity_id }).eq("id", run.id);
        return;
      }
      currentId = nextNodeId(edges, currentId);
      continue;
    }

    // Auto nodes
    let result: any;
    if (kind === "email") result = await execEmail(sb, node, ctx, dryRun);
    else if (kind === "whatsapp") result = await execWhatsapp(sb, node, ctx, dryRun);
    else if (kind === "update") result = await execUpdate(sb, node, ctx, dryRun);
    else result = { status: "ok", output: { skipped: kind } };

    await sb.from("flow_run_steps").insert({ run_id: run.id, node_id: node.id, node_type: kind, status: result.status, output: result.output, error: result.error });

    if (result.status === "failed") {
      await sb.from("flow_runs").update({ status: "error", error: result.error, current_node_id: currentId, finished_at: new Date().toISOString() }).eq("id", run.id);
      return;
    }
    currentId = nextNodeId(edges, currentId);
  }

  if (!currentId) {
    await sb.from("flow_runs").update({ status: "completed", finished_at: new Date().toISOString(), current_node_id: null }).eq("id", run.id);
  } else {
    // hit safety cap — schedule continuation
    await sb.from("flow_runs").update({ status: "pending", resume_at: new Date(Date.now() + 60_000).toISOString(), current_node_id: currentId }).eq("id", run.id);
  }
}

// ---------- HTTP entry ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";
  const specificRunId = url.searchParams.get("run_id");

  try {
    let runs: any[] = [];
    if (specificRunId) {
      const { data } = await sb.from("flow_runs").select("*").eq("id", specificRunId).limit(1);
      runs = data || [];
    } else {
      const { data } = await sb
        .from("flow_runs")
        .select("*")
        .eq("status", "pending")
        .lte("resume_at", new Date().toISOString())
        .order("resume_at", { ascending: true })
        .limit(50);
      runs = data || [];
    }

    const results: any[] = [];
    for (const run of runs) {
      try {
        await processRun(sb, run, dryRun);
        results.push({ run_id: run.id, ok: true });
      } catch (e: any) {
        console.error("[flow-worker] run failed", run.id, e);
        await sb.from("flow_runs").update({ status: "error", error: String(e?.message || e), finished_at: new Date().toISOString() }).eq("id", run.id);
        results.push({ run_id: run.id, ok: false, error: String(e?.message || e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, dry_run: dryRun, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
