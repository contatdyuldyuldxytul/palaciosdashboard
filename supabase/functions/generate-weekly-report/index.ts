// Generate the weekly report; runs Friday 17:00 BRT
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function spNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const today = spNow();
  // Monday of current week
  const day = today.getDay() || 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day - 1));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const weekStart = monday.toISOString().slice(0, 10);
  const weekEnd = friday.toISOString().slice(0, 10);

  const { data: activities } = await supabase
    .from("daily_activities")
    .select("assignee_label, completed, completed_at, related_campaign_id")
    .gte("scheduled_date", weekStart)
    .lte("scheduled_date", weekEnd);

  const byUser: Record<string, { total: number; done: number }> = {};
  for (const a of activities ?? []) {
    const k = a.assignee_label || "—";
    byUser[k] ||= { total: 0, done: 0 };
    byUser[k].total++;
    if (a.completed) byUser[k].done++;
  }

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, kpis, status");

  const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const { data: strategy } = await supabase
    .from("monthly_strategies")
    .select("id")
    .eq("month", month)
    .maybeSingle();

  const metrics = {
    activities_by_user: byUser,
    campaigns_active: (campaigns ?? []).filter((c: any) => c.status === "active").length,
    campaigns: campaigns,
    week_start: weekStart,
    week_end: weekEnd,
  };

  const narrative = `Semana ${weekStart} a ${weekEnd}. ${
    Object.entries(byUser)
      .map(([u, v]) => `${u}: ${v.done}/${v.total}`)
      .join(" · ")
  }. ${(campaigns ?? []).filter((c: any) => c.status === "active").length} campanha(s) ativa(s).`;

  const { data: inserted } = await supabase
    .from("weekly_reports")
    .upsert(
      {
        week_start: weekStart,
        week_end: weekEnd,
        monthly_strategy_id: strategy?.id ?? null,
        metrics,
        narrative_text: narrative,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "week_start" }
    )
    .select()
    .single();

  // Optional webhook
  const webhook = Deno.env.get("WEEKLY_REPORT_WEBHOOK");
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inserted),
      });
    } catch (e) {
      console.error("webhook failed", e);
    }
  }

  return new Response(JSON.stringify({ ok: true, report: inserted }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
