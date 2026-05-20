/**
 * GET /api/stats  — 读取统计数据
 * POST /api/stats — 增加解析次数（body: { type: 'parse' }）
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const [parses, shortens, visits] = await Promise.all([
      env.SHORT_URLS.get('stats:parses'),
      env.SHORT_URLS.get('stats:shortens'),
      env.SHORT_URLS.get('stats:shortlink_visits'),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        parses: parseInt(parses || '0'),
        shortens: parseInt(shortens || '0'),
        visits: parseInt(visits || '0'),
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const body = await request.json();

    if (body.type === 'parse') {
      const current = parseInt(await env.SHORT_URLS.get('stats:parses') || '0');
      await env.SHORT_URLS.put('stats:parses', String(current + 1));
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
