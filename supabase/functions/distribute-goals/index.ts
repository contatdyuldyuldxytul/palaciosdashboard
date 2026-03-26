import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mes_ano, leads_milena, leads_contatados_aline, demos_aline, contratos } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Get current month info
    const [mes, ano] = mes_ano.split("/");
    const year = parseInt(ano);
    const month = parseInt(mes) - 1;
    
    const prompt = `Distribua as metas mensais abaixo em quinzenas, semanas e dias úteis de forma inteligente.

Mês: ${mes_ano}
- Leads Milena (LDR): ${leads_milena}
- Leads Contatados Aline (SDR): ${leads_contatados_aline}
- Demos Agendadas Aline: ${demos_aline}
- Contratos: ${contratos}

Considere:
- Semanas com mais dias úteis recebem mais metas
- Primeira semana do mês é de aquecimento (80% do ritmo)
- Última semana é de aceleração (120% do ritmo)
- Distribua em dias úteis apenas (seg-sex)
- Use o calendário real do mês ${mes}/${ano}

Retorne APENAS JSON válido:
{
  "quinzena1": { "leads_milena": 0, "leads_contatados": 0, "demos": 0 },
  "quinzena2": { "leads_milena": 0, "leads_contatados": 0, "demos": 0 },
  "semanas": [
    { "semana": 1, "inicio": "DD/MM", "fim": "DD/MM", "leads_milena": 0, "leads_contatados": 0, "demos": 0 }
  ],
  "dias": [
    { "data": "YYYY-MM-DD", "dia_semana": "Segunda", "leads_milena": 0, "leads_contatados": 0, "demos": 0 }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um especialista em gestão de times comerciais B2B. Retorne APENAS JSON válido, sem markdown." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    
    // Clean markdown code blocks
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    const distribution = JSON.parse(content);

    return new Response(JSON.stringify({ distribution }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("distribute-goals error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
