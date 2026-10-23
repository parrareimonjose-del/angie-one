// KV guard: cualquier llamada al Worker de producción que un test NO haya simulado se redirige a `wrangler dev` local
// (KV local, misma IA). Así QA/eval no gastan el límite gratis de KV de Cloudflare. Uso: node --import ./tests/kvguard.mjs tests/qa-x.mjs
// LOCAL_WORKER (por defecto http://localhost:8812). KV_GUARD=off para desactivarlo (solo smoke test en vivo tras publicar).
import { createRequire } from 'node:module';
const LOCAL = process.env.LOCAL_WORKER || 'http://localhost:8812';
const PROD = /^https:\/\/angie-one-ai\.angieoneapp-support\.workers\.dev/;
export const stats = { forwarded: 0 };
async function guard(ctx) {
  await ctx.route(PROD, async (route) => {
    const r = route.request();
    if (r.method() === 'GET' && /\/foods\/(search|barcode|meta)/.test(r.url()) && process.env.KV_FOODS_LOCAL !== '1') return route.fallback(); // lecturas baratas (100k/día) de la base real, con Cache API delante
    const url = r.url().replace(PROD, LOCAL);
    try {
      // Conserva el Origin de la página (8801 público / 8803 paytest); si no, 8801.
      const origin = r.headers()['origin'] || r.headers()['Origin'] || 'http://localhost:8801';
      const res = await route.fetch({ url, headers: { ...r.headers(), origin } }); stats.forwarded++; await route.fulfill({ response: res });
    }
    catch { await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"local_worker_down"}' }); }
  });
}
function patch(mod) {
  for (const B of [mod.chromium, mod.webkit, mod.firefox].filter(Boolean)) {
    if (B.__kv) continue; B.__kv = 1; const launch = B.launch.bind(B);
    B.launch = async (...a) => { const b = await launch(...a); const nc = b.newContext.bind(b);
      b.newContext = async (...o) => { const c = await nc(...o); await guard(c); return c; };
      b.newPage = async (...o) => (await b.newContext(...o)).newPage(); return b; };
  }
}
if (process.env.KV_GUARD !== 'off') {
  const req = createRequire(import.meta.url);
  for (const p of ['playwright-core', '/workspace/e2e/node_modules/playwright-core/index.js']) { try { patch(req(p)); } catch {} }
}
