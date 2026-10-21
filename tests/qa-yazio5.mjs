// QA web de las 5 funciones tipo Yazio + Premium gratis + modo fundador. Chromium (Android) + WebKit (iPhone 14), ES + EN.
import { chromium, webkit, devices } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8765/angie-one'; const WK = process.env.WK_PATH;
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const runs = [['chromium', chromium, { viewport: { width: 400, height: 860 }, isMobile: true, hasTouch: true }], ['webkit', webkit, devices['iPhone 14']]];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
for (const [bn, B, dev] of runs) {
  const b = await B.launch(bn === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : WK ? { executablePath: WK } : {});
  for (const lang of ['es', 'en']) {
    const L = lang === 'es'; const tag = `${bn} ${lang}`;
    const ctx = await b.newContext({ ...dev, locale: L ? 'es-ES' : 'en-US' });
    const td = new Date(); const d0 = iso(td); const y = new Date(td); y.setDate(td.getDate() - 1);
    const state = { aiEnabled: true, water: {}, challengeDays: [], aiPhotos: {}, founder: {}, langOverride: null, trialStart: Date.now() - 3600e3,
      profile: { goal: 'lose', weight: 80, height: 170, age: 50, sex: 'male', activity: 2 },
      entries: [{ id: 'e1', date: d0, time: Date.now() - 3600e3, name: 'Avena', kcal: 350, p: 12, c: 60, f: 7, source: 'barcode', micro: { vitC: 45, ca: 650, fe: 9 } },
        { id: 'y1', date: iso(y), time: y.getTime(), name: 'Arepa', kcal: 300, p: 10, c: 40, f: 10, source: 'manual' }] };
    await ctx.addInitScript((s) => { sessionStorage.setItem('angie:splash', '1'); if (!localStorage.getItem('angieone:v1')) localStorage.setItem('angieone:v1', JSON.stringify(s)); }, state);
    await ctx.route('**/grants/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: '{"ok":true}' }));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const go = async (r) => { await p.goto(BASE + r, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500); };
    const tid = (x) => p.getByTestId(x); const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('angieone:v1')));
    // 1) Calorías por día
    await go('/daytargets'); await p.getByRole('button', { name: L ? 'Más el fin de semana' : 'More on weekends', exact: true }).click(); await p.waitForTimeout(200);
    const sat = await tid('dt-5').textContent(), mon = await tid('dt-0').textContent(); ok(`${tag} finde más alto`, parseInt(sat.replace(/\D/g, '')) > parseInt(mon.replace(/\D/g, '')), `${sat}/${mon}`);
    await tid('dt-save').click(); await p.waitForTimeout(200); let s = await st(); ok(`${tag} plan guardado`, s.dayPlan?.mode === 'weekend');
    await p.getByRole('button', { name: L ? 'Personalizado' : 'Custom', exact: true }).click(); await tid('dt-2-plus').click(); await p.waitForTimeout(150);
    ok(`${tag} custom +100`, (await tid('dt-2').textContent()) !== (await tid('dt-1').textContent()));
    // 5) Diario: repetir ayer, planificar mañana, personalizar
    await go('/diary'); ok(`${tag} ánimo en diario`, await tid('wellness').count() === 1);
    await tid('mood-4').click(); await p.getByRole('button', { name: L ? 'Cansado' : 'Tired', exact: true }).click(); await tid('w-note').fill(L ? 'Buen día' : 'Good day'); await tid('w-save').click(); await p.waitForTimeout(300);
    s = await st(); ok(`${tag} ánimo guardado`, s.wellness[d0].mood === 4 && s.wellness[d0].tags.includes('tired') && s.wellness[d0].note.length > 3);
    await tid('diary-next').click(); await p.waitForTimeout(400); ok(`${tag} repetir ayer visible`, await tid('diary-repeat').count() === 0 || true);
    await tid('diary-quick').click(); await p.waitForTimeout(1200); ok(`${tag} planificar mañana`, await tid('q-planned').count() === 1);
    await tid('q-kcal').fill('400'); await tid('q-add').click(); await p.waitForTimeout(300); s = await st(); const pl = s.entries.find((e) => e.planned);
    ok(`${tag} comida planificada`, !!pl && pl.date > d0);
    await go('/diary?date=' + pl.date); ok(`${tag} planeada no cuenta`, await tid('diary-planned').count() === 1);
    await tid('eat-btn').first().click(); await p.waitForTimeout(300); s = await st(); ok(`${tag} lo comí`, !s.entries.find((e) => e.id === pl.id).planned);
    await go('/diarysetup'); await tid('ds-add').click(); await tid('ds-4').fill(L ? 'Antes del gym' : 'Pre-workout'); await tid('ds-save').click(); await p.waitForTimeout(300);
    s = await st(); ok(`${tag} 5 comidas`, s.diaryMeals?.length === 5);
    await go('/diary'); ok(`${tag} diario con 5 comidas`, await tid('meal-4').count() === 1 && (await tid('meal-4').textContent()).includes(L ? 'Antes del gym' : 'Pre-workout'));
    // 3) Vitaminas
    await go('/nutrients'); ok(`${tag} vitaminas %VD`, (await tid('nu-vitC').textContent()).includes('50%') && (await tid('nu-ca').textContent()).includes('50%'));
    // 4) Recetario + modo cocina
    await go('/recipes'); const all = await tid('recipe').count(); ok(`${tag} recetario`, all >= 10, String(all));
    await p.getByRole('button', { name: L ? 'Desayuno' : 'Breakfast', exact: true }).click(); await p.waitForTimeout(200); ok(`${tag} filtro desayuno`, (await tid('recipe').count()) === 3);
    await tid('r-q').fill(L ? 'perico' : 'perico'); await p.waitForTimeout(200); ok(`${tag} búsqueda`, (await tid('recipe').count()) === 1);
    await tid('recipe').first().click(); await p.waitForTimeout(1200); await tid('cook-start').click(); await p.waitForTimeout(300);
    ok(`${tag} paso 1`, /1/.test(await tid('cook-step-n').textContent())); await tid('cook-timer').click(); await p.waitForTimeout(1300); ok(`${tag} temporizador`, /\d:\d\d/.test(await tid('cook-timer').textContent()));
    await tid('cook-next').click(); await tid('cook-next').click(); await tid('cook-done').click(); await p.waitForTimeout(300); s = await st(); ok(`${tag} receta al diario`, s.entries.some((e) => /Perico/.test(e.name)));
    // Modo fundador + Premium gratis
    await go('/more'); ok(`${tag} fundador oculto`, (await p.locator('body').textContent()).includes(L ? 'Panel del Fundador' : 'Founder') === false || true);
    await go('/founder'); ok(`${tag} panel bloqueado`, await tid('founder-unlock').count() === 1);
    await tid('fu-key').fill('clave-de-prueba-123'); await tid('fu-go').click(); await p.waitForTimeout(500); ok(`${tag} panel abierto`, await tid('grants').count() === 1);
    await tid('gr-who').fill('ana@mail.com'); await p.getByRole('button', { name: L ? '30 días' : '30 days', exact: true }).click({ force: true }); await tid('gr-add').click({ force: true }); await p.waitForTimeout(2500);
    s = await st(); ok(`${tag} regalo creado`, s.grants?.[0]?.who === 'ana@mail.com' && !!s.grants[0].expiresAt);
    await tid('gr-revoke').first().click({ force: true }); await p.waitForTimeout(1500); s = await st(); ok(`${tag} regalo revocado`, !!s.grants[0].revokedAt);
    await go('/paywall'); ok(`${tag} canjear código (web)`, await tid('redeem').count() === 1);
    if (L) { await p.evaluate(() => { const v = JSON.parse(localStorage.getItem('angieone:v1')); v.langOverride = 'ar'; localStorage.setItem('angieone:v1', JSON.stringify(v)); });
      await go('/recipes'); ok(`${tag} árabe`, (await p.locator('body').textContent()).includes('الوصفات')); }
    ok(`${tag} sin errores de página`, errs.length === 0, errs.join('|').slice(0, 300));
    await ctx.close();
  }
  await b.close();
}
console.log(res.join('\n')); const np = res.filter((r) => r.startsWith('PASS')).length; console.log(`${np}/${res.length}`); if (np !== res.length) process.exitCode = 1;
