// Sync campaign_leads status with Pipedrive deals
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PIPEDRIVE_BASE = "https://palacios3dstudio.pipedrive.com/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const PIPEDRIVE_TOKEN = Deno.env.get("PIPEDRIVE_API_KEY");
  if (!PIPEDRIVE_TOKEN) {
    return new Response(JSON.stringify({ error: "PIPEDRIVE_API_KEY missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: leads } = await supabase
    .from("campaign_leads")
    .select("id, pipedrive_deal_id")
    .not("pipedrive_deal_id", "is", null)
    .eq("status", "active");

  let updated = 0;
  for (const lead of leads ?? []) {
    try {
      const r = await fetch(
        `${PIPEDRIVE_BASE}/deals/${lead.pipedrive_deal_id}?api_token=${PIPEDRIVE_TOKEN}`
      );
      if (!r.ok) continue;
      const j = await r.json();
      const status = j?.data?.status; // open | won | lost | deleted
      let newStatus: string = "active";
      if (status === "won") newStatus = "won";
      else if (status === "lost") newStatus = "lost";
      else if (status === "deleted") newStatus = "done";

      await supabase
        .from("campaign_leads")
        .update({ status: newStatus, last_synced_at: new Date().toISOString() })
        .eq("id", lead.id);
      updated++;
    } catch (e) {
      console.error("sync error", lead.id, e);
    }
  }

  return new Response(JSON.stringify({ ok: true, updated }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
