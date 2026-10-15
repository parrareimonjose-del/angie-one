// Angie One AI proxy: keeps GEMINI_API_KEY server-side (Worker secret).
const MODEL = 'gemini-flash-lite-latest';
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB request cap
const RATE = 20; // requests per minute per IP (per isolate, best effort)
const ORIGINS = [/^https:\/\/parrareimonjose-del\.github\.io$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const hits = new Map();
const PROMPT = `You are a nutrition estimator for Latin American and international food. Estimate the meal (from the photo or description) and answer ONLY JSON:
{"isFood": true|false, "name": short dish name written in LANG (the user's language, native script), "kcalMin": int, "kcalMax": int, "p": grams protein, "c": grams carbs, "f": grams fat, "confidence": "high"|"medium"|"low"}
If there is no food or drink in the photo/description, answer {"isFood": false}. Give a realistic RANGE, not a single value. Never comment on body weight or give medical advice.`;

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
    const LANGS = { es: 'Spanish', en: 'English', pt: 'Portuguese', fr: 'French', de: 'German', it: 'Italian', zh: 'Simplified Chinese', ja: 'Japanese', ko: 'Korean', hi: 'Hindi', ar: 'Arabic', ru: 'Russian', tr: 'Turkish' };
    const code = String(b.lang || 'en').slice(0, 5).toLowerCase().split('-')[0];
    const lang = LANGS[code] || 'English';
    const parts = [{ text: PROMPT.replace('LANG', lang) + ` Write the dish name in ${lang}.` }];
    if (b.image) {
      const mime = /^image\/(jpeg|png|webp|heic)$/.test(b.mime) ? b.mime : 'image/jpeg';
      parts.push({ inline_data: { mime_type: mime, data: String(b.image) } });
    } else if (b.text) parts.push({ text: 'Meal: ' + String(b.text).slice(0, 500) });
    else return json({ error: 'need image or text' }, 400, h);
    const call = async () => {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 20000);
      try {
        return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
          method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
          body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 400 } }),
        });
      } catch (e) { return null; } finally { clearTimeout(tm); }
    };
    // Hasta 3 intentos con espera creciente si Google está saturado (429), falla (5xx) o no responde.
    let r = null;
    for (let i = 0; i < 3; i++) {
      r = await call();
      if (r && r.ok) break;
      if (r && r.status !== 429 && r.status < 500) break;
      if (i < 2) await new Promise((x) => setTimeout(x, [700, 1800][i]));
    }
    if (!r) return json({ error: 'busy', message: 'AI timeout' }, 503, h);
    if (!r.ok) {
      const d = (await r.text()).slice(0, 300); console.log('upstream', r.status, d.replace(/AIza[\w-]+|AQ\.[\w-]+/g, '***'));
      return json({ error: r.status === 429 || r.status >= 500 ? 'busy' : 'upstream' }, r.status === 429 || r.status >= 500 ? 503 : 502, h);
    }
    const j = await r.json();
    const txt = (j?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').replace(/^```(json)?|```$/g, '').trim();
    let o; try { o = JSON.parse(txt || '{}'); } catch { const m = txt.match(/\{[\s\S]*\}/); try { o = JSON.parse(m ? m[0] : '{}'); } catch { return json({ error: 'parse' }, 502, h); } }
    const n = (v) => Math.max(0, Math.round(+v || 0));
    let lo = n(o.kcalMin), hi = n(o.kcalMax); if (lo > hi) [lo, hi] = [hi, lo];
    if (o.isFood === false || !hi) return json({ error: 'not_food' }, 422, h);
    return json({ name: String(o.name || '?').slice(0, 80), kcalMin: lo, kcalMax: hi, p: n(o.p), c: n(o.c), f: n(o.f), confidence: ['high','medium','low'].includes(o.confidence) ? o.confidence : 'medium' }, 200, h);
  },
};
