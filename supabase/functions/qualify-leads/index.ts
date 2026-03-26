import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em qualificação de leads para o mercado imobiliário brasileiro.

SOBRE O ICP DA PALACIOS 3D STUDIO:
Clientes ideais são CONSTRUTORAS e INCORPORADORAS brasileiras que fazem lançamentos imobiliários residenciais ou comerciais. Características:
- Empresas que constroem e vendem imóveis na planta
- Fazem lançamentos imobiliários com material de vendas
- Precisam de renders 3D para vender unidades
- Geralmente têm entre 10-500 funcionários
- Atuam em cidades brasileiras de médio e grande porte

NÃO são ICP:
- Construtoras de obras públicas (estradas, pontes)
- Empresas de reforma e manutenção
- Imobiliárias (só vendem, não constroem)
- Escritórios de arquitetura
- Administradoras de condomínio
- Engenharia industrial
- Prefeituras e órgãos públicos

Analise cada linha da planilha fornecida e classifique:
- QUALIFICADO: é construtora ou incorporadora que faz lançamentos imobiliários
- NÃO QUALIFICADO: não é o perfil
- INCERTO: pode ser mas precisa de verificação

Retorne APENAS um JSON válido:
{
  "empresas": [
    {
      "nome": "nome da empresa",
      "classificacao": "QUALIFICADO" ou "NAO_QUALIFICADO" ou "INCERTO",
      "motivo": "explicação curta em 1 linha"
    }
  ],
  "resumo": {
    "total": 0,
    "qualificados": 0,
    "nao_qualificados": 0,
    "incertos": 0
  }
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analise estas empresas da planilha e classifique cada uma:\n\n${data}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No valid JSON in AI response");
    
    const parsed = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify({ success: true, result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("qualify-leads error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
