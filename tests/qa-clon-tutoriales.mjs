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
    ok(`${tag} home clone nudge`, await p.getByTestId('clone-nudge').count() > 0);
    // Tutoriales
    await p.goto(BASE + '/more', { waitUntil: 'networkidle' }); await p.waitForTimeout(500); ok(`${tag} more has tutorials`, await p.getByTestId('more-tut').count() > 0);
    await p.getByTestId('more-tut').click(); await p.waitForTimeout(800);
    ok(`${tag} 12 tutorials`, await p.locator('[data-testid^="tut-"]').count() === 12); await shot('tutorial-lista');
    await p.getByTestId('tut-photo').click(); await p.waitForTimeout(800); ok(`${tag} big play`, await p.getByTestId('tut-play').count() > 0); await shot('tutorial-play');
    await p.getByTestId('tut-play').click(); await p.waitForTimeout(1800);
    ok(`${tag} caption step1`, await has(L ? 'Toca Escanear abajo' : 'Tap Scan at the bottom')); await shot('tutorial-paso1');
    await p.getByTestId('tut-pause').click(); await p.waitForTimeout(5500); ok(`${tag} pause holds`, await has(L ? 'Toca Escanear abajo' : 'Tap Scan at the bottom'));
    await p.getByTestId('tut-pause').click(); await p.waitForTimeout(4500); ok(`${tag} auto-advance`, await has(L ? 'Toma una foto de tu plato' : 'Take a photo of your plate'));
    await p.getByLabel(L ? 'Siguiente' : 'Next').click(); await p.waitForTimeout(300); await p.getByLabel(L ? 'Siguiente' : 'Next').click(); await p.waitForTimeout(600);
    ok(`${tag} done`, await has(L ? '¡Listo! Ahora pruébalo tú.' : 'Done! Now try it yourself.')); await shot('tutorial-fin');
    // Clon IA
    await p.goto(BASE + '/clon', { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
    ok(`${tag} consent unchecked`, (await p.getByTestId('cl-consent').getAttribute('aria-checked')) === 'false'); await shot('clon-1-permiso');
    await p.getByTestId('cl-start').click(); await p.waitForTimeout(300); ok(`${tag} blocked without consent`, await has(L ? 'Marca las dos casillas' : 'Check both boxes'));
    await p.getByTestId('cl-consent').click(); await p.getByTestId('cl-adult').click(); await p.getByTestId('cl-start').click(); await p.waitForTimeout(600);
    ok(`${tag} face guide`, await p.getByTestId('guide-faceFront').count() > 0); await shot('clon-2-guia-cara');
    const pick = async (f) => { const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.getByText(L ? 'Elegir una foto' : 'Choose a photo').click()]); await fc.setFiles(f); await p.waitForTimeout(1200); };
    await pick('/tmp/face.jpg'); ok(`${tag} step2`, await p.getByTestId('guide-faceLeft').count() > 0);
    await p.getByTestId('cl-skip').click(); await p.getByTestId('cl-skip').click(); await p.waitForTimeout(300);
    ok(`${tag} body guide`, await p.getByTestId('guide-bodyFront').count() > 0); await shot('clon-3-guia-cuerpo');
    ok(`${tag} body front not skippable`, await p.getByTestId('cl-skip').count() === 0);
    await pick('/tmp/body.jpg'); await p.getByTestId('cl-skip').click(); await p.getByTestId('cl-skip').click(); await p.waitForTimeout(500);
    await shot('clon-4-revisar'); await p.getByTestId('cl-build').click(); await p.waitForTimeout(2500);
    ok(`${tag} clone built`, await p.getByTestId('clone').count() > 0); await shot('clon-5-antes-ahora-meta');
    const fb = lang === 'en' && name === 'chromium';
    ok(`${tag} ${fb ? 'fallback local' : 'AI traits'}`, await has(fb ? 'Made on your phone' : (L ? 'Hecho con IA' : 'Made with AI')));
    ok(`${tag} only 2 photos sent`, sent.length === 1 && (() => { const j = JSON.parse(sent[0]); return Object.keys(j).sort().join() === 'body,face,lang'; })());
    ok(`${tag} no other uploads`, others.length === 0, others.join());
    const kgNow1 = await p.getByTestId('cl-kg-now').innerText();
    // Bajar de peso → el clon cambia
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('angieone:v1')); s.ext.weights.push({ date: '2026-10-15', kg: 79 }); localStorage.setItem('angieone:v1', JSON.stringify(s)); });
    await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    const kgNow2 = await p.getByTestId('cl-kg-now').innerText(); ok(`${tag} morph on weight`, kgNow1 !== kgNow2 && /79/.test(kgNow2), `${kgNow1}→${kgNow2}`);
    ok(`${tag} diff text`, await has(L ? 'Bajaste 5 kg' : 'You lost 5 kg')); await shot('clon-6-bajo-peso');
    await p.getByText(L ? 'Lado' : 'Side', { exact: true }).click(); await p.waitForTimeout(300); await shot('clon-7-lado');
    ok(`${tag} stored only locally`, await p.evaluate(() => !!localStorage.getItem('angieone:clone') && !localStorage.getItem('angieone:v1').includes('base64')));
    await p.getByTestId('cl-del').click(); await p.getByTestId('cl-del-yes').click(); await p.waitForTimeout(500);
    ok(`${tag} delete`, await p.evaluate(() => !localStorage.getItem('angieone:clone')) && await p.getByTestId('cl-consent').count() > 0);
    ok(`${tag} no page errors`, errs.length === 0, errs.join(' | ').slice(0, 200));
    await ctx.close();
  }
  await b.close();
}
console.log(res.join('\n')); const f = res.filter((x) => x.startsWith('FAIL')).length; console.log(`\n${res.length - f}/${res.length} PASS`); process.exit(f ? 1 : 0);
