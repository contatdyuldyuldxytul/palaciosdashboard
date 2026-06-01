import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { evo, jidToPhone } from "../_shared/evolution.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(SUPABASE_URL, SERVICE);
    const body = await req.json().catch(() => ({}));
    const { instance_id, remote_jid } = body || {};
    if (!instance_id || !remote_jid) {
      return new Response(JSON.stringify({ error: "instance_id and remote_jid required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: instance } = await admin
      .from("whatsapp_instances").select("instance_name").eq("id", instance_id).maybeSingle();
    if (!instance) {
      return new Response(JSON.stringify({ error: "instance not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const phone = jidToPhone(remote_jid);
    let profilePictureUrl: string | null = null;
    try {
      const r = await evo(`/chat/fetchProfilePictureUrl/${instance.instance_name}`, {
        method: "POST",
        body: JSON.stringify({ number: phone }),
      });
      profilePictureUrl = r?.profilePictureUrl || r?.url || null;
    } catch (_) { /* ignore - private/none */ }

    // pushName from latest raw
    const { data: last } = await admin
      .from("whatsapp_messages").select("raw")
      .eq("instance_id", instance_id).eq("remote_jid", remote_jid)
      .eq("direction", "in").order("created_at", { ascending: false }).limit(1).maybeSingle();
    const pushName = (last?.raw as any)?.pushName || null;

    return new Response(JSON.stringify({ profilePictureUrl, pushName, phone }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
