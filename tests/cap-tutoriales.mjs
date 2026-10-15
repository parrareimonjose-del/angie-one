// Captura pantallas reales para los tutoriales (assets/tutoriales/<lang>-<id>.jpg).
import { chromium } from 'playwright-core';
import { execSync } from 'child_process';
const BASE = process.env.BASE || 'http://localhost:8797/angie-one';
const R = { photo: '/scan', voice: '/voice', barcode: '/barcode', coach: '/coach', plan: '/diet', gym: '/gym', weight: '/weight', chef: '/chef', menu: '/menu', datos: '/datos', security: '/security', clone: '/clon' };
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const lang of ['es', 'en']) {
  const ctx = await b.newContext({ viewport: { width: 420, height: 880 }, locale: lang === 'es' ? 'es-ES' : 'en-US' });
  const st = { aiEnabled: true, entries: [], water: {}, challengeDays: [], aiPhotos: {}, founder: {}, langOverride: null, trialStart: Date.now() - 3600e3, profile: { goal: 'lose', weight: 82, height: 168, age: 45, sex: 'female', activity: 2 }, ext: { weights: [{ date: '2026-09-20', kg: 84 }, { date: '2026-10-01', kg: 83.1 }, { date: '2026-10-12', kg: 82 }] } };
  await ctx.addInitScript((s) => { localStorage.setItem('angieone:v1', JSON.stringify(s)); sessionStorage.setItem('angie:splash', '1'); }, st);
  const p = await ctx.newPage();
  for (const [id, r] of Object.entries(R)) {
    await p.goto(BASE + r + '?nosplash=1', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
    const f = `/tmp/tut-${lang}-${id}.png`; await p.screenshot({ path: f });
    execSync(`python3 -c "from PIL import Image;Image.open('${f}').convert('RGB').resize((315,660)).save('assets/tutoriales/${lang}-${id}.jpg',quality=72)"`);
  }
  await ctx.close();
}
await b.close(); console.log('ok');
