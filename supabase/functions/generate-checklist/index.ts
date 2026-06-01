import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const _authSb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: _claims, error: _authErr } = await _authSb.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (_authErr || !_claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { colaborador } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const mesAno = `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
    const todayStr = now.toISOString().split("T")[0];

    // Get today's goals
    const { data: metasDia } = await supabase
      .from("metas_distribuidas")
      .select("*")
      .eq("mes_ano", mesAno)
      .eq("data", todayStr)
      .maybeSingle();

    // Get Pipedrive data for Aline
    let pipedriveContext = "";
    if (colaborador === "Aline") {
      const PIPEDRIVE_API_KEY = Deno.env.get("PIPEDRIVE_API_KEY");
      if (PIPEDRIVE_API_KEY) {
        try {
          // Get deals from Aline's pipeline
          const pRes = await fetch(`https://api.pipedrive.com/v1/deals?status=open&limit=100&api_token=${PIPEDRIVE_API_KEY}`);
          if (pRes.ok) {
            const pData = await pRes.json();
            const deals = pData.data || [];
            
            const staleDeals = deals.filter((d: any) => {
              const lastUpdate = new Date(d.update_time || d.add_time);
              const daysSince = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
              return daysSince >= 10 && (d.stage_id || "").toString().includes("contato");
            });

            const demoDeals = deals.filter((d: any) => {
              const stageName = (d.stage_name || "").toLowerCase();
              return stageName.includes("demo");
            });

            pipedriveContext = `
Leads sem movimentação 10+ dias: ${staleDeals.length > 0 ? staleDeals.map((d: any) => `${d.title} (${Math.floor((now.getTime() - new Date(d.update_time || d.add_time).getTime()) / (1000*60*60*24))} dias)`).join(", ") : "Nenhum"}
Deals em Demo Agendada: ${demoDeals.length}
Total deals abertos: ${deals.length}`;
          }
        } catch (e) {
          console.error("Pipedrive fetch error:", e);
        }
      }
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (colaborador === "Aline") {
      systemPrompt = `Você é o coach de vendas da Palacios 3D Studio, empresa de renderização 3D para construtoras e incorporadoras. Crie o checklist diário para Aline, SDR da empresa.

METODOLOGIA: SPIN Selling
PROCESSO: Entrada de Leads → Tentando Contato → Contato Realizado → Contato c/ Decisor → Demo Agendada

REGRAS:
1. Prioridade máxima: leads em 'Contato com o Decisor' sem movimentação há 10+ dias = tarefa de break-up
2. Seguir as metas diárias estabelecidas pelo CEO
3. Tarefas devem ser específicas e acionáveis
4. Máximo 6 tarefas por dia
5. Formato:
   - tipo: 'email' | 'ligacao' | 'followup' | 'breakup' | 'demo' | 'proposta'
   - titulo: texto curto
   - quantidade: número
   - prioridade: 'alta' | 'media' | 'baixa'
   - descricao: detalhe da tarefa

Retorne APENAS JSON válido:
{
  "tarefas": [
    { "tipo": "breakup", "titulo": "Break-up com decisores inativos", "quantidade": 3, "descricao": "Decisores sem resposta há 10+ dias.", "prioridade": "alta" }
  ]
}`;

      userPrompt = `DADOS DO DIA (${todayStr}):
Meta demos hoje: ${metasDia?.demos_dia || 0}
Meta contatos hoje: ${metasDia?.leads_contatados_dia || 0}
${pipedriveContext}`;
    } else {
      // Milena (LDR)
      systemPrompt = `Você é o coach de prospecção da Palacios 3D Studio. Crie o checklist diário para Milena, LDR da empresa.

PAPEL: Gerar e qualificar leads de construtoras e incorporadoras para a SDR Aline.

FONTES:
- LinkedIn (busca por Gerente/Diretor de Marketing em construtoras)
- Alvarás da Prefeitura de SP
- Indicações e referências

REGRAS:
1. Tarefas focadas em geração de leads
2. Máximo 5 tarefas por dia
3. Baseadas na meta diária

Retorne APENAS JSON válido:
{
  "tarefas": [
    { "tipo": "email", "titulo": "Prospectar no LinkedIn", "quantidade": 10, "descricao": "Buscar gerentes de marketing em construtoras.", "prioridade": "alta" }
  ]
}`;

      userPrompt = `DADOS DO DIA (${todayStr}):
Meta leads hoje: ${metasDia?.leads_milena_dia || 0}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos AI esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    const checklist = JSON.parse(content);

    return new Response(JSON.stringify(checklist), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-checklist error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
