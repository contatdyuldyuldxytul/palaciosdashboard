import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { evo, normalizePhone } from "../_shared/evolution.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE);
    const nowIso = new Date().toISOString();

    const { data: due } = await admin
      .from("whatsapp_scheduled_messages")
      .select("*, whatsapp_instances(*)")
      .eq("status", "pending")
      .lte("scheduled_for", nowIso)
      .limit(25);

    let processed = 0, sent = 0, failed = 0;
    for (const job of due || []) {
      processed++;
      const instance: any = (job as any).whatsapp_instances;
      try {
        if (!instance || instance.status !== "connected") throw new Error("instance_not_connected");
        const number = normalizePhone(job.to_number);
        const res = await evo(`/message/sendText/${instance.instance_name}`, {
          method: "POST",
          body: JSON.stringify({ number, text: job.content }),
        });
        const messageId = res?.key?.id || res?.id || null;
        const ins = await admin.from("whatsapp_messages").insert({
          instance_id: instance.id,
          direction: "out",
          remote_jid: `${number}@s.whatsapp.net`,
          message_id: messageId,
          content: job.content,
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
      } catch (e) {
        failed++;
        await admin.from("whatsapp_scheduled_messages").update({
          status: "failed", error_message: String((e as any)?.message || e),
        }).eq("id", job.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, processed, sent, failed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("evolution-scheduler error", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
