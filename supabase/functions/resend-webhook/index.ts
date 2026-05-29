import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-signature, svix-timestamp',
};

// Resend webhook events:
// email.sent, email.delivered, email.opened, email.clicked, email.bounced, email.complained, email.delivery_delayed

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload = await req.json();
    const type = payload.type as string;
    const data = payload.data ?? {};
    const messageId = data.email_id || data.id;
    if (!messageId) return new Response('no message id', { status: 200, headers: corsHeaders });

    const now = new Date().toISOString();
    const { data: rec } = await supabase
      .from('email_campaign_recipients')
      .select('id, campaign_id, open_count, click_count, first_opened_at, first_clicked_at')
      .eq('resend_message_id', messageId).maybeSingle();

    if (!rec) return new Response('not found', { status: 200, headers: corsHeaders });

    const updates: Record<string, unknown> = {};
    const campaignBump: Record<string, number> = {};

    switch (type) {
      case 'email.delivered':
        updates.status = 'delivered';
        updates.delivered_at = now;
        campaignBump.total_delivered = 1;
        break;
      case 'email.opened':
        updates.status = 'opened';
        updates.last_opened_at = now;
        updates.open_count = (rec.open_count ?? 0) + 1;
        if (!rec.first_opened_at) {
          updates.first_opened_at = now;
          campaignBump.total_opened = 1;
        }
        break;
      case 'email.clicked': {
        updates.status = 'clicked';
        updates.last_clicked_at = now;
        updates.click_count = (rec.click_count ?? 0) + 1;
        if (!rec.first_clicked_at) {
          updates.first_clicked_at = now;
          campaignBump.total_clicked = 1;
        }
        // Captura URL clicada
        const url = data.click?.link || data.link;
        if (url) {
          const { data: rec2 } = await supabase
            .from('email_campaign_recipients').select('urls_clicadas').eq('id', rec.id).single();
          const arr = Array.isArray(rec2?.urls_clicadas) ? rec2.urls_clicadas : [];
          arr.push({ url, at: now });
          updates.urls_clicadas = arr;
        }
        break;
      }
      case 'email.bounced': {
        updates.status = 'bounced';
        updates.bounce_reason = data.bounce?.message ?? data.reason ?? null;
        campaignBump.total_bounced = 1;
        // Adiciona à supressão
        const { data: rec2 } = await supabase
          .from('email_campaign_recipients').select('recipient_email').eq('id', rec.id).single();
        if (rec2?.recipient_email) {
          await supabase.from('email_suppressions').upsert({
            email: rec2.recipient_email, motivo: 'bounce', detalhe: updates.bounce_reason as string,
          }, { onConflict: 'email' });
        }
        break;
      }
      case 'email.complained': {
        updates.status = 'complained';
        const { data: rec2 } = await supabase
          .from('email_campaign_recipients').select('recipient_email').eq('id', rec.id).single();
        if (rec2?.recipient_email) {
          await supabase.from('email_suppressions').upsert({
            email: rec2.recipient_email, motivo: 'complaint',
          }, { onConflict: 'email' });
        }
        break;
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('email_campaign_recipients').update(updates).eq('id', rec.id);
    }

    // bump campaign aggregates
    for (const [col, inc] of Object.entries(campaignBump)) {
      const { data: c } = await supabase
        .from('email_campaigns').select(col).eq('id', rec.campaign_id).single();
      const cur = (c as any)?.[col] ?? 0;
      await supabase.from('email_campaigns').update({ [col]: cur + inc }).eq('id', rec.campaign_id);
    }

    return new Response('ok', { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error('webhook error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
