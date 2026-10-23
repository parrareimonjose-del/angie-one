// QA revisión Apple/Google (21-oct-2026). Chromium + WebKit iPhone 14, ES + EN. Worker simulado (sin desplegar).
import { chromium, webkit, devices } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8798/angie-one';
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const runs = [['chromium', chromium, { viewport: { width: 400, height: 860 }, isMobile: true, hasTouch: true }], ['webkit', webkit, devices['iPhone 14']]];
for (const [bn, B, dev] of runs) {
  const b = await B.launch(bn === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : { executablePath: '/home/box/.cache/ms-playwright/webkit-2370/pw_run.sh' });
  for (const lang of ['es', 'en']) {
    const L = lang === 'es'; const tag = `${bn} ${lang}`;
    const state = { aiEnabled: true, water: {}, challengeDays: [], aiPhotos: {}, founder: {}, langOverride: null, trialStart: Date.now() - 3600e3,
      profile: { goal: 'lose', weight: 80, height: 170, age: 40, sex: 'male', activity: 2 }, entries: [], ext: { friends: { id: 'meid000001', nick: 'Pepe', groups: ['AB12CD'] } } };
    const ctx = await b.newContext({ ...dev, locale: L ? 'es-ES' : 'en-US' });
    await ctx.addInitScript((s) => { sessionStorage.setItem('angie:splash', '1'); s.eula = s.eula || { v: 1, at: Date.now() }; if (!localStorage.getItem('angieone:v1')) localStorage.setItem('angieone:v1', JSON.stringify(s)); }, state);
    const calls = []; const H = { 'access-control-allow-origin': '*' };
    const ful = (r, st, o) => r.fulfill({ status: st, contentType: 'application/json', headers: H, body: JSON.stringify(o) });
    await ctx.route('**/foods/barcode**', (r) => ful(r, 404, { error: 'not_found' }));
    await ctx.route(/\/(foods\/(report|contribute|queue.*)|friends\/.*|estimate|chat)$/, (r) => { const u = new URL(r.request().url()).pathname; const body = JSON.parse(r.request().postData() || '{}'); calls.push([u, body, r.request().headers()['x-founder-key'] || '']);
      if (u.endsWith('/estimate')) return ful(r, 200, { name: 'Arepa', kcalMin: 300, kcalMax: 360, p: 10, c: 40, f: 12, fib: 3, confidence: 'medium' });
      if (u.endsWith('/chat')) return ful(r, 200, { reply: 'Come más verduras.', text: 'Come más verduras.' });
      if (u.endsWith('/foods/queue')) return ful(r, 200, { reports: [{ key: 'r:1:x', id: 'ai:chat', reason: 'ai', name: 'Respuesta rara' }], contributions: [{ key: 'ub:7501234567890', n: 'Galletas', k: 430 }] });
      if (u.endsWith('/friends/reports')) return ful(r, 200, { items: [{ key: 'frrep:AB12CD:aaa', code: 'AB12CD', group: 'Ana', target: 'aaa', nick: 'Luis', why: 'abuse' }] });
      if (u.endsWith('/friends/get')) return ful(r, 200, { code: 'AB12CD', name: 'Ana', me: 'pme', members: [{ pid: 'pme', nick: 'Pepe', pts: 1 }] });
      return ful(r, 200, { ok: true }); });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
    const go = async (r) => { await p.goto(BASE + r, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500); }; const tid = (x) => p.getByTestId(x); const body = () => p.locator('body').innerText();
    // 1) Reportar IA (estimación por texto)
    await go('/manual'); await p.locator('textarea').first().fill('una arepa con queso'); await p.getByText(L ? /Calcular|Estimar|IA/ : /Estimate|AI|Calculate/).first().click().catch(() => {}); await p.waitForTimeout(2500);
    if (await tid('ai-report').count()) { await tid('ai-report').first().click(); await p.waitForTimeout(600); }
    ok(`${tag} reportar respuesta de IA`, calls.some(([u, b]) => u.endsWith('/foods/report') && b.reason === 'ai') && await tid('ai-reported').count() === 1);
    // 2) Aportar producto que falta
    await go('/barcode'); await p.locator('input').first().fill('7501234567890'); await p.getByText(L ? /^🔎/ : /^🔎/).first().click(); await p.waitForTimeout(1500);
    ok(`${tag} tarjeta aportar producto`, await tid('contribute').count() === 1);
    await tid('ct-name').fill('Galletas María'); await tid('ct-k').fill('430'); await tid('ct-p').fill('7'); await tid('ct-c').fill('72'); await tid('ct-f').fill('13'); await tid('ct-send').click(); await p.waitForTimeout(1500);
    const cb = calls.find(([u]) => u.endsWith('/foods/contribute'));
    ok(`${tag} aporte enviado sin datos personales`, !!cb && Object.keys(cb[1]).sort().join(',') === 'brand,c,code,f,k,lang,name,p');
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('angieone:v1'))); ok(`${tag} aporte anotado en el diario`, st.entries.some((e) => e.kcal === 430));
    // 3) Moderación en el Panel del Fundador
    await p.evaluate(() => { localStorage.setItem('angieone:founder', '1'); localStorage.setItem('angieone:fkey', 'clave-prueba'); });
    await go('/founder');
    if (await tid('moderation').count()) { await tid('mod-load').scrollIntoViewIfNeeded().catch(() => {}); await tid('mod-load').click({ force: true }); await p.waitForTimeout(1200); }
    ok(`${tag} cola de moderación`, /Luis/.test(await body()) && /Galletas/.test(await body()) && calls.some(([u, , k]) => u.endsWith('/friends/reports') && k === 'clave-prueba'));
    // 4) Política de privacidad al día
    await go('/legal?doc=privacy'); ok(`${tag} privacidad menciona amigos y salud`, (L ? /Amigos y retos/ : /Friends and challenges/).test(await body()) && (L ? /Apple Salud/ : /Apple Health/).test(await body()));
    // 5) Borrar cuenta sale de los grupos
    await go('/delete-account'); await tid('del-btn').scrollIntoViewIfNeeded().catch(() => {}); await tid('del-btn').click({ force: true }); await p.waitForTimeout(1500);
    ok(`${tag} borrar cuenta sale de los grupos`, calls.some(([u, b]) => u.endsWith('/friends/leave') && b.code === 'AB12CD' && b.id === 'meid000001'));
    ok(`${tag} sin errores de página`, errs.length === 0, errs.join(' | ').slice(0, 200));
    await ctx.close();
  }
  await b.close();
}
console.log(res.join('\n')); const f = res.filter((r) => r.startsWith('FAIL')).length; console.log(`\n${res.length - f}/${res.length} OK`); process.exit(f ? 1 : 0);
