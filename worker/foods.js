// Base de alimentos de Angie One (gratis): Cloudflare KV + Open Food Facts (ODbL) + USDA FoodData Central (dominio público).
// Índice en KV: s:<n> (búsqueda, una línea por alimento " tokens \t json") y b:<n> (código de barras). Ver /workspace/calorias/base-alimentos-informe.md
const STOP = new Set('de con la el los las y a al del en the with and of in or u un una para sin por o e com do da dos das no na nfs ns'.split(' '));
export function toks(s) {
  const out = [];
  for (let w of String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/)) {
    if (w.length < 2 || STOP.has(w)) continue;
    if (w.length > 3 && w.endsWith('s')) w = w.slice(0, -1);
    if (!out.includes(w)) out.push(w);
  }
  return out;
}
export function fnv(s) { let h = 0x811c9dc5; for (const ch of new TextEncoder().encode(s)) h = Math.imul(h ^ ch, 0x01000193) >>> 0; return h; }
export const sKey = (t, ns = 500) => 's:' + (fnv(t.slice(0, 4)) % ns);
export const bKey = (code, nb = 300) => 'b:' + (fnv(code) % nb);
export function normCode(c) { c = String(c || '').replace(/\D/g, ''); return c && c.length < 13 ? c.padStart(13, '0') : c; }
function checkDigit(d) { let s = 0; for (let i = 0; i < d.length; i++) s += +d[d.length - 1 - i] * (i % 2 === 0 ? 3 : 1); return String((10 - (s % 10)) % 10); }
export function codeVariants(raw) {
  const c = String(raw || '').replace(/\D/g, ''); const out = [normCode(c)];
  if (c.length === 11 || c.length === 12 || c.length === 7) out.push(normCode(c + checkDigit(c)));
  if (c.length === 14 && c.startsWith('0')) out.push(c.slice(1));
  return [...new Set(out)].filter((x) => x.length >= 8 && x.length <= 14);
}
// Diccionario es/pt → en para buscar en nombres en inglés (USDA / OFF).
const DICT = { pollo: 'chicken', frango: 'chicken', pechuga: 'breast', peito: 'breast', muslo: 'thigh', res: 'beef', carne: 'beef', vaca: 'beef', cerdo: 'pork', porco: 'pork', puerco: 'pork',
  pescado: 'fish', peixe: 'fish', atun: 'tuna', atum: 'tuna', salmon: 'salmon', camaron: 'shrimp', camarao: 'shrimp', huevo: 'egg', ovo: 'egg', leche: 'milk', leite: 'milk', queso: 'cheese', queijo: 'cheese',
  yogur: 'yogurt', iogurte: 'yogurt', mantequilla: 'butter', manteiga: 'butter', pan: 'bread', pao: 'bread', arroz: 'rice', frijol: 'bean', frijole: 'bean', feijao: 'bean', caraota: 'bean', habichuela: 'bean', lenteja: 'lentil', garbanzo: 'chickpea',
  papa: 'potato', patata: 'potato', batata: 'potato', camote: 'sweet potato', manzana: 'apple', maca: 'apple', platano: 'plantain', banano: 'banana', guineo: 'banana', naranja: 'orange', laranja: 'orange', fresa: 'strawberry', morango: 'strawberry',
  pina: 'pineapple', abacaxi: 'pineapple', uva: 'grape', sandia: 'watermelon', melancia: 'watermelon', aguacate: 'avocado', palta: 'avocado', abacate: 'avocado', tomate: 'tomato', cebolla: 'onion', cebola: 'onion', ajo: 'garlic', alho: 'garlic',
  zanahoria: 'carrot', cenoura: 'carrot', lechuga: 'lettuce', alface: 'lettuce', espinaca: 'spinach', brocoli: 'broccoli', maiz: 'corn', milho: 'corn', avena: 'oat', aveia: 'oat', harina: 'flour', farinha: 'flour', azucar: 'sugar', acucar: 'sugar',
  aceite: 'oil', azeite: 'olive oil', oleo: 'oil', nuez: 'walnut', almendra: 'almond', mani: 'peanut', cacahuate: 'peanut', amendoim: 'peanut', galleta: 'cookie', biscoito: 'cookie', chocolate: 'chocolate', jugo: 'juice', suco: 'juice', zumo: 'juice',
  refresco: 'soda', gaseosa: 'soda', cafe: 'coffee', te: 'tea', cha: 'tea', agua: 'water', cerveza: 'beer', cerveja: 'beer', vino: 'wine', vinho: 'wine', sopa: 'soup', ensalada: 'salad', salada: 'salad', asado: 'roasted', frito: 'fried', hervido: 'boiled', cocido: 'cooked', crudo: 'raw', cru: 'raw',
  integral: 'whole wheat', helado: 'ice cream', sorvete: 'ice cream', pasta: 'pasta', fideo: 'noodle', tocino: 'bacon', jamon: 'ham', presunto: 'ham', salchicha: 'sausage', pavo: 'turkey', peru: 'turkey', hongo: 'mushroom', champinon: 'mushroom', calabaza: 'pumpkin', pepino: 'cucumber', limon: 'lemon', mango: 'mango', coco: 'coconut' };
const alts = (w) => { const d = DICT[w]; return d ? [w, ...toks(d)] : [w]; };
const lineRe = (w) => new RegExp('^[^\\t\\n]* ' + w.replace(/[^a-z0-9]/g, '') + (w.length < 4 ? ' ' : '') + '[^\\t\\n]*\\t(.*)$', 'gm');

const CC = { us: 'united-states', mx: 'mexico', co: 'colombia', ve: 'venezuela', ar: 'argentina', cl: 'chile', pe: 'peru', ec: 'ecuador', gt: 'guatemala', do: 'dominican-republic', pr: 'puerto-rico', cr: 'costa-rica', pa: 'panama', sv: 'el-salvador', hn: 'honduras', ni: 'nicaragua', bo: 'bolivia', py: 'paraguay', uy: 'uruguay', cu: 'cuba', br: 'brazil', es: 'spain' };
let META = null;
async function meta(env) { if (!META) { try { META = JSON.parse((await env.FOODS.get('meta', { cacheTtl: 3600 })) || '{}'); } catch { META = {}; } } return META; }

/** Puntuación: verificados primero, luego coincidencia de nombre, calidad, país del usuario. */
function rank(list, words, lang, cc) {
  const name = (r) => (r.n && (r.n[lang] || r.n.es || r.n.en || r.n.pt)) || '';
  return list.map((r) => { const nt = toks(name(r)); let sc = (r.v ? 1000 : 0) + (r.q || 0);
    if (nt[0] && words[0] && nt[0].startsWith(words[0])) sc += 60; const et = toks((r.n && r.n.en) || ''); if (et[0] && words.some((w) => et[0].startsWith(w))) sc += 40; if (r.n && r.n[lang]) sc += 25; if (cc && (r.cc || []).some((x) => x === cc || x === CC[cc])) sc += 20; if (r.s === 'angie') sc += 30; sc -= Math.min(20, nt.length * 2);
    return { r, sc }; }).sort((a, b) => b.sc - a.sc).map((x) => x.r);
}
export async function searchKV(env, q, lang = 'es', cc = '') {
  const words = toks(q).slice(0, 5); if (!words.length || !env.FOODS) return [];
  const m = await meta(env); const ns = m.NS || 500, sizes = m.sizes || {};
  // Elegimos la palabra cuyo bucket es más pequeño (menos CPU).
  const groups = words.map(alts);
  let best = 0, bestSize = Infinity;
  groups.forEach((g, i) => { const s = g.reduce((a, w) => a + (sizes[sKey(w, ns)] || 1e6), 0); if (s < bestSize) { bestSize = s; best = i; } });
  const out = new Map();
  for (const w of groups[best]) {
    const txt = await env.FOODS.get(sKey(w, ns), { cacheTtl: 3600 }); if (!txt) continue;
    const re = lineRe(w); let mm; let n = 0;
    while ((mm = re.exec(txt)) && n < 900) {
      n++; const start = txt.lastIndexOf('\n', mm.index) + 1; const head = txt.slice(start, txt.indexOf('\t', start));
      if (!groups.every((g, i) => i === best || g.some((x) => head.includes(' ' + x + (x.length < 4 ? ' ' : ''))))) continue;
      try { const r = JSON.parse(mm[1]); out.set(r.i, r); } catch { /* línea rota */ }
    }
  }
  return rank([...out.values()], words, lang, cc);
}
export async function barcodeKV(env, code) {
  if (!env.FOODS) return null; const m = await meta(env);
  for (const v of codeVariants(code)) {
    const txt = await env.FOODS.get(bKey(v, m.NB || 300), { cacheTtl: 3600 }); if (!txt) continue;
    const i = txt.startsWith(v + '\t') ? 0 : txt.indexOf('\n' + v + '\t'); if (i < 0) continue;
    const s = i === 0 ? 0 : i + 1; const e = txt.indexOf('\n', s);
    try { return JSON.parse(txt.slice(s + v.length + 1, e < 0 ? undefined : e)); } catch { return null; }
  }
  // Productos aportados por usuarios (ub:<código>), mientras no entren en la próxima reconstrucción de la base.
  for (const v of codeVariants(code)) { const u = await env.FOODS.get('ub:' + v, { cacheTtl: 600 }); if (u) { try { return JSON.parse(u); } catch { /* roto */ } } }
  return null;
}
// ---- Fuentes en vivo (con caché) ----
const R1 = (v) => (v == null || isNaN(+v) ? undefined : Math.round(+v * 10) / 10);
export function fromOFF(p, code) {
  const n = p.nutriments || {}; const k = +n['energy-kcal_100g']; if (!(k >= 0) || n.proteins_100g == null) return null;
  const names = {}; for (const l of ['es', 'en', 'pt']) if (p['product_name_' + l]) names[l] = String(p['product_name_' + l]).slice(0, 70);
  if (!Object.keys(names).length && p.product_name) names.en = String(p.product_name).slice(0, 70); if (!Object.keys(names).length) return null;
  const r = { i: 'off:' + normCode(code || p.code), bc: normCode(code || p.code), n: names, b: p.brands ? String(p.brands).split(',')[0].slice(0, 40) : undefined, k: Math.round(k), p: R1(n.proteins_100g), c: R1(n.carbohydrates_100g) ?? 0, f: R1(n.fat_100g) ?? 0,
    fb: R1(n.fiber_100g), sg: R1(n.sugars_100g), na: n.sodium_100g != null ? Math.round(n.sodium_100g * 1000) : undefined, s: 'off', v: 0, q: 50, img: p.image_front_small_url, live: 1 };
  if (p.serving_size && +p.serving_quantity > 0) r.sv = [String(p.serving_size).slice(0, 30), +p.serving_quantity];
  return r;
}
export function fromUSDA(x) {
  const g = (num) => (x.foodNutrients || []).find((n) => String(n.nutrientNumber) === num)?.value;
  const k = g('208'); if (k == null) return null;
  const r = { i: 'usda:' + x.fdcId, n: { en: String(x.description || '').slice(0, 70) }, b: x.brandOwner ? String(x.brandName || x.brandOwner).slice(0, 40) : undefined, bc: x.gtinUpc ? normCode(x.gtinUpc) : undefined,
    k: Math.round(k), p: R1(g('203')) ?? 0, c: R1(g('205')) ?? 0, f: R1(g('204')) ?? 0, fb: R1(g('291')), sg: R1(g('269')), na: g('307') != null ? Math.round(g('307')) : undefined, s: 'usda', v: x.dataType === 'Branded' ? 0 : 1, q: 70, live: 1 };
  if (x.servingSize && /^g$/i.test(x.servingSizeUnit || '')) r.sv = [x.householdServingFullText || `${x.servingSize} g`, +x.servingSize];
  return r;
}
async function cachedJSON(url, ttl, init) {
  const key = new Request('https://cache.angieone.internal/live/' + encodeURIComponent(url.replace(/api_key=[^&]+/, '')));
  const hit = await caches.default.match(key); if (hit) return hit.json();
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(url, { ...(init || {}), signal: ctl.signal, headers: { 'User-Agent': 'AngieOne/1.0 (angieoneapp.support@gmail.com)' } }); if (!r.ok) return null;
    const j = await r.json(); await caches.default.put(key, new Response(JSON.stringify(j), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${ttl}` } })); return j;
  } catch { return null; } finally { clearTimeout(tm); }
}
const FIELDS = 'code,product_name,product_name_es,product_name_en,product_name_pt,brands,nutriments,serving_size,serving_quantity,image_front_small_url';
export async function liveSearch(env, q, lang) {
  const usdaKey = env.USDA_API_KEY || 'DEMO_KEY';
  const [o, u] = await Promise.all([
    cachedJSON(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&json=1&page_size=12&lc=${lang}&fields=${FIELDS}`, 86400),
    cachedJSON(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${usdaKey}&query=${encodeURIComponent(q)}&pageSize=10&dataType=Foundation,SR%20Legacy,Branded`, 86400),
  ]);
  return [...((o && o.products) || []).map((p) => fromOFF(p)).filter(Boolean), ...((u && u.foods) || []).map(fromUSDA).filter(Boolean)];
}
export async function liveBarcode(env, code) {
  for (const v of codeVariants(code)) {
    const j = await cachedJSON(`https://world.openfoodfacts.org/api/v2/product/${v}.json?fields=${FIELDS}`, 604800);
    if (j && j.status === 1 && j.product) { const r = fromOFF(j.product, v); if (r) return r; }
  }
  const u = await cachedJSON(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${env.USDA_API_KEY || 'DEMO_KEY'}&query=${normCode(code).replace(/^0+/, '')}&dataType=Branded&pageSize=3`, 604800);
  const hit = ((u && u.foods) || []).find((x) => x.gtinUpc && codeVariants(code).includes(normCode(x.gtinUpc)));
  return hit ? fromUSDA(hit) : null;
}
const nameKey = (r) => toks((r.n && (r.n.en || r.n.es || r.n.pt)) || '').sort().join(' ') + '|' + toks(r.b || '').join(' ');
export async function handleFoods(path, req, env, json, h) {
  const u = new URL(req.url); const lang = (u.searchParams.get('lang') || 'es').slice(0, 2); const cc = (u.searchParams.get('cc') || '').toLowerCase().slice(0, 20);
  if (path === '/foods/search') {
    const q = (u.searchParams.get('q') || '').slice(0, 80).trim(); if (q.length < 2) return json({ items: [] }, 200, h);
    let items = await searchKV(env, q, lang, cc); let live = false;
    if (items.length < 6) { live = true; const seen = new Set(items.map((r) => r.bc || r.i)); const keys = new Set(items.map(nameKey));
      for (const r of await liveSearch(env, q, lang)) { if (seen.has(r.bc || r.i) || keys.has(nameKey(r))) continue; seen.add(r.bc || r.i); keys.add(nameKey(r)); items.push(r); } }
    return json({ items: items.slice(0, 25), live, attribution: 'Open Food Facts (ODbL) · USDA FoodData Central' }, 200, { ...h, 'Cache-Control': 'public, max-age=3600' });
  }
  if (path === '/foods/barcode') {
    const code = (u.searchParams.get('code') || '').replace(/\D/g, ''); if (!/^\d{6,14}$/.test(code)) return json({ error: 'bad code' }, 400, h);
    let item = await barcodeKV(env, code); if (!item) item = await liveBarcode(env, code);
    return item ? json({ item, attribution: 'Open Food Facts (ODbL) · USDA FoodData Central' }, 200, h) : json({ error: 'not_found' }, 404, h);
  }
  if (path === '/foods/meta') { const m = await meta(env); const { sizes, ...rest } = m; return json(rest, 200, h); }
  return json({ error: 'not found' }, 404, h);
}
/** Reporte de datos erróneos: se guarda 180 días en KV para la cola de revisión. Sin datos personales. */
export async function foodReport(b, env, json, h) {
  const reason = ['kcal', 'macros', 'portion', 'dup', 'name', 'other', 'ai'].includes(b.reason) ? b.reason : null; const id = String(b.id || '').slice(0, 40);
  if (!reason || !id) return json({ error: 'bad report' }, 400, h);
  const rec = { id, reason, name: String(b.name || '').replace(/[<>]/g, '').slice(0, 80), value: String(b.value || '').replace(/[<>]/g, '').slice(0, 120), at: new Date().toISOString() };
  try { await env.FOODS.put(`r:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`, JSON.stringify(rec), { expirationTtl: 180 * 86400 }); } catch { return json({ error: 'busy' }, 503, h); }
  return json({ ok: true }, 200, h);
}

/** Validación de un producto aportado por un usuario (por 100 g). Devuelve el registro o un error. */
export function checkContribution(b) {
  const code = normCode(String(b.code || '').replace(/\D/g, '')); if (!/^\d{8,14}$/.test(code)) return { err: 'code' };
  const name = String(b.name || '').replace(/[<>]/g, '').trim().slice(0, 70); if (name.length < 2 || /(http|www\.|@)/i.test(name)) return { err: 'name' };
  const num = (v, max) => { const x = +String(v ?? '').replace(',', '.'); return x >= 0 && x <= max ? Math.round(x * 10) / 10 : NaN; };
  const k = num(b.k, 950), p = num(b.p, 100), c = num(b.c, 100), f = num(b.f, 100);
  if ([k, p, c, f].some(isNaN) || p + c + f > 101) return { err: 'nums' };
  if (Math.abs(k - (4 * p + 4 * c + 9 * f)) > Math.max(60, 0.35 * k)) return { err: 'nums' };
  const brand = String(b.brand || '').replace(/[<>]/g, '').trim().slice(0, 40);
  const lang = ['es', 'en', 'pt'].includes(b.lang) ? b.lang : 'es';
  return { rec: { i: 'user:' + code, bc: code, n: { [lang]: name }, b: brand || undefined, k: Math.round(k), p, c, f, s: 'user', v: 0, q: 30, at: new Date().toISOString().slice(0, 10) } };
}
const chits = new Map();
/** POST /foods/contribute: el producto queda disponible al momento para todos (marcado «de usuarios», sin sello) y en la cola del fundador. */
export async function foodContribute(b, req, env, json, h) {
  const ip = req.headers.get('CF-Connecting-IP') || 'x'; const day = new Date().toISOString().slice(0, 10); const key = ip + day; const n = chits.get(key) || 0;
  if (n >= 10) return json({ error: 'rate' }, 429, h); chits.set(key, n + 1); if (chits.size > 5000) chits.clear();
  const { rec, err } = checkContribution(b); if (err) return json({ error: err }, 400, h);
  if (await barcodeKV(env, rec.bc)) return json({ ok: true, exists: true }, 200, h);
  try { await env.FOODS.put('ub:' + rec.bc, JSON.stringify(rec), { metadata: { n: Object.values(rec.n)[0], k: rec.k } }); } catch { return json({ error: 'busy' }, 503, h); }
  return json({ ok: true, item: rec }, 200, h);
}
/** Cola del fundador: reportes de alimentos e IA (r:) y aportes de usuarios (ub:). Requiere x-founder-key. */
export async function foodQueue(path, b, req, env, json, h) {
  if (!env.FOUNDER_KEY || req.headers.get('x-founder-key') !== env.FOUNDER_KEY) return json({ error: 'auth' }, 401, h);
  if (path === '/foods/queue') {
    const [r, u] = await Promise.all([env.FOODS.list({ prefix: 'r:', limit: 100 }), env.FOODS.list({ prefix: 'ub:', limit: 100 })]);
    const reports = []; for (const k of r.keys.slice(-50)) { const v = await env.FOODS.get(k.name); if (v) reports.push({ key: k.name, ...JSON.parse(v) }); }
    return json({ reports, contributions: u.keys.map((k) => ({ key: k.name, ...(k.metadata || {}) })) }, 200, h);
  }
  if (path === '/foods/queue/delete') { const k = String(b.key || ''); if (!/^(r|ub):/.test(k)) return json({ error: 'bad' }, 400, h); await env.FOODS.delete(k); return json({ ok: true }, 200, h); }
  return json({ error: 'not found' }, 404, h);
}
