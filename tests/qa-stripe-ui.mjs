// QA UI Stripe MODO PRUEBA: build local EXPO_PUBLIC_PAY_MODE=test (8803, Worker local 8812) + build público (8801, sin compra).
import { chromium } from 'playwright-core';
const T = process.env.PT || 'http://localhost:8803/angie-one', PUB = process.env.BASE || 'http://localhost:8801/angie-one', FK = process.env.FOUNDER_KEY;
let pass = 0, fail = 0; const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log((c ? 'OK   ' : 'FALLA ') + n + (c ? '' : ' ' + x)); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const state = { aiEnabled: true, entries: [], water: {}, challengeDays: [], aiPhotos: {}, founder: {}, langOverride: null, trialStart: Date.now() - 30 * 864e5, profile: { goal: 'lose', weight: 80, height: 170, age: 40, sex: 'female', activity: 2 } };
const mk = async (lang = 'es') => { const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, locale: lang === 'es' ? 'es-ES' : 'en-US' });
  await ctx.addInitScript(([s, fk]) => { localStorage.setItem('angieone:founder', '1'); localStorage.setItem('angieone:fkey', fk); if (!localStorage.getItem('angieone:v1')) localStorage.setItem('angieone:v1', JSON.stringify(s)); }, [state, FK]);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); return { ctx, p, errs }; };
const has = (p, id) => p.locator(`[data-testid="${id}"]`).count();
for (const lang of ['es', 'en']) { const { ctx, p } = await mk(lang); const calls = []; p.on('request', (r) => { if (/stripe|\/pay\//.test(r.url())) calls.push(r.url()); });
  await p.goto(PUB + '/paywall', { waitUntil: 'networkidle' }); await sleep(1500);
  ok(`${lang} público: sin botón de compra`, (await has(p, 'pay-buy')) === 0 && (await has(p, 'pay-soon')) === 1);
  ok(`${lang} público: sin aviso TEST ni llamadas a Stripe`, (await has(p, 'pay-test')) === 0 && calls.length === 0, calls.join(','));
  await p.goto(PUB + '/founder', { waitUntil: 'networkidle' }); ok(`${lang} público: sin tarjeta Stripe en el Panel`, (await has(p, 'stripe-ledger')) === 0);
  await ctx.close(); }
for (const [lang, plan] of [['es', 'm'], ['en', 'y']]) {
  const { ctx, p, errs } = await mk(lang); await p.goto(T + '/paywall', { waitUntil: 'networkidle' });
  ok(`${lang} prueba: aviso MODO PRUEBA visible`, (await has(p, 'pay-test')) === 1 && /PRUEBA|TEST/.test(await p.locator('[data-testid=pay-test]').textContent()));
  ok(`${lang} prueba: botón marcado TEST`, /TEST/.test(await p.locator('[data-testid=pay-buy]').textContent().catch(() => '')));
  if (plan === 'm') await p.getByRole('radio').nth(1).click();
  await p.locator('[data-testid=pay-buy]').click(); await p.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
  await p.waitForSelector('#email', { timeout: 40000 }); await sleep(1500);
  ok(`${lang} prueba: Stripe Checkout sandbox ${plan === 'm' ? '2,49' : '24,99'}`, (plan === 'm' ? /2[.,]49/ : /24[.,]99/).test(await p.textContent('body')));
  await p.fill('#email', `qa+ui${Date.now()}@example.com`);
  if (!(await p.locator('#cardNumber').isVisible().catch(() => false))) await p.locator('[data-testid=card-accordion-item-button]').dispatchEvent('click').catch(() => {});
  await p.waitForSelector('#cardNumber'); await p.fill('#cardNumber', '4242424242424242'); await p.fill('#cardExpiry', '12 / 34'); await p.fill('#cardCvc', '123'); await p.fill('#billingName', 'QA UI');
  const zip = p.locator('#billingPostalCode'); if (await zip.isVisible().catch(() => false)) await zip.fill('10001');
  const lk = p.locator('#enableStripePass'); if (await lk.isChecked().catch(() => false)) await lk.dispatchEvent('click');
  await sleep(800); await p.locator('.SubmitButton').dispatchEvent('click');
  await p.waitForURL(/localhost:8803\/angie-one\/paywall\?pay=ok/, { timeout: 60000 }).catch(() => {});
  await p.locator('[data-testid=pay-ok]').waitFor({ timeout: 40000 }).catch(() => {});
  ok(`${lang} prueba: vuelve y confirma Premium (webhook)`, (await has(p, 'pay-ok')) === 1);
  await p.goto(T + '/subscription', { waitUntil: 'networkidle' }); await sleep(2500);
  ok(`${lang} prueba: Suscripción muestra Premium`, /Premium/.test(await p.locator('[data-testid=sub-status]').textContent()));
  await p.locator('[data-testid=cancel-1]').click(); await p.locator('[data-testid=cancel-2]').click();
  await p.waitForURL(/billing\.stripe\.com/, { timeout: 30000 }).catch(() => {});
  ok(`${lang} prueba: Cancelar abre el Portal de Stripe`, /billing\.stripe\.com/.test(p.url()), p.url().slice(0, 50));
  if (lang === 'es') { await p.goto(T + '/founder', { waitUntil: 'networkidle' }); const card = p.locator('[data-testid=stripe-ledger]');
    if (await card.count()) { await p.locator('[data-testid=stripe-load]').dispatchEvent('click'); await p.locator('[data-testid=stripe-charge]').first().waitFor({ timeout: 20000 }).catch(() => {});
      ok('Panel fundador: ingresos Stripe TEST con botón Reembolsar', (await has(p, 'stripe-charge')) > 0 && (await has(p, 'stripe-refund')) > 0 && /TEST/.test(await card.textContent()));
    } else ok('Panel fundador: tarjeta Stripe presente', false, 'no visible'); }
  ok(`${lang} sin errores JS`, errs.length === 0, errs.join(' | ').slice(0, 200)); await ctx.close();
}
await b.close(); console.log(`\nStripe UI QA: ${pass} OK, ${fail} FALLA`); process.exit(fail ? 1 : 0);
