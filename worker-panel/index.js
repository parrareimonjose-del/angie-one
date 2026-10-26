// Angie One → Panel Maestro de Parra Apps (aprobado por José, 26-oct-2026).
// GET /api/v1/panel-maestro/summary  ·  Authorization: Bearer pm_<64 hex>  ·  solo agregados (sin salud, sin datos personales).
// Secreto: PM_TOKEN_SHA256 (hash del código; el código nunca se guarda). Solo lee el KV.
const ORIGINS = ['https://panel-maestro.pages.dev', 'http://localhost:8123'];
const sha = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((x) => x.toString(16).padStart(2, '0')).join('');
async function list(env, prefix, withMeta) { const out = []; let cursor; do { const r = await env.FOODS.list({ prefix, cursor }); out.push(...r.keys); cursor = r.list_complete ? null : r.cursor; } while (cursor && out.length < 20000); return out; }
let cache = null;
async function summary(env) {
  if (cache && Date.now() - cache.t < 300e3) return cache.s;
  const [backups, subs, leds, grants] = await Promise.all([list(env, 'u:'), list(env, 'pay:uid:'), list(env, 'pay:led:'), list(env, 'grant:')]);
  let gross = 0, refunds = 0, testCharges = 0, charges = 0, active = 0, testSubs = 0;
  for (const k of leds.slice(-500)) { const e = await env.FOODS.get(k.name, 'json'); if (!e) continue; if (e.test) { testCharges++; continue; }
    if (e.kind === 'charge') { charges++; gross += (+e.amount || 0) / 100; } if (e.kind === 'refund') refunds += (+e.amount || 0) / 100; }
  for (const k of subs.slice(0, 500)) { const r = await env.FOODS.get(k.name, 'json'); if (!r) continue; if (r.test) testSubs++; else if (['active', 'trialing'].includes(r.status)) active++; }
  const net = Math.round((gross - refunds) * 100) / 100, b = (p) => (charges ? Math.round(net * p) / 100 : null);
  const s = { schema: 'parra-apps/panel-maestro-summary@1',
    app: { id: 'angie-one', name: 'Angie One', emoji: '🥗', color: '#E11D48', version: 'web', founderPanelUrl: 'https://parrareimonjose-del.github.io/angie-one/' },
    generatedAt: new Date().toISOString(), sampleData: false,
    cards: [['Copias en la nube', backups.length], ['Suscripciones activas (reales)', active], ['Cobros reales', charges], ['Premium regalados', grants.length]],
    metrics: { cloudBackups: backups.length, activeSubs: active, testSubs, charges, testCharges, grants: grants.length },
    revenue: { note: charges ? `Neto real ${net.toFixed(2)} USD (cobros − reembolsos)` : 'Aún no hay cobros reales.', currency: 'USD' },
    socialFund: { rule: 'Sin donaciones ni fondos de impacto. Solo reparto 60/25/15.' },
    revenueSplit: { rule: '60% fundador / 25% app (crecimiento) / 15% impuestos', buckets: [{ key: 'jose', name: 'Para José', pct: 60, balanceUsd: b(60) }, { key: 'growth', name: 'Crecimiento', pct: 25, balanceUsd: b(25) }, { key: 'reserve', name: 'Impuestos', pct: 15, balanceUsd: b(15) }], pendingApprovals: 0 },
    approvals: { pending: 0, kinds: [] }, privacy: { healthDataIncluded: false, personalData: false } };
  cache = { t: Date.now(), s }; return s;
}
export default { async fetch(req, env) {
  const o = req.headers.get('Origin') || '', h = ORIGINS.includes(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization', Vary: 'Origin' } : {};
  const j = (x, s) => new Response(JSON.stringify(x), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  if (req.method !== 'GET' || new URL(req.url).pathname !== '/api/v1/panel-maestro/summary') return j({ error: 'not found' }, 404);
  const t = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!/^pm_[0-9a-f]{64}$/.test(t) || !env.PM_TOKEN_SHA256 || (await sha(t)) !== env.PM_TOKEN_SHA256) return j({ error: 'auth' }, 401);
  return j(await summary(env), 200);
} };
