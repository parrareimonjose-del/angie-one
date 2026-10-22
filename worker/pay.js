// Pagos web con Stripe (Checkout de suscripción + Portal del cliente + webhook firmado). Precio único mundial:
// angieone_premium_monthly = 2,49 USD/mes · angieone_premium_yearly = 24,99 USD/año (lookup_key, sin IDs fijos).
// Secretos solo en el Worker: STRIPE_SK (sk_test_ hoy; sk_live_ solo con PAY_LIVE=1) y STRIPE_WHSEC. Nunca en la app.
// KV (FOODS): pay:uid:<uid> → {customer, sub, plan, status, renewAt, test} · pay:cus:<customer> → uid · pay:led:<ts>:<id> → movimiento.
const API = 'https://api.stripe.com/v1/';
const okUid = (u) => /^[a-z0-9]{16,40}$/.test(String(u || ''));
const okKey = (req, env) => !!env.FOUNDER_KEY && req.headers.get('x-founder-key') === env.FOUNDER_KEY;
const LOOKUP = { monthly: 'angieone_premium_monthly', yearly: 'angieone_premium_yearly' };
export const payMode = (env) => (!env.STRIPE_SK ? 'off' : env.STRIPE_SK.startsWith('sk_live_') ? (env.PAY_LIVE === '1' ? 'live' : 'off') : 'test');
function form(o, p = '', out = []) {
  for (const [k, v] of Object.entries(o)) { const key = p ? `${p}[${k}]` : k;
    if (v && typeof v === 'object') form(v, key, out); else if (v !== undefined && v !== null) out.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(v))); }
  return out.join('&');
}
export async function stripe(env, method, path, body) {
  const r = await fetch(API + path, { method, headers: { authorization: 'Bearer ' + env.STRIPE_SK, 'content-type': 'application/x-www-form-urlencoded' }, body: body ? form(body) : undefined });
  const o = await r.json(); if (!r.ok) throw new Error(o?.error?.code || o?.error?.type || 'stripe'); return o;
}
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
/** Verifica la cabecera Stripe-Signature (HMAC-SHA256 de "t.cuerpo", tolerancia 5 min, comparación en tiempo constante). */
export async function verifySig(raw, header, secret, now = Date.now()) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map((x) => x.split('=')).filter((x) => x.length === 2).map(([k, v]) => [k, v]));
  const v1s = header.split(',').filter((x) => x.startsWith('v1=')).map((x) => x.slice(3)); const t = +parts.t;
  if (!t || !v1s.length || Math.abs(now / 1000 - t) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${raw}`)));
  return v1s.some((v) => v.length === sig.length && [...v].reduce((a, c, i) => a | (c.charCodeAt(0) ^ sig.charCodeAt(i)), 0) === 0);
}
const get = async (env, k) => { const r = await env.FOODS.get(k); return r ? JSON.parse(r) : null; };
const put = (env, k, v) => env.FOODS.put(k, JSON.stringify(v));
async function ledger(env, kind, o) { const ts = Date.now(); await put(env, `pay:led:${ts}:${o.id}`, { kind, ts, ...o }); }
async function setSub(env, s) {
  const uid = s.metadata?.uid || (await env.FOODS.get('pay:cus:' + s.customer)); if (!okUid(uid)) return;
  const item = s.items?.data?.[0]; const interval = item?.price?.recurring?.interval;
  const rec = { customer: s.customer, sub: s.id, plan: interval === 'year' ? 'yearly' : 'monthly', status: s.status, cancelAt: s.cancel_at_period_end ? (s.current_period_end || item?.current_period_end) * 1000 : 0,
    renewAt: ((s.current_period_end || item?.current_period_end || 0) * 1000), active: ['active', 'trialing'].includes(s.status), test: !s.livemode, updated: Date.now() };
  await put(env, 'pay:uid:' + uid, rec); await env.FOODS.put('pay:cus:' + s.customer, uid);
}
export async function handlePay(path, req, env, json, h) {
  const mode = payMode(env);
  if (path === '/pay/webhook') {
    const raw = await req.text(); if (!(await verifySig(raw, req.headers.get('stripe-signature'), env.STRIPE_WHSEC))) return json({ error: 'signature' }, 400, h);
    const ev = JSON.parse(raw); const o = ev.data?.object || {};
    if (await env.FOODS.get('pay:ev:' + ev.id)) return json({ ok: true, dup: true }, 200, h); // idempotente
    if (ev.type === 'checkout.session.completed' && okUid(o.client_reference_id) && o.customer) await env.FOODS.put('pay:cus:' + o.customer, o.client_reference_id);
    if (ev.type === "checkout.session.completed" && o.subscription) await setSubFromId(env, o.subscription);
    if (ev.type.startsWith('customer.subscription.')) await setSub(env, o);
    if (ev.type === 'invoice.paid') await ledger(env, 'charge', { id: o.id, charge: o.charge || '', pi: o.payment_intent || '', amount: o.amount_paid, currency: o.currency, customer: o.customer, sub: o.subscription || o.parent?.subscription_details?.subscription || '', test: !ev.livemode });
    if (ev.type === 'charge.refunded') await ledger(env, 'refund', { id: o.id + ':r', charge: o.id, amount: o.amount_refunded, currency: o.currency, customer: o.customer, test: !ev.livemode });
    if (ev.type === 'invoice.payment_failed') await ledger(env, 'failed', { id: o.id + ':f', amount: o.amount_due, currency: o.currency, customer: o.customer, test: !ev.livemode });
    await env.FOODS.put('pay:ev:' + ev.id, '1', { expirationTtl: 7 * 86400 });
    return json({ ok: true }, 200, h);
  }
  if (req.method !== 'POST') return json({ error: 'method' }, 405, h);
  let b; try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400, h); }
  if (path === '/pay/mode') return json({ mode }, 200, h);
  if (mode === 'off') return json({ error: 'not_configured', mode }, 503, h);
  if (path === '/pay/checkout') {
    if (!okUid(b.uid) || !LOOKUP[b.plan]) return json({ error: 'bad' }, 400, h);
    const back = /^https:\/\/parrareimonjose-del\.github\.io\/angie-one\/|^http:\/\/localhost(:\d+)?\//.test(String(b.back || '')) ? String(b.back).split('?')[0] : 'https://parrareimonjose-del.github.io/angie-one/paywall';
    const pr = await stripe(env, 'GET', 'prices?lookup_keys[]=' + LOOKUP[b.plan] + '&active=true');
    if (!pr.data?.[0]) return json({ error: 'no_price' }, 500, h);
    const cur = await get(env, 'pay:uid:' + b.uid);
    const s = await stripe(env, 'POST', 'checkout/sessions', { mode: 'subscription', client_reference_id: b.uid, line_items: { 0: { price: pr.data[0].id, quantity: 1 } },
      ...(cur?.customer ? { customer: cur.customer } : {}), subscription_data: { metadata: { uid: b.uid, app: 'angie-one' } }, metadata: { uid: b.uid, app: 'angie-one' },
      success_url: back + '?pay=ok', cancel_url: back + '?pay=cancel', locale: 'auto' });
    return json({ url: s.url, mode }, 200, h);
  }
  if (path === '/pay/status') { if (!okUid(b.uid)) return json({ error: 'bad' }, 400, h); const r = await get(env, 'pay:uid:' + b.uid);
    return json(r ? { active: r.active && r.renewAt > Date.now(), plan: r.plan, renewAt: r.renewAt, cancelAt: r.cancelAt || 0, test: r.test, mode } : { active: false, mode }, 200, h); }
  if (path === '/pay/portal') { if (!okUid(b.uid)) return json({ error: 'bad' }, 400, h); const r = await get(env, 'pay:uid:' + b.uid); if (!r?.customer) return json({ error: 'no_customer' }, 404, h);
    const back = /^https:\/\/parrareimonjose-del\.github\.io\/angie-one\/|^http:\/\/localhost(:\d+)?\//.test(String(b.back || '')) ? String(b.back).split('?')[0] : 'https://parrareimonjose-del.github.io/angie-one/subscription';
    const p = await stripe(env, 'POST', 'billing_portal/sessions', { customer: r.customer, return_url: back }); return json({ url: p.url }, 200, h); }
  if (path === '/pay/ledger') { if (!okKey(req, env)) return json({ error: 'auth' }, 401, h);
    const l = await env.FOODS.list({ prefix: 'pay:led:' }); const items = [];
    for (const k of l.keys.slice(-200)) { const v = await get(env, k.name); if (v) items.push(v); }
    return json({ items: items.sort((a, b2) => b2.ts - a.ts), mode }, 200, h); }
  if (path === '/pay/refund') { if (!okKey(req, env)) return json({ error: 'auth' }, 401, h);
    const charge = String(b.charge || ''); let pi = String(b.pi || '');
    if (/^in_/.test(String(b.invoice || '')) && !pi) { const ip = await stripe(env, 'GET', 'invoice_payments?invoice=' + b.invoice); pi = ip.data?.[0]?.payment?.payment_intent || ''; if (!b.sub) { const inv = await stripe(env, 'GET', 'invoices/' + b.invoice); b.sub = inv.parent?.subscription_details?.subscription || inv.subscription || ''; } }
    if (!/^(ch|py)_/.test(charge) && !/^pi_/.test(pi)) return json({ error: 'bad' }, 400, h);
    const rf = await stripe(env, 'POST', 'refunds', pi ? { payment_intent: pi } : { charge }); if (b.sub && /^sub_/.test(b.sub)) await stripe(env, 'DELETE', 'subscriptions/' + b.sub);
    return json({ ok: true, refund: rf.id, status: rf.status }, 200, h); }
  return json({ error: 'not found' }, 404, h);
}
async function setSubFromId(env, id) { try { await setSub(env, await stripe(env, 'GET', 'subscriptions/' + id)); } catch {} }
