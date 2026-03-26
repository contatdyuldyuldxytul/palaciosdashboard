import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mes_ano, dia_atual, dias_uteis, meta_leads_milena, realizado_leads_milena, meta_demos, realizado_demos, meta_contratos, realizado_contratos, leads_funil, conversao_atual } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const paceMilena = dias_uteis > 0 ? ((realizado_leads_milena / dia_atual) * dias_uteis / meta_leads_milena * 100).toFixed(0) : "0";
    const paceDemos = dias_uteis > 0 && meta_demos > 0 ? ((realizado_demos / dia_atual) * dias_uteis / meta_demos * 100).toFixed(0) : "0";
    const paceContratos = dias_uteis > 0 && meta_contratos > 0 ? ((realizado_contratos / dia_atual) * dias_uteis / meta_contratos * 100).toFixed(0) : "0";

    const prompt = `Analise o atraso nas metas abaixo e gere um relatório executivo em português com:
1. Diagnóstico: por que a meta está atrasada
2. Fatores de risco identificados
3. Ações corretivas para os próximos 7 dias
4. Projeção: se nada mudar, onde chegaremos

DADOS:
- Dia do mês: ${dia_atual} de ${dias_uteis} dias úteis
- Meta leads Milena: ${meta_leads_milena} | Realizado: ${realizado_leads_milena} | Pace: ${paceMilena}%
- Meta demos Aline: ${meta_demos} | Realizado: ${realizado_demos} | Pace: ${paceDemos}%
- Meta contratos: ${meta_contratos} | Realizado: ${realizado_contratos} | Pace: ${paceContratos}%
- Leads no funil: ${leads_funil || "N/A"}
- Conversão atual: ${conversao_atual || "N/A"}

Seja direto e prático. Máximo 300 palavras.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é consultor estratégico da Palacios 3D Studio, empresa de renderização 3D para construtoras. Seja direto e prático." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ report: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("goal-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
