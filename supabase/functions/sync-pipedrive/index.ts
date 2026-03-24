import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STAGE_MAP: Record<string, string> = {
  "Entrada de Leads": "lead",
  "Tentando Contato #A": "contatado",
  "Tentando Contato #B": "contatado",
  "Contato Realizado #A": "contatado",
  "Contato Realizado #B": "contatado",
  "Contato com o Decisor": "contatado",
  "Demo Agendada": "reuniao_agendada",
  "Hold": "contatado",
  "Porta Aberta": "reuniao_realizada",
  "Porta Aberta Decisores": "proposta",
};

interface PipedriveDeal {
  id: number;
  title: string;
  value: number;
  currency: string;
  status: string; // open, won, lost
  stage_id: number;
  person_name: string | null;
  org_name: string | null;
  owner_name: string;
  expected_close_date: string | null;
  update_time: string;
  add_time: string;
  stage_change_time: string | null;
  won_time: string | null;
  lost_time: string | null;
  lost_reason: string | null;
  person_id: { name: string } | null;
  org_id: { name: string } | null;
  user_id: { name: string } | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PIPEDRIVE_API_KEY = Deno.env.get('PIPEDRIVE_API_KEY');
    if (!PIPEDRIVE_API_KEY) {
      throw new Error('PIPEDRIVE_API_KEY not configured');
    }

    // 1. Fetch all stages to build stage_id → name map
    const stagesRes = await fetch(
      `https://api.pipedrive.com/v1/stages?api_token=${PIPEDRIVE_API_KEY}`
    );
    const stagesData = await stagesRes.json();
    if (!stagesData.success) throw new Error('Failed to fetch Pipedrive stages');

    const stageIdToName: Record<number, string> = {};
    for (const stage of stagesData.data || []) {
      stageIdToName[stage.id] = stage.name;
    }

    // 2. Fetch all deals (paginated)
    const allDeals: any[] = [];
    let start = 0;
    let hasMore = true;

    while (hasMore) {
      const dealsRes = await fetch(
        `https://api.pipedrive.com/v1/deals?api_token=${PIPEDRIVE_API_KEY}&start=${start}&limit=100&status=all_not_deleted`
      );
      const dealsData = await dealsRes.json();
      if (!dealsData.success) throw new Error('Failed to fetch Pipedrive deals');

      if (dealsData.data) {
        allDeals.push(...dealsData.data);
      }

      hasMore = dealsData.additional_data?.pagination?.more_items_in_collection || false;
      start = (dealsData.additional_data?.pagination?.next_start) || 0;
    }

    // 3. Map deals to platform format
    const mappedDeals = allDeals.map((deal: any) => {
      const stageName = stageIdToName[deal.stage_id] || 'Unknown';
      let platformStatus: string;

      if (deal.status === 'won') {
        platformStatus = 'fechado';
      } else if (deal.status === 'lost') {
        platformStatus = 'perdido';
      } else {
        platformStatus = STAGE_MAP[stageName] || 'lead';
      }

      const ownerName = deal.user_id?.name || deal.owner_name || null;
      const contactName = deal.person_id?.name || deal.person_name || null;
      const companyName = deal.org_id?.name || deal.org_name || deal.title || 'Sem nome';

      // Calculate days in current stage
      const stageChangeDate = deal.stage_change_time || deal.add_time;
      const daysInStage = stageChangeDate
        ? Math.floor((Date.now() - new Date(stageChangeDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        pipedrive_id: deal.id,
        empresa: companyName,
        contato: contactName,
        status: platformStatus,
        valor_estimado: deal.value || 0,
        responsavel_nome: ownerName,
        origem: 'pipedrive',
        data_criacao: deal.add_time,
        data_atualizacao: deal.update_time,
        data_fechamento: deal.won_time || deal.lost_time || null,
        motivo_perda: deal.lost_reason || null,
        expected_close_date: deal.expected_close_date || null,
        pipedrive_stage: stageName,
        days_in_stage: daysInStage,
        notas: `Pipedrive Deal #${deal.id} | Stage: ${stageName}`,
      };
    });

    // Summary stats
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const wonThisMonth = mappedDeals.filter(d => {
      if (d.status !== 'fechado' || !d.data_fechamento) return false;
      const dt = new Date(d.data_fechamento);
      return dt.getMonth() === currentMonth && dt.getFullYear() === currentYear;
    });

    const totalPipelineValue = mappedDeals
      .filter(d => !['fechado', 'perdido'].includes(d.status))
      .reduce((s, d) => s + d.valor_estimado, 0);

    const wonValue = wonThisMonth.reduce((s, d) => s + d.valor_estimado, 0);

    return new Response(JSON.stringify({
      success: true,
      deals: mappedDeals,
      summary: {
        total_deals: mappedDeals.length,
        active_deals: mappedDeals.filter(d => !['fechado', 'perdido'].includes(d.status)).length,
        won_this_month: wonThisMonth.length,
        won_value_this_month: wonValue,
        total_pipeline_value: totalPipelineValue,
        synced_at: new Date().toISOString(),
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Pipedrive sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
