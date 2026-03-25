import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PIPEDRIVE_API_KEY = Deno.env.get('PIPEDRIVE_API_KEY');
    if (!PIPEDRIVE_API_KEY) {
      throw new Error('PIPEDRIVE_API_KEY not configured');
    }

    // 1. Fetch all pipelines and find "ALINE'S PIPELINE - ALFA"
    console.log('Pipedrive API key length:', PIPEDRIVE_API_KEY.length);
    const pipelinesUrl = `https://api.pipedrive.com/v1/pipelines?api_token=${PIPEDRIVE_API_KEY}`;
    const pipelinesRes = await fetch(pipelinesUrl);
    const pipelinesText = await pipelinesRes.text();
    console.log('Pipelines response status:', pipelinesRes.status, 'body:', pipelinesText.substring(0, 500));
    
    let pipelinesData;
    try {
      pipelinesData = JSON.parse(pipelinesText);
    } catch {
      throw new Error(`Pipedrive returned non-JSON (status ${pipelinesRes.status}): ${pipelinesText.substring(0, 200)}`);
    }
    if (!pipelinesData.success) throw new Error(`Failed to fetch Pipedrive pipelines: ${JSON.stringify(pipelinesData)}`);

    const targetPipeline = (pipelinesData.data || []).find(
      (p: any) => p.name === "ALINE'S PIPELINE - ALFA"
    );
    if (!targetPipeline) {
      throw new Error('Pipeline "ALINE\'S PIPELINE - ALFA" not found');
    }
    const pipelineId = targetPipeline.id;

    // 2. Fetch stages for this pipeline only
    const stagesRes = await fetch(
      `https://api.pipedrive.com/v1/stages?api_token=${PIPEDRIVE_API_KEY}&pipeline_id=${pipelineId}`
    );
    const stagesData = await stagesRes.json();
    if (!stagesData.success) throw new Error('Failed to fetch Pipedrive stages');

    const stageIdToName: Record<number, string> = {};
    for (const stage of stagesData.data || []) {
      stageIdToName[stage.id] = stage.name;
    }

    // 3. Fetch all deals from this pipeline only (paginated)
    const allDeals: any[] = [];
    let start = 0;
    let hasMore = true;

    while (hasMore) {
      const dealsRes = await fetch(
        `https://api.pipedrive.com/v1/deals?api_token=${PIPEDRIVE_API_KEY}&start=${start}&limit=100&status=all_not_deleted&pipeline_id=${pipelineId}`
      );
      const dealsData = await dealsRes.json();
      if (!dealsData.success) throw new Error('Failed to fetch Pipedrive deals');

      if (dealsData.data) {
        allDeals.push(...dealsData.data);
      }

      hasMore = dealsData.additional_data?.pagination?.more_items_in_collection || false;
      start = (dealsData.additional_data?.pagination?.next_start) || 0;
    }

    // 4. Map deals — keep raw pipedrive_stage name
    const mappedDeals = allDeals.map((deal: any) => {
      const stageName = stageIdToName[deal.stage_id] || 'Unknown';
      const ownerName = deal.user_id?.name || deal.owner_name || null;
      const contactName = deal.person_id?.name || deal.person_name || null;
      const companyName = deal.org_id?.name || deal.org_name || deal.title || 'Sem nome';

      let platformStatus: string;
      if (deal.status === 'won') {
        platformStatus = 'fechado';
      } else if (deal.status === 'lost') {
        platformStatus = 'perdido';
      } else {
        platformStatus = 'open';
      }

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
        notas: deal.title || `Pipedrive Deal #${deal.id}`,
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

    const activeDealStages = [
      "Entrada de Leads", "Tentando Contato #A", "Tentando Contato #B",
      "Contato Realizado #A", "Contato Realizado #B", "Contato com o Decisor",
      "Demo Agendada", "Hold", "Porta Aberta Decisores", "Recicláveis"
    ];

    const activeDeals = mappedDeals.filter(d => 
      d.status === 'open' && activeDealStages.includes(d.pipedrive_stage)
    );

    const wonValue = wonThisMonth.reduce((s, d) => s + d.valor_estimado, 0);

    return new Response(JSON.stringify({
      success: true,
      deals: mappedDeals,
      pipeline_name: "ALINE'S PIPELINE - ALFA",
      summary: {
        total_deals: mappedDeals.length,
        active_deals: activeDeals.length,
        won_this_month: wonThisMonth.length,
        won_value_this_month: wonValue,
        total_pipeline_value: activeDeals.reduce((s, d) => s + d.valor_estimado, 0),
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
