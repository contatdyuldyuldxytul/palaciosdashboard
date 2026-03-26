import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalize(str: string): string {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function namesMatch(leadName: string, dealName: string): boolean {
  const leadParts = normalize(leadName).split(/\s+/).filter(w => w.length > 1);
  const dealParts = normalize(dealName).split(/\s+/).filter(w => w.length > 1);
  if (leadParts.length < 2 || dealParts.length < 2) return false;
  const leadFirst = leadParts[0];
  const leadLast = leadParts[leadParts.length - 1];
  const dealFirst = dealParts[0];
  const dealLast = dealParts[dealParts.length - 1];
  return leadFirst === dealFirst && leadLast === dealLast;
}

interface PipedriveDeal {
  title: string;
  person_name: string | null;
  org_name: string | null;
  add_time: string;
  stage_id: number;
  status: string;
  person_id?: { name?: string; email?: Array<{ value: string }> } | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { leads } = await req.json();
    const API_KEY = Deno.env.get("PIPEDRIVE_API_KEY");
    if (!API_KEY) throw new Error("PIPEDRIVE_API_KEY is not configured");

    const pipelinesRes = await fetch(`https://api.pipedrive.com/v1/pipelines?api_token=${API_KEY}`);
    if (!pipelinesRes.ok) throw new Error("Failed to fetch pipelines");
    const pipelinesData = await pipelinesRes.json();
    const pipeline = (pipelinesData.data || []).find((p: any) =>
      p.name?.toUpperCase().includes("ALINE") && p.name?.toUpperCase().includes("ALFA")
    );
    if (!pipeline) throw new Error("Pipeline ALINE'S PIPELINE - ALFA not found");

    const stagesRes = await fetch(`https://api.pipedrive.com/v1/stages?pipeline_id=${pipeline.id}&api_token=${API_KEY}`);
    const stagesData = await stagesRes.json();
    const stageMap: Record<number, string> = {};
    (stagesData.data || []).forEach((s: any) => { stageMap[s.id] = s.name; });

    const allDeals: PipedriveDeal[] = [];
    let start = 0;
    let hasMore = true;
    while (hasMore) {
      const dealsRes = await fetch(
        `https://api.pipedrive.com/v1/deals?pipeline_id=${pipeline.id}&start=${start}&limit=100&api_token=${API_KEY}`
      );
      if (!dealsRes.ok) throw new Error(`Pipedrive API error (${dealsRes.status})`);
      const dealsData = await dealsRes.json();
      if (dealsData.data) allDeals.push(...dealsData.data);
      hasMore = dealsData.additional_data?.pagination?.more_items_in_collection || false;
      start += 100;
    }

    const results = (leads as any[]).map((lead: any) => {
      const leadName = lead.nome || lead.contato || lead.name || "";
      const leadEmail = normalize(lead.email || "");
      const leadCompany = lead.empresa || lead.company || "";

      let status: "JA_PROSPECTADO" | "NOVO" = "NOVO";
      let matchField: string | null = null;
      let matchValue: string | null = null;
      let matchedDeal: PipedriveDeal | null = null;

      for (const deal of allDeals) {
        const dealPerson = deal.person_id?.name || deal.person_name || "";
        const dealEmails = (deal.person_id?.email || []).map((e: any) => normalize(e.value || "")).filter(Boolean);

        // Rule 1: Exact email match
        if (leadEmail && leadEmail.length > 3 && dealEmails.includes(leadEmail)) {
          status = "JA_PROSPECTADO";
          matchField = "E-mail";
          matchValue = leadEmail;
          matchedDeal = deal;
          break;
        }

        // Rule 2: First AND last name both match exactly
        if (leadName && dealPerson && namesMatch(leadName, dealPerson)) {
          status = "JA_PROSPECTADO";
          matchField = "Nome";
          matchValue = dealPerson;
          matchedDeal = deal;
          break;
        }
      }

      return {
        nome: leadName || "—",
        empresa: leadCompany || "—",
        email: lead.email || "—",
        status,
        match_info: matchField ? { field: matchField, pipedrive_value: matchValue } : null,
        pipedrive_info: matchedDeal ? {
          added: matchedDeal.add_time,
          stage: stageMap[matchedDeal.stage_id] || "Desconhecido",
          deal_status: matchedDeal.status,
        } : null,
      };
    });

    const summary = {
      total: results.length,
      ja_prospectados: results.filter((r: any) => r.status === "JA_PROSPECTADO").length,
      novos: results.filter((r: any) => r.status === "NOVO").length,
    };

    return new Response(JSON.stringify({ success: true, results, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-pipedrive-history error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
