// QA web de las 5 funciones tipo MyFitnessPal: metas de macros (día y comida) con anillos, salud (import export.xml + "en la app del teléfono"),
// copiar comidas a varios días y añadir rápido, preparación semanal + lista de compras, carbohidratos netos y hora editable.
// Chromium (Android) + WebKit (iPhone 14), ES + EN. Capturas mfp5-*.png
import { chromium, webkit, devices } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8765/angie-one'; const OUT = '/workspace/calorias/mvp-capturas/';
const XML = '/workspace/e2e/fixtures/export.xml';
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const runs = [['chromium', chromium, { viewport: { width: 400, height: 860 }, isMobile: true, hasTouch: true }], ['webkit', webkit, devices['iPhone 14']]];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
for (const [bn, B, dev] of runs) {
  const b = await B.launch(bn === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : { executablePath: '/home/box/.cache/ms-playwright/webkit-2370/pw_run.sh' });
  for (const lang of ['es', 'en']) {
    const L = lang === 'es'; const tag = `${bn} ${lang}`; const shotOK = bn === 'chromium' || lang === 'es';
    const ctx = await b.newContext({ ...dev, locale: L ? 'es-ES' : 'en-US', acceptDownloads: true });
    const td = new Date(); const d0 = iso(td); const at = (h, m = 0) => new Date(td.getFullYear(), td.getMonth(), td.getDate(), h, m).getTime();
    const state = { aiEnabled: true, water: {}, challengeDays: [], aiPhotos: {}, founder: {}, langOverride: null, trialStart: Date.now() - 3600e3,
      profile: { goal: 'lose', weight: 80, height: 170, age: 62, sex: 'female', activity: 2 },
      entries: [{ id: 'e1', date: d0, time: at(8, 10), name: L ? 'Avena con fruta' : 'Oatmeal with fruit', kcal: 350, p: 12, c: 60, f: 7, fiber: 8, source: 'manual' },
        { id: 'e2', date: d0, time: at(13, 30), name: L ? 'Arroz con pollo' : 'Chicken and rice', kcal: 620, p: 40, c: 70, f: 15, source: 'photo' }] };
    await ctx.addInitScript((s) => { if (!localStorage.getItem('angieone:v1')) localStorage.setItem('angieone:v1', JSON.stringify(s)); sessionStorage.setItem('angie:splash', '1'); }, state);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const go = async (r) => { await p.goto(BASE + r, { waitUntil: 'networkidle' }); await p.waitForTimeout(1800); };
    const shot = (n) => shotOK ? p.screenshot({ path: `${OUT}mfp5-${bn === 'webkit' ? 'iphone-' : ''}${lang}-${n}.png` }) : null;
    const tid = (x) => p.getByTestId(x); const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('angieone:v1')));
    // 1) Inicio: 3 anillos + netos
    await go('/'); ok(`${tag} 3 anillos`, await tid('ring-p').count() === 1 && await tid('ring-c').count() === 1 && await tid('ring-f').count() === 1);
    ok(`${tag} netos en inicio`, /\b122\b/.test(await tid('home-net').textContent()), await tid('home-net').textContent());
    await tid('macro-rings').scrollIntoViewIfNeeded(); await shot('01-inicio-anillos');
    // 1) Metas por día y comida
    await go('/macros'); await tid('g-p').fill('130'); await tid('g-c-plus').click(); await p.waitForTimeout(200);
    const kc = await tid('g-kcal').textContent(); ok(`${tag} kcal se recalcula`, /\d/.test(kc), kc);
    ok(`${tag} 4 comidas (premium)`, await tid('meal-goal-3').count() === 1);
    await tid('m0-p-plus').click(); await tid('g-net').click(); await tid('g-save').click(); await p.waitForTimeout(300);
    ok(`${tag} metas guardadas`, await tid('g-msg').count() === 1);
    let s = await st(); ok(`${tag} gramos en estado`, s.macros.day.p === 130 && s.macros.meals.length === 4 && s.macros.net === true);
    await shot('02-metas-macros'); await tid('meal-goal-0').scrollIntoViewIfNeeded(); await shot('03-metas-por-comida');
    await go('/'); ok(`${tag} anillo usa meta nueva`, (await tid('ring-p').textContent()).includes('130'));
    ok(`${tag} anillo de netos`, (await tid('ring-c').textContent()).includes(L ? 'netos' : 'Net'));
    // 3) Añadir rápido
    await go('/quickadd'); await tid('q-p').fill('20'); await tid('q-c').fill('30'); await tid('q-f').fill('10'); await p.waitForTimeout(150);
    ok(`${tag} rápido calcula 290`, (await tid('q-est').textContent()).includes('290')); await shot('04-anadir-rapido');
    await tid('q-add').click(); await p.waitForTimeout(300); ok(`${tag} rápido añadido`, await tid('q-msg').count() === 1);
    s = await st(); ok(`${tag} rápido en diario`, s.entries.some((e) => e.source === 'quick' && e.kcal === 290));
    // 5) Diario por comidas, hora editable, netos
    await go('/diary'); ok(`${tag} diario por comidas`, await tid('meal-0').count() === 1 && await tid('meal-3').count() === 1);
    ok(`${tag} netos en diario`, /\d/.test(await tid('diary-net').textContent()));
    await p.getByTestId('entry').filter({ hasText: L ? 'Avena' : 'Oatmeal' }).first().getByTestId('time-btn').click(); await tid('time-input').fill('99:99'); await tid('time-save').click(); await p.waitForTimeout(200);
    ok(`${tag} hora inválida avisa`, await tid('time-bad').count() === 1);
    await tid('time-input').fill('20:15'); await tid('time-save').click(); await p.waitForTimeout(400);
    s = await st(); const e1 = s.entries.find((e) => e.id === 'e1'); ok(`${tag} hora cambiada`, new Date(e1.time).getHours() === 20 && new Date(e1.time).getMinutes() === 15);
    ok(`${tag} pasa a la cena`, (await tid('meal-3').textContent()).includes(L ? 'Avena' : 'Oatmeal'));
    await shot('05-diario-comidas-hora');
    // 3) Copiar a varios días
    await tid('diary-copy').click(); await p.waitForTimeout(1200); ok(`${tag} pantalla copiar`, p.url().includes('/copy'));
    const t1 = new Date(td); t1.setDate(t1.getDate() + 1); const t2 = new Date(td); t2.setDate(t2.getDate() + 2);
    const chips = p.getByRole('button').filter({ hasText: new RegExp(String(t1.getDate()) + '|' + String(t2.getDate())) });
    const fmt = (d) => d.toLocaleDateString(L ? 'es-ES' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });
    await p.getByRole('button', { name: fmt(t1), exact: true }).click(); await p.getByRole('button', { name: fmt(t2), exact: true }).click();
    await tid('cp-item').first().click(); await shot('06-copiar-dias'); await tid('cp-go').click(); await p.waitForTimeout(400);
    ok(`${tag} copiado`, await tid('cp-msg').count() === 1);
    s = await st(); const n1 = s.entries.filter((e) => e.date === iso(t1)).length, n2 = s.entries.filter((e) => e.date === iso(t2)).length;
    ok(`${tag} copia en 2 días`, n1 === 2 && n2 === 2, `${n1}/${n2}`);
    // 4) Preparación semanal + lista
    await go('/mealprep'); await tid('prep-fill').click(); await p.waitForTimeout(500);
    ok(`${tag} semana llena`, await tid('prep-meal').count() === 4); await shot('07-semana');
    await tid('prep-log').first().click(); await p.waitForTimeout(300); s = await st(); ok(`${tag} comida del plan al diario con fibra`, s.entries.some((e) => typeof e.fiber === 'number' && e.meal === 0 && e.name !== 'x'));
    const gi = await tid('gro-item').count(); ok(`${tag} lista de compras`, gi >= 5, String(gi));
    await tid('gro-item').first().click(); await p.waitForTimeout(200); s = await st(); ok(`${tag} marcar artículo`, s.prep.checked.length === 1);
    await p.evaluate(() => { try { delete navigator.share; } catch {} Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); });
    await tid('gro-share').click(); await p.waitForTimeout(400); const gt = await tid('gro-text').inputValue();
    ok(`${tag} lista como texto`, gt.includes('☑') && gt.includes('Angie One'));
    await tid('grocery').scrollIntoViewIfNeeded(); await shot('08-lista-compras');
    // 2) Salud
    await go('/sync'); ok(`${tag} nativo: en la app del teléfono`, await tid('native-only').count() === 1);
    try { const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 5000 }), tid('h-pick').click()]); await fc.setFiles(XML); }
    catch { const xml = (await import('node:fs')).readFileSync(XML, 'utf8'); await p.evaluate(() => {}); ok(`${tag} filechooser`, false); }
    await p.waitForTimeout(800); ok(`${tag} import export.xml`, (await tid('h-msg').textContent()).includes('2'), await tid('h-msg').textContent());
    s = await st(); ok(`${tag} pasos y entreno`, Object.values(s.health.steps).includes(7300) && s.health.workouts.length === 1);
    ok(`${tag} peso a la gráfica`, (s.ext?.weights || []).some((w) => w.kg === 79.4)); await shot('09-salud');
    // Gratis vs Premium: fin de la prueba
    await p.evaluate(() => { const v = JSON.parse(localStorage.getItem('angieone:v1')); v.trialStart = Date.now() - 30 * 86400e3; localStorage.setItem('angieone:v1', JSON.stringify(v)); });
    await go('/macros'); ok(`${tag} gratis: metas por día sí`, await tid('g-p').count() === 1); ok(`${tag} gratis: por comida bloqueado`, await tid('locked').count() === 1);
    await go('/mealprep'); ok(`${tag} gratis: semana bloqueada`, await tid('locked').count() === 1);
    await go('/quickadd'); ok(`${tag} gratis: añadir rápido sí`, await tid('q-add').count() === 1); await go('/sync'); ok(`${tag} gratis: salud sí`, await tid('h-pick').count() === 1);
    if (L) { await p.evaluate(() => { const v = JSON.parse(localStorage.getItem('angieone:v1')); v.langOverride = 'ar'; localStorage.setItem('angieone:v1', JSON.stringify(v)); });
      await go('/macros'); ok(`${tag} árabe RTL sin errores`, (await p.locator('body').textContent()).includes('أهداف')); if (bn === 'chromium') await shot('10-arabe'); }
    ok(`${tag} sin errores de página`, errs.length === 0, errs.join('|').slice(0, 300));
    await ctx.close();
  }
  await b.close();
}
console.log(res.join('\n')); const np = res.filter((r) => r.startsWith('PASS')).length; console.log(`${np}/${res.length}`); if (np !== res.length) process.exitCode = 1;
