import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalize(str: string): string {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
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

    // Get all pipelines to find ALINE'S PIPELINE
    const pipelinesRes = await fetch(`https://api.pipedrive.com/v1/pipelines?api_token=${API_KEY}`);
    if (!pipelinesRes.ok) throw new Error("Failed to fetch pipelines");
    const pipelinesData = await pipelinesRes.json();
    const pipeline = (pipelinesData.data || []).find((p: any) => 
      p.name?.toUpperCase().includes("ALINE") && p.name?.toUpperCase().includes("ALFA")
    );
    if (!pipeline) throw new Error("Pipeline ALINE'S PIPELINE - ALFA not found");

    // Get stages for this pipeline
    const stagesRes = await fetch(`https://api.pipedrive.com/v1/stages?pipeline_id=${pipeline.id}&api_token=${API_KEY}`);
    const stagesData = await stagesRes.json();
    const stageMap: Record<number, string> = {};
    (stagesData.data || []).forEach((s: any) => { stageMap[s.id] = s.name; });

    // Fetch ALL deals from this pipeline (paginated)
    const allDeals: PipedriveDeal[] = [];
    let start = 0;
    let hasMore = true;
    while (hasMore) {
      const dealsRes = await fetch(
        `https://api.pipedrive.com/v1/deals?pipeline_id=${pipeline.id}&start=${start}&limit=100&api_token=${API_KEY}`
      );
      if (!dealsRes.ok) {
        const errText = await dealsRes.text();
        throw new Error(`Pipedrive API error (${dealsRes.status}): ${errText}`);
      }
      const dealsData = await dealsRes.json();
      if (dealsData.data) allDeals.push(...dealsData.data);
      hasMore = dealsData.additional_data?.pagination?.more_items_in_collection || false;
      start += 100;
    }

    // Also fetch persons for email matching
    const personsMap: Record<string, { name: string; emails: string[] }> = {};
    for (const deal of allDeals) {
      const personName = deal.person_id?.name || deal.person_name || "";
      const emails = (deal.person_id?.email || []).map((e: any) => e.value?.toLowerCase()).filter(Boolean);
      const orgName = deal.org_name || deal.title || "";
      const key = normalize(orgName) || normalize(personName);
      if (key) {
        personsMap[key] = { name: personName, emails };
      }
    }

    // Compare each uploaded lead against Pipedrive deals
    const results = (leads as any[]).map((lead: any) => {
      const leadName = normalize(lead.nome || lead.contato || lead.name || "");
      const leadEmail = (lead.email || "").toLowerCase().trim();
      const leadCompany = normalize(lead.empresa || lead.company || "");
      
      let matchType: "exact" | "partial" | "none" = "none";
      let matchedDeal: any = null;

      for (const deal of allDeals) {
        const dealPerson = normalize(deal.person_id?.name || deal.person_name || "");
        const dealOrg = normalize(deal.org_name || "");
        const dealTitle = normalize(deal.title || "");
        const dealEmails = (deal.person_id?.email || []).map((e: any) => e.value?.toLowerCase().trim()).filter(Boolean);

        let nameMatch = false;
        let emailMatch = false;
        let companyMatch = false;

        if (leadName && dealPerson && (dealPerson.includes(leadName) || leadName.includes(dealPerson))) nameMatch = true;
        if (leadEmail && dealEmails.includes(leadEmail)) emailMatch = true;
        if (leadCompany && (dealOrg.includes(leadCompany) || leadCompany.includes(dealOrg) || dealTitle.includes(leadCompany) || leadCompany.includes(dealTitle))) companyMatch = true;

        if ((nameMatch && emailMatch) || (nameMatch && companyMatch) || (emailMatch && companyMatch) || companyMatch) {
          matchType = "exact";
          matchedDeal = deal;
          break;
        }
        if (nameMatch || emailMatch) {
          matchType = "partial";
          matchedDeal = deal;
        }
      }

      return {
        nome: lead.nome || lead.contato || lead.name || "—",
        empresa: lead.empresa || lead.company || "—",
        email: lead.email || "—",
        status: matchType === "exact" ? "JA_PROSPECTADO" : matchType === "partial" ? "POSSIVEL_DUPLICATA" : "NOVO",
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
      possiveis_duplicatas: results.filter((r: any) => r.status === "POSSIVEL_DUPLICATA").length,
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
