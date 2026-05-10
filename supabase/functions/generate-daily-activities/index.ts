// Generate daily activities for the next business day
// Triggered nightly by pg_cron at 23:00 BRT, or manually
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function nextBusinessDay(from: Date): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
}

function diffBusinessDays(from: Date, to: Date): number {
  let n = 0;
  const cur = new Date(from);
  while (cur < to) {
    cur.setDate(cur.getDate() + 1);
    if (cur.getDay() !== 0 && cur.getDay() !== 6) n++;
  }
  return n;
}

function render(template: string, ctx: Record<string, string>): string {
  return template
    .replace(/\{\{lead_name\}\}/g, ctx.lead_name || "")
    .replace(/\{\{lead_company\}\}/g, ctx.lead_company || "");
}

const PIPEDRIVE_USER_TO_ASSIGNEE: Record<string, string> = {
  "23830611": "Thiago",
  "24578358": "Aline",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Determine target date (next business day from "today" in São Paulo)
    const url = new URL(req.url);
    const overrideDate = url.searchParams.get("date");
    const todaySP = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const target = overrideDate ? new Date(overrideDate) : nextBusinessDay(todaySP);
    const targetISO = target.toISOString().slice(0, 10);

    if (target.getDay() === 0 || target.getDay() === 6) {
      return new Response(JSON.stringify({ ok: true, skipped: "weekend", date: targetISO }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load active campaigns + leads
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id, name, owner_user_id, playbook_type, custom_templates")
      .eq("status", "active");

    const generated: any[] = [];

    for (const campaign of campaigns ?? []) {
      const { data: leads } = await supabase
        .from("campaign_leads")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("status", "active");

      const { data: templates } = await supabase
        .from("cadence_templates")
        .select("*")
        .eq("playbook_type", campaign.playbook_type);

      const overrides = (campaign.custom_templates as Record<string, string>) || {};
      const assignee = PIPEDRIVE_USER_TO_ASSIGNEE[String(campaign.owner_user_id)] || "Aline";

      for (const lead of leads ?? []) {
        const enteredAt = new Date(lead.entered_flow_at);
        const businessDaysSince = diffBusinessDays(enteredAt, target);
        const dayInFlow = Math.min(10, businessDaysSince + 1);
        if (dayInFlow < 1 || dayInFlow > 10) continue;

        const dayTemplates = (templates ?? []).filter((t: any) => t.day_in_flow === dayInFlow);

        for (const tpl of dayTemplates) {
          const overrideKey = `${tpl.channel}_day_${tpl.day_in_flow}`;
          const taskTemplate = overrides[overrideKey] || tpl.task_template;
          const description = render(taskTemplate, {
            lead_name: lead.lead_name ?? "",
            lead_company: lead.lead_company ?? "",
          });

          generated.push({
            assignee_label: assignee,
            scheduled_date: targetISO,
            task_type: "cadence",
            task_description: description,
            related_deal_id: lead.pipedrive_deal_id,
            related_campaign_id: campaign.id,
            priority: 5,
            source: "auto",
          });
        }

        // advance day for next run
        await supabase
          .from("campaign_leads")
          .update({ current_day_in_flow: dayInFlow })
          .eq("id", lead.id);
      }
    }

    // Strategic inputs not yet processed
    const { data: inputs } = await supabase
      .from("strategic_inputs")
      .select("*")
      .eq("processed", false);

    for (const input of inputs ?? []) {
      generated.push({
        user_id: input.target_user_id,
        assignee_label: input.target_assignee_label,
        scheduled_date: targetISO,
        task_type: "strategic",
        task_description: input.task_description,
        related_deal_id: input.related_deal_id,
        priority: input.priority || 8,
        source: "claude_briefing",
      });
      await supabase
        .from("strategic_inputs")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("id", input.id);
    }

    // Cap at 10 per assignee by priority desc, push the rest to next business day
    const byAssignee: Record<string, any[]> = {};
    for (const g of generated) {
      const k = g.assignee_label || g.user_id || "unassigned";
      (byAssignee[k] ||= []).push(g);
    }

    const toInsert: any[] = [];
    const overflow: any[] = [];
    for (const arr of Object.values(byAssignee)) {
      arr.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      toInsert.push(...arr.slice(0, 10));
      overflow.push(...arr.slice(10));
    }

    if (toInsert.length) await supabase.from("daily_activities").insert(toInsert);

    // Overflow goes to next next business day
    if (overflow.length) {
      const nextNext = nextBusinessDay(target).toISOString().slice(0, 10);
      const queued = overflow.map((o) => ({ ...o, scheduled_date: nextNext }));
      await supabase.from("daily_activities").insert(queued);
    }

    return new Response(
      JSON.stringify({ ok: true, date: targetISO, inserted: toInsert.length, queued_next_day: overflow.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
