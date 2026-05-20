/**
 * POST /api/shorten
 * 创建短链，存入 Cloudflare KV，后台统计
 * 需要在 Cloudflare Pages 项目中绑定 KV namespace，名称设为 SHORT_URLS
 */
export async function onRequestPost(context) {
  const { request, env, waitUntil } = context;

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

    // 写入 KV
    await env.SHORT_URLS.put(`short:${code}`, JSON.stringify(payload));

    // 后台统计：不阻塞响应
    if (waitUntil) {
      waitUntil(
        (async () => {
          try {
            const today = new Date().toISOString().slice(0, 10);

            // 总数 +1
            const current = parseInt(await env.SHORT_URLS.get('stats:shortens') || '0');
            await env.SHORT_URLS.put('stats:shortens', String(current + 1));

            // 按天 +1
            const daily = parseInt(await env.SHORT_URLS.get(`daily:${today}:shortens`) || '0');
            await env.SHORT_URLS.put(`daily:${today}:shortens`, String(daily + 1));

            // 日志
            const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || '';
            const logEntry = {
              time: new Date().toISOString(),
              type: 'shorten',
              url,
              ip: clientIp,
            };
            const logsRaw = await env.SHORT_URLS.get('logs:recent');
            let logs = [];
            try { logs = JSON.parse(logsRaw || '[]'); } catch {}
            logs.unshift(logEntry);
            if (logs.length > 50) logs = logs.slice(0, 50);
            await env.SHORT_URLS.put('logs:recent', JSON.stringify(logs));
          } catch {
            // 统计失败不影响主流程
          }
        })()
      );
    }

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
