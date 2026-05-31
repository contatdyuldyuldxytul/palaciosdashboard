import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { evo, WEBHOOK_URL, WEBHOOK_TOKEN } from "../_shared/evolution.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function slugify(s: string) {
  return (s || "user").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || (req.method === "GET" ? "status" : "");

    // Fetch profile for slug
    const { data: profile } = await admin.from("profiles").select("full_name,email,colaborador_slug").eq("id", userId).maybeSingle();
    const baseSlug = profile?.colaborador_slug || slugify(profile?.full_name || profile?.email || userId.slice(0, 8));
    const instanceName = `palacios_${baseSlug}`;

    // Common: load existing row
    const { data: existing } = await admin.from("whatsapp_instances").select("*").eq("user_id", userId).maybeSingle();

    if (action === "create" || action === "connect") {
      let row = existing;
      if (!row) {
        // create instance on Evolution
        try {
          await evo(`/instance/create`, {
            method: "POST",
            body: JSON.stringify({
              instanceName,
              integration: "WHATSAPP-BAILEYS",
              qrcode: true,
              webhook: {
                url: WEBHOOK_URL,
                webhook_by_events: false,
                webhook_base64: true,
                events: [
                  "QRCODE_UPDATED",
                  "CONNECTION_UPDATE",
                  "MESSAGES_UPSERT",
                  "SEND_MESSAGE",
                  "MESSAGES_UPDATE",
                ],
                headers: { "X-Webhook-Token": WEBHOOK_TOKEN },
              },
            }),
          });
        } catch (e) {
          // If exists already on Evolution, continue
          if (!String(e).includes("already in use") && !String(e).includes("409")) throw e;
        }
        const ins = await admin.from("whatsapp_instances").insert({
          user_id: userId,
          instance_name: instanceName,
          status: "connecting",
          webhook_configured: true,
        }).select().single();
        if (ins.error) throw ins.error;
        row = ins.data as any;
      } else {
        // ensure connect call to refresh QR
        try {
          await evo(`/instance/connect/${row.instance_name}`, { method: "GET" });
        } catch (_) { /* may already be connected */ }
        await admin.from("whatsapp_instances").update({ status: "connecting" }).eq("id", row.id);
      }
      // Try to fetch QR immediately
      let qr: string | null = null;
      try {
        const qrRes = await evo(`/instance/connect/${row.instance_name}`, { method: "GET" });
        qr = qrRes?.base64 || qrRes?.code || null;
      } catch (_) {}
      if (qr) {
        await admin.from("whatsapp_instances").update({ qr_code: qr, qr_updated_at: new Date().toISOString() }).eq("id", row.id);
      }
      return new Response(JSON.stringify({ ok: true, instance: { ...row, qr_code: qr } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "qr") {
      if (!existing) return new Response(JSON.stringify({ error: "no_instance" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      let qr: string | null = null;
      try {
        const qrRes = await evo(`/instance/connect/${existing.instance_name}`, { method: "GET" });
        qr = qrRes?.base64 || qrRes?.code || null;
      } catch (_) {}
      if (qr) await admin.from("whatsapp_instances").update({ qr_code: qr, qr_updated_at: new Date().toISOString() }).eq("id", existing.id);
      return new Response(JSON.stringify({ qr }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "status") {
      if (!existing) return new Response(JSON.stringify({ instance: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      try {
        const st = await evo(`/instance/connectionState/${existing.instance_name}`, { method: "GET" });
        const state = st?.instance?.state || st?.state;
        const mapped = state === "open" ? "connected" : state === "connecting" ? "connecting" : "disconnected";
        if (mapped !== existing.status) {
          await admin.from("whatsapp_instances").update({ status: mapped }).eq("id", existing.id);
        }
      } catch (_) {}
      const { data: fresh } = await admin.from("whatsapp_instances").select("*").eq("id", existing.id).single();
      return new Response(JSON.stringify({ instance: fresh }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "disconnect") {
      if (!existing) return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      try { await evo(`/instance/logout/${existing.instance_name}`, { method: "DELETE" }); } catch (_) {}
      await admin.from("whatsapp_instances").update({ status: "disconnected", qr_code: null, last_disconnected_at: new Date().toISOString() }).eq("id", existing.id);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete") {
      if (!existing) return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      try { await evo(`/instance/logout/${existing.instance_name}`, { method: "DELETE" }); } catch (_) {}
      try { await evo(`/instance/delete/${existing.instance_name}`, { method: "DELETE" }); } catch (_) {}
      await admin.from("whatsapp_instances").delete().eq("id", existing.id);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown_action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("evolution-instance error", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
