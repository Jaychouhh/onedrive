/**
 * GET /api/stats  — 读取统计数据（总数 + 最近7天 + 日志）
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const [shortens, visits] = await Promise.all([
      env.SHORT_URLS.get('stats:shortens'),
      env.SHORT_URLS.get('stats:shortlink_visits'),
    ]);

    // 最近7天
    const today = new Date();
    const dailyPromises = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = fmtDate(d);
      dailyPromises.push(
        Promise.all([
          dateStr,
          env.SHORT_URLS.get(`daily:${dateStr}:shortens`),
          env.SHORT_URLS.get(`daily:${dateStr}:visits`),
        ]).then(([date, s, v]) => ({
          date,
          shortens: parseInt(s || '0'),
          visits: parseInt(v || '0'),
        }))
      );
    }
    const daily = await Promise.all(dailyPromises);

    // 最近操作日志（仅短链生成）
    const logsRaw = await env.SHORT_URLS.get('logs:recent');
    let recent = [];
    try { recent = JSON.parse(logsRaw || '[]'); } catch {}

    return new Response(
      JSON.stringify({
        success: true,
        totals: {
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
