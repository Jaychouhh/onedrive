/**
 * GET /s/:code
 * 短链跳转：从 KV 读取原始 URL，302 跳转
 * 需要在 Cloudflare Pages 项目中绑定 KV namespace，名称设为 SHORT_URLS
 */
export async function onRequestGet(context) {
  const { env, params } = context;
  const { code } = params;

  if (!code || code.length < 4) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const data = await env.SHORT_URLS.get(`short:${code}`);

    if (!data) {
      return new Response('短链不存在或已过期', { status: 404 });
    }

    const { url, expires } = JSON.parse(data);

    // 检查是否过期
    if (Date.now() > expires) {
      await env.SHORT_URLS.delete(`short:${code}`);
      return new Response('短链已过期', { status: 410 });
    }

    // 302 跳转到真实下载地址
    return Response.redirect(url, 302);
  } catch (err) {
    return new Response('Error: ' + err.message, { status: 500 });
  }
}
