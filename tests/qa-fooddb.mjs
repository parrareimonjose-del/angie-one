// QA: base grande de alimentos (Worker /foods/* en vivo) + copia en la nube cifrada (activar, restaurar en perfil nuevo, borrar todo).
// Chromium (Android) + WebKit (iPhone 14), ES + EN. Capturas fooddb-*.png
import { chromium, webkit, devices } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8765/angie-one'; const OUT = '/workspace/calorias/mvp-capturas/';
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const runs = [['chromium', chromium, { viewport: { width: 400, height: 860 }, isMobile: true, hasTouch: true }], ['webkit', webkit, devices['iPhone 14']]];
for (const [bn, B, dev] of runs) {
  const b = await B.launch(bn === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : { executablePath: '/home/box/.cache/ms-playwright/webkit-2370/pw_run.sh' });
  for (const lang of ['es', 'en']) {
    const L = lang === 'es'; const tag = `${bn} ${lang}`; const shotOK = bn === 'chromium' || lang === 'es';
    const mk = async (state) => { const ctx = await b.newContext({ ...dev, locale: L ? 'es-ES' : 'en-US' });
      await ctx.addInitScript((s) => { if (s && !localStorage.getItem('angieone:v1')) localStorage.setItem('angieone:v1', JSON.stringify(s)); sessionStorage.setItem('angie:splash', '1'); }, state);
      const p = await ctx.newPage(); p.on('dialog', (d) => d.accept()); return { ctx, p }; };
    const mark = `QA-${bn}-${lang}-${Date.now()}`;
    const state = { aiEnabled: true, water: {}, challengeDays: [], aiPhotos: {}, founder: {}, langOverride: null, trialStart: Date.now() - 3600e3,
      profile: { goal: 'lose', weight: 77, height: 168, age: 55, sex: 'female', activity: 2 },
      entries: [{ id: 'e1', date: '2026-10-15', time: Date.now(), name: mark, kcal: 333, p: 10, c: 40, f: 9, fiber: 5, source: 'manual' }] };
    const { ctx, p } = await mk(state); const errs = []; p.on('pageerror', (e) => { if (!/openfoodfacts\.org.*access control checks/.test(e.message)) errs.push(e.message); });
    const go = async (pg, r) => { await pg.goto(BASE + r, { waitUntil: 'networkidle' }); await pg.waitForTimeout(1500); };
    const shot = (pg, n) => shotOK ? pg.screenshot({ path: `${OUT}fooddb-${bn === 'webkit' ? 'iphone-' : ''}${lang}-${n}.png` }) : null;
    const st = (pg) => pg.evaluate(() => JSON.parse(localStorage.getItem('angieone:v1') || 'null'));
    // 1) Búsqueda en la base grande
    await go(p, '/manual'); const box = p.getByPlaceholder(L ? /Buscar|buscar/ : /Search|search/).first();
    await box.fill('arepa'); await p.getByTestId('food-attrib').waitFor({ timeout: 20000 }).catch(() => {});
    let rows = await p.getByTestId('food-row').count(); ok(`${tag} arepa: resultados de la nube`, rows >= 5 && await p.getByTestId('food-attrib').count() === 1, `rows=${rows}`);
    ok(`${tag} verificados primero`, (await p.getByTestId('food-row').first().textContent()).match(/Verificado|Verified/) != null);
    await shot(p, '01-buscar-arepa');
    await box.fill(L ? 'pechuga de pollo' : 'chicken breast'); await p.waitForTimeout(600); await p.getByTestId('food-attrib').waitFor({ timeout: 20000 }).catch(() => {});
    const t1 = await p.getByTestId('food-row').first().textContent(); ok(`${tag} pollo multilingüe`, /pollo|chicken/i.test(t1) && /USDA|Angie/.test(t1), t1.slice(0, 60));
    await shot(p, '02-buscar-pollo');
    await p.getByTestId('food-row').first().locator('[role=button]').first().click(); await p.waitForTimeout(800);
    ok(`${tag} añadir desde la nube`, (await st(p)).entries.length === 2);
    // 2) Código de barras desde la base (con fibra)
    await go(p, '/barcode'); await p.getByPlaceholder('7501055363063').fill('737628064502'); await p.getByText(/🔎/).first().click();
    await p.getByTestId('bar-attrib').waitFor({ timeout: 20000 }).catch(() => {});
    ok(`${tag} código encontrado`, await p.getByTestId('bar-attrib').count() === 1); await shot(p, '03-codigo');
    // 3) Copia en la nube
    await p.evaluate(() => localStorage.setItem('angieone:clone', JSON.stringify({ photos: ['data:image/png;base64,SECRETO'] })));
    await go(p, '/backup'); await p.getByTestId('bk-on').click(); await p.waitForTimeout(300);
    const code = (await p.getByTestId('bk-code').textContent()).trim(); ok(`${tag} código de recuperación`, /^[A-Z2-9]{4}(-[A-Z2-9]{4}){4}$/.test(code), code.slice(0, 4) + '…');
    await shot(p, '04-codigo-recuperacion');
    await p.getByTestId('bk-saved').click(); await p.getByTestId('bk-last').waitFor({ timeout: 25000 }).catch(() => {});
    ok(`${tag} copia hecha`, await p.getByTestId('bk-last').count() === 1 && await p.getByTestId('bk-code').count() === 0); await shot(p, '05-copia-activa');
    // 4) Restaurar en perfil nuevo (teléfono nuevo)
    const n = await mk(null); await go(n.p, '/backup'); await n.p.getByTestId('bk-rc').fill(code.toLowerCase()); await n.p.getByTestId('bk-restore').click();
    await n.p.getByTestId('bk-home').waitFor({ timeout: 25000 }).catch(() => {});
    const ns = await st(n.p); ok(`${tag} restaurado en perfil nuevo`, !!ns && ns.entries.some((e) => e.name === mark && e.fiber === 5) && ns.profile?.weight === 77);
    ok(`${tag} fotos del clon NO viajan`, await n.p.evaluate(() => localStorage.getItem('angieone:clone')) === null);
    await shot(n.p, '06-restaurado'); await n.ctx.close();
    // 5) Borrar todo de la nube
    await go(p, '/backup'); await p.getByTestId('bk-del').click(); await p.getByTestId('bk-msg').waitFor({ timeout: 20000 }).catch(() => {});
    ok(`${tag} borrado de la nube`, (await st(p)).sync === undefined && await p.getByTestId('bk-on').count() === 1);
    const m = await mk(null); await go(m.p, '/backup'); await m.p.getByTestId('bk-rc').fill(code); await m.p.getByTestId('bk-restore').click();
    await m.p.getByTestId('bk-err').waitFor({ timeout: 20000 }).catch(() => {});
    for (let i = 0; i < 4 && !(await m.p.getByTestId('bk-err').count()); i++) { await m.ctx.close(); await new Promise((r) => setTimeout(r, 20000)); Object.assign(m, await mk(null)); await go(m.p, '/backup'); await m.p.getByTestId('bk-rc').fill(code); await m.p.getByTestId('bk-restore').click(); await m.p.getByTestId('bk-err').waitFor({ timeout: 20000 }).catch(() => {}); } /* KV de Cloudflare: el borrado tarda ≤60 s en todas las regiones */
    ok(`${tag} tras borrar ya no se puede restaurar`, await m.p.getByTestId('bk-err').count() === 1); await m.ctx.close();
    ok(`${tag} sin errores de página`, errs.length === 0, errs.join(' | ').slice(0, 200));
    await ctx.close();
  }
  await b.close();
}
console.log(res.join('\n')); const f = res.filter((x) => x.startsWith('FAIL')).length; console.log(`\n${res.length - f}/${res.length} PASS`); process.exit(f ? 1 : 0);
