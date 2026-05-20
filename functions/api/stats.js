/**
 * GET /api/stats  — 读取统计数据（总数 + 最近7天 + 最近记录）
 * POST /api/stats — 增加统计（body: { type: 'parse'|'shorten'|'visit', url? }）
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

async function incrementStat(env, type, detail) {
  const today = fmtDate(new Date());

  // 解析、短链、访问需要更新总数和按天统计；下载只记日志
  if (type !== 'download') {
    // 1. 更新总数
    const totalKey = `stats:${type}`;
    const current = parseInt(await env.SHORT_URLS.get(totalKey) || '0');
    await env.SHORT_URLS.put(totalKey, String(current + 1));

    // 2. 更新按天统计
    const dailyKey = `daily:${today}:${type}`;
    const dailyCurrent = parseInt(await env.SHORT_URLS.get(dailyKey) || '0');
    await env.SHORT_URLS.put(dailyKey, String(dailyCurrent + 1));
  }

  // 3. 添加操作日志（访问太频繁，不记日志）
  if (type !== 'visit') {
    const logEntry = {
      time: new Date().toISOString(),
      type,
      url: detail?.url || '',
      ip: detail?.ip || '',
    };
    const logsRaw = await env.SHORT_URLS.get('logs:recent');
    let logs = [];
    try { logs = JSON.parse(logsRaw || '[]'); } catch {}
    logs.unshift(logEntry);
    if (logs.length > 50) logs = logs.slice(0, 50);
    await env.SHORT_URLS.put('logs:recent', JSON.stringify(logs));
  }
}

export async function onRequestGet(context) {
  const { env } = context;

  try {
    // 总数
    const [parses, shortens, visits] = await Promise.all([
      env.SHORT_URLS.get('stats:parses'),
      env.SHORT_URLS.get('stats:shortens'),
      env.SHORT_URLS.get('stats:shortlink_visits'),
    ]);

    // 最近7天按天统计
    const today = new Date();
    const dailyPromises = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = fmtDate(d);
      dailyPromises.push(
        Promise.all([
          dateStr,
          env.SHORT_URLS.get(`daily:${dateStr}:parses`),
          env.SHORT_URLS.get(`daily:${dateStr}:shortens`),
          env.SHORT_URLS.get(`daily:${dateStr}:visits`),
        ]).then(([date, p, s, v]) => ({
          date,
          parses: parseInt(p || '0'),
          shortens: parseInt(s || '0'),
          visits: parseInt(v || '0'),
        }))
      );
    }
    const daily = await Promise.all(dailyPromises);

    // 最近操作日志
    const logsRaw = await env.SHORT_URLS.get('logs:recent');
    let recent = [];
    try { recent = JSON.parse(logsRaw || '[]'); } catch {}

    return new Response(
      JSON.stringify({
        success: true,
        totals: {
          parses: parseInt(parses || '0'),
          shortens: parseInt(shortens || '0'),
          visits: parseInt(visits || '0'),
        },
        daily,
        recent,
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
    const validTypes = ['parse', 'shorten', 'visit', 'download'];

    if (!validTypes.includes(body.type)) {
      return new Response(
        JSON.stringify({ error: 'invalid type' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || '';
    await incrementStat(env, body.type, { url: body.url, ip: clientIp });

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
