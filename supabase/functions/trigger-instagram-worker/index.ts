import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get('GITHUB_PAT_INSTAGRAM');
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'GITHUB_PAT_INSTAGRAM not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const ghRes = await fetch(
      'https://api.github.com/repos/contatdyuldxytul/Palacios-Instagram/dispatches',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          'User-Agent': 'palacios-os',
        },
        body: JSON.stringify({ event_type: 'qualificar_leads' }),
      },
    );

    if (!ghRes.ok) {
      const text = await ghRes.text();
      return new Response(
        JSON.stringify({ error: `GitHub API ${ghRes.status}: ${text}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
