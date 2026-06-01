import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Auth: fundador only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: claimsData } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: isFundador } = await supabase.rpc('has_role', { _user_id: claimsData.claims.sub, _role: 'fundador' });
    if (!isFundador) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Gather data
    const [finEmpresa, finClientes, leads, metas, reunioes, clientes] = await Promise.all([
      supabase.from("financeiro_empresa").select("*"),
      supabase.from("financeiro_clientes").select("*"),
      supabase.from("leads").select("*"),
      supabase.from("metas").select("*"),
      supabase.from("reunioes_realizadas").select("*"),
      supabase.from("clientes_ativos").select("*"),
    ]);

    const empresaData = finEmpresa.data || [];
    const clientesFinData = finClientes.data || [];
    const leadsData = leads.data || [];
    const metasData = metas.data || [];
    const reunioesData = reunioes.data || [];
    const clientesData = clientes.data || [];

    const mesData = empresaData.filter(d => d.data?.startsWith(currentMonth));
    const receita_mes = mesData.filter(d => d.tipo === "receita").reduce((s, d) => s + Number(d.valor), 0);
    const total_despesas = mesData.filter(d => d.tipo === "despesa").reduce((s, d) => s + Number(d.valor), 0);

    const currentMeta = metasData.find(m => m.periodo === "mensal") || metasData[0];
    const meta_receita = currentMeta?.meta_receita || 0;

    const leads_mes = leadsData.filter(l => l.data_criacao?.startsWith(currentMonth)).length;
    const reunioes_mes = reunioesData.filter(r => r.data_reuniao?.startsWith(currentMonth)).length;
    const contratos_mes = leadsData.filter(l => l.status === "fechado" && l.data_fechamento?.startsWith(currentMonth)).length;
    const pagamentos_atrasados = clientesFinData.filter((c: any) => c.status === "atrasado").length;
    const projetos_ativos = clientesData.filter(c => c.status === "ativo").length;

    const pctMeta = meta_receita > 0 ? ((receita_mes / meta_receita) * 100).toFixed(1) : "0";

    const systemPrompt = `Você é um consultor estratégico sênior especializado em empresas de serviços criativos B2B no mercado imobiliário brasileiro. Analise os dados da Palacios 3D Studio e gere exatamente 3 direcionamentos estratégicos prioritários para o fundador agir esta semana.

CONTEXTO DA EMPRESA:
- Empresa de renderização 3D estratégica para construtoras e incorporadoras
- Ticket médio: R$20.000
- Time: 1 LDR + 2 SDRs
- Metodologia: SPIN Selling
- Principal desafio histórico: volume de leads

DADOS ATUAIS:
- Receita do mês: R$${receita_mes.toLocaleString("pt-BR")}
- Meta do mês: R$${Number(meta_receita).toLocaleString("pt-BR")}
- % da meta atingida: ${pctMeta}%
- Leads gerados: ${leads_mes}
- Reuniões realizadas: ${reunioes_mes}
- Contratos fechados: ${contratos_mes}
- Total de despesas: R$${total_despesas.toLocaleString("pt-BR")}
- Pagamentos em atraso: ${pagamentos_atrasados}
- Projetos ativos: ${projetos_ativos}

Retorne APENAS um JSON válido sem texto adicional:
{
  "insights": [
    {
      "prioridade": 1,
      "area": "Vendas",
      "titulo": "título curto",
      "insight": "o que está acontecendo",
      "acao": "o que fazer esta semana",
      "impacto": "resultado esperado"
    }
  ]
}

Areas possíveis: Vendas, Financeiro, Operacional, Time`;

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
          { role: "user", content: "Gere os 3 direcionamentos estratégicos prioritários para esta semana com base nos dados acima." },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    
    // Strip markdown code fences if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { insights: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ceo-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
