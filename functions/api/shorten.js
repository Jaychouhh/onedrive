/**
 * POST /api/shorten
 * 创建短链，存入 Cloudflare KV
 * 需要在 Cloudflare Pages 项目中绑定 KV namespace，名称设为 SHORT_URLS
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
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
    const { url } = await request.json();

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return new Response(
        JSON.stringify({ error: '请提供有效的 URL' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 生成 6 位随机短码
    const code = generateCode(6);
    const payload = {
      url,
      created: Date.now(),
      expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 天后过期
    };

    // 写入 KV（binding 名称需在 Pages 设置里配置为 SHORT_URLS）
    await env.SHORT_URLS.put(`short:${code}`, JSON.stringify(payload));

    // 统计：短链创建次数 +1
    const currentShortens = parseInt(await env.SHORT_URLS.get('stats:shortens') || '0');
    await env.SHORT_URLS.put('stats:shortens', String(currentShortens + 1));

    // 构造短链地址
    const shortUrl = new URL(`/s/${code}`, request.url).toString();

    return new Response(
      JSON.stringify({ success: true, shortUrl, code }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

function generateCode(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (x) => chars[x % chars.length]).join('');
}
