// Premium gratis del fundador (sin deploy todavía). Se guarda en el KV existente FOODS con prefijo "grant:" (sin cuentas nuevas).
// /grants/add y /grants/revoke exigen la cabecera x-founder-key = secreto FOUNDER_KEY (wrangler secret put FOUNDER_KEY).
// /grants/redeem es público: código + correo/ID deben coincidir; responde solo {ok, until}.
const norm = (w) => String(w || '').trim().toLowerCase().replace(/\s+/g, '').slice(0, 120);
const okKey = (req, env) => !!env.FOUNDER_KEY && req.headers.get('x-founder-key') === env.FOUNDER_KEY;
export async function handleGrants(path, req, env, json, h) {
  if (req.method !== 'POST') return json({ error: 'method' }, 405, h);
  let b; try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400, h); }
  const code = String(b.code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12);
  if (!code) return json({ error: 'code' }, 400, h);
  if (path === '/grants/add' || path === '/grants/revoke') {
    if (!okKey(req, env)) return json({ error: 'auth' }, 401, h);
    const g = { who: norm(b.who), expiresAt: +b.expiresAt || 0, revokedAt: path === '/grants/revoke' ? Date.now() : 0, createdAt: +b.createdAt || Date.now() };
    await env.FOODS.put('grant:' + code, JSON.stringify(g)); return json({ ok: true }, 200, h);
  }
  if (path === '/grants/redeem') {
    const raw = await env.FOODS.get('grant:' + code); if (!raw) return json({ ok: false }, 404, h);
    const g = JSON.parse(raw); const now = Date.now();
    if (g.who !== norm(b.who) || g.revokedAt || (g.expiresAt && g.expiresAt <= now)) return json({ ok: false }, 404, h);
    return json({ ok: true, until: g.expiresAt || null }, 200, h);
  }
  return json({ error: 'not found' }, 404, h);
}
