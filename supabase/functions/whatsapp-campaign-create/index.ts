import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { normalizePhone } from "../_shared/evolution.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Recipient = { to: string; name?: string; variables?: Record<string, any>; person_id?: string; deal_id?: string };
type Settings = {
  interval_min?: number; // seconds
  interval_max?: number;
  daily_limit?: number;
  window_start?: string; // "09:00"
  window_end?: string;   // "18:00"
  weekdays?: number[];   // 0-6 (0=Sun)
};

function parseHM(s: string): { h: number; m: number } {
  const [h, m] = (s || "09:00").split(":").map((n) => parseInt(n, 10) || 0);
  return { h, m };
}

// Schedule N msgs honoring random interval, daily window and limit
function buildSchedule(count: number, settings: Settings): Date[] {
  const intMin = Math.max(5, settings.interval_min ?? 30);
  const intMax = Math.max(intMin, settings.interval_max ?? 60);
  const dailyLimit = Math.max(1, settings.daily_limit ?? 80);
  const winStart = parseHM(settings.window_start ?? "09:00");
  const winEnd = parseHM(settings.window_end ?? "18:00");
  const weekdays = (settings.weekdays && settings.weekdays.length ? settings.weekdays : [1, 2, 3, 4, 5]);

  const out: Date[] = [];
  let cursor = new Date();
  const advanceToNextWindow = () => {
    // move cursor to next valid weekday/window
    while (true) {
      const wd = cursor.getDay();
      const startToday = new Date(cursor);
      startToday.setHours(winStart.h, winStart.m, 0, 0);
      const endToday = new Date(cursor);
      endToday.setHours(winEnd.h, winEnd.m, 0, 0);
      if (weekdays.includes(wd) && cursor < endToday) {
        if (cursor < startToday) cursor = startToday;
        return;
      }
      // next day at start
      cursor = new Date(cursor.getTime() + 24 * 3600 * 1000);
      cursor.setHours(winStart.h, winStart.m, 0, 0);
    }
  };

  let sentToday = 0;
  let currentDay = -1;

  for (let i = 0; i < count; i++) {
    advanceToNextWindow();
    if (cursor.getDate() !== currentDay) {
      currentDay = cursor.getDate();
      sentToday = 0;
    }
    if (sentToday >= dailyLimit) {
      // jump to next day window
      cursor = new Date(cursor.getTime() + 24 * 3600 * 1000);
      cursor.setHours(winStart.h, winStart.m, 0, 0);
      advanceToNextWindow();
      currentDay = cursor.getDate();
      sentToday = 0;
    }
    out.push(new Date(cursor));
    sentToday++;
    const gap = (intMin + Math.random() * (intMax - intMin)) * 1000;
    cursor = new Date(cursor.getTime() + gap);
  }
  return out;
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
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const { instance_id, nome, message_template, recipients, settings } = body || {};
    if (!instance_id || !nome || !message_template || !Array.isArray(recipients) || !recipients.length) {
      return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate instance
    const { data: instance } = await admin.from("whatsapp_instances").select("*").eq("id", instance_id).maybeSingle();
    if (!instance) return new Response(JSON.stringify({ error: "no_instance" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (instance.user_id !== userId) {
      const { data: isFund } = await admin.rpc("has_role", { _user_id: userId, _role: "fundador" });
      if (!isFund) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Dedup + normalize
    const seen = new Set<string>();
    const cleanRecipients: Recipient[] = [];
    for (const r of recipients as Recipient[]) {
      const num = normalizePhone(r.to || "");
      if (!num || seen.has(num)) continue;
      seen.add(num);
      cleanRecipients.push({ ...r, to: num });
    }
    if (!cleanRecipients.length) return new Response(JSON.stringify({ error: "no_valid_recipients" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Create campaign
    const camp = await admin.from("whatsapp_campaigns").insert({
      instance_id,
      created_by: userId,
      nome,
      message_template,
      total: cleanRecipients.length,
      status: "running",
      settings: settings || {},
    }).select().single();
    if (camp.error) throw camp.error;
    const campaignId = camp.data.id;

    // Schedule
    const times = buildSchedule(cleanRecipients.length, settings || {});
    const rows = cleanRecipients.map((r, i) => ({
      instance_id,
      created_by: userId,
      campaign_id: campaignId,
      to_number: r.to,
      recipient_name: r.name || null,
      content: message_template, // also stored for visibility
      variables: r.variables || { nome: r.name || "" },
      scheduled_for: times[i].toISOString(),
      status: "pending",
      person_id: r.person_id || null,
      deal_id: r.deal_id || null,
    }));

    // Insert in chunks
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const { error } = await admin.from("whatsapp_scheduled_messages").insert(rows.slice(i, i + chunkSize));
      if (error) throw error;
    }

    return new Response(JSON.stringify({ ok: true, campaign_id: campaignId, scheduled: rows.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("whatsapp-campaign-create error", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
