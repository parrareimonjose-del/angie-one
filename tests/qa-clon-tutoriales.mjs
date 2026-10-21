// QA: pantalla de logo (splash), tutoriales y Clon IA. Chromium (escritorio móvil) + WebKit (iPhone). ES + EN.
import { chromium, webkit, devices } from '/workspace/e2e/node_modules/playwright-core/index.mjs';
const BASE = process.env.BASE || 'http://localhost:8797/angie-one'; const OUT = '/workspace/calorias/mvp-capturas/';
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const st = (w) => ({ aiEnabled: true, entries: [], water: {}, challengeDays: [], aiPhotos: {}, founder: {}, langOverride: null, trialStart: Date.now() - 3600e3, profile: { goal: 'lose', weight: 84, height: 168, age: 45, sex: 'female', activity: 2 }, ext: { weights: w } });
for (const [eng, name] of [[chromium, 'chromium'], [webkit, 'webkit']]) {
  const b = await eng.launch(name === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
  for (const lang of ['es', 'en']) {
    const L = lang === 'es'; const tag = `${name}-${lang}`;
    const base = name === 'webkit' ? { ...devices['iPhone 13'] } : { viewport: { width: 400, height: 860 } };
    const ctx = await b.newContext({ ...base, locale: L ? 'es-ES' : 'en-US' });
    await ctx.addInitScript((s) => { if (!localStorage.getItem('angieone:v1')) localStorage.setItem('angieone:v1', JSON.stringify(s)); }, st([{ date: '2026-10-01', kg: 84 }]));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const sent = []; await p.route('**/clone', async (r) => { sent.push(r.request().postData() || ''); if (lang === 'en' && name === 'chromium') return r.abort(); return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ skin: '#C68C69', hair: '#3C281E', hairLen: 'medium', shoulders: 1.02, hips: 1.04 }) }); });
    const others = []; p.on('request', (r) => { const u = r.url(); if (!u.startsWith('http://localhost') && (r.postData() || '').length > 20000 && !u.endsWith('/clone')) others.push(u); });
    const shot = (n) => p.screenshot({ path: `${OUT}${n}-${tag}.png` });
    const has = async (t) => (await p.getByText(t, { exact: false }).count()) > 0;
    // Splash
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(700);
    ok(`${tag} splash visible`, await p.getByTestId('splash').count() > 0); await shot('splash');
    await p.waitForTimeout(1800); ok(`${tag} splash closes ~1.5s`, await p.getByTestId('splash').count() === 0);
    await p.evaluate(() => sessionStorage.clear()); await p.reload(); await p.waitForTimeout(400);
    await p.getByTestId('splash').click({ force: true }); await p.waitForTimeout(500); ok(`${tag} splash skippable`, await p.getByTestId('splash').count() === 0);
    await p.reload(); await p.waitForTimeout(500); ok(`${tag} splash once per session`, await p.getByTestId('splash').count() === 0);
    await p.emulateMedia({ reducedMotion: 'reduce' }); await p.evaluate(() => sessionStorage.clear()); await p.reload(); await p.waitForTimeout(1400);
    ok(`${tag} reduced motion closes`, await p.getByTestId('splash').count() === 0);
    ok(`${tag} home sin clon (escondido)`, await p.getByTestId('clone-nudge').count() === 0);
    // Tutoriales
    await p.goto(BASE + '/more', { waitUntil: 'networkidle' }); await p.waitForTimeout(500); ok(`${tag} more has tutorials`, await p.getByTestId('more-tut').count() > 0);
    await p.getByTestId('more-tut').click(); await p.waitForTimeout(800);
    ok(`${tag} 11 tutorials sin clon`, await p.locator('[data-testid^="tut-"]').count() === 11 && await p.getByTestId('tut-clone').count() === 0); await shot('tutorial-lista');
    await p.getByTestId('tut-photo').click(); await p.waitForTimeout(800); ok(`${tag} big play`, await p.getByTestId('tut-play').count() > 0); await shot('tutorial-play');
    await p.getByTestId('tut-play').click(); await p.waitForTimeout(1800);
    ok(`${tag} caption step1`, await has(L ? 'Toca Escanear abajo' : 'Tap Scan at the bottom')); await shot('tutorial-paso1');
    await p.getByTestId('tut-pause').click(); await p.waitForTimeout(5500); ok(`${tag} pause holds`, await has(L ? 'Toca Escanear abajo' : 'Tap Scan at the bottom'));
    await p.getByTestId('tut-pause').click(); await p.waitForTimeout(4500); ok(`${tag} auto-advance`, await has(L ? 'Toma una foto de tu plato' : 'Take a photo of your plate'));
    await p.getByLabel(L ? 'Siguiente' : 'Next').click(); await p.waitForTimeout(300); await p.getByLabel(L ? 'Siguiente' : 'Next').click(); await p.waitForTimeout(600);
    ok(`${tag} done`, await has(L ? '¡Listo! Ahora pruébalo tú.' : 'Done! Now try it yourself.')); await shot('tutorial-fin');
    // Clon IA
    // Clon escondido (CLONE_ENABLED=false): sin entrada en Más y /clon, /twin llevan a Inicio
    await p.goto(BASE + '/more', { waitUntil: 'networkidle' }); await p.waitForTimeout(500); ok(`${tag} más sin clon`, await p.getByTestId('more-clone').count() === 0);
    for (const r of ['/clon', '/twin']) { await p.goto(BASE + r, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200); ok(`${tag} ${r} → Inicio`, !/\/(clon|twin)$/.test(p.url()) && await p.getByTestId('cl-consent').count() === 0 && await p.getByTestId('twin').count() === 0, p.url()); }
    await p.goto(BASE + '/explore', { waitUntil: 'networkidle' }); await p.waitForTimeout(800); ok(`${tag} explorar sin gemelo`, !(await has(L ? 'Gemelo' : 'Twin')));
    ok(`${tag} no page errors`, errs.length === 0, errs.join(' | ').slice(0, 200));
    await ctx.close();
  }
  await b.close();
}
console.log(res.join('\n')); const f = res.filter((x) => x.startsWith('FAIL')).length; console.log(`\n${res.length - f}/${res.length} PASS`); process.exit(f ? 1 : 0);
