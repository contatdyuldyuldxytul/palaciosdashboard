import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function htmlPage(title: string, message: string, ok = true) {
  const color = ok ? '#059669' : '#dc2626';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${title}</title>
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px}
      .card{background:rgba(255,255,255,0.05);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:40px;max-width:480px;text-align:center}
      h1{color:${color};margin:0 0 12px;font-size:24px}
      p{color:#94a3b8;line-height:1.6;margin:0}
      .brand{margin-top:24px;font-size:12px;color:#64748b}
    </style></head><body>
    <div class="card"><h1>${title}</h1><p>${message}</p><div class="brand">Palácios 3D Studio</div></div>
    </body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return new Response(htmlPage('Link inválido', 'Token de descadastro ausente.', false),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: tok } = await supabase.from('email_unsubscribe_tokens')
      .select('email, used_at').eq('token', token).maybeSingle();

    if (!tok) {
      return new Response(htmlPage('Link inválido', 'Este link de descadastro não foi encontrado.', false),
        { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    await supabase.from('email_suppressions').upsert(
      { email: tok.email, motivo: 'unsubscribe' },
      { onConflict: 'email' }
    );
    await supabase.from('email_unsubscribe_tokens').update({ used_at: new Date().toISOString() }).eq('token', token);

    return new Response(htmlPage('Descadastro confirmado',
      `O endereço <b>${tok.email}</b> foi removido da nossa lista de envios. Você não receberá mais emails de campanhas.`),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (e) {
    return new Response(htmlPage('Erro', 'Ocorreu um erro ao processar seu descadastro. Tente novamente mais tarde.', false),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
});
