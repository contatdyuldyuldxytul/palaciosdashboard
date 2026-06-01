import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function requireAuth(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await sb.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (error || !data?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authFail = await requireAuth(req);
  if (authFail) return authFail;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { funnelData } = await req.json();

    const systemPrompt = `Você é o coach de pré-vendas da Palacios 3D Studio, empresa brasileira de renderização 3D estratégica para construtoras e incorporadoras.

CONTEXTO DA EMPRESA:
- Vendemos materiais visuais estratégicos para lançamentos imobiliários — não apenas renders bonitos, mas imagens que aumentam a taxa de conversão na planta
- Ticket médio: R$20.000
- Ciclo de vendas: 20 dias
- Clientes ideais: Gerentes de Marketing e Gerentes de Projetos de construtoras e incorporadoras
- Metodologia: SPIN Selling

SOBRE O FUNIL DE PRÉ-VENDAS:
- Entrada de Leads: leads disponíveis para prospectar
- Tentando Contato: ligações ativas para chegar na empresa (benchmark: 85% de avanço)
- Contato Realizado: conseguimos falar com alguém na empresa, mesmo que não seja o decisor (benchmark: 70% de avanço)
- Contato c/ Decisor: chegamos ao Gerente de Marketing ou Projetos (benchmark: 40% de avanço)
- Demo Agendada: reunião marcada com o decisor — fim das pré-vendas (benchmark: 50% de avanço)

PRINCIPAIS OBJEÇÕES NO PROCESSO:
1. Não temos lançamento agora
2. Preciso falar com meu diretor
3. Já temos uma empresa de renders

REGRAS ABSOLUTAS — NUNCA sugira ações sobre:
- Leads em Hold (empreendimentos futuros com data definida, não devem ser tocados)
- Leads Recicláveis (sem contato, prospectar futuro)
- Leads Porta Aberta Decisor (decisores sem momento, não abordar agora)

Foque APENAS nas etapas ativas: Entrada, Tentando Contato, Contato Realizado, Contato c/ Decisor, Demo Agendada.

Analise os dados do funil fornecidos e gere uma análise de no máximo 5 linhas com:
1. O maior gargalo e por quê considerando o mercado imobiliário
2. Uma ação prática e específica para esta semana usando técnicas de SPIN Selling ou abordagem consultiva para o mercado de construção
3. Um ponto positivo do funil atual

Formate a resposta usando estas marcações especiais:
- Use **texto** para negrito nos pontos mais importantes
- Use [ALERTA] para indicar o gargalo principal
- Use [AÇÃO] para a ação recomendada
- Use [POSITIVO] para o ponto positivo

Seja direto, prático e motivador. Fale como um coach experiente em vendas B2B para o mercado imobiliário brasileiro.`;

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
