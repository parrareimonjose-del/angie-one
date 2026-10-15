import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8765/angie-one';
const OUT = '/workspace/calorias/mvp-capturas/';
const shots = process.env.SHOTS === '1';
const results = []; const ok = (n, c, x = '') => { results.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`); };
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const lang of (process.env.LANGS || 'es,en').split(',')) {
  const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, locale: lang === 'es' ? 'es-ES' : 'en-US', deviceScaleFactor: 1 });
  const now = Date.now(); const d = (n) => { const x = new Date(now - n * 864e5); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const state = { aiEnabled: true, entries: [], water: {}, challengeDays: [d(1), d(2)], aiPhotos: {}, founder: {}, langOverride: null, trialStart: now - 3600e3,
    profile: { goal: 'lose', weight: 80, height: 170, age: 45, sex: 'female', activity: 2 },
    ext: { weights: [{ date: d(14), kg: 80 }, { date: d(10), kg: 80.1 }, { date: d(6), kg: 79.9 }, { date: d(2), kg: 80 }], sleep: [{ date: d(1), h: 6, stress: 3 }, { date: d(2), h: 8, stress: 2 }] } };
  await ctx.addInitScript((s) => { if (!localStorage.getItem('angieone:v1')) localStorage.setItem('angieone:v1', JSON.stringify(s)); }, state);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const go = async (r) => { await p.goto(BASE + r, { waitUntil: 'networkidle' }); await p.waitForTimeout(700); };
  const shot = async (n) => { if (shots) await p.screenshot({ path: `${OUT}pulido-${lang}-${n}.png`, fullPage: false }); };
  const tx = (re) => { const l = p.getByText(re).first(); return { click: (o) => l.click({ timeout: 10000, ...(o||{}) }).catch(() => ok(`${lang} click ${re}`, false)) }; };
  const has = async (re) => (await p.getByText(re).count()) > 0;
  const L = lang === 'es';
  // Home: fab + tips + hub
  await go('/'); ok(`${lang} home voice fab`, await p.getByTestId('voice-fab').count() > 0); await shot('01-inicio');
  await go('/plus'); ok(`${lang} hub`, await has(L ? 'Herramientas sanas' : 'Healthy tools')); await shot('02-centro');
  // Weight
  await go('/weight'); ok(`${lang} chart`, await p.getByTestId('weight-chart').count() > 0); ok(`${lang} trend`, await p.getByTestId('trend').count() > 0);
  ok(`${lang} adaptive slow`, await has(L ? 'Aplicar -100' : 'Apply -100'));
  await tx(L ? 'Aplicar -100' : 'Apply -100').click(); await p.waitForTimeout(300); ok(`${lang} adaptive applied`, await has(L ? 'Nueva meta' : 'New goal'));
  await tx('−1').click(); await tx(L ? '✓ Guardar peso' : '✓ Save weight').click(); await p.waitForTimeout(300); ok(`${lang} weight saved`, await p.getByTestId('w-msg').count() > 0); await shot('03-peso');
  // Memory
  await go('/memory'); await p.getByPlaceholder(L ? 'Ejemplo: no me gusta la berenjena' : "Example: I don't like eggplant").fill(L ? 'No como pescado' : "I don't eat fish");
  await tx(L ? '＋ Añadir' : '＋ Add').click(); await p.waitForTimeout(300); ok(`${lang} memory add`, await has(L ? '• No como pescado' : "• I don't eat fish")); await shot('04-memoria');
  await p.getByLabel(L ? 'Borrar' : 'Delete', { exact: true }).first().click(); await p.waitForTimeout(300); ok(`${lang} memory delete`, !(await has(L ? '• No como pescado' : "• I don't eat fish")));
  // Import
  await go('/import'); await tx(L ? 'Probar un ejemplo' : 'Try an example').click(); await p.getByText(L ? 'Importar' : 'Import', { exact: true }).last().click(); await p.waitForTimeout(400);
  const im = await p.getByTestId('imp-msg').textContent().catch(() => ''); ok(`${lang} mfp import`, /3/.test(im || ''), im); await shot('05-importar');
  await p.getByText(L ? 'Importar' : 'Import', { exact: true }).last().click(); await p.waitForTimeout(300);
  const cnt = await p.evaluate(() => JSON.parse(localStorage.getItem('angieone:v1')).entries.filter((e) => e.id.startsWith('mfp')).length); ok(`${lang} mfp no dup`, cnt === 3, String(cnt));
  // Voice (typed)
  await go('/voice'); await p.getByTestId('voice-text').fill(L ? 'me comí 2 arepas con queso' : 'I had 2 arepas with cheese'); await tx(L ? '✨ Calcular' : '✨ Calculate').click();
  await p.getByTestId('voice-est').waitFor({ timeout: 40000 }).catch(() => {}); ok(`${lang} voice estimate`, await p.getByTestId('voice-est').count() > 0);
  if (await p.getByTestId('voice-est').count()) { await tx(L ? '＋ Agregar' : '＋ Add').click(); await p.waitForTimeout(300); ok(`${lang} voice add`, await has(L ? '✓ Guardado' : '✓ Saved')); } await shot('06-voz');
  // Plans
  await go('/plans'); await p.getByText(L ? 'Usar este plan' : 'Use this plan').nth(2).click(); await p.waitForTimeout(500); ok(`${lang} plan applied`, await p.getByTestId('pl-msg').count() > 0); await shot('07-planes');
  // Chef (text)
  await go('/chef'); await p.getByTestId('chef-text').fill(L ? 'arroz, huevos, tomate, cebolla, comino' : 'rice, eggs, tomato, onion, cumin'); await tx(L ? '✨ Dame recetas' : '✨ Give me recipes').click();
  await p.getByTestId('recipe').first().waitFor({ timeout: 50000 }).catch(() => {}); const nr = await p.getByTestId('recipe').count(); ok(`${lang} chef recipes`, nr >= 1, String(nr));
  if (nr) { await p.getByText(L ? 'Ver' : 'See', { exact: true }).first().click().catch(() => {}); } await shot('08-chef');
  // Chef photo (fridge)
  await go('/chef'); const fc = p.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null); await tx(L ? '📸 Foto de mi nevera' : '📸 Photo of my fridge').click(); const ch = await fc;
  if (ch) { await ch.setFiles('/tmp/shot/fridge.jpg'); await p.getByTestId('recipe').first().waitFor({ timeout: 60000 }).catch(() => {}); ok(`${lang} fridge photo`, await p.getByTestId('recipe').count() > 0); await shot('09-nevera'); } else ok(`${lang} fridge chooser`, false);
  // Menu
  await go('/menu'); await p.getByTestId('menu-text').fill('Arepa reina pepiada 9$, Pabellón criollo 14$, Ensalada de pollo 11$, Tequeños 8$, Cachapa con queso 10$');
  await tx(L ? '✨ ¿Qué pido?' : '✨ What do I order?').click(); await p.getByTestId('dish').first().waitFor({ timeout: 50000 }).catch(() => {}); ok(`${lang} menu dishes`, await p.getByTestId('dish').count() >= 3); await shot('10-menu');
  // Craving
  await go('/craving'); await tx('Pizza').click(); ok(`${lang} craving swap`, await p.getByTestId('swap').count() > 0); await shot('11-antojo');
  // Sleep
  await go('/sleep'); await tx('5 h').click(); await tx(L ? 'Muy estresado' : 'Very stressed').click(); await p.waitForTimeout(300); ok(`${lang} sleep stress tip`, await has(L ? 'Respirar con Angie' : 'Breathe with Angie')); await shot('12-sueno');
  // Reminders
  await go('/reminders'); ok(`${lang} reminders`, await has(L ? 'Avisos inteligentes' : 'Smart reminders')); await shot('13-avisos');
  // Points & avatar
  await go('/points'); const pts = await p.getByTestId('pts').textContent(); ok(`${lang} points`, +String(pts).replace(/\D/g, '') > 0, pts); await shot('14-puntos');
  await go('/avatar'); ok(`${lang} avatar`, await p.getByTestId('avatar').count() > 0); await p.getByLabel(L ? 'Camisa 2' : 'Shirt 2').click(); await shot('15-avatar');
  // Weekly
  await go('/weekly'); ok(`${lang} weekly`, await p.getByTestId('weekly').count() > 0); await shot('16-resumen');
  // Chat memory
  // Pulido: memoria aprende del chat
  await go('/chat'); const fact = L ? 'Soy alérgica al maní, no me gusta la berenjena' : "I'm allergic to peanuts and I don't like eggplant";
  await p.getByTestId('chat-input').fill(fact); await tx(L ? '➤ Enviar' : '➤ Send').click();
  await p.getByTestId('chat-reply').first().waitFor({ timeout: 45000 }).catch(() => {}); ok(`${lang} chat reply`, await p.getByTestId('chat-reply').count() > 0);
  const facts = await p.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('angieone:v1'))));
  ok(`${lang} memory learned from chat`, facts.includes(L ? 'alérgica al maní' : 'allergic to peanuts'));
  await shot('19-chat-memoria');
  await go('/memory'); ok(`${lang} memory screen shows learned fact`, await has(L ? /alérgica al maní/ : /allergic to peanuts/)); await shot('20-memoria-aprendida');
  // Pulido: el botón 🎙️ no tapa el final del contenido
  for (const r of ['/', '/plus', '/settings', '/weight']) {
    await go(r); await p.mouse.wheel(0, 20000); await p.waitForTimeout(500);
    const ov = await p.evaluate(() => { const fab = document.querySelector('[data-testid="voice-fab"]'); if (!fab) return 'nofab'; const fr = fab.getBoundingClientRect();
      const els = [...document.querySelectorAll('[role="button"],input,textarea')].filter((e) => !e.closest('[data-testid="voice-fab"]') && e !== fab);
      const sv = fab.parentElement.querySelector('div[style*="overflow"]') ; 
      const bar = fab.nextElementSibling ? fab.nextElementSibling.getBoundingClientRect() : { top: 1e9 };
      const bad = els.filter((e) => { const b = e.getBoundingClientRect(); if (e.closest('[data-testid="voice-fab"]') || b.top >= bar.top - 1) return false; return b.bottom > fr.top && b.top < fr.bottom && b.right > fr.left && b.left < fr.right; });
      return bad.map((e) => (e.innerText || e.getAttribute('aria-label') || '').slice(0, 30)).join('|'); });
    ok(`${lang} fab no overlap ${r}`, ov === '', ov);
  }
  await go('/settings'); await p.mouse.wheel(0, 20000); await p.waitForTimeout(400); await shot('21-final-sin-tapar');
  // Pulido: botones grandes (>=48px)
  const small = await p.evaluate(() => [...document.querySelectorAll('[role="button"]')].filter((e) => { const b = e.getBoundingClientRect(); return b.height > 0 && b.height < 44; }).map((e) => (e.innerText || e.getAttribute('aria-label') || '?').slice(0, 20)));
  ok(`${lang} tap targets >=44px on settings`, small.length === 0, small.join('|'));
  // Settings feedback + founder dev AI
  await go('/settings'); await p.getByTestId('fb').fill(L ? 'La foto tarda mucho' : 'The photo is slow'); await tx(L ? 'Enviar a Angie One' : 'Send to Angie One').click(); ok(`${lang} feedback`, await has(L ? '¡Gracias! Guardado.' : 'Thanks! Saved.'));
  await go('/founder'); await tx(L ? '🔍 Analizar y proponer' : '🔍 Analyze and propose').click(); await p.getByTestId('dev-prop').first().waitFor({ timeout: 45000 }).catch(() => {});
  ok(`${lang} dev proposals`, await p.getByTestId('dev-prop').count() > 0);
  await p.getByTestId('devai').getByRole('button', { name: L ? 'Aprobar' : 'Approve', exact: true }).first().click({ timeout: 10000 }).catch(() => {}); await p.waitForTimeout(300); ok(`${lang} dev approve`, await p.getByTestId('dev-status').count() > 0);
  await p.getByTestId('devai').scrollIntoViewIfNeeded(); await shot('17-ia-programadora');
  // Free-user gating
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('angieone:v1')); s.trialStart = Date.now() - 20 * 864e5; localStorage.setItem('angieone:v1', JSON.stringify(s)); });
  await go('/chef'); ok(`${lang} gating chef`, await p.getByTestId('locked').count() > 0); await go('/weight'); ok(`${lang} weight free + adaptive locked`, await p.getByTestId('weight-chart').count() > 0 && await p.getByTestId('locked').count() > 0); await shot('18-gratis-bloqueo');
  ok(`${lang} no page errors`, errs.length === 0, errs.join(' | ').slice(0, 300));
  await ctx.close();
}
await b.close(); console.log(results.join('\n'));
