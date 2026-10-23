/** Proxy to central Parra Data Hub. Prefers service binding (DATA_HUB); falls back to DATA_HUB_URL. */
const HUB_DEFAULT = 'https://parra-data-hub.angieoneapp-support.workers.dev';

export async function handleDatahub(path, req, env, json, h) {
  const sub = path.replace(/^\/datahub/, '') || '/';
  const map = {
    '/consent': '/v1/consent',
    '/ingest': '/v1/ingest',
    '/purge': '/v1/purge',
    '/summary': '/v1/summary',
    '/health': '/health',
    '/decide': '/v1/decide',
  };
  const targetPath = map[sub];
  if (!targetPath) return json({ error: 'not_found' }, 404, h);

  if (!env.DATA_HUB_APP_KEY && targetPath !== '/health') {
    return json({ error: 'not_configured', status: 'local_fallback', message: 'DATA_HUB_APP_KEY missing on Worker' }, 503, h);
  }

  const headers = { 'Content-Type': 'application/json' };
  if (targetPath === '/v1/decide') {
    const fk = req.headers.get('x-founder-key') || '';
    if (!env.FOUNDER_KEY || fk !== env.FOUNDER_KEY) return json({ error: 'unauthorized' }, 401, h);
    headers['x-founder-key'] = env.DATA_HUB_FOUNDER_KEY || '';
    if (!env.DATA_HUB_FOUNDER_KEY) return json({ error: 'not_configured' }, 503, h);
  } else if (targetPath !== '/health') {
    headers['x-app-key'] = env.DATA_HUB_APP_KEY;
  }

  const init = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }

  try {
    let r;
    if (env.DATA_HUB && typeof env.DATA_HUB.fetch === 'function') {
      // Service binding — same account, no public URL hop
      r = await env.DATA_HUB.fetch(new Request('https://parra-data-hub' + targetPath, init));
    } else {
      const hubBase = (env.DATA_HUB_URL || HUB_DEFAULT).replace(/\/+$/, '');
      r = await fetch(hubBase + targetPath, init);
    }
    const text = await r.text();
    let body; try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 200) }; }
    if (body && typeof body === 'object' && !body.status && r.ok) body.status = 'ACTIVE';
    return json(body, r.status, h);
  } catch (e) {
    return json({ error: 'hub_down', status: 'local_fallback', message: 'Parra Data Hub unreachable; app keeps local copy' }, 503, h);
  }
}
