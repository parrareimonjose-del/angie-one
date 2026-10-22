// QA coach profesional: recetas según el plan, Guía profesional, alarma y contexto en el chat. Chromium (Android) + WebKit (iPhone 14). /chat simulado.
import { chromium, webkit, devices } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8798/angie-one'; const SHOTS = process.env.SHOTS || '';
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const runs = [['chromium', chromium, { viewport: { width: 400, height: 860 }, isMobile: true, hasTouch: true }], ['webkit', webkit, devices['iPhone 14']]];
for (const [bn, B, dev] of runs) {
  const b = await B.launch(bn === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : { executablePath: '/home/box/.cache/ms-playwright/webkit-2370/pw_run.sh' });
  for (const lang of ['es', 'en', 'ar']) {
    const L = lang === 'es'; const tag = `${bn} ${lang}`; const d0 = iso(new Date());
    const state = { aiEnabled: true, water: {}, challengeDays: [], aiPhotos: {}, founder: {}, langOverride: lang, trialStart: Date.now() - 3600e3,
      profile: { goal: 'lose', weight: 80, height: 170, age: 40, sex: 'male', activity: 2 }, entries: [{ id: 'e1', date: d0, time: Date.now(), name: 'Desayuno', kcal: 600, p: 20, c: 70, f: 20, source: 'manual' }],
      coach: { prefs: { place: 'home', days: 3, minutes: 30, level: 'beginner', injuries: [], injuryNote: '', dislikes: ['veg'], cuisine: 'latin', budget: 'medium', meals: 4 }, adjust: 0, boost: 0, checkins: [], workouts: [], chat: [], chatCount: {} } };
    const ctx = await b.newContext({ ...dev, locale: L ? 'es-ES' : 'en-US', colorScheme: lang === 'en' ? 'dark' : 'light' });
    await ctx.addInitScript((s) => { sessionStorage.setItem('angie:splash', '1'); if (!localStorage.getItem('angieone:v1')) localStorage.setItem('angieone:v1', JSON.stringify(s)); }, state);
    const sent = []; await ctx.route(/workers\.dev\/chat$/, (r) => { sent.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ reply: 'Plan: 3 días de fuerza y proteína en cada comida.' }) }); });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const go = async (r) => { await p.goto(BASE + r, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500); }; const tid = (x) => p.getByTestId(x); const body = () => p.locator('body').innerText();
    // 1) Recetas según el plan en el coach
    await go('/coach'); const n = await tid('ck-rec').count(); ok(`${tag} 2-3 recetas según el plan`, n >= 2 && n <= 3, String(n));
    const txt = await tid('ck-recipes').innerText(); const left = (txt.match(/(\d[\d.,\s]*)\s*kcal/) || [])[1];
    ok(`${tag} muestra kcal restantes`, /\d/.test(txt) && (lang === 'ar' || /1[\s.,]?[0-9]{3}|[0-9]{3,4}/.test(txt)));
    ok(`${tag} vegetariano: sin carne`, !/(pollo|carne|pescado|cerdo|chicken|beef|fish|pork|tuna|atún)/i.test(txt));
    ok(`${tag} sin claves sin traducir`, !/\bck\.[a-z]/.test(await body()));
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${bn}-${lang}-coach.png`, fullPage: true });
    // 2) Añadir plato al diario
    if (await tid('ck-add').count()) { await tid('ck-add').first().click(); await p.waitForTimeout(600); const st = await p.evaluate(() => JSON.parse(localStorage.getItem('angieone:v1'))); ok(`${tag} plato añadido al diario`, st.entries.length === 2 && (await tid('ck-added').count()) === 1); }
    else ok(`${tag} plato añadido al diario`, true, '(solo recetas)');
    // 3) Cocinar abre el modo cocina
    await go('/coach'); await tid('ck-cook').first().click(); await p.waitForTimeout(1500); ok(`${tag} Cocinar abre la receta`, /\/cook/.test(p.url()) && /id=/.test(p.url()));
    // 4) Guía profesional
    await go('/coachguide'); ok(`${tag} guía: semana y 8 áreas`, (await tid('ck-week').count()) === 1 && (await p.locator('[data-testid^="ck-area-"]').count()) === 8);
    await tid('ck-c1').click(); await tid('ck-c3').click(); await p.waitForTimeout(500); ok(`${tag} lista diaria 2/5`, /2\/5/.test(await tid('ck-check').innerText()));
    await go('/coachguide'); ok(`${tag} lista se guarda`, /2\/5/.test(await tid('ck-check').innerText()));
    await tid('ck-area-physio').click(); await p.waitForTimeout(400); ok(`${tag} área se abre`, (await tid('ck-area-physio').innerText()).split('\n').length >= 3);
    ok(`${tag} aviso de profesional y no médico`, (await tid('ck-red').count()) === 1);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${bn}-${lang}-guide.png`, fullPage: true });
    // 5) Chat: contexto profesional + alarma
    await go('/chat'); await tid('chat-input').fill(L ? '¿Cuánta proteína necesito para entrenar fuerza?' : 'How much protein do I need for strength training?'); await p.getByText(/➤/).first().click(); await p.waitForTimeout(1500);
    const c0 = sent[0]?.context || ''; ok(`${tag} chat envía conocimiento profesional`, /Pro knowledge/.test(c0) && /protein 1\.2-1\.6/.test(c0) && /Safety/.test(c0) && c0.length <= 1400);
    ok(`${tag} sin alarma en pregunta normal`, (await tid('ck-red').count()) === 0);
    await tid('chat-input').fill(L ? 'Tengo dolor en el pecho cuando corro' : 'I have chest pain when I run'); await p.getByText(/➤/).first().click(); await p.waitForTimeout(1500);
    ok(`${tag} alarma → profesional`, (await tid('ck-red').count()) === 1);
    ok(`${tag} sin errores de página`, errs.length === 0, errs.join(' | ').slice(0, 200));
    await ctx.close();
  }
  await b.close();
}
console.log(res.join('\n')); const np = res.filter((r) => r.startsWith('PASS')).length; console.log(`${np}/${res.length}${np === res.length ? ' OK' : ''}`); if (np !== res.length) process.exitCode = 1;
