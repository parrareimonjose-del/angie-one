// QA "sin lenguaje médico" (Google Play cuenta personal: Salud y fitness, no Medical). ES + EN. Capturas sin-medico-*.png
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8765/angie-one'; const OUT = '/workspace/calorias/mvp-capturas/';
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const BAD = /diabet|cel[ií]ac|celiac|hipertens|hypertens|presi[oó]n alta|blood pressure|colesterol|cholesterol|embarazo|pregnan|fisioterap|physiother|physio|informe m[eé]dico|doctor report|para (mi|el) m[eé]dico|for (my|your) doctor|diagn[oó]stic(?!o m)|lesi[oó]n|injur/i;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const lang of ['es', 'en']) {
  const L = lang === 'es'; const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, locale: L ? 'es-ES' : 'en-US' });
  const state = { aiEnabled: true, entries: [{ id: 'e1', date: new Date().toISOString().slice(0, 10), time: 1, name: 'Arroz', kcal: 400, p: 1, c: 1, f: 1, source: 'manual' }], water: {}, challengeDays: [], aiPhotos: {}, founder: {}, langOverride: null, trialStart: Date.now() - 3600e3,
    profile: { goal: 'lose', weight: 80, height: 170, age: 40, sex: 'female', activity: 2 }, ext: { modes: ['diabetes', 'hypertension', 'pregnancy'] } };
  await ctx.addInitScript((s) => { if (!localStorage.getItem('angieone:v1')) localStorage.setItem('angieone:v1', JSON.stringify(s)); }, state);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const go = async (r) => { await p.goto(BASE + r, { waitUntil: 'networkidle' }); await p.waitForTimeout(700); };
  const shot = (n) => p.screenshot({ path: `${OUT}sin-medico-${lang}-${n}.png`, fullPage: true });
  const body = () => p.evaluate(() => document.body.innerText);
  const clean = async (n) => { const t = await body(); const m = t.match(BAD); ok(`${lang} ${n} sin médico`, !m, m ? m[0] : ''); return t; };
  await go('/health'); let t = await clean('preferencias');
  ok(`${lang} preferencias neutras`, /Sin gluten|Gluten-free/.test(t) && /Menos azúcar|Less sugar/.test(t) && /No es consejo médico|Not medical advice/.test(t));
  ok(`${lang} migración diabetes→menos azúcar`, await p.getByTestId('mode-lesssugar').count() > 0); await shot('01-preferencias');
  await go('/report'); t = await clean('resumen'); ok(`${lang} resumen bienestar`, /resumen personal de bienestar|personal wellness summary/i.test(t) && /no es consejo médico|not medical advice/i.test(t)); await shot('02-resumen');
  await go('/coach-setup'); t = await clean('coach'); await shot('03-coach');
  await go('/memory'); await p.getByPlaceholder(L ? 'Ejemplo: no me gusta la berenjena' : /eggplant/i).fill(L ? 'soy celíaca' : 'I am celiac'); await p.getByRole('button', { name: /Añadir|Add/ }).first().click(); await p.waitForTimeout(300);
  t = await clean('memoria'); ok(`${lang} memoria neutra`, /sin gluten/i.test(t)); await shot('04-memoria');
  await go('/fasting'); t = await body(); ok(`${lang} ayuno adulto disponible`, !/menores de 18|under 18/.test(t)); await shot('05-ayuno');
  await go('/legal?doc=medical'); await shot('06-legal'); t = await body(); ok(`${lang} legal disclaimer`, /No es consejo médico|Not medical advice/.test(t)); ok(`${lang} aviso dolor`, /si sientes dolor|if you feel pain/i.test(t));
  for (const r of ['/', '/explore', '/more', '/coach', '/gym', '/market']) { await go(r); await clean(r); }
  ok(`${lang} sin errores js`, !errs.length, errs.join(' | ').slice(0, 200)); await ctx.close();
}
await b.close(); console.log(res.join('\n')); const f = res.filter((r) => r.startsWith('FAIL')).length; console.log(`\n${res.length - f}/${res.length} OK`); process.exit(f ? 1 : 0);
