import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { evo, normalizePhone } from "../_shared/evolution.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function renderTemplate(tpl: string, vars: Record<string, any>) {
  return (tpl || "").replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, k) => {
    const v = vars?.[k];
    return v == null ? "" : String(v);
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE);
    const nowIso = new Date().toISOString();

    const { data: due } = await admin
      .from("whatsapp_scheduled_messages")
      .select("*, whatsapp_instances(*), whatsapp_campaigns(id,status,sent,failed,total,message_template)")
      .eq("status", "pending")
      .lte("scheduled_for", nowIso)
      .limit(25);

    let processed = 0, sent = 0, failed = 0, skipped = 0;
    for (const job of due || []) {
      processed++;
      const instance: any = (job as any).whatsapp_instances;
      const campaign: any = (job as any).whatsapp_campaigns;

      // Respect paused/cancelled campaigns
      if (campaign && (campaign.status === "paused" || campaign.status === "cancelled")) {
        skipped++;
        continue;
      }

      try {
        if (!instance || instance.status !== "connected") throw new Error("instance_not_connected");
        const number = normalizePhone(job.to_number);
        // Render variables if any
        const baseTpl = campaign?.message_template || job.content;
        const finalContent = renderTemplate(baseTpl, (job as any).variables || {});

        const res = await evo(`/message/sendText/${instance.instance_name}`, {
          method: "POST",
          body: JSON.stringify({ number, text: finalContent }),
        });
        const messageId = res?.key?.id || res?.id || null;
        const ins = await admin.from("whatsapp_messages").insert({
          instance_id: instance.id,
          direction: "out",
          remote_jid: `${number}@s.whatsapp.net`,
          message_id: messageId,
          content: finalContent,
          status: "sent",
          deal_id: job.deal_id,
          person_id: job.person_id,
          sent_at: new Date().toISOString(),
          raw: res || {},
        }).select().single();
        await admin.from("whatsapp_scheduled_messages").update({
          status: "sent", sent_at: new Date().toISOString(), sent_message_id: ins.data?.id || null,
        }).eq("id", job.id);
        sent++;

        if (campaign?.id) {
          const newSent = (campaign.sent || 0) + 1;
          const isDone = newSent + (campaign.failed || 0) >= (campaign.total || 0);
          await admin.from("whatsapp_campaigns").update({
            sent: newSent,
            status: isDone ? "completed" : "running",
          }).eq("id", campaign.id);
        }
      } catch (e) {
        failed++;
        await admin.from("whatsapp_scheduled_messages").update({
          status: "failed", error_message: String((e as any)?.message || e),
        }).eq("id", job.id);
        if (campaign?.id) {
          const newFailed = (campaign.failed || 0) + 1;
          const isDone = (campaign.sent || 0) + newFailed >= (campaign.total || 0);
          await admin.from("whatsapp_campaigns").update({
            failed: newFailed,
            status: isDone ? "completed" : "running",
          }).eq("id", campaign.id);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, processed, sent, failed, skipped }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("evolution-scheduler error", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
