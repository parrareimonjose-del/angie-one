// QA de las 6 funciones gratis (top 10). Chromium (Android) + WebKit (iPhone 14), ES + EN. /friends simulado (Worker sin desplegar).
import { chromium, webkit, devices } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8798/angie-one'; const SHOTS = process.env.SHOTS || '';
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const runs = [['chromium', chromium, { viewport: { width: 400, height: 860 }, isMobile: true, hasTouch: true }], ['webkit', webkit, devices['iPhone 14']]];
for (const [bn, B, dev] of runs) {
  const b = await B.launch(bn === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : { executablePath: '/home/box/.cache/ms-playwright/webkit-2370/pw_run.sh' });
  for (const lang of ['es', 'en']) {
    const L = lang === 'es'; const tag = `${bn} ${lang}`; const d0 = iso(new Date());
    const entries = Array.from({ length: 10 }, (_, i) => { const x = new Date(); x.setDate(x.getDate() - i); return { id: 'e' + i, date: iso(x), time: x.getTime(), name: i ? 'Arroz con pollo' : 'Pollo a la plancha', kcal: i ? 1900 : 220, p: i ? 60 : 40, c: 200, f: 40, source: 'manual', micro: { fe: 4, ca: 300 } }; });
    entries.push({ id: 'g1', date: d0, time: Date.now(), name: 'Galletas', kcal: 450, p: 4, c: 60, f: 20, source: 'manual' });
    const w0 = new Date(); w0.setDate(w0.getDate() - 9);
    const state = { aiEnabled: true, water: { [d0]: 6 }, challengeDays: [], aiPhotos: {}, founder: {}, langOverride: null, trialStart: Date.now() - 3600e3,
      profile: { goal: 'lose', weight: 80, height: 170, age: 50, sex: 'male', activity: 2 }, entries, health: { steps: { [d0]: 6000 }, weights: [], workouts: [] },
      ext: { sleep: [{ date: d0, h: 7.5, stress: 2 }], weights: [{ date: iso(w0), kg: 81 }, { date: d0, kg: 80 }] } };
    const ctx = await b.newContext({ ...dev, locale: L ? 'es-ES' : 'en-US', colorScheme: L ? 'light' : 'dark' });
    await ctx.addInitScript((s) => { sessionStorage.setItem('angie:splash', '1'); s.eula = s.eula || { v: 1, at: Date.now() }; if (!localStorage.getItem('angieone:v1')) localStorage.setItem('angieone:v1', JSON.stringify(s)); }, state);
    const G = { code: 'AB12CD', name: 'Ana', members: [{ id: 'other123', pid: 'aaaaaaaaaaaa', nick: 'Luis', pts: 30 }] }; const PUB = (id) => ({ code: G.code, name: G.name, me: id ? 'p' + id.slice(0, 11) : undefined, members: G.members.map((m) => ({ pid: m.pid, nick: m.nick, pts: m.pts })) }); const calls = []; const bodies = [];
    await ctx.route('**/friends/**', async (r) => { const path = new URL(r.request().url()).pathname.split('/').pop(); const body = JSON.parse(r.request().postData() || '{}'); calls.push(path); bodies.push(Object.keys(body).sort().join(','));
      if (body.id && !G.members.some((m) => m.id === body.id) && ['create', 'join'].includes(path)) G.members.push({ id: body.id, pid: 'p' + body.id.slice(0, 11), nick: body.nick, pts: 0 });
      if (path === 'score') G.members.find((m) => m.id === body.id).pts = body.pts;
      r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(path === 'report' || path === 'leave' ? { ok: true } : PUB(body.id)) }); });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const go = async (r) => { await p.goto(BASE + r, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500); }; const tid = (x) => p.getByTestId(x); const body = () => p.locator('body').innerText();
    const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('angieone:v1'))); const shot = (n) => SHOTS && p.screenshot({ path: `${SHOTS}/${L ? 'light' : 'dark'}-${n}.png` });
    await go('/'); ok(`${tag} Inicio tarjeta hábitos`, await tid('habit-card').count() === 1);
    await go('/habits'); const tot = +(await tid('habit-total').textContent()); ok(`${tag} puntuación 0-100`, tot > 50 && tot <= 100, String(tot));
    ok(`${tag} colores verde y naranja`, await tid('fc-green').count() > 0 && await tid('fc-orange').count() > 0); ok(`${tag} sin "malo"`, !/\b(malo|bad food)\b/i.test(await body())); await shot(1);
    await go('/energy'); ok(`${tag} gasto estimado listo`, /Ajustado|Adjusted/.test(await body())); await shot(2);
    await go('/progress'); await tid('m-waist').fill('90'); await tid('m-save').click(); await p.waitForTimeout(300); let s = await st();
    ok(`${tag} medida guardada`, s.ext.measures?.[0]?.waist === 90);
    const fc = p.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null); await tid('ph-add').click(); const ch = await fc; if (ch) await ch.setFiles(new URL('./fixtures/label.jpg', import.meta.url).pathname); await p.waitForTimeout(2000);
    const loc = await p.evaluate(() => localStorage.getItem('angieone:progress') || ''); s = await st();
    ok(`${tag} foto solo local`, loc.length > 1000 && !JSON.stringify(s).includes('base64')); await shot(3);
    await go('/lessons'); ok(`${tag} lección con audio`, await tid('l-play').count() === 1); await tid('l-done').click(); await p.waitForTimeout(300); s = await st(); ok(`${tag} lección hecha`, s.ext.lessons?.length === 1); await shot(4);
    await go('/nutgoals'); await tid('n-fe').click(); await p.waitForTimeout(300); s = await st(); ok(`${tag} meta hierro`, s.ext.nutGoals?.fe === 18); ok(`${tag} aviso suave`, await tid('n-gaps').count() === 1); await shot(5);
    await go('/friends'); await tid('f-nick').fill('puta'); await tid('f-create').click(); await p.waitForTimeout(400); ok(`${tag} apodo moderado`, await tid('f-err').count() === 1);
    await tid('f-nick').fill('Pepe'); await tid('f-code').fill('ab12cd'); await tid('f-join').click(); await p.waitForTimeout(2500);
    ok(`${tag} unido al grupo`, await tid('f-group').count() === 1 && /Luis/.test(await body())); ok(`${tag} puntos enviados`, calls.includes('score'));
    await tid('f-report').first().click(); await p.waitForTimeout(800); ok(`${tag} reportar`, calls.includes('report')); ok(`${tag} reportar bloquea solo para mí`, !/Luis/.test(await body()) && await tid('f-unblock').count() === 1); await shot(6);
    await tid('f-unblock').click(); await p.waitForTimeout(300); ok(`${tag} desbloquear`, /Luis/.test(await body()));
    ok(`${tag} sin datos de salud al servidor`, bodies.every((k) => /^(code,)?(id,)?(nick)?$|^code,id,pts$|^code,id,target,why$|^code$|^code,id$/.test(k)), bodies.join(' / '));
    ok(`${tag} sin errores de página`, errs.length === 0, errs.join(' | ').slice(0, 200));
    await ctx.close();
  }
  await b.close();
}
console.log(res.join('\n')); const f = res.filter((r) => r.startsWith('FAIL')).length; console.log(`\n${res.length - f}/${res.length} OK`); process.exit(f ? 1 : 0);
