import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  vendas: `Você é o assistente de vendas da Palacios 3D Studio, empresa brasileira de renderização 3D estratégica para construtoras e incorporadoras. Domina SPIN Selling e conhece profundamente o mercado imobiliário brasileiro. Ajuda SDRs e LDR a prospectar melhor, contornar objeções e fechar mais negócios. Ticket médio R$15.000, ciclo 20 dias. Principais objeções: timing de lançamento, hierarquia de decisão, fornecedor atual. Seja direto, prático, sempre com exemplos concretos de scripts.`,

  fundador: `Você é o consultor estratégico pessoal do fundador da Palacios 3D Studio, empresa brasileira de renderização 3D que fatura R$20.000/mês e quer escalar. Time: 1 LDR + 2 SDRs. Ticket médio R$15.000. Conversão 0,4%. Mercado: construtoras e incorporadoras. Analise dados financeiros e métricas de vendas. Ajude com decisões: contratar pessoas, ajustar metas, reduzir custos, mudar estratégia. Seja analítico, baseado em dados, sempre apontando trade-offs.`,

  geral: `Você é assistente especializado da Palacios 3D Studio para o mercado imobiliário brasileiro. Responde sobre: mercado imobiliário, vendas B2B, renderização 3D, precificação de serviços criativos, gestão de equipes comerciais, SPIN Selling e estratégia de negócios. Seja prático e direto.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, assistant } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = SYSTEM_PROMPTS[assistant] || SYSTEM_PROMPTS.geral;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos nas configurações." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
