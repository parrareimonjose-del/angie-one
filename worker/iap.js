// Apple In-App Purchase vía RevenueCat (decisión José 28-oct-2026). Mismo interruptor de Premium que Stripe:
// el estado se guarda por el mismo ID anónimo (uid) → iap:uid:<uid>; /iap/status combina Apple + Stripe.
// Secretos solo en el Worker: REVENUECAT_WEBHOOK_AUTH (cabecera Authorization que pone RevenueCat). REVENUECAT_ALLOW_SANDBOX=1 solo en pruebas.
// Libro: los ingresos de Apple se registran NETOS de la comisión (APPLE_TAKEHOME, por defecto 0,85) para que el reparto 55/5/25/15 cuadre.
const okUid = (u) => /^[a-z0-9]{16,40}$/.test(String(u || ''));
export const PRODUCT_PREFIX = 'angieone_premium_';
const get = async (env, k) => { const r = await env.FOODS.get(k); return r ? JSON.parse(r) : null; };
const put = (env, k, v) => env.FOODS.put(k, JSON.stringify(v));
const eq = (a, b) => a.length === b.length && [...a].reduce((x, c, i) => x | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;
export const isOurs = (e) => (e.subscriber_attributes?.app?.value === 'angieone') || String(e.product_id || '').startsWith(PRODUCT_PREFIX);
const GRANT = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE', 'SUBSCRIPTION_EXTENDED', 'TEMPORARY_ENTITLEMENT_GRANT', 'CANCELLATION', 'BILLING_ISSUE']);

/** Aplica un evento de RevenueCat. Devuelve una etiqueta de lo hecho (para pruebas). */
export async function applyRc(env, e, now = Date.now()) {
  const uid = [e.app_user_id, e.original_app_user_id, ...(e.aliases || [])].find(okUid);
  if (!uid) return 'no_uid';
  if (e.environment === 'SANDBOX' && env.REVENUECAT_ALLOW_SANDBOX !== '1') return 'sandbox_ignored';
  if (await env.FOODS.get('iap:ev:' + e.id)) return 'dup';
  const cur = (await get(env, 'iap:uid:' + uid)) || {};
  const exp = +e.expiration_at_ms || 0; const plan = /yearly/.test(e.product_id || '') ? 'yearly' : 'monthly';
  const refunded = e.type === 'CANCELLATION' && e.cancel_reason === 'CUSTOMER_SUPPORT' || (+e.price < 0);
  let rec = { ...cur, provider: 'apple', product: e.product_id || cur.product, plan, origTx: e.original_transaction_id || cur.origTx, test: e.environment === 'SANDBOX', updated: now };
  if (refunded) rec = { ...rec, active: false, refunded: true, renewAt: now };
  else if (e.type === 'EXPIRATION') rec = { ...rec, active: false, renewAt: exp || now };
  else if (GRANT.has(e.type) && !cur.refunded) {
    const grace = e.type === 'BILLING_ISSUE' ? 7 * 86400e3 : 0;
    rec = { ...rec, active: true, renewAt: Math.max(exp, now + grace), cancelAt: e.type === 'CANCELLATION' ? exp : 0 };
  }
  await put(env, 'iap:uid:' + uid, rec);
  const price = +e.price_in_purchased_currency || +e.price || 0;
  if (price && e.environment !== 'SANDBOX' && ['INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE', 'PRODUCT_CHANGE'].includes(e.type) || price < 0) {
    const take = +(env.APPLE_TAKEHOME || e.takehome_percentage || 0.85); const gross = Math.round(Math.abs(price) * 100);
    const netc = Math.round(gross * take);
    await put(env, `pay:led:${now}:${e.id}`, { kind: price < 0 ? 'refund' : 'charge', source: 'app_store', ts: now, id: e.id, amount: netc, gross, fee: gross - netc, currency: String(e.currency || 'usd').toLowerCase(), sub: rec.origTx || '', test: false });
  }
  await env.FOODS.put('iap:ev:' + e.id, '1', { expirationTtl: 14 * 86400 });
  return refunded ? 'refunded' : rec.active ? 'active' : 'inactive';
}

/** Un solo interruptor de Premium: Apple o Stripe activos para el mismo uid. */
export async function entitlement(env, uid, now = Date.now()) {
  const a = await get(env, 'iap:uid:' + uid); const s = await get(env, 'pay:uid:' + uid);
  const aOn = !!(a?.active && a.renewAt > now); const sOn = !!(s?.active && s.renewAt > now);
  const src = aOn ? a : sOn ? s : null;
  return { active: aOn || sOn, provider: aOn ? 'apple' : sOn ? 'stripe' : null, plan: src?.plan, renewAt: src?.renewAt || 0, cancelAt: src?.cancelAt || 0, test: !!src?.test };
}

/** Borrado de cuenta: elimina el estado de Apple y de Stripe (web) del uid. Cancela la suscripción Stripe si existe. */
export async function deleteUid(env, uid, cancelStripe) {
  const s = await get(env, 'pay:uid:' + uid);
  if (s?.sub && cancelStripe) { try { await cancelStripe(s.sub); } catch { /* se borra igual */ } }
  if (s?.customer) await env.FOODS.delete('pay:cus:' + s.customer);
  await env.FOODS.delete('pay:uid:' + uid); await env.FOODS.delete('iap:uid:' + uid);
  return { ok: true, hadStripe: !!s, cancelled: !!(s?.sub && cancelStripe) };
}

export async function handleIap(path, req, env, json, h, deps = {}) {
  if (path === '/iap/revenuecat-webhook') {
    if (req.method !== 'POST') return json({ error: 'method' }, 405, h);
    const want = env.REVENUECAT_WEBHOOK_AUTH || ''; const got = req.headers.get('authorization') || '';
    if (!want || !eq(got, want) && !eq(got, 'Bearer ' + want)) return json({ error: 'auth' }, 401, h);
    let b; try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400, h); }
    const e = b?.event || {}; if (!e.id) return json({ error: 'bad' }, 400, h);
    if (!isOurs(e)) return json({ ok: true, skipped: 'other_app' }, 200, h);
    return json({ ok: true, did: await applyRc(env, e) }, 200, h);
  }
  if (req.method !== 'POST') return json({ error: 'method' }, 405, h);
  let b; try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400, h); }
  if (!okUid(b.uid)) return json({ error: 'bad' }, 400, h);
  if (path === '/iap/status') return json(await entitlement(env, b.uid), 200, h);
  if (path === '/iap/delete') return json(await deleteUid(env, b.uid, deps.cancelStripe), 200, h);
  return json({ error: 'not found' }, 404, h);
}
