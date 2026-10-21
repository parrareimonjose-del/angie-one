// QA web de los faltantes: entrada con PIN + ojo + recordar, huella (autenticador virtual), borrar cuenta, panel (cargos, PDF/CSV,
// Panel Maestro, IA admin → IA programadora), suscripción y tienda/donaciones ocultas. ES + EN. Capturas faltantes-*.png
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:8765/angie-one'; const OUT = '/workspace/calorias/mvp-capturas/';
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const lang of ['es', 'en']) {
  const L = lang === 'es'; const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, locale: L ? 'es-ES' : 'en-US', acceptDownloads: true });
  const state = { aiEnabled: true, entries: [{ id: 'e1', date: new Date().toISOString().slice(0, 10), time: 1, name: 'x', kcal: 3000, p: 1, c: 1, f: 1, source: 'manual' }], water: {}, challengeDays: [], aiPhotos: {}, founder: {}, langOverride: null, trialStart: Date.now() - 3600e3,
    profile: { goal: 'lose', weight: 80, height: 170, age: 70, sex: 'female', activity: 2 } };
  await ctx.addInitScript((s) => { localStorage.setItem('angieone:founder', '1'); if (!localStorage.getItem('angieone:v1')) localStorage.setItem('angieone:v1', JSON.stringify(s)); }, state);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const cdp = await ctx.newCDPSession(p); await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
  const go = async (r) => { await p.goto(BASE + r, { waitUntil: 'networkidle' }); await p.waitForTimeout(700); };
  const shot = (n) => p.screenshot({ path: `${OUT}faltantes-${lang}-${n}.png` });
  const has = async (t) => (await p.getByText(t, { exact: false }).count()) > 0;
  const btn = (t) => p.getByRole('button', { name: t, exact: true }).first();
  // Inicio: tarjeta de protección (saltable)
  await go('/'); ok(`${lang} nudge`, await p.getByTestId('sec-nudge').count() > 0); await shot('01-inicio-proteger');
  // Seguridad
  await go('/security'); ok(`${lang} skip visible`, await p.getByTestId('sec-skip').count() > 0);
  await p.getByTestId('sec-name').fill('Ana'); await p.getByTestId('sec-a').fill('1234'); await p.getByTestId('sec-b').fill('1234');
  await p.getByTestId('sec-remember-new').click(); await btn(L ? '✓ Guardar' : '✓ Save').click(); await p.waitForTimeout(400);
  ok(`${lang} weak pin rejected`, await has(L ? 'Muy fácil' : 'Too easy'));
  await p.getByTestId('sec-a').fill('2580'); ok(`${lang} masked`, (await p.getByTestId('sec-a').getAttribute('type')) === 'password');
  await p.getByTestId('sec-a-eye').click(); ok(`${lang} eye shows`, (await p.getByTestId('sec-a').getAttribute('type')) !== 'password');
  await p.getByTestId('sec-b').fill('2580'); await shot('02-crear-pin-ojo');
  await btn(L ? '✓ Guardar' : '✓ Save').click(); await p.waitForTimeout(1200); ok(`${lang} saved`, await p.getByTestId('sec-on').count() > 0);
  const stored = await p.evaluate(() => localStorage.getItem('angieone:auth')); ok(`${lang} no plain pin`, stored && !stored.includes('2580'));
  // Huella
  await p.getByText(L ? '👆 Activar huella/Face ID' : '👆 Turn on fingerprint/Face ID').click(); await p.waitForTimeout(1500);
  ok(`${lang} passkey on`, await has(L ? 'Huella/Face ID activada' : 'Fingerprint/Face ID is on')); await shot('03-huella');
  // Bloqueo: nueva sesión (sessionStorage limpio)
  await p.evaluate(() => sessionStorage.clear()); await go('/'); await p.waitForTimeout(1500);
  ok(`${lang} passkey auto-unlock`, await p.getByTestId('unlock').count() === 0);
  await p.evaluate(() => { sessionStorage.clear(); const a = JSON.parse(localStorage.getItem('angieone:auth')); delete a.passkeyId; localStorage.setItem('angieone:auth', JSON.stringify(a)); });
  await go('/'); ok(`${lang} lock screen`, await p.getByTestId('unlock').count() > 0);
  await p.getByTestId('unlock-secret').fill('0000'); await btn(L ? '✓ Entrar' : '✓ Enter').click(); await p.waitForTimeout(800);
  ok(`${lang} wrong pin msg`, await p.getByTestId('unlock-msg').count() > 0); await shot('04-entrada-pin');
  await p.getByTestId('unlock-secret').fill('2580'); await p.getByTestId('unlock-remember').click(); await btn(L ? '✓ Entrar' : '✓ Enter').click(); await p.waitForTimeout(1200);
  ok(`${lang} unlocked`, await p.getByTestId('unlock').count() === 0);
  await p.evaluate(() => sessionStorage.clear()); await go('/'); ok(`${lang} remembered device`, await p.getByTestId('unlock').count() === 0);
  // Pago y condiciones
  await go('/paywall'); ok(`${lang} terms`, await p.getByTestId('sub-terms').count() > 0); ok(`${lang} stripe on web`, /Stripe/.test(await p.getByTestId('pay-provider').textContent()));
  await p.getByTestId('sub-terms').scrollIntoViewIfNeeded(); await shot('05-suscripcion');
  // Tienda y donaciones ocultas
  await go('/explore'); ok(`${lang} no store tile`, !(await has(L ? 'Tienda' : 'Store'))); ok(`${lang} no impact tile`, !(await has(L ? 'Nuestro impacto' : 'Our impact')));
  await go('/impact'); ok(`${lang} impact redirects`, !p.url().includes('/impact')); await go('/store'); ok(`${lang} store redirects`, !p.url().includes('/store'));
  // Panel del fundador
  await go('/founder'); ok(`${lang} no disbursements`, await p.getByText(/💗/).count() === 0);
  ok(`${lang} ledger sample`, await has(L ? 'DATOS DE EJEMPLO' : 'SAMPLE DATA'));
  await p.getByTestId('ledger').getByRole('button', { name: L ? 'Aprobar reparto' : 'Approve split' }).first().click(); await p.waitForTimeout(300);
  ok(`${lang} receipt`, await p.getByTestId('charge-ok').count() > 0);
  let dl = p.waitForEvent('download'); await p.getByRole('button', { name: L ? '📄 Recibo PDF' : '📄 PDF receipt' }).first().click(); let d = await dl; ok(`${lang} pdf receipt`, /\.pdf$/.test(d.suggestedFilename()));
  const pth = await d.path(); const fs = await import('node:fs'); ok(`${lang} pdf valid`, fs.readFileSync(pth).subarray(0, 5).toString() === '%PDF-');
  dl = p.waitForEvent('download'); await p.getByRole('button', { name: 'CSV', exact: true }).click(); d = await dl; const csv = fs.readFileSync(await d.path(), 'utf8'); ok(`${lang} csv`, csv.includes('founder_60') && csv.includes('AO-'));
  dl = p.waitForEvent('download'); await p.getByRole('button', { name: 'PDF', exact: true }).click(); d = await dl; ok(`${lang} accountant pdf`, d.suggestedFilename().endsWith('.pdf'));
  await p.getByTestId('ledger').scrollIntoViewIfNeeded(); await shot('06-registro-cargos');
  await p.getByTestId('adminai').getByRole('button', { name: L ? '🔍 Revisar números y proponer' : '🔍 Review numbers and propose' }).click(); await p.waitForTimeout(400);
  const np = await p.getByTestId('ad-prop').count(); ok(`${lang} admin proposals`, np >= 2, String(np));
  ok(`${lang} real number`, await has(L ? 'días por encima de la meta' : 'days over the goal') || await has(L ? 'días activos' : 'active days'));
  await p.getByTestId('adminai').getByRole('button', { name: L ? 'Aprobar' : 'Approve', exact: true }).first().click(); await p.waitForTimeout(400);
  ok(`${lang} spec created`, await p.getByTestId('spec').count() > 0); await p.getByTestId('adminai').scrollIntoViewIfNeeded(); await shot('07-ia-admin');
  dl = p.waitForEvent('download'); await p.getByTestId('spec').first().getByRole('button').click(); d = await dl; const md = fs.readFileSync(await d.path(), 'utf8'); ok(`${lang} spec md`, md.includes('```diff') && md.includes('BORRADOR'));
  await p.getByTestId('devspecs').scrollIntoViewIfNeeded(); await shot('08-ia-programadora');
  dl = p.waitForEvent('download'); await p.getByTestId('pm').getByRole('button').first().click(); d = await dl; const js = JSON.parse(fs.readFileSync(await d.path(), 'utf8'));
  ok(`${lang} panel maestro json`, js.schema === 'parra-apps/panel-maestro-summary@1' && js.revenueSplit.buckets.length === 3 && js.privacy.healthDataIncluded === false);
  await p.getByTestId('pm').scrollIntoViewIfNeeded(); await shot('09-panel-maestro');
  // Borrar cuenta
  await go('/settings'); await p.getByTestId('go-security').click(); await p.waitForTimeout(600); await p.getByTestId('go-delete').click(); await p.waitForTimeout(600);
  await shot('10-borrar-cuenta'); p.once('dialog', (dg) => dg.accept()); await p.getByTestId('del-btn').click(); await p.waitForTimeout(800);
  ok(`${lang} deleted`, await p.getByTestId('del-done').count() > 0 && (await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('angieone')).length)) === 0);
  ok(`${lang} no page errors`, errs.length === 0, errs.join('|').slice(0, 300));
  await ctx.close();
}
await b.close(); console.log(res.join('\n')); console.log(`${res.filter((r) => r.startsWith('PASS')).length}/${res.length}`);
