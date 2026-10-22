// E2E Stripe MODO PRUEBA contra `wrangler dev` local (KV local) + `stripe listen` → /pay/webhook. Nunca imprime claves.
import { chromium } from 'playwright-core';
const W = process.env.LOCAL_WORKER || 'http://localhost:8812', SK = process.env.STRIPE_TEST_SK, FK = process.env.FOUNDER_KEY;
if (!SK?.startsWith('sk_test_')) { console.log('FALLA: solo modo prueba'); process.exit(1); }
let pass = 0, fail = 0; const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log((c ? 'OK   ' : 'FALLA ') + n + (c ? '' : ' ' + x)); };
const H = { 'content-type': 'application/json', origin: 'http://localhost:8801' };
const call = async (p, b, extra = {}) => { const r = await fetch(W + p, { method: 'POST', headers: { ...H, ...extra }, body: JSON.stringify(b) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const api = async (m, p, body) => { const r = await fetch('https://api.stripe.com/v1/' + p, { method: m, headers: { authorization: 'Bearer ' + SK, 'content-type': 'application/x-www-form-urlencoded' }, body }); return r.json(); };
const uid = () => [...crypto.getRandomValues(new Uint8Array(12))].map((x) => x.toString(36).padStart(2, '0')).join('').slice(0, 24);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms = 30000) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await f(); if (v) return v; await sleep(1500); } return null; };
const status = async (u) => (await call('/pay/status', { uid: u })).j;

ok('modo = test', (await call('/pay/mode', {})).j.mode === 'test');
ok('webhook sin firma → 400', (await fetch(W + '/pay/webhook', { method: 'POST', body: '{"id":"evt_x","type":"invoice.paid","data":{"object":{}}}' })).status === 400);
ok('webhook firma falsa → 400', (await fetch(W + '/pay/webhook', { method: 'POST', headers: { 'stripe-signature': 't=' + Math.floor(Date.now() / 1000) + ',v1=' + 'a'.repeat(64) }, body: '{}' })).status === 400);
ok('ledger sin clave → 401', (await call('/pay/ledger', {})).s === 401);
ok('refund sin clave → 401', (await call('/pay/refund', { charge: 'ch_x' })).s === 401);
ok('checkout uid inválido → 400', (await call('/pay/checkout', { uid: 'x', plan: 'monthly' })).s === 400);
ok('checkout plan inválido → 400', (await call('/pay/checkout', { uid: uid(), plan: 'latam' })).s === 400);

const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
async function checkout(plan, card, expect) {
  const u = uid(); const r = await call('/pay/checkout', { uid: u, plan, back: 'http://localhost:8801/paywall' });
  ok(`${plan}/${expect}: sesión Checkout creada`, r.s === 200 && /^https:\/\/checkout\.stripe\.com\//.test(r.j.url), JSON.stringify(r.j));
  const sid = r.j.url?.match(/cs_test_[A-Za-z0-9]+/)?.[0]; const ses = sid ? await api('GET', 'checkout/sessions/' + sid + '?expand[]=line_items') : {};
  ok(`${plan}: precio ${plan === 'monthly' ? '2,49/mes' : '24,99/año'}`, ses.amount_total === (plan === 'monthly' ? 249 : 2499) && ses.currency === 'usd' && ses.mode === 'subscription' && ses.livemode === false);
  const p = await (await b.newContext({ locale: 'es-ES' })).newPage();
  await p.goto(r.j.url, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#email', { timeout: 40000 }); if (!(await p.locator('#cardNumber').isVisible().catch(() => false))) await p.locator('[data-testid=card-accordion-item-button]').dispatchEvent('click').catch(() => {}); await p.waitForSelector('#cardNumber', { timeout: 40000 });
  await p.fill('#email', `qa+${u}@example.com`); await p.fill('#cardNumber', card); await p.fill('#cardExpiry', '12 / 34'); await p.fill('#cardCvc', '123'); await p.fill('#billingName', 'QA Test');
  const zip = p.locator('#billingPostalCode'); if (await zip.isVisible().catch(() => false)) await zip.fill('10001');
  const cty = p.locator('#billingCountry'); if (await cty.isVisible().catch(() => false)) await cty.selectOption('US').catch(() => {});
  const lk = p.locator('#enableStripePass'); if (await lk.isChecked().catch(() => false)) await lk.dispatchEvent('click'); await p.waitForTimeout(800); await p.locator('.SubmitButton').dispatchEvent('click'); await p.waitForTimeout(9000); await p.screenshot({ path: '/tmp/co-' + expect + '-' + plan + '.png', fullPage: true });
  if (expect === '3ds') {
    const f = await until(async () => p.frames().find((fr) => /3ds|challenge|authorize/i.test(fr.url()) && fr.url().includes('stripe')), 30000);
    let done = false; for (let i = 0; i < 20 && !done; i++) { for (const fr of p.frames()) { const btn = fr.locator('#test-source-authorize-3ds, button:has-text("Complete"), button:has-text("Completar")'); if (await btn.count().catch(() => 0)) { await btn.first().click().catch(() => {}); done = true; break; } } await sleep(1500); }
    ok('3DS: desafío mostrado y aprobado', !!f && done);
  }
  if (expect === 'declined') {
    const txt = await until(async () => /rechaz|declin/i.test(await p.textContent('body').catch(() => '')) ? 1 : 0, 30000);
    ok('tarjeta rechazada: error visible, sin Premium', !!txt && !(await status(u)).active);
    await p.context().close(); return { u };
  }
  const landed = await until(async () => /^http:\/\/localhost:8801\/(angie-one\/)?paywall\?pay=ok/.test(p.url()), 45000);
  ok(`${plan}/${expect}: vuelve a la app con ?pay=ok`, !!landed, p.url().slice(0, 60));
  const st = await until(async () => { const s = await status(u); return s.active ? s : null; }, 40000);
  ok(`${plan}/${expect}: webhook da Premium`, !!st && st.plan === plan && st.test === true && st.renewAt > Date.now() + (plan === 'monthly' ? 25 : 360) * 864e5, JSON.stringify(st));
  await p.context().close(); return { u, st };
}
const m = await checkout('monthly', '4242424242424242', 'ok');
const y = await checkout('yearly', '4242424242424242', 'ok');
await checkout('monthly', '4000000000000002', 'declined');
const t = await checkout('monthly', '4000002500003155', '3ds');

// Portal para cancelar
const pr = await call('/pay/portal', { uid: m.u, back: 'http://localhost:8801/subscription' });
ok('Portal del cliente (cancelar) abre', pr.s === 200 && /billing\.stripe\.com/.test(pr.j.url || ''));
ok('portal uid sin cliente → 404', (await call('/pay/portal', { uid: uid() })).s === 404);
// Cancelar al final del periodo (lo que hace el Portal) → sigue Premium hasta renewAt
const cus = await api('GET', 'customers/search?query=' + encodeURIComponent(`email:'qa+${m.u}@example.com'`));
const sub = (await api('GET', 'subscriptions?customer=' + cus.data?.[0]?.id)).data?.[0];
await api('POST', 'subscriptions/' + sub.id, 'cancel_at_period_end=true');
const c1 = await until(async () => { const s = await status(m.u); return s.cancelAt ? s : null; });
ok('cancelar (fin de periodo): sigue Premium y muestra fecha', !!c1 && c1.active && c1.cancelAt > Date.now());
await api('DELETE', 'subscriptions/' + sub.id);
ok('cancelación inmediata: webhook quita Premium', !!(await until(async () => !(await status(m.u)).active)));

// Panel del fundador: ingresos y reembolso
const led = await until(async () => { const l = (await call('/pay/ledger', {}, { 'x-founder-key': FK })).j; return l.items?.filter((i) => i.kind === 'charge').length >= 3 ? l : null; }, 40000);
ok('Panel fundador: cobros registrados (mensual 249 + anual 2499)', !!led && led.items.some((i) => i.kind === 'charge' && i.amount === 249) && led.items.some((i) => i.kind === 'charge' && i.amount === 2499) && led.items.every((i) => i.test));
const ych = led?.items.find((i) => i.kind === 'charge' && i.amount === 2499);
const rf = await call('/pay/refund', { invoice: ych.id }, { 'x-founder-key': FK });
ok('reembolso solo por acción del fundador: OK', rf.s === 200 && rf.j.ok, JSON.stringify(rf.j));
ok('reembolso visible en el Panel', !!(await until(async () => (await call('/pay/ledger', {}, { 'x-founder-key': FK })).j.items?.some((i) => i.kind === 'refund' && i.amount === 2499))));
ok('reembolso + cancelación: webhook quita Premium (anual)', !!(await until(async () => !(await status(y.u)).active)));
ok('3DS sigue Premium', (await status(t.u)).active);
await b.close();
console.log(`\nStripe TEST E2E: ${pass} OK, ${fail} FALLA`); process.exit(fail ? 1 : 0);
