import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { funnelData } = await req.json();

    const systemPrompt = `Você é um especialista em pré-vendas B2B para empresas de serviços criativos no mercado imobiliário brasileiro. Analise os dados do funil de pré-vendas da Palacios 3D Studio e gere uma análise curta e objetiva em português com:
1. O maior gargalo atual do funil e por quê
2. Uma ação específica e prática para melhorar a taxa mais baixa esta semana
3. Um ponto positivo do funil atual
Seja direto, use no máximo 4 linhas no total. Não use bullet points, escreva em texto corrido. Fale diretamente com a SDR como se fosse um coach de vendas.`;

    const userPrompt = `Dados do funil de pré-vendas:
- Entrada de Leads: ${funnelData.entrada} deals
- Tentando Contato: ${funnelData.tentando} deals
- Contato Realizado: ${funnelData.contatoRealizado} deals
- Contato com o Decisor: ${funnelData.decisor} deals
- Demo Agendada: ${funnelData.demo} deals

Taxas de conversão (vs benchmark):
- Entrada → Tentando: ${funnelData.conv1}% (benchmark 85%)
- Tentando → Contato Realizado: ${funnelData.conv2}% (benchmark 70%)
- Contato Realizado → Decisor: ${funnelData.conv3}% (benchmark 40%)
- Decisor → Demo: ${funnelData.conv4}% (benchmark 50%)

Métricas laterais:
- Hold: ${funnelData.hold} deals
- Recicláveis: ${funnelData.reciclaveis} deals
- Porta Aberta: ${funnelData.portaAberta} deals

Meta: ${funnelData.demo}/${funnelData.demoGoal} demos este mês (dia ${funnelData.dayOfMonth} de 30)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para análise AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "Análise indisponível no momento.";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("funnel-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
