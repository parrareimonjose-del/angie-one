/** Base de alimentos en la nube (gratis): Worker /foods/* sobre Cloudflare KV + Open Food Facts (ODbL) + USDA FoodData Central.
 *  Si no hay internet o el servidor falla, la app sigue con la lista local (verified.ts) y Open Food Facts directo. */
import { APP_AI } from './ai-config';
import type { VFood } from './verified';
import type { Product } from './off';
export const FOODS_BASE = APP_AI.workerBase + '/foods';
export const ATTRIBUTION = 'Open Food Facts (ODbL) · USDA FoodData Central';
export type RFood = { i: string; n: Record<string, string>; b?: string; bc?: string; k: number; p: number; c: number; f: number; fb?: number; sg?: number; na?: number; sv?: [string, number | null]; s: 'usda' | 'off' | 'angie'; v: 0 | 1; ps?: 1; img?: string; mi?: import('./yazio5').Micro };
const r1 = (x: number) => Math.round(x * 10) / 10;
export const rname = (r: RFood, lang: string) => (r.n[lang] || r.n.es || r.n.en || r.n.pt || Object.values(r.n)[0] || '?') + (r.b ? ` · ${r.b}` : '');
/** Convierte a una fila de la app: por porción si se conoce en gramos, si no por 100 g. */
export function toVFood(r: RFood, lang: string): VFood {
  const g = r.sv && r.sv[1] && !r.ps ? +r.sv[1] : 0; const m = r.ps ? 1 : g ? g / 100 : 1;
  const portion = r.ps ? r.sv?.[0] || '1' : g ? `${r.sv![0]}${/\d\s*g/.test(r.sv![0]) ? '' : ` (${Math.round(g)} g)`}` : '100 g';
  return { id: r.i, key: 'db:' + r.i, name: rname(r, lang), brand: r.b, portion, kcal: Math.round(r.k * m), p: r1(r.p * m), c: r1(r.c * m), f: r1(r.f * m), fiber: r.fb == null ? undefined : r1(r.fb * m),
    verified: !!r.v, source: r.s === 'angie' ? 'curated' : r.s };
}
export function toProduct(r: RFood, lang: string): Product {
  return { name: rname(r, lang), kcal100: r.k, p100: r.p, c100: r.c, f100: r.f, fiber100: r.fb, sugar100: r.sg, salt100: r.na == null ? undefined : r1((r.na / 1000) * 2.5), micro100: r.mi, image: r.img, verified: !!r.v, source: r.s };
}
async function get(url: string, ms = 7000) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('offline');
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { signal: ctl.signal }); return r; } finally { clearTimeout(tm); }
}
export async function searchCloud(q: string, lang: string, cc = ''): Promise<VFood[]> {
  const r = await get(`${FOODS_BASE}/search?q=${encodeURIComponent(q.trim().slice(0, 80))}&lang=${lang}&cc=${cc.toLowerCase()}`);
  if (!r.ok) throw new Error('server'); const j = await r.json(); return ((j.items || []) as RFood[]).map((x) => toVFood(x, lang));
}
/** null = no existe; lanza error si no hay red/servidor (la app usa entonces Open Food Facts directo). */
export async function barcodeCloud(code: string, lang: string): Promise<Product | null> {
  const r = await get(`${FOODS_BASE}/barcode?code=${encodeURIComponent(code.replace(/\D/g, ''))}`, 12000);
  if (r.status === 404) return null; if (!r.ok) throw new Error('server');
  const j = await r.json(); return j.item ? toProduct(j.item, lang) : null;
}
export async function reportCloud(rep: { id: string; name: string; reason: string }) {
  try { await fetch(APP_AI.workerBase + '/foods/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rep) }); } catch { /* queda en el teléfono */ }
}
