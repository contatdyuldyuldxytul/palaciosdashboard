import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing API keys' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      to, subject, html,
      from_email = 'contato@palacios3dstudio.com',
      from_name = 'Palácios 3D Studio',
      reply_to,
      deal_id, person_id, recipient_name,
    } = await req.json();

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: 'to, subject, html required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Cria campanha "1-a-1" para reaproveitar tracking
    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    const { data: camp } = await supabase.from('email_campaigns').insert({
      nome: `Direto: ${subject}`.slice(0, 200),
      subject, body_html: html,
      from_email, from_name, reply_to,
      criado_por: user?.id ?? null,
      status: 'sending',
      total_recipients: 1,
    }).select().single();

    const resp = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: `${from_name} <${from_email}>`,
        to: [to], subject, html,
        reply_to: reply_to || undefined,
        tags: camp ? [{ name: 'campaign_id', value: camp.id }] : undefined,
      }),
    });
    const body = await resp.json();

    if (camp) {
      await supabase.from('email_campaign_recipients').insert({
        campaign_id: camp.id,
        deal_id, person_id,
        recipient_email: to,
        recipient_name,
        resend_message_id: resp.ok ? body.id : null,
        status: resp.ok ? 'sent' : 'failed',
        sent_at: resp.ok ? new Date().toISOString() : null,
        error_message: resp.ok ? null : JSON.stringify(body),
      });
      await supabase.from('email_campaigns').update({
        status: resp.ok ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
        total_sent: resp.ok ? 1 : 0,
        total_failed: resp.ok ? 0 : 1,
      }).eq('id', camp.id);
    }

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: body }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, message_id: body.id, campaign_id: camp?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
