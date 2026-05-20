/**
 * GET /api/config  — 读取当前配置
 * POST /api/config — 修改配置（需要管理员密码）
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export async function onRequestGet(context) {
  const { env } = context;

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const [enableParse, enableShorten] = await Promise.all([
      env.SHORT_URLS.get('config:enable_parse'),
      env.SHORT_URLS.get('config:enable_shorten'),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        enableParse: enableParse !== 'false',
        enableShorten: enableShorten !== 'false',
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

    // 验证密码
    const stored = await env.SHORT_URLS.get('config:password');
    const correct = stored || '142857';
    if (body.password !== correct) {
      return new Response(
        JSON.stringify({ success: false, error: '密码错误' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const updates = [];

    if (body.enableParse !== undefined) {
      updates.push(env.SHORT_URLS.put('config:enable_parse', body.enableParse ? 'true' : 'false'));
    }
    if (body.enableShorten !== undefined) {
      updates.push(env.SHORT_URLS.put('config:enable_shorten', body.enableShorten ? 'true' : 'false'));
    }
    if (body.newPassword) {
      updates.push(env.SHORT_URLS.put('config:password', body.newPassword));
    }

    await Promise.all(updates);

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
