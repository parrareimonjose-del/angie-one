// Capturas de TODAS las pantallas en claro y oscuro + collages. Uso: BASE=... node tests/cap-rediseno.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://127.0.0.1:8812/angie-one';
const OUT = process.env.OUT || '/workspace/calorias/rediseno/final/';
const LANG = process.env.LANG_UI || 'es';
fs.mkdirSync(OUT, { recursive: true });
const routes = (process.env.ROUTES ? process.env.ROUTES.split(',') : fs.readdirSync(new URL('../app/', import.meta.url)).filter((f) => f.endsWith('.tsx') && !f.startsWith('_')).map((f) => f.replace('.tsx', '')).sort());
const now = Date.now(); const d = (n) => { const x = new Date(now - n * 864e5); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const state = { aiEnabled: true, water: { [d(0)]: 5 }, challengeDays: [d(1), d(2), d(3)], aiPhotos: {}, founder: {}, langOverride: null, trialStart: process.env.LOCKED ? now - 40 * 864e5 : now - 3600e3,
  entries: [{ id: 'e1', date: d(0), name: LANG === 'es' ? 'Arepa con queso' : 'Arepa with cheese', kcal: 320, p: 12, c: 38, f: 13, meal: 'breakfast', time: '08:10' }, { id: 'e2', date: d(0), name: LANG === 'es' ? 'Ensalada de pollo' : 'Chicken salad', kcal: 450, p: 38, c: 20, f: 22, meal: 'lunch', time: '13:20' }],
  profile: { goal: 'lose', weight: 80, height: 170, age: 45, sex: 'female', activity: 2, name: 'José' },
  ext: { weights: [{ date: d(28), kg: 82 }, { date: d(21), kg: 81.4 }, { date: d(14), kg: 80.8 }, { date: d(10), kg: 80.3 }, { date: d(6), kg: 79.9 }, { date: d(2), kg: 79.5 }], sleep: [{ date: d(1), h: 6, stress: 3 }, { date: d(2), h: 8, stress: 2 }] } };
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const errs = [];
for (const scheme of (process.env.SCHEMES || 'light,dark').split(',')) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: LANG === 'es' ? 'es-ES' : LANG === 'ar' ? 'ar' : 'en-US', colorScheme: scheme });
  await ctx.addInitScript((s) => { sessionStorage.setItem('angie:splash', '1'); if (!localStorage.getItem('angieone:v1')) localStorage.setItem('angieone:v1', JSON.stringify(s)); }, state);
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(`${scheme} ${p.url()} ${e.message}`));
  for (const r of routes) {
    await p.goto(`${BASE}/${r === 'index' ? '' : r}`, { waitUntil: 'networkidle' }).catch(() => {});
    await p.waitForTimeout(1300);
    await p.screenshot({ fullPage: !!process.env.FULL, path: `${OUT}${process.env.PREFIX || ''}${scheme}-${r}.png` });
  }
  await ctx.close();
}
await b.close();
fs.writeFileSync(OUT + 'errores.txt', errs.join('\n'));
console.log('rutas', routes.length, 'errores', errs.length); errs.slice(0, 20).forEach((e) => console.log(e));
