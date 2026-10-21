// Copia en la nube cifrada de extremo a extremo (el servidor solo ve bytes cifrados).
// Clave en KV: u:<id> (id = SHA-256 derivado del código de recuperación en el teléfono). Metadatos: hash del token, fecha.
// Límite gratis de KV: 1.000 escrituras/día en toda la cuenta → el teléfono sube como máximo cada 6 h (y al pulsar "Copiar ahora"); aquí, mínimo 2 min por usuario.
const MAX = 2 * 1024 * 1024, MIN_GAP = 120e3;
const sha = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((x) => x.toString(16).padStart(2, '0')).join('');
export async function handleSync(path, req, env, json, h) {
  if (path !== '/sync/backup') return json({ error: 'not found' }, 404, h);
  const id = new URL(req.url).searchParams.get('id') || '';
  const tok = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!/^[0-9a-f]{64}$/.test(id) || !/^[0-9a-f]{64}$/.test(tok)) return json({ error: 'auth' }, 401, h);
  const key = 'u:' + id; const th = await sha('angie-sync:' + tok);
  const cur = await env.FOODS.getWithMetadata(key, { type: 'text' });
  const gone = !!(cur.metadata && cur.metadata.deleted); if (gone) cur.value = null;
  const owner = !cur.value || (cur.metadata && cur.metadata.auth === th);
  if (!owner) return json({ error: 'auth' }, 401, h);
  if (req.method === 'GET') return cur.value ? new Response(cur.value, { status: 200, headers: { ...h, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }) : json({ error: 'empty' }, 404, h);
  if (req.method === 'DELETE') { if (cur.value) await env.FOODS.put(key, '', { metadata: { deleted: 1, at: 0 }, expirationTtl: 86400 }); return json({ ok: true, deleted: true }, 200, h); }
  if (req.method === 'PUT' || req.method === 'POST') {
    if (+(req.headers.get('Content-Length') || 0) > MAX) return json({ error: 'too large' }, 413, h);
    const raw = await req.text(); if (raw.length > MAX) return json({ error: 'too large' }, 413, h);
    let b; try { b = JSON.parse(raw); } catch { return json({ error: 'bad json' }, 400, h); }
    if (b.v !== 1 || typeof b.iv !== 'string' || typeof b.ct !== 'string' || b.iv.length > 40) return json({ error: 'bad backup' }, 400, h);
    if (cur.metadata && !gone && Date.now() - (cur.metadata.at || 0) < MIN_GAP) return json({ ok: true, skipped: 'too_soon', at: cur.metadata.at }, 200, h);
    const at = Date.now();
    try { await env.FOODS.put(key, JSON.stringify({ v: 1, iv: b.iv, ct: b.ct, at }), { metadata: { auth: th, at } }); }
    catch { return json({ error: 'busy' }, 503, h); }
    return json({ ok: true, at }, 200, h);
  }
  return json({ error: 'method' }, 405, h);
}
