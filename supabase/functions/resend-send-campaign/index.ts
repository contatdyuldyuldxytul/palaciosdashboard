import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function renderVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? '');
}

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

    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: 'campaign_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: campaign, error: cErr } = await supabase
      .from('email_campaigns').select('*').eq('id', campaign_id).single();
    if (cErr || !campaign) throw new Error('Campaign not found');

    const { data: recipients, error: rErr } = await supabase
      .from('email_campaign_recipients')
      .select('*').eq('campaign_id', campaign_id).eq('status', 'queued');
    if (rErr) throw rErr;

    await supabase.from('email_campaigns').update({ status: 'sending' }).eq('id', campaign_id);

    let sent = 0, failed = 0;

    for (const r of recipients ?? []) {
      const vars = {
        nome: r.recipient_name ?? '',
        email: r.recipient_email,
      };
      const subject = renderVars(campaign.subject, vars);
      const html = renderVars(campaign.body_html, vars);

      try {
        const resp = await fetch(`${GATEWAY_URL}/emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: `${campaign.from_name} <${campaign.from_email}>`,
            to: [r.recipient_email],
            subject,
            html,
            reply_to: campaign.reply_to || undefined,
            tags: [{ name: 'campaign_id', value: campaign_id }],
          }),
        });

        const body = await resp.json();
        if (!resp.ok) {
          await supabase.from('email_campaign_recipients').update({
            status: 'failed', error_message: JSON.stringify(body),
          }).eq('id', r.id);
          failed++;
        } else {
          await supabase.from('email_campaign_recipients').update({
            status: 'sent', sent_at: new Date().toISOString(), resend_message_id: body.id,
          }).eq('id', r.id);
          sent++;
        }
      } catch (e) {
        await supabase.from('email_campaign_recipients').update({
          status: 'failed', error_message: String(e),
        }).eq('id', r.id);
        failed++;
      }

      await sleep(550); // Resend free: 2 req/s
    }

    await supabase.from('email_campaigns').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      total_sent: sent,
      total_failed: failed,
    }).eq('id', campaign_id);

    return new Response(JSON.stringify({ ok: true, sent, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
