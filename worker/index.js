// Angie One AI proxy: keeps GEMINI_API_KEY server-side (Worker secret).
const MODEL = 'gemini-flash-lite-latest';
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB request cap
const RATE = 20; // requests per minute per IP (per isolate, best effort)
const ORIGINS = [/^https:\/\/parrareimonjose-del\.github\.io$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const hits = new Map();
const PROMPT = `You are a nutrition estimator for Latin American and international food. Estimate the meal (from the photo or description) and answer ONLY JSON:
{"name": short dish name in LANG, "kcalMin": int, "kcalMax": int, "p": grams protein, "c": grams carbs, "f": grams fat, "confidence": "high"|"medium"|"low"}
Give a realistic RANGE, not a single value. Never comment on body weight or give medical advice.`;

function cors(origin) {
  const ok = origin && ORIGINS.some((r) => r.test(origin));
  return ok ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' } : null;
}
const json = (o, s, h) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', ...(h || {}) } });

export default {
  async fetch(req, env) {
    const h = cors(req.headers.get('Origin'));
    if (!h) return json({ error: 'origin' }, 403);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (req.method !== 'POST' || new URL(req.url).pathname !== '/estimate') return json({ error: 'not found' }, 404, h);
    const ip = req.headers.get('CF-Connecting-IP') || 'x';
    const now = Date.now(), arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
    if (arr.length >= RATE) return json({ error: 'rate' }, 429, h);
    arr.push(now); hits.set(ip, arr); if (hits.size > 5000) hits.clear();
    if (+(req.headers.get('Content-Length') || 0) > MAX_BYTES) return json({ error: 'too large' }, 413, h);
    const raw = await req.text();
    if (raw.length > MAX_BYTES) return json({ error: 'too large' }, 413, h);
    let b; try { b = JSON.parse(raw); } catch { return json({ error: 'bad json' }, 400, h); }
    const lang = String(b.lang || 'en').slice(0, 5);
    const parts = [{ text: PROMPT.replace('LANG', lang) }];
    if (b.image) {
      const mime = /^image\/(jpeg|png|webp|heic)$/.test(b.mime) ? b.mime : 'image/jpeg';
      parts.push({ inline_data: { mime_type: mime, data: String(b.image) } });
    } else if (b.text) parts.push({ text: 'Meal: ' + String(b.text).slice(0, 500) });
    else return json({ error: 'need image or text' }, 400, h);
    const call = () => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 300 } }),
    });
    let r = await call();
    if (r.status === 429 || r.status >= 500) { await new Promise((x) => setTimeout(x, 800)); r = await call(); }
    if (!r.ok) { const d = (await r.text()).slice(0, 300); console.log('upstream', r.status, d); return json({ error: 'upstream ' + r.status, detail: d.replace(/AIza[\w-]+|AQ\.[\w-]+/g, '***') }, 502, h); }
    const j = await r.json();
    let o; try { o = JSON.parse(j?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'); } catch { return json({ error: 'parse' }, 502, h); }
    return json({ name: String(o.name || '?'), kcalMin: +o.kcalMin || 0, kcalMax: +o.kcalMax || 0, p: +o.p || 0, c: +o.c || 0, f: +o.f || 0, confidence: ['high','medium','low'].includes(o.confidence) ? o.confidence : 'medium' }, 200, h);
  },
};
