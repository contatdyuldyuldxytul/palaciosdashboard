import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Pega campanhas agendadas vencidas (status draft, scheduled_at <= now)
    const { data: due } = await supabase
      .from('email_campaigns')
      .select('id, scheduled_at')
      .eq('status', 'draft')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', new Date().toISOString());

    const triggered: string[] = [];
    for (const c of due ?? []) {
      // Dispara a campanha (não aguarda — pode demorar muito)
      fetch(`${SUPABASE_URL}/functions/v1/resend-send-campaign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ campaign_id: c.id }),
      }).catch((e) => console.error('dispatch failed', c.id, e));
      triggered.push(c.id);
    }

    return new Response(JSON.stringify({ ok: true, triggered }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
