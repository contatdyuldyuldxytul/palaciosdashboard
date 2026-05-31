import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { evo, normalizePhone } from "../_shared/evolution.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const { instance_id, to, content, deal_id, person_id } = body || {};
    if (!to || !content) {
      return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve instance — by id (if provided) or by user
    let instance: any = null;
    if (instance_id) {
      const { data } = await admin.from("whatsapp_instances").select("*").eq("id", instance_id).maybeSingle();
      instance = data;
    } else {
      const { data } = await admin.from("whatsapp_instances").select("*").eq("user_id", userId).maybeSingle();
      instance = data;
    }
    if (!instance) return new Response(JSON.stringify({ error: "no_instance" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Authz: owner or fundador
    if (instance.user_id !== userId) {
      const { data: isFund } = await admin.rpc("has_role", { _user_id: userId, _role: "fundador" });
      if (!isFund) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (instance.status !== "connected") {
      return new Response(JSON.stringify({ error: "instance_not_connected" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const number = normalizePhone(to);
    const res = await evo(`/message/sendText/${instance.instance_name}`, {
      method: "POST",
      body: JSON.stringify({ number, text: content }),
    });

    const messageId = res?.key?.id || res?.id || null;
    const ins = await admin.from("whatsapp_messages").insert({
      instance_id: instance.id,
      direction: "out",
      remote_jid: `${number}@s.whatsapp.net`,
      message_id: messageId,
      content,
      status: "sent",
      deal_id: deal_id || null,
      person_id: person_id || null,
      sent_at: new Date().toISOString(),
      raw: res || {},
    }).select().single();

    return new Response(JSON.stringify({ ok: true, message: ins.data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("evolution-send error", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
