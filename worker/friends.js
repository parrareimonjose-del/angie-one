// Amigos y retos: grupo por código de invitación. Solo se guardan apodo, id anónimo y puntos del reto semanal (nunca datos de salud).
// KV FOODS, prefijo "fr:". Seguridad (revisión 21-oct-2026):
//  - El id del teléfono es SECRETO: el grupo solo muestra un id público (pid = hash). Nadie puede hacerse pasar por otro.
//  - Reportar NO oculta a nadie automáticamente (antes 3 cuentas falsas podían ocultar a alguien). El reporte va a la cola
//    del Panel del Fundador; quien reporta bloquea al otro solo para sí mismo (en su teléfono). El fundador decide: quitar o descartar.
//  - Filtro de apodos, máximo 30 miembros, límite de peticiones por IP.
const BAD = /(fuck|shit|puta|puto|mierda|pendej|cabr[oó]n|bitch|nazi|idiot|imb[eé]cil|marica|verga|coño|http|www\.|@)/i;
export const nick = (n) => { const v = String(n || '').replace(/[<>]/g, '').trim().slice(0, 20); return v.length >= 2 && !BAD.test(v) ? v : ''; };
const okId = (x) => /^[a-z0-9]{8,32}$/.test(String(x || ''));
const okCode = (c) => /^[A-Z0-9]{6}$/.test(String(c || ''));
const week = () => { const d = new Date(); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
export async function pidOf(id) { const b = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ao-fr:' + id))); return Array.from(b.slice(0, 6), (x) => x.toString(16).padStart(2, '0')).join(''); }
export async function pub(g) {
  const members = [];
  for (const m of g.members) if (!m.hidden) members.push({ pid: await pidOf(m.id), nick: m.nick, pts: g.week === week() ? m.pts : 0 });
  return { code: g.code, name: g.name, week: g.week, members };
}
const founder = (req, env) => !!env.FOUNDER_KEY && req.headers.get('x-founder-key') === env.FOUNDER_KEY;
const hits = new Map();
export async function handleFriends(path, req, env, json, h) {
  if (req.method !== 'POST') return json({ error: 'method' }, 405, h);
  const ip = req.headers.get('CF-Connecting-IP') || 'x'; const now = Date.now(); const arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
  if (arr.length >= 40) return json({ error: 'rate' }, 429, h); arr.push(now); hits.set(ip, arr); if (hits.size > 5000) hits.clear();
  let b; try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400, h); }
  const load = async (c) => { const r = await env.FOODS.get('fr:' + c); return r ? JSON.parse(r) : null; };
  const save = (g) => env.FOODS.put('fr:' + g.code, JSON.stringify(g), { expirationTtl: 86400 * 180 });
  // ---- Moderación del fundador ----
  if (path === '/friends/reports') {
    if (!founder(req, env)) return json({ error: 'auth' }, 401, h);
    const l = await env.FOODS.list({ prefix: 'frrep:', limit: 100 }); const items = [];
    for (const k of l.keys) { const v = await env.FOODS.get(k.name); if (v) items.push({ key: k.name, ...JSON.parse(v) }); }
    return json({ items }, 200, h);
  }
  if (path === '/friends/dismiss') {
    if (!founder(req, env)) return json({ error: 'auth' }, 401, h);
    if (!String(b.key || '').startsWith('frrep:')) return json({ error: 'bad' }, 400, h); await env.FOODS.delete(String(b.key)); return json({ ok: true }, 200, h);
  }
  if (path === '/friends/create') {
    const n = nick(b.nick), name = nick(b.name) || n; if (!n || !okId(b.id)) return json({ error: 'nick' }, 400, h);
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code = ''; for (const x of crypto.getRandomValues(new Uint8Array(6))) code += A[x % A.length];
    const g = { code, name, week: week(), members: [{ id: b.id, nick: n, pts: 0 }], owner: b.id }; await save(g); return json({ ...(await pub(g)), me: await pidOf(b.id) }, 200, h);
  }
  if (!okCode(b.code)) return json({ error: 'code' }, 400, h);
  const g = await load(b.code); if (!g) return json({ error: 'not found' }, 404, h);
  if (g.week !== week()) { g.week = week(); g.members.forEach((m) => (m.pts = 0)); }
  const me = okId(b.id) ? g.members.find((m) => m.id === b.id) : null;
  const ret = async () => json({ ...(await pub(g)), me: me ? await pidOf(me.id) : undefined }, 200, h);
  if (path === '/friends/get') return ret();
  if (path === '/friends/join') {
    const n = nick(b.nick); if (!n || !okId(b.id)) return json({ error: 'nick' }, 400, h);
    if (!me) { if (g.members.length >= 30) return json({ error: 'full' }, 409, h); g.members.push({ id: b.id, nick: n, pts: 0 }); } else me.nick = n;
    await save(g); return json({ ...(await pub(g)), me: await pidOf(b.id) }, 200, h);
  }
  if (path === '/friends/score') { if (!me) return json({ error: 'auth' }, 401, h); me.pts = Math.max(0, Math.min(70, Math.round(+b.pts || 0))); await save(g); return ret(); }
  if (path === '/friends/leave') { if (!me) return json({ ok: true }, 200, h); g.members = g.members.filter((m) => m !== me); await save(g); return json({ ok: true }, 200, h); }
  const findPid = async (pid) => { for (const m of g.members) if ((await pidOf(m.id)) === pid) return m; return null; };
  if (path === '/friends/report') {
    const t = await findPid(String(b.target || '')); if (!me || !t || t === me) return json({ error: 'bad' }, 400, h);
    const why = ['nick', 'spam', 'abuse', 'other'].includes(b.why) ? b.why : 'other';
    await env.FOODS.put('frrep:' + g.code + ':' + (await pidOf(t.id)), JSON.stringify({ code: g.code, group: g.name, target: await pidOf(t.id), nick: t.nick, by: await pidOf(me.id), why, at: new Date().toISOString() }), { expirationTtl: 86400 * 60 });
    return json({ ok: true }, 200, h);
  }
  if (path === '/friends/remove') {
    if (!founder(req, env)) return json({ error: 'auth' }, 401, h);
    const t = await findPid(String(b.target || '')); if (t) { g.members = g.members.filter((m) => m !== t); await save(g); }
    if (String(b.key || '').startsWith('frrep:')) await env.FOODS.delete(String(b.key));
    return json({ ok: true }, 200, h);
  }
  return json({ error: 'not found' }, 404, h);
}
