import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function renderVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => vars[k] ?? '');
}

function firstName(full?: string | null) {
  if (!full) return '';
  return full.trim().split(/\s+/)[0] ?? '';
}

function genToken() {
  return crypto.randomUUID().replace(/-/g, '');
}

function appendUnsubscribeFooter(html: string, unsubUrl: string) {
  const footer = `
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;font-family:Arial,sans-serif;text-align:center;">
      Você está recebendo este email da Palácios 3D Studio.<br/>
      Se preferir não receber mais nossos emails, <a href="${unsubUrl}" style="color:#6b7280;text-decoration:underline;">clique aqui para descadastrar</a>.
    </div>`;
  return html + footer;
}

async function loadAttachments(supabase: any, attachments: Array<{ path: string; filename: string }>) {
  const out: Array<{ filename: string; content: string }> = [];
  for (const a of attachments ?? []) {
    try {
      const { data, error } = await supabase.storage.from('email-attachments').download(a.path);
      if (error || !data) continue;
      const buf = new Uint8Array(await data.arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      out.push({ filename: a.filename, content: btoa(bin) });
    } catch (_) { /* skip */ }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing API keys' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { campaign_id, test_only_email } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: 'campaign_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: campaign, error: cErr } = await supabase
      .from('email_campaigns').select('*').eq('id', campaign_id).single();
    if (cErr || !campaign) throw new Error('Campaign not found');

    // === TEST MODE: envia 1 email para um endereço fornecido com o primeiro destinatário como base de merge ===
    if (test_only_email) {
      const { data: sample } = await supabase
        .from('email_campaign_recipients')
        .select('recipient_name, recipient_email')
        .eq('campaign_id', campaign_id).limit(1).maybeSingle();

      const vars = {
        nome: sample?.recipient_name ?? 'Cliente',
        primeiro_nome: firstName(sample?.recipient_name) || 'Cliente',
        email: sample?.recipient_email ?? test_only_email,
        empresa: '',
        cargo: '',
      };
      const subject = '[TESTE] ' + renderVars(campaign.subject, vars);
      const html = renderVars(campaign.body_html, vars);
      const attachments = await loadAttachments(supabase, campaign.anexos ?? []);

      const resp = await fetch(`${GATEWAY_URL}/emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: `${campaign.from_name} <${campaign.from_email}>`,
          to: [test_only_email],
          subject, html,
          reply_to: campaign.reply_to || undefined,
          attachments: attachments.length ? attachments : undefined,
        }),
      });
      const body = await resp.json();
      if (!resp.ok) throw new Error(JSON.stringify(body));
      await supabase.from('email_campaigns').update({ teste_enviado_para: test_only_email }).eq('id', campaign_id);
      return new Response(JSON.stringify({ ok: true, test: true, id: body.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === ENVIO EM MASSA ===
    const { data: recipients, error: rErr } = await supabase
      .from('email_campaign_recipients')
      .select('*').eq('campaign_id', campaign_id).eq('status', 'queued');
    if (rErr) throw rErr;

    // Carrega supressão
    const { data: suppressed } = await supabase.from('email_suppressions').select('email');
    const suppressedSet = new Set((suppressed ?? []).map((s: any) => s.email.toLowerCase()));

    await supabase.from('email_campaigns').update({ status: 'sending' }).eq('id', campaign_id);

    const attachments = await loadAttachments(supabase, campaign.anexos ?? []);

    let sent = 0, failed = 0, suppressedCount = 0;

    for (const r of recipients ?? []) {
      // Verifica supressão
      if (suppressedSet.has(r.recipient_email.toLowerCase())) {
        await supabase.from('email_campaign_recipients').update({
          status: 'suppressed', error_message: 'Email em lista de supressão',
        }).eq('id', r.id);
        suppressedCount++;
        continue;
      }

      // Gera token de unsubscribe
      const token = genToken();
      await supabase.from('email_unsubscribe_tokens').insert({ token, email: r.recipient_email });
      const unsubUrl = `${SUPABASE_URL}/functions/v1/email-unsubscribe?token=${token}`;

      const vars = {
        nome: r.recipient_name ?? '',
        primeiro_nome: firstName(r.recipient_name),
        email: r.recipient_email,
        empresa: '',
        cargo: '',
        unsubscribe_url: unsubUrl,
      };
      const subject = renderVars(campaign.subject, vars);
      let html = renderVars(campaign.body_html, vars);
      if (!html.includes('unsubscribe_url') && !html.includes(unsubUrl)) {
        html = appendUnsubscribeFooter(html, unsubUrl);
      }

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
            subject, html,
            reply_to: campaign.reply_to || undefined,
            attachments: attachments.length ? attachments : undefined,
            headers: { 'List-Unsubscribe': `<${unsubUrl}>` },
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

      await sleep(550);
    }

    await supabase.from('email_campaigns').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      total_sent: sent,
      total_failed: failed,
    }).eq('id', campaign_id);

    return new Response(JSON.stringify({ ok: true, sent, failed, suppressed: suppressedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
