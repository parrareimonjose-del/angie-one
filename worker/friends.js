// Amigos y retos: grupo por código de invitación. Solo se guardan apodo, id anónimo y puntos del reto semanal (nunca datos de salud).
// KV FOODS, prefijo "fr:". Moderación: filtro de apodos, reportar (3 reportes ocultan al miembro) y el fundador puede quitar (x-founder-key).
const BAD = /(fuck|shit|puta|puto|mierda|pendej|cabr[oó]n|bitch|nazi|idiot|imb[eé]cil|marica|verga|coño|http|www\.|@)/i;
const nick = (n) => { const v = String(n || '').replace(/[<>]/g, '').trim().slice(0, 20); return v.length >= 2 && !BAD.test(v) ? v : ''; };
const okId = (x) => /^[a-z0-9]{8,32}$/.test(String(x || ''));
const okCode = (c) => /^[A-Z0-9]{6}$/.test(String(c || ''));
const week = () => { const d = new Date(); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
const pub = (g) => ({ code: g.code, name: g.name, week: g.week, members: g.members.filter((m) => !m.hidden).map((m) => ({ id: m.id, nick: m.nick, pts: g.week === week() ? m.pts : 0 })) });
export async function handleFriends(path, req, env, json, h) {
  if (req.method !== 'POST') return json({ error: 'method' }, 405, h);
  let b; try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400, h); }
  const load = async (c) => { const r = await env.FOODS.get('fr:' + c); return r ? JSON.parse(r) : null; };
  const save = (g) => env.FOODS.put('fr:' + g.code, JSON.stringify(g), { expirationTtl: 86400 * 180 });
  if (path === '/friends/create') {
    const n = nick(b.nick), name = nick(b.name) || n; if (!n || !okId(b.id)) return json({ error: 'nick' }, 400, h);
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code = ''; for (const x of crypto.getRandomValues(new Uint8Array(6))) code += A[x % A.length];
    const g = { code, name, week: week(), members: [{ id: b.id, nick: n, pts: 0, reports: [] }], owner: b.id }; await save(g); return json(pub(g), 200, h);
  }
  if (!okCode(b.code)) return json({ error: 'code' }, 400, h);
  const g = await load(b.code); if (!g) return json({ error: 'not found' }, 404, h);
  if (g.week !== week()) { g.week = week(); g.members.forEach((m) => (m.pts = 0)); }
  const me = g.members.find((m) => m.id === b.id);
  if (path === '/friends/get') return json(pub(g), 200, h);
  if (path === '/friends/join') {
    const n = nick(b.nick); if (!n || !okId(b.id)) return json({ error: 'nick' }, 400, h);
    if (!me) { if (g.members.length >= 30) return json({ error: 'full' }, 409, h); g.members.push({ id: b.id, nick: n, pts: 0, reports: [] }); } else me.nick = n;
    await save(g); return json(pub(g), 200, h);
  }
  if (path === '/friends/score') { if (!me) return json({ error: 'auth' }, 401, h); me.pts = Math.max(0, Math.min(70, Math.round(+b.pts || 0))); await save(g); return json(pub(g), 200, h); }
  if (path === '/friends/leave') { g.members = g.members.filter((m) => m.id !== b.id); await save(g); return json({ ok: true }, 200, h); }
  if (path === '/friends/report') {
    const t = g.members.find((m) => m.id === b.target); if (!me || !t || t.id === me.id) return json({ error: 'bad' }, 400, h);
    t.reports = [...new Set([...(t.reports || []), me.id])]; if (t.reports.length >= 3) t.hidden = true;
    await env.FOODS.put('frrep:' + Date.now() + ':' + g.code, JSON.stringify({ code: g.code, target: t.id, nick: t.nick, by: me.id, why: String(b.why || '').slice(0, 40) }), { expirationTtl: 86400 * 60 });
    await save(g); return json({ ok: true }, 200, h);
  }
  if (path === '/friends/remove') {
    if (!env.FOUNDER_KEY || req.headers.get('x-founder-key') !== env.FOUNDER_KEY) return json({ error: 'auth' }, 401, h);
    g.members = g.members.filter((m) => m.id !== b.target); await save(g); return json({ ok: true }, 200, h);
  }
  return json({ error: 'not found' }, 404, h);
}
