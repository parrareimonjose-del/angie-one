// QA: lista verificada (una entrada por alimento, «Verificado ✓» primero, reportar) + cobro honesto (aviso 1 día antes,
// cancelar en 2 toques, restaurar compra, máx 1 aviso Premium por sesión, Premium sin anuncios) + rachas opcionales.
// Chromium + WebKit (iPhone 14), ES + EN. Capturas mfp5-*-1x.png
import { chromium, webkit, devices } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8765/angie-one'; const OUT = '/workspace/calorias/mvp-capturas/';
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`); const D = 86400e3;
const runs = [['chromium', chromium, { viewport: { width: 400, height: 860 }, isMobile: true, hasTouch: true }], ['webkit', webkit, devices['iPhone 14']]];
for (const [bn, B, dev] of runs) {
  const b = await B.launch(bn === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : { executablePath: '/home/box/.cache/ms-playwright/webkit-2370/pw_run.sh' });
  for (const lang of ['es', 'en']) {
    const L = lang === 'es'; const tag = `${bn} ${lang}`; const shotOK = bn === 'chromium' || lang === 'es';
    const ctx = await b.newContext({ ...dev, locale: L ? 'es-ES' : 'en-US' });
    const state = { aiEnabled: true, entries: [], water: {}, challengeDays: [], aiPhotos: {}, founder: {}, langOverride: null, trialStart: Date.now() - 6.3 * D,
      profile: { goal: 'lose', weight: 80, height: 170, age: 62, sex: 'female', activity: 2 } };
    await ctx.addInitScript((s) => { if (!localStorage.getItem('angieone:v1')) localStorage.setItem('angieone:v1', JSON.stringify(s)); sessionStorage.setItem('angie:splash', '1'); }, state);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const go = async (r) => { await p.goto(BASE + r, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500); };
    const shot = (n) => shotOK ? p.screenshot({ path: `${OUT}mfp5-${bn === 'webkit' ? 'iphone-' : ''}${lang}-${n}.png` }) : null;
    const tid = (x) => p.getByTestId(x); const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('angieone:v1')));
    const setSt = (fn) => p.evaluate((f) => { const v = JSON.parse(localStorage.getItem('angieone:v1')); const n = (0, eval)(f)(v); localStorage.setItem('angieone:v1', JSON.stringify(n)); }, fn.toString());
    // Aviso 1 día antes del fin de prueba
    await go('/'); ok(`${tag} aviso fin de prueba`, await tid('bill-reminder').count() === 1); ok(`${tag} prueba: sin aviso Premium`, await tid('upsell').count() === 0);
    ok(`${tag} racha visible`, await tid('streak').count() === 1); await tid('bill-reminder').scrollIntoViewIfNeeded(); await shot('11-aviso-cobro');
    // Cancelar en 2 toques desde Ajustes
    await go('/settings'); await tid('go-sub').click(); await p.waitForTimeout(1000); ok(`${tag} mi suscripción`, p.url().includes('/subscription'));
    await tid('cancel-1').click(); await p.waitForTimeout(300); ok(`${tag} pasos de cancelar`, await tid('cancel-steps').count() === 1 && await tid('cancel-2').count() === 1);
    ok(`${tag} prueba sin tarjeta`, await tid('cancel-trial').count() === 1);
    await tid('restore').click(); await p.waitForTimeout(300); ok(`${tag} restaurar claro`, (await tid('restore-msg').textContent()).length > 20); await shot('12-cancelar-2-toques');
    // Rachas opcionales
    await go('/settings'); await tid('streak-toggle').click(); await p.waitForTimeout(300); ok(`${tag} rachas apagadas`, (await st()).streakOff === true);
    await go('/'); ok(`${tag} sin racha en inicio`, await tid('streak').count() === 0);
    // Lista verificada
    await go('/manual'); await p.getByLabel(L ? 'Buscar comida' : 'Search food', { exact: false }).first().fill(L ? 'arroz' : 'rice'); await p.waitForTimeout(400);
    const rows = await tid('food-row').count(); ok(`${tag} una entrada por alimento`, rows >= 1, String(rows));
    ok(`${tag} badge verificado`, await tid('verified').count() >= 1); await tid('report').first().click(); await p.getByRole('button', { name: L ? 'Calorías mal' : 'Wrong calories' }).click(); await p.waitForTimeout(300);
    ok(`${tag} reporte guardado`, (await st()).reports?.length === 1 && await tid('reported').count() === 1); await shot('13-verificado');
    // Propio duplicado no crea entrada nueva
    await setSt((v) => ({ ...v, myFoods: [{ id: 'u1', key: '', name: 'Arroz blanco', portion: '1', kcal: 999, p: 0, c: 0, f: 0, verified: false, source: 'user' }, { id: 'u2', key: '', name: 'Arepa de la abuela', portion: '1', kcal: 300, p: 0, c: 0, f: 0, verified: false, source: 'user' }] }));
    await go('/manual'); await p.getByLabel(L ? 'Buscar comida' : 'Search food', { exact: false }).first().fill('arepa'); await p.waitForTimeout(400);
    const txt = await p.locator('body').textContent(); ok(`${tag} propio sin verificar al final`, await tid('unverified').count() === 1 && txt.indexOf('abuela') > txt.indexOf(L ? 'Verificado' : 'Verified'));
    await go('/manual'); await p.getByLabel(L ? 'Buscar comida' : 'Search food', { exact: false }).first().fill(L ? 'arroz blanco' : 'white rice'); await p.waitForTimeout(400);
    ok(`${tag} duplicado fusionado`, !(await p.locator('body').textContent()).includes('999'));
    // Fin de prueba: 1 aviso por sesión; anuncios solo gratis
    await setSt((v) => ({ ...v, trialStart: Date.now() - 30 * 86400e3 }));
    await go('/'); ok(`${tag} gratis: 1 aviso Premium`, await tid('upsell').count() === 1); await shot('14-un-aviso');
    await go('/'); ok(`${tag} no se repite en la sesión`, await tid('upsell').count() === 0);
    await go('/recipes'); ok(`${tag} gratis ve anuncio`, await tid('sponsored').count() >= 1);
    await setSt((v) => ({ ...v, sub: { active: true, plan: 'yearly', renewAt: Date.now() + 0.5 * 86400e3, provider: 'stripe' } }));
    await p.evaluate(() => sessionStorage.removeItem('angie:upsell'));
    await go('/recipes'); ok(`${tag} Premium sin anuncios`, await tid('sponsored').count() === 0);
    await go('/'); ok(`${tag} Premium sin aviso de venta`, await tid('upsell').count() === 0); ok(`${tag} aviso de renovación`, (await tid('bill-reminder').textContent()).length > 10);
    await go('/paywall'); ok(`${tag} restaurar en pago`, await tid('pay-restore').count() === 1);
    ok(`${tag} sin errores de página`, errs.length === 0, errs.join('|').slice(0, 300));
    await ctx.close();
  }
  await b.close();
}
console.log(res.join('\n')); const np = res.filter((r) => r.startsWith('PASS')).length; console.log(`${np}/${res.length}`); if (np !== res.length) process.exitCode = 1;
