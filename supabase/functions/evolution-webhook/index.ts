import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { jidToPhone, WEBHOOK_TOKEN } from "../_shared/evolution.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // Token validation
    const token = req.headers.get("X-Webhook-Token") || req.headers.get("x-webhook-token") || new URL(req.url).searchParams.get("token");
    if (!WEBHOOK_TOKEN || token !== WEBHOOK_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const payload = await req.json().catch(() => ({}));
    const event: string = payload?.event || payload?.eventType || "unknown";
    const instanceName: string = payload?.instance || payload?.instanceName || payload?.data?.instance || "";

    // Log raw
    await admin.from("whatsapp_webhook_events").insert({
      event_type: event,
      instance_name: instanceName,
      payload,
    });

    // Lookup instance
    const { data: instance } = await admin
      .from("whatsapp_instances").select("*").eq("instance_name", instanceName).maybeSingle();
    if (!instance) {
      return new Response(JSON.stringify({ ok: true, ignored: "unknown_instance" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = payload?.data || {};
    const evt = (event || "").toLowerCase();

    if (evt.includes("qrcode")) {
      const base64 = data?.qrcode?.base64 || data?.qr?.base64 || data?.base64;
      const code = data?.qrcode?.code || data?.code;
      const qr = base64 || code;
      if (qr) {
        await admin.from("whatsapp_instances").update({
          qr_code: qr, qr_updated_at: new Date().toISOString(), status: "connecting",
        }).eq("id", instance.id);
      }
    } else if (evt.includes("connection")) {
      const state = data?.state || data?.status;
      const mapped = state === "open" ? "connected" : state === "connecting" ? "connecting" : "disconnected";
      const update: any = { status: mapped };
      if (mapped === "connected") {
        update.last_connected_at = new Date().toISOString();
        update.qr_code = null;
        const number = data?.wuid || data?.number || data?.user?.id;
        if (number) update.phone_number = jidToPhone(number);
        if (data?.profileName) update.profile_name = data.profileName;
        if (data?.profilePictureUrl) update.profile_picture_url = data.profilePictureUrl;
      } else if (mapped === "disconnected") {
        update.last_disconnected_at = new Date().toISOString();
      }
      await admin.from("whatsapp_instances").update(update).eq("id", instance.id);
    } else if (evt.includes("messages.upsert") || evt.includes("messages_upsert")) {
      const messages = Array.isArray(data?.messages) ? data.messages : Array.isArray(data) ? data : [data];
      for (const m of messages) {
        if (!m?.key) continue;
        const fromMe = !!m.key.fromMe;
        const jid = m.key.remoteJid || "";
        const text =
          m.message?.conversation ||
          m.message?.extendedTextMessage?.text ||
          m.message?.imageMessage?.caption ||
          m.message?.videoMessage?.caption ||
          null;
        // Try to match deal/person by phone
        const phone = jidToPhone(jid);
        let deal_id: string | null = null, person_id: string | null = null;
        if (phone) {
          const { data: person } = await admin
            .from("crm_persons").select("id").or(`telefone.ilike.%${phone.slice(-8)}%`).limit(1).maybeSingle();
          if (person?.id) {
            person_id = person.id;
            const { data: deal } = await admin.from("crm_deals").select("id").eq("person_id", person.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
            if (deal?.id) deal_id = deal.id;
          }
        }
        await admin.from("whatsapp_messages").insert({
          instance_id: instance.id,
          direction: fromMe ? "out" : "in",
          remote_jid: jid,
          message_id: m.key.id,
          content: text,
          status: fromMe ? "sent" : "delivered",
          deal_id,
          person_id,
          sent_at: fromMe ? new Date().toISOString() : null,
          received_at: !fromMe ? new Date().toISOString() : null,
          raw: m,
        });
      }
    }

    await admin.from("whatsapp_webhook_events").update({ processed: true }).eq("event_type", event).eq("instance_name", instanceName).order("created_at", { ascending: false }).limit(1);

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("evolution-webhook error", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
