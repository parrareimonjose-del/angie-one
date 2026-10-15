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

const LANG_NAMES = { es: 'Spanish', en: 'English', pt: 'Portuguese', fr: 'French', de: 'German', it: 'Italian', zh: 'Simplified Chinese', ja: 'Japanese', ko: 'Korean', hi: 'Hindi', ar: 'Arabic', ru: 'Russian', tr: 'Turkish' };
const langOf = (v) => LANG_NAMES[String(v || 'en').slice(0, 5).toLowerCase().split('-')[0]] || 'English';
const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(+v || 0)));
const str = (v, n) => String(v ?? '').replace(/[<>]/g, '').slice(0, n);

async function gemini(env, parts, maxTokens, timeoutMs, mimeJson) {
  for (let i = 0; i < 3; i++) {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), timeoutMs);
    let r = null;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { ...(mimeJson ? { responseMimeType: 'application/json' } : {}), temperature: 0.4, maxOutputTokens: maxTokens } }),
      });
    } catch (e) { r = null; } finally { clearTimeout(tm); }
    if (r && r.ok) { const j = await r.json(); return (j?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim(); }
    if (r && r.status !== 429 && r.status < 500) { console.log('upstream', r.status); return null; }
    if (i < 2) await new Promise((x) => setTimeout(x, [800, 2000][i]));
  }
  return null;
}
const parseJson = (txt) => { const t = String(txt || '').replace(/^```(json)?|```$/g, '').trim(); try { return JSON.parse(t); } catch { const m = t.match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch { return null; } } };

/** Cache gratis de Cloudflare: misma petición → misma respuesta, sin gastar cuota de Gemini. */
async function cached(kind, body, ttl, make) {
  const data = new TextEncoder().encode(JSON.stringify(body));
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map((x) => x.toString(16).padStart(2, '0')).join('');
  const key = new Request(`https://cache.angieone.internal/${kind}/${hash}`);
  const cache = caches.default;
  const hit = await cache.match(key); if (hit) { const o = await hit.json(); return { ...o, cached: true }; }
  const o = await make(); if (!o || o.error) return o;
  await cache.put(key, new Response(JSON.stringify(o), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${ttl}` } }));
  return o;
}

const PLAN_PROMPT = `You are "Angie", a warm, guilt-free nutrition and fitness coach (not a doctor). Create a ONE-WEEK personal plan for this user and answer ONLY JSON in this exact shape:
{"diet":{"days":[{"meals":[{"name":"short dish name (NOT the meal time like breakfast)","items":"foods and portions in plain words","kcal":int,"p":int,"c":int,"f":int}]}],"shopping":["item with quantity for the week"]},
 "workout":{"days":[{"rest":bool,"title":"short title","exercises":[{"name":"exercise","desc":"one or two plain sentences how to do it safely","sets":int,"reps":int,"secs":int,"rest":int,"met":number}]}],"safety":"one short safety note"}}
Rules: exactly 7 diet days (Monday..Sunday), MEALS meals per day; each day's kcal must add up close to KCAL kcal (never below MIN kcal), protein about PROT g. Prefer CUISINE dishes with local, affordable (BUDGET budget) ingredients; NEVER use: DISLIKE. Shopping list max 25 items.
Exactly 7 workout days: DAYS training days at PLACE, about MINUTES minutes each, level LEVEL; others "rest":true with empty exercises. 4–7 exercises per training day including a short warm-up. Use "reps" for repetition exercises (secs 0) or "secs" for timed ones (reps 0). rest in seconds. met = realistic MET value (2–8). Respect limits/injuries: INJURY. Hard rules: knees → no squats of any kind (including chair squats), lunges, step-ups or jumps; lower back → no deadlifts, good mornings, barbell rows or heavy spinal loading; shoulders → no overhead or shoulder press; wrists → no push-ups or planks on the hands. Choose low-impact options if needed. Beginner-friendly descriptions. Write ALL text in LANG. No medical advice, no body shaming.`;

function cleanPlan(o, b) {
  if (!o || !o.diet || !o.workout) return null;
  const minK = b.sex === 'male' ? 1500 : 1200;
  const ddays = (Array.isArray(o.diet.days) ? o.diet.days : []).slice(0, 7).map((d) => ({
    meals: (Array.isArray(d?.meals) ? d.meals : []).slice(0, 6).map((m) => ({ name: str(m.name, 60), items: str(m.items, 220), kcal: clampN(m.kcal, 0, 2500), p: clampN(m.p, 0, 250), c: clampN(m.c, 0, 400), f: clampN(m.f, 0, 200) })).filter((m) => m.name && m.kcal),
  }));
  if (ddays.length !== 7 || ddays.some((d) => d.meals.length < 2)) return null;
  // Escala suave para que cada día quede en la meta y nunca por debajo del mínimo seguro
  const target = Math.max(minK, b.kcal);
  for (const d of ddays) {
    const sum = d.meals.reduce((a, m) => a + m.kcal, 0); const k = target / sum;
    if (k < 0.85 || k > 1.15) d.meals = d.meals.map((m) => ({ ...m, kcal: Math.round(m.kcal * k), p: Math.round(m.p * k), c: Math.round(m.c * k), f: Math.round(m.f * k) }));
  }
  const wdays = (Array.isArray(o.workout.days) ? o.workout.days : []).slice(0, 7).map((d) => ({
    rest: !!d?.rest || !(d?.exercises || []).length, title: str(d?.title, 60),
    exercises: (Array.isArray(d?.exercises) ? d.exercises : []).slice(0, 8).map((e) => {
      const reps = clampN(e.reps, 0, 50), secs = reps ? 0 : clampN(e.secs || 30, 10, 900);
      return { name: str(e.name, 60), desc: str(e.desc, 260), sets: clampN(e.sets || 1, 1, 6), reps, secs, rest: clampN(e.rest ?? 45, 0, 180), met: Math.min(10, Math.max(1.5, +e.met || 3.5)) };
    }).filter((e) => e.name),
  }));
  if (wdays.length !== 7 || !wdays.some((d) => !d.rest)) return null;
  const shopping = (Array.isArray(o.diet.shopping) ? o.diet.shopping : []).slice(0, 30).map((x) => str(x, 80)).filter(Boolean);
  return { diet: { days: ddays, shopping }, workout: { days: wdays, safety: str(o.workout.safety, 300) } };
}

const CHAT_PROMPT = `You are "Angie", the coach inside the Angie One app: warm, motivating, guilt-free, practical, Latin-friendly. Answer questions about food, nutrition, cooking and exercise in LANG, in at most 120 words, simple words, plain text without markdown. Tone rules (strict, in every language): never use pet names or terms of endearment (e.g. mi amor, cariño, mi reina, linda, guapa, corazón, mija, mi vida, honey, sweetie, dear, darling, querida, chérie, Schatz, tesoro); never compliment or comment on the user's looks or body; never assume the user's gender: in gendered languages (Spanish, Portuguese, French, Italian, Arabic, etc.) use neutral wording (e.g. "te doy la bienvenida" instead of "bienvenida/o", "qué buena pregunta", avoid adjectives that agree with the user's gender, such as saciada/saciado, lista/listo, cansada/cansado; keep wording neutral even if the user states their gender, e.g. "te mantiene con saciedad"). You are NOT a doctor: never diagnose, never prescribe medication, never suggest eating below 1200 kcal (women) / 1500 kcal (men), never praise extreme restriction, purging or over-exercise. If the user mentions symptoms, pain, pregnancy, a disease, or signs of an eating disorder, kindly suggest talking to a health professional. If the question is unrelated to food, health habits or exercise, gently steer back. User context: CTX.`;

// Red de seguridad del tono: quita apelativos cariñosos que la IA cuele (13 idiomas).
const PET = /(?:,\s*|(?<=(?:^|[¡¿\s])(?:hola|hey|hi|hello|oi|olá|ola|salut|bonjour|ciao|hallo|merhaba|привет)\s+))(?:mi\s+(?:amor|vida|cielo|reina|rey|corazón|corazon|niña|niño|nena|linda|lindo|bella|hermosa|querida|querido|princesa)|cariño|cariñ[oa]|mija|mijo|mamita|papito|mami|papi|guap[oa]|lind[oa]|herman[oa]sa|preciosa?|querid[oa]|corazón|bonit[oa]|chula|amorcito|reina|princesa|honey|sweetie|sweetheart|darling|babe|baby|dear|hun|gorgeous|beautiful|handsome|love|meu\s+amor|minha\s+querida|meu\s+querido|benzinho|ma\s+(?:chérie|belle)|mon\s+(?:chéri|cœur|ange)|ma\s+puce|schatz|liebling|süße|tesoro|carissim[oa]|cara\s+mia|tatlım|canım|güzelim|дорог(?:ая|ой)|милая|солнышко|亲爱的|宝贝|ダーリン|자기야|حبيبتي|حبيبي|عزيزتي)\b(?=\s*[,.!?¡¿;:)]|\s*$)/giu;
const ONLYW = /^[^\p{L}]*$/u;
function cleanTone(t) {
  return t.split('\n').map((l) => l.replace(PET, '').replace(/\s+([,.!?;:])/g, '$1').replace(/([¡¿])\s*([!?])/g, '$1$2').replace(/¡!/g, '!').replace(/¿\?/g, '?').replace(/,\s*([.!?])/g, '$1')).join('\n').trim();
}

async function coach(path, b, env, h) {
  if (path === '/plan') {
    const p = {
      lang: langOf(b.lang), kcal: clampN(b.kcal, 1000, 5000), prot: clampN(b.prot, 30, 300), sex: b.sex === 'male' ? 'male' : 'female',
      meals: clampN(b.meals || 4, 3, 5), days: clampN(b.days || 3, 1, 6), minutes: clampN(b.minutes || 30, 10, 90),
      place: b.place === 'gym' ? 'a gym' : 'home with no equipment (a chair and a wall are fine)', level: ['beginner', 'intermediate', 'advanced'].includes(b.level) ? b.level : 'beginner',
      injury: str(b.injury, 200) || 'none', dislike: str(b.dislike, 200) || 'nothing', cuisine: str(b.cuisine, 80) || 'Latin American', budget: ['low', 'medium', 'high'].includes(b.budget) ? b.budget : 'medium',
      goal: ['lose', 'keep', 'gain'].includes(b.goal) ? b.goal : 'keep', age: clampN(b.age, 13, 100), weight: clampN(b.weight, 30, 300),
    };
    const out = await cached('plan-v2', p, 7 * 86400, async () => {
      const prompt = PLAN_PROMPT.replace('MEALS', p.meals).replace('KCAL', p.kcal).replace('MIN', p.sex === 'male' ? 1500 : 1200).replace('PROT', p.prot).replace('CUISINE', p.cuisine).replace('BUDGET', p.budget).replace('DISLIKE', p.dislike)
        .replace('DAYS', p.days).replace('PLACE', p.place).replace('MINUTES', p.minutes).replace('LEVEL', p.level).replace('INJURY', p.injury).replace('LANG', p.lang)
        + ` User: ${p.sex}, ${p.age} years, ${p.weight} kg, goal ${p.goal}.`;
      for (let attempt = 0; attempt < 2; attempt++) {
      const txt = await gemini(env, [{ text: prompt }], 8192, 55000, true);
      if (txt === null) return { error: 'busy' };
      const parsed = parseJson(txt); const plan = cleanPlan(parsed, p);
      if (!plan) console.log('plan reject', txt.length, txt.slice(0, 300), txt.slice(-200), parsed ? JSON.stringify({ dd: parsed.diet?.days?.length, wd: parsed.workout?.days?.length, m: parsed.diet?.days?.map((d) => d.meals?.length) }) : 'noparse');
      if (plan) return { plan };
      }
      return { error: 'parse' };
    });
    if (out.error) return json({ error: out.error }, out.error === 'busy' ? 503 : 502, h);
    return json(out, 200, h);
  }
  // /chat
  const msgs = (Array.isArray(b.messages) ? b.messages : []).slice(-6).map((m) => ({ role: m.role === 'user' ? 'User' : 'Angie', text: str(m.text, 600) })).filter((m) => m.text);
  if (!msgs.length || msgs[msgs.length - 1].role !== 'User') return json({ error: 'need question' }, 400, h);
  const lang = langOf(b.lang); const ctx = str(b.context, 300) || 'none';
  const out = await cached('chat-v4', { lang, ctx, msgs }, 86400, async () => {
    const txt = await gemini(env, [{ text: CHAT_PROMPT.replace('LANG', lang).replace('CTX', ctx) + '\n\n' + msgs.map((m) => `${m.role}: ${m.text}`).join('\n') + '\nAngie:' }], 500, 25000, false);
    if (txt === null) return { error: 'busy' };
    return txt ? { reply: cleanTone(txt.replace(/^Angie:\s*/, '')).slice(0, 1500) } : { error: 'parse' };
  });
  if (out.error) return json({ error: out.error }, out.error === 'busy' ? 503 : 502, h);
  return json(out, 200, h);
}

export default {
  async fetch(req, env) {
    const h = cors(req.headers.get('Origin'));
    if (!h) return json({ error: 'origin' }, 403);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    const path = new URL(req.url).pathname;
    if (req.method !== 'POST' || !['/estimate', '/plan', '/chat'].includes(path)) return json({ error: 'not found' }, 404, h);
    const ip = req.headers.get('CF-Connecting-IP') || 'x';
    const now = Date.now(), arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
    if (arr.length >= RATE) return json({ error: 'rate' }, 429, h);
    arr.push(now); hits.set(ip, arr); if (hits.size > 5000) hits.clear();
    if (+(req.headers.get('Content-Length') || 0) > MAX_BYTES) return json({ error: 'too large' }, 413, h);
    const raw = await req.text();
    if (raw.length > MAX_BYTES) return json({ error: 'too large' }, 413, h);
    let b; try { b = JSON.parse(raw); } catch { return json({ error: 'bad json' }, 400, h); }
    if (path === '/plan' || path === '/chat') return coach(path, b, env, h);
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
