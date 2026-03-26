import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalize(str: string): string {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// Common words to IGNORE when comparing company names
const COMMON_WORDS = new Set([
  "incorporadora", "construtora", "empreendimentos", "imobiliaria", "engenharia",
  "ltda", "sa", "s/a", "eireli", "me", "epp", "grupo", "holding",
  "desenvolvimento", "participacoes", "investimentos", "negocios",
  "construcoes", "servicos", "comercio", "comercial", "industria",
  "brasil", "brasileira", "nacional", "internacional",
  "de", "do", "da", "dos", "das", "e", "em", "com", "para", "por",
  "s.a", "s.a.", "the", "and", "of",
]);

function getUniqueWords(name: string): string[] {
  return normalize(name)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !COMMON_WORDS.has(w));
}

// Levenshtein distance
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  return ((maxLen - levenshtein(a, b)) / maxLen) * 100;
}

// Compare company names using only unique (non-common) words
function companySimlarity(leadCompany: string, dealCompany: string): number {
  const leadWords = getUniqueWords(leadCompany);
  const dealWords = getUniqueWords(dealCompany);
  
  // If either has no unique words, can't match
  if (leadWords.length === 0 || dealWords.length === 0) return 0;
  
  // Full string similarity on unique parts only
  const leadUnique = leadWords.join(" ");
  const dealUnique = dealWords.join(" ");
  
  return similarity(leadUnique, dealUnique);
}

// Check if first AND last name both match
function fullNameMatch(leadName: string, dealName: string): boolean {
  const leadParts = normalize(leadName).split(/\s+/).filter(w => w.length > 1);
  const dealParts = normalize(dealName).split(/\s+/).filter(w => w.length > 1);
  
  if (leadParts.length < 2 || dealParts.length < 2) return false;
  
  const leadFirst = leadParts[0];
  const leadLast = leadParts[leadParts.length - 1];
  const dealFirst = dealParts[0];
  const dealLast = dealParts[dealParts.length - 1];
  
  return (similarity(leadFirst, dealFirst) >= 85 && similarity(leadLast, dealLast) >= 85);
}

interface MatchInfo {
  field: string;
  pipedrive_value: string;
  confidence: number;
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

    // Get pipelines
    const pipelinesRes = await fetch(`https://api.pipedrive.com/v1/pipelines?api_token=${API_KEY}`);
    if (!pipelinesRes.ok) throw new Error("Failed to fetch pipelines");
    const pipelinesData = await pipelinesRes.json();
    const pipeline = (pipelinesData.data || []).find((p: any) => 
      p.name?.toUpperCase().includes("ALINE") && p.name?.toUpperCase().includes("ALFA")
    );
    if (!pipeline) throw new Error("Pipeline ALINE'S PIPELINE - ALFA not found");

    // Get stages
    const stagesRes = await fetch(`https://api.pipedrive.com/v1/stages?pipeline_id=${pipeline.id}&api_token=${API_KEY}`);
    const stagesData = await stagesRes.json();
    const stageMap: Record<number, string> = {};
    (stagesData.data || []).forEach((s: any) => { stageMap[s.id] = s.name; });

    // Fetch ALL deals (paginated)
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

    // Compare each lead with strict rules
    const results = (leads as any[]).map((lead: any) => {
      const leadName = lead.nome || lead.contato || lead.name || "";
      const leadEmail = (lead.email || "").toLowerCase().trim();
      const leadCompany = lead.empresa || lead.company || "";

      let bestStatus: "JA_PROSPECTADO" | "POSSIVEL_DUPLICATA" | "NOVO" = "NOVO";
      let bestMatch: MatchInfo | null = null;
      let bestDeal: PipedriveDeal | null = null;

      for (const deal of allDeals) {
        const dealPerson = deal.person_id?.name || deal.person_name || "";
        const dealOrg = deal.org_name || "";
        const dealTitle = deal.title || "";
        const dealEmails = (deal.person_id?.email || []).map((e: any) => e.value?.toLowerCase().trim()).filter(Boolean);
        const dealCompanyName = dealOrg || dealTitle;

        // RULE 1: Exact email match → JA_PROSPECTADO
        if (leadEmail && leadEmail.length > 3 && dealEmails.includes(leadEmail)) {
          bestStatus = "JA_PROSPECTADO";
          bestMatch = { field: "Email", pipedrive_value: leadEmail, confidence: 100 };
          bestDeal = deal;
          break;
        }

        // RULE 2: Full name match (first + last) → JA_PROSPECTADO
        if (leadName && dealPerson && fullNameMatch(leadName, dealPerson)) {
          bestStatus = "JA_PROSPECTADO";
          bestMatch = { field: "Nome completo", pipedrive_value: dealPerson, confidence: 95 };
          bestDeal = deal;
          break;
        }

        // RULE 3: Company name comparison
        if (leadCompany && dealCompanyName) {
          const compSim = companySimlarity(leadCompany, dealCompanyName);

          // ≥80% on unique words → JA_PROSPECTADO
          if (compSim >= 80) {
            if (bestStatus !== "JA_PROSPECTADO") {
              bestStatus = "JA_PROSPECTADO";
              bestMatch = { field: "Empresa", pipedrive_value: dealCompanyName, confidence: Math.round(compSim) };
              bestDeal = deal;
            }
          }
          // 60-80% → POSSIVEL_DUPLICATA (only upgrade if currently NOVO)
          else if (compSim >= 60 && bestStatus === "NOVO") {
            bestStatus = "POSSIVEL_DUPLICATA";
            bestMatch = { field: "Empresa (parcial)", pipedrive_value: dealCompanyName, confidence: Math.round(compSim) };
            bestDeal = deal;
          }
        }

        // If already JA_PROSPECTADO, stop searching
        if (bestStatus === "JA_PROSPECTADO") break;
      }

      return {
        nome: leadName || "—",
        empresa: leadCompany || "—",
        email: leadEmail || "—",
        status: bestStatus,
        match_info: bestMatch,
        pipedrive_info: bestDeal ? {
          added: bestDeal.add_time,
          stage: stageMap[bestDeal.stage_id] || "Desconhecido",
          deal_status: bestDeal.status,
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
