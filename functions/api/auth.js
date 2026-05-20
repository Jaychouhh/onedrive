/**
 * POST /api/auth
 * 验证访问密码
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { password } = await request.json();
    const stored = await env.SHORT_URLS.get('config:password');
    const correct = stored || '142857';

    if (password === correct) {
      return new Response(
        JSON.stringify({ success: true }),
        { headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: '密码错误' }),
      { status: 401, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
