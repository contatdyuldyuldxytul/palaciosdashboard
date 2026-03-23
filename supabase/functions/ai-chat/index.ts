import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  vendas: `Você é o consultor de vendas da Palacios 3D Studio, empresa brasileira especializada em renderização 3D estratégica para construtoras e incorporadoras. Seu papel é ajudar os vendedores (SDRs e LDR) a prospectar melhor, contornar objeções e fechar mais negócios.

SOBRE A EMPRESA:
- Vendemos materiais visuais estratégicos para lançamentos imobiliários — não apenas renders bonitos, mas imagens que aumentam a taxa de conversão na planta
- Ticket médio: R$20.000
- Preço: R$800/imagem + R$4.000 modelagem + R$120/segundo animação
- Ciclo de vendas: 20 dias
- Metodologia: SPIN Selling
- Clientes ideais: Gerentes de Marketing e Gerentes de Projetos de construtoras e incorporadoras

FUNIL DE VENDAS:
- 1.000 leads → 230 contatos (23%) → 115 reuniões agendadas (50%) → 35 propostas (30%) → 3-4 contratos fechados (10%)

PRINCIPAIS OBJEÇÕES E COMO CONTORNAR:
1. Não temos lançamento agora:
   Resposta: Exatamente por isso faz sentido conversar agora — material visual de qualidade leva tempo para produzir. Se o lançamento for daqui 3 meses, o material precisa estar pronto antes. Você quer chegar no lançamento com o material certo ou correndo?

2. Preciso falar com meu diretor:
   Resposta: Claro, faz todo sentido. Me ajuda a preparar melhor a conversa com ele — o que ele normalmente prioriza mais: velocidade de venda, custo do material ou diferenciação visual do concorrente?

3. Já temos uma empresa de renders:
   Resposta: Ótimo, significa que vocês já reconhecem o valor disso. Minha pergunta é: o material que vocês têm hoje foi pensado como estratégia de vendas ou como entrega visual? O que a gente faz é diferente — posso mostrar em 15 minutos?

PERGUNTAS SPIN SELLING:
- Situação: Como tem sido o processo de venda na planta? Quantos leads precisam para fechar uma unidade?
- Problema: O material visual atual está ajudando a converter ou os clientes precisam muito da própria imaginação?
- Implicação: Quando o material não convence na visita, como isso afeta o ritmo do seu lançamento?
- Necessidade: Se o material já chegasse pronto para converter, com ângulos estratégicos e lifestyle, quanto facilitaria o trabalho da sua equipe?

REMUNERAÇÃO DO TIME:
- SDR: R$2.000 fixo + R$30/reunião + 4% contratos indicados
- LDR: R$1/lead + 1% contratos fechados

Seja direto, prático e sempre dê exemplos concretos de scripts. Responda sempre em português brasileiro.`,

  fundador: `Você é o consultor estratégico pessoal do fundador da Palacios 3D Studio, empresa brasileira de renderização 3D que fatura R$20.000/mês e quer escalar. Time: 1 LDR + 2 SDRs. Ticket médio R$20.000. Conversão 0,4%. Mercado: construtoras e incorporadoras. Analise dados financeiros e métricas de vendas. Ajude com decisões: contratar pessoas, ajustar metas, reduzir custos, mudar estratégia. Seja analítico, baseado em dados, sempre apontando trade-offs.`,

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
        model: "google/gemini-2.5-pro",
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
