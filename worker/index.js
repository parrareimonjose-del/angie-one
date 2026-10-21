import { handleGrants } from './grants.js';
import { handleFoods, foodReport } from './foods.js';
import { handleSync } from './sync.js';
// Angie One AI proxy: keeps GEMINI_API_KEY server-side (Worker secret).
const MODEL = 'gemini-flash-lite-latest';
const MODELS = ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-flash-lite-latest'];
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB request cap
const RATE = 20; // requests per minute per IP (per isolate, best effort)
const ORIGINS = [/^https:\/\/parrareimonjose-del\.github\.io$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const hits = new Map();
const PROMPT = `You are a nutrition estimator for Latin American and international food. Estimate the meal (from the photo or description) and answer ONLY JSON:
{"isFood": true|false, "name": short dish name written in LANG (the user's language, native script), "kcalMin": int, "kcalMax": int, "p": grams protein, "c": grams carbs, "f": grams fat, "fib": grams fiber, "confidence": "high"|"medium"|"low"}
If there is no food or drink in the photo/description, answer {"isFood": false}. Give a realistic RANGE, not a single value. Never comment on body weight or give medical advice.`;

function cors(origin) {
  const ok = origin && ORIGINS.some((r) => r.test(origin));
  return ok ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Vary': 'Origin' } : null;
}
const json = (o, s, h) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', ...(h || {}) } });

const LANG_NAMES = { es: 'Spanish', en: 'English', pt: 'Portuguese', fr: 'French', de: 'German', it: 'Italian', zh: 'Simplified Chinese', ja: 'Japanese', ko: 'Korean', hi: 'Hindi', ar: 'Arabic', ru: 'Russian', tr: 'Turkish' };
const langOf = (v) => LANG_NAMES[String(v || 'en').slice(0, 5).toLowerCase().split('-')[0]] || 'English';
const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(+v || 0)));
const str = (v, n) => String(v ?? '').replace(/[<>]/g, '').slice(0, n);

async function gemini(env, parts, maxTokens, timeoutMs, mimeJson, schema) {
  // Intenta varios modelos gratis; reintenta con espera creciente si hay 429/5xx/timeout.
  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), timeoutMs);
    let r = null;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { ...(mimeJson ? { responseMimeType: 'application/json' } : {}), ...(schema ? { responseSchema: schema } : {}), temperature: 0.4, maxOutputTokens: maxTokens } }),
      });
    } catch (e) { r = null; console.log('gemini timeout/err', model); } finally { clearTimeout(tm); }
    if (r && r.ok) { const j = await r.json(); return (j?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim(); }
    if (r) console.log('upstream', model, r.status, (await r.text().catch(() => '')).slice(0, 200).replace(/AIza[\w-]+/g, '***'));
    if (r && r.status === 400) return null;
    if (i < MODELS.length - 1) await new Promise((x) => setTimeout(x, [400, 1500, 3000, 6000][i]));
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

const N = { type: 'INTEGER' }, S = { type: 'STRING' };
const SCHEMA = {
  diet: { type: 'OBJECT', properties: { diet: { type: 'OBJECT', properties: {
    days: { type: 'ARRAY', items: { type: 'OBJECT', properties: { meals: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: S, items: S, kcal: N, p: N, c: N, f: N }, required: ['name', 'items', 'kcal', 'p', 'c', 'f'] } } }, required: ['meals'] } },
    shopping: { type: 'ARRAY', items: S } }, required: ['days', 'shopping'] } }, required: ['diet'] },
  workout: { type: 'OBJECT', properties: { workout: { type: 'OBJECT', properties: {
    days: { type: 'ARRAY', items: { type: 'OBJECT', properties: { rest: { type: 'BOOLEAN' }, title: S, exercises: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: S, desc: S, sets: N, reps: N, secs: N, rest: N, met: { type: 'NUMBER' } }, required: ['name', 'desc', 'sets', 'reps', 'secs', 'rest', 'met'] } } }, required: ['rest', 'title', 'exercises'] } },
    safety: S }, required: ['days', 'safety'] } }, required: ['workout'] },
};

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
    const out = await cached('plan-v3', p, 7 * 86400, async () => {
      const prompt = PLAN_PROMPT.replace('MEALS', p.meals).replace('KCAL', p.kcal).replace('MIN', p.sex === 'male' ? 1500 : 1200).replace('PROT', p.prot).replace('CUISINE', p.cuisine).replace('BUDGET', p.budget).replace('DISLIKE', p.dislike)
        .replace('DAYS', p.days).replace('PLACE', p.place).replace('MINUTES', p.minutes).replace('LEVEL', p.level).replace('INJURY', p.injury).replace('LANG', p.lang)
        + ` User: ${p.sex}, ${p.age} years, ${p.weight} kg, goal ${p.goal}.`;
      // Dos llamadas pequeñas en paralelo (dieta y ejercicio) con esquema JSON forzado: menos JSON roto y menos tiempo.
      const part = async (which) => {
        for (let attempt = 0; attempt < 2; attempt++) {
          const txt = await gemini(env, [{ text: prompt + `\nNOW OUTPUT ONLY the "${which}" object (as {"${which}":{...}}).` }], 8192, 45000, true, SCHEMA[which]);
          if (txt === null) return { err: 'busy' };
          const o = parseJson(txt); const v = o && (o[which] || (which === 'diet' ? (o.days && o.shopping ? o : null) : (o.days ? o : null)));
          if (v) return { v };
          console.log('plan reject', which, txt.length, txt.slice(-150));
        }
        return { err: 'parse' };
      };
      const [d, w] = await Promise.all([part('diet'), part('workout')]);
      if (d.err || w.err) return { error: d.err === 'busy' || w.err === 'busy' ? 'busy' : 'parse' };
      const plan = cleanPlan({ diet: d.v, workout: w.v }, p);
      if (!plan) { console.log('plan clean reject', JSON.stringify({ dd: d.v.days?.length, wd: w.v.days?.length, m: d.v.days?.map((x) => x.meals?.length) })); return { error: 'parse' }; }
      return { plan };
    });
    if (out.error) return json({ error: out.error }, out.error === 'busy' ? 503 : 502, h);
    return json(out, 200, h);
  }
  // /chat
  const msgs = (Array.isArray(b.messages) ? b.messages : []).slice(-6).map((m) => ({ role: m.role === 'user' ? 'User' : 'Angie', text: str(m.text, 600) })).filter((m) => m.text);
  if (!msgs.length || msgs[msgs.length - 1].role !== 'User') return json({ error: 'need question' }, 400, h);
  const lang = langOf(b.lang); const ctx = str(b.context, 700) || 'none';
  const out = await cached('chat-v4', { lang, ctx, msgs }, 86400, async () => {
    const txt = await gemini(env, [{ text: CHAT_PROMPT.replace('LANG', lang).replace('CTX', ctx) + '\n\n' + msgs.map((m) => `${m.role}: ${m.text}`).join('\n') + '\nAngie:' }], 500, 25000, false);
    if (txt === null) return { error: 'busy' };
    return txt ? { reply: cleanTone(txt.replace(/^Angie:\s*/, '')).slice(0, 1500) } : { error: 'parse' };
  });
  if (out.error) return json({ error: out.error }, out.error === 'busy' ? 503 : 502, h);
  return json(out, 200, h);
}

// ---------- Fase 2: nevera/despensa/chef, menú del restaurante e IA Programadora ----------
const CHEF_PROMPT = `You are "Angie", a guilt-free AI chef for Latin American home cooking (not a doctor). INPUT. Answer ONLY JSON:
{"items":["ingredient or spice detected/given, in LANG"],"recipes":[{"name":"dish in LANG","kcal":int per serving,"min":int minutes,"uses":["main items used"],"steps":["short step in LANG"]}]}
Give exactly 3 simple, healthy, affordable recipes mostly using those items (basic pantry staples like salt, oil and water allowed), max 6 steps each, kcal per serving about KCAL or less (never below 200). NEVER use: DISLIKE. If there is no food at all, answer {"items":[],"recipes":[]}. No medical advice.`;
const MENU_PROMPT = `You read a restaurant menu (photo or text) for a guilt-free nutrition app. The user has about LEFT kcal left today. Answer ONLY JSON:
{"dishes":[{"name":"dish as written","kcalMin":int,"kcalMax":int,"pick":"best"|"ok"|"treat","tip":"one short friendly tip in LANG (e.g. ask for sauce on the side)"}]}
Max 8 dishes; mark 2–3 "best" (fits LEFT, good protein, less fried). Never shame; "treat" is fine to enjoy sometimes. If it is not a menu, answer {"dishes":[]}.`;
const DEV_PROMPT = `You are the "Programmer AI" of the Angie One app (nutrition app by Parra Apps). Read anonymous user feedback and metrics and propose up to 4 small, safe product changes. Answer ONLY JSON:
{"proposals":[{"title":"short title in LANG","why":"one sentence in LANG citing the feedback or metric","change":"what to change, one sentence in LANG","risk":"low"|"medium"}]}
Never propose anything about payments, moving money, collecting more personal data, or publishing without the founder's approval. Data: DATA`;
async function phase2(path, b, env, h) {
  const lang = langOf(b.lang);
  if (path === '/dev') {
    const data = str(JSON.stringify(b.data || {}), 2500);
    const out = await cached('dev-v1', { lang, data }, 6 * 3600, async () => {
      const txt = await gemini(env, [{ text: DEV_PROMPT.replace('LANG', lang).replace('DATA', data) }], 1200, 30000, true);
      if (txt === null) return { error: 'busy' }; const o = parseJson(txt);
      const list = (Array.isArray(o?.proposals) ? o.proposals : []).slice(0, 4).map((x) => ({ title: str(x.title, 80), why: str(x.why, 240), change: str(x.change, 240), risk: x.risk === 'medium' ? 'medium' : 'low' })).filter((x) => x.title);
      return list.length ? { proposals: list } : { error: 'parse' };
    });
    if (out.error) return json({ error: out.error }, out.error === 'busy' ? 503 : 502, h);
    return json(out, 200, h);
  }
  if (b.mode === 'receipt') {
    // Sección de Datos: lee un recibo (foto o PDF). Solo campos de compra; nunca datos de salud ni personales.
    if (!b.image) return json({ error: 'need input' }, 400, h);
    const mime = /^(image\/(jpeg|png|webp)|application\/pdf)$/.test(b.mime) ? b.mime : 'image/jpeg';
    const CATS = ['groceries', 'restaurant', 'home', 'clothing', 'services', 'transport', 'education', 'charity', 'business', 'health', 'pharmacy', 'other'];
    const out = await (async () => { // sin caché: los recibos no se guardan en el servidor
      const txt = await gemini(env, [{ text: `Read this purchase receipt. Answer ONLY JSON: {"isReceipt":true,"store":"","date":"YYYY-MM-DD","category":"one of ${CATS.join('|')}","total":0,"currency":"USD","items":[{"name":"","price":0}]}. Item names in ${lang}. Do NOT include card numbers, names, addresses, phone numbers or loyalty IDs. If it is not a receipt, {"isReceipt":false}.` }, { inline_data: { mime_type: mime, data: String(b.image) } }], 1200, 40000, true);
      if (txt === null) return { error: 'busy' }; const o = parseJson(txt); if (!o) return { error: 'parse' };
      if (o.isReceipt === false) return { error: 'not_receipt' };
      return { store: str(o.store, 60), date: /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : '', category: CATS.includes(o.category) ? o.category : 'other', total: Math.max(0, Math.round((+o.total || 0) * 100) / 100), currency: str(o.currency || 'USD', 3).toUpperCase(),
        items: (Array.isArray(o.items) ? o.items : []).slice(0, 40).map((x) => ({ name: str(x?.name, 50), price: Math.max(0, +x?.price || 0) })).filter((x) => x.name) };
    })();
    if (out.error) return json({ error: out.error }, out.error === 'busy' ? 503 : out.error === 'not_receipt' ? 422 : 502, h);
    return json(out, 200, h);
  }
  const mode = b.mode === 'menu' ? 'menu' : 'chef';
  const parts = [];
  if (mode === 'menu') parts.push({ text: MENU_PROMPT.replace('LEFT', clampN(b.left, 0, 5000)).replace('LANG', lang) });
  else parts.push({ text: CHEF_PROMPT.replace('INPUT', b.image ? 'Look at the photo of a fridge, pantry or spice rack and list the visible foods and spices.' : 'The user has these items: ' + str(b.text, 400) + '.').replace(/LANG/g, lang).replace('KCAL', clampN(b.kcal || 550, 250, 1200)).replace('DISLIKE', str(b.dislike, 150) || 'nothing') });
  if (b.image) parts.push({ inline_data: { mime_type: /^image\/(jpeg|png|webp)$/.test(b.mime) ? b.mime : 'image/jpeg', data: String(b.image) } });
  else if (mode === 'menu') parts.push({ text: 'Menu text: ' + str(b.text, 1500) });
  if (!b.image && !str(b.text, 10).trim()) return json({ error: 'need input' }, 400, h);
  const out = await cached('vis-v1-' + mode, { lang, mode, img: b.image || '', text: str(b.text, 1500), kcal: b.kcal, left: b.left, dislike: b.dislike }, 86400, async () => {
    const txt = await gemini(env, parts, 2000, 40000, true);
    if (txt === null) return { error: 'busy' }; const o = parseJson(txt); if (!o) return { error: 'parse' };
    if (mode === 'menu') return { dishes: (Array.isArray(o.dishes) ? o.dishes : []).slice(0, 8).map((d) => { let lo = clampN(d.kcalMin, 0, 4000), hi = clampN(d.kcalMax, 0, 4000); if (lo > hi) [lo, hi] = [hi, lo]; return { name: str(d.name, 80), kcalMin: lo, kcalMax: hi, pick: ['best', 'ok', 'treat'].includes(d.pick) ? d.pick : 'ok', tip: str(d.tip, 160) }; }).filter((d) => d.name && d.kcalMax) };
    return { items: (Array.isArray(o.items) ? o.items : []).slice(0, 30).map((x) => str(x, 40)).filter(Boolean),
      recipes: (Array.isArray(o.recipes) ? o.recipes : []).slice(0, 3).map((r) => ({ name: str(r.name, 70), kcal: clampN(r.kcal, 150, 1500), min: clampN(r.min, 5, 180), uses: (r.uses || []).slice(0, 8).map((x) => str(x, 40)), steps: (r.steps || []).slice(0, 6).map((x) => str(x, 200)) })).filter((r) => r.name && r.steps.length) };
  });
  if (out.error) return json({ error: out.error }, out.error === 'busy' ? 503 : 502, h);
  return json(out, 200, h);
}

// Clon IA: rasgos visuales para un avatar estilizado. Las fotos NO se guardan ni se cachean: solo se analizan y se descartan.
async function clone(b, env, h) {
  const imgs = [b.face, b.body].filter((x) => typeof x === 'string' && x.length > 100 && x.length < 600000);
  if (!imgs.length) return json({ error: 'need input' }, 400, h);
  const parts = [{ text: 'You help draw a friendly cartoon avatar. From the photo(s) of an adult in fitted clothes, return ONLY JSON: {"ok":true,"skin":"#RRGGBB","hair":"#RRGGBB","hairLen":"short|medium|long","shoulders":1.0,"hips":1.0}. shoulders and hips are relative width 0.85-1.15 (1 = average). No names, no age, no health, no judgments. If no clothed adult person is visible, or there is nudity, return {"ok":false}.' }];
  for (const d of imgs) parts.push({ inline_data: { mime_type: 'image/jpeg', data: d } });
  const txt = await gemini(env, parts, 200, 30000, true);
  if (txt === null) return json({ error: 'busy' }, 503, h);
  const o = parseJson(txt); if (!o || o.ok === false) return json({ error: 'no_person' }, 422, h);
  const hex = (v, d) => (/^#[0-9a-fA-F]{6}$/.test(v) ? v : d), num = (v) => Math.max(0.85, Math.min(1.15, +v || 1));
  return json({ skin: hex(o.skin, '#E0AC8A'), hair: hex(o.hair, '#3B2A20'), hairLen: ['short', 'medium', 'long'].includes(o.hairLen) ? o.hairLen : 'medium', shoulders: num(o.shoulders), hips: num(o.hips) }, 200, h);
}

export default {
  async fetch(req, env) {
    const h = cors(req.headers.get('Origin'));
    if (!h) return json({ error: 'origin' }, 403);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    const path = new URL(req.url).pathname;
    if (req.method === 'GET' && path.startsWith('/foods/')) return handleFoods(path, req, env, json, h);
    if (path.startsWith('/sync/')) return handleSync(path, req, env, json, h, hits);
    if (path.startsWith('/grants/')) return handleGrants(path, req, env, json, h);
    if (req.method !== 'POST' || !['/estimate', '/plan', '/chat', '/vision', '/dev', '/voice', '/clone', '/foods/report'].includes(path)) return json({ error: 'not found' }, 404, h);
    const ip = req.headers.get('CF-Connecting-IP') || 'x';
    const now = Date.now(), arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
    if (arr.length >= RATE) return json({ error: 'rate' }, 429, h);
    arr.push(now); hits.set(ip, arr); if (hits.size > 5000) hits.clear();
    if (+(req.headers.get('Content-Length') || 0) > MAX_BYTES) return json({ error: 'too large' }, 413, h);
    const raw = await req.text();
    if (raw.length > MAX_BYTES) return json({ error: 'too large' }, 413, h);
    let b; try { b = JSON.parse(raw); } catch { return json({ error: 'bad json' }, 400, h); }
    if (path === '/voice') {
      // Voz en iPhone/otros: audio grabado (mp4/aac, webm/opus, wav) → texto. No se guarda nada.
      if (!b.audio) return json({ error: 'need audio' }, 400, h);
      const mime = String(b.mime || 'audio/mp4').split(';')[0];
      const am = /^audio\/(mp4|aac|m4a|x-m4a|mpeg|mp3|webm|ogg|wav|x-wav)$/.test(mime) ? mime.replace('x-m4a', 'mp4').replace('m4a', 'mp4').replace('webm', 'webm') : 'audio/mp4';
      const txt = await gemini(env, [{ text: `Transcribe what the person says in this short audio (they are probably telling what they ate). Answer ONLY JSON {"text":"exact transcription in the spoken language"}. If there is no speech, {"text":""}.` }, { inline_data: { mime_type: am, data: String(b.audio) } }], 400, 30000, true);
      if (txt === null) return json({ error: 'busy' }, 503, h);
      const o = parseJson(txt); const t = str(o?.text, 500).trim();
      return t ? json({ text: t }, 200, h) : json({ error: 'no_speech' }, 422, h);
    }
    if (path === '/foods/report') return foodReport(b, env, json, h);
    if (path === '/plan' || path === '/chat') return coach(path, b, env, h);
    if (path === '/vision' || path === '/dev') return phase2(path, b, env, h);
    if (path === '/clone') return clone(b, env, h);
    const LANGS = { es: 'Spanish', en: 'English', pt: 'Portuguese', fr: 'French', de: 'German', it: 'Italian', zh: 'Simplified Chinese', ja: 'Japanese', ko: 'Korean', hi: 'Hindi', ar: 'Arabic', ru: 'Russian', tr: 'Turkish' };
    const code = String(b.lang || 'en').slice(0, 5).toLowerCase().split('-')[0];
    const lang = LANGS[code] || 'English';
    const parts = [{ text: b.label && b.image
      ? `This photo shows a packaged food's nutrition facts label and/or package. Read the values PER SERVING (or per package if no serving). Answer ONLY JSON {"isFood": true, "name": product name or short description in ${lang}, "kcalMin": int, "kcalMax": int (same as kcalMin if read exactly), "p": g protein, "c": g carbs, "f": g fat, "fib": g dietary fiber (0 if not shown), "confidence": "high" if read from the label else "low"}. If no food label or package is visible, {"isFood": false}.`
      : PROMPT.replace('LANG', lang) + ` Write the dish name in ${lang}.` }];
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
    return json({ name: String(o.name || '?').slice(0, 80), kcalMin: lo, kcalMax: hi, p: n(o.p), c: n(o.c), f: n(o.f), fib: n(o.fib), confidence: ['high','medium','low'].includes(o.confidence) ? o.confidence : 'medium' }, 200, h);
  },
};
