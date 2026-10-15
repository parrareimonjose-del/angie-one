/** Lista verificada de alimentos (queja nº 4 de MyFitnessPal: duplicados y datos erróneos).
 *  Una sola entrada canónica por alimento (nombre normalizado + marca); las verificadas salen primero y llevan «Verificado ✓».
 *  Valores por porción de USDA FoodData Central (dominio público, gratis) y la base latina curada de Angie One.
 *  Los reportes de datos erróneos se guardan en el teléfono y van a la cola de revisión del panel del fundador (sin servidor aún). */
import { LATIN_FOODS } from './foods';

export type VFood = { id: string; key: string; nameKey?: string; name?: string; brand?: string; portion: string; kcal: number; p: number; c: number; f: number; fiber?: number;
  verified: boolean; source: 'usda' | 'curated' | 'off' | 'user'; reports?: number; alt?: string[] };
const U = (id: string, portion: string, kcal: number, p: number, c: number, f: number, fiber: number, fdc: string): VFood =>
  ({ id, key: '', nameKey: `vf.${id}`, portion, kcal, p, c, f, fiber, verified: true, source: 'usda', name: fdc });
/** USDA FDC (SR Legacy / Foundation), porción indicada. `name` guarda el nombre en inglés de USDA para normalizar. */
export const USDA: VFood[] = [
  U('banana', '1 u (118 g)', 105, 1.3, 27, 0.4, 3.1, 'Banana'), U('apple', '1 u (182 g)', 95, 0.5, 25, 0.3, 4.4, 'Apple'),
  U('orange', '1 u (131 g)', 62, 1.2, 15, 0.2, 3.1, 'Orange'), U('egg', '1 u (50 g)', 78, 6.3, 0.6, 5.3, 0, 'Egg boiled'),
  U('oatmeal', '1 taza (234 g)', 166, 5.9, 28, 3.6, 4, 'Oatmeal cooked'), U('milk', '1 taza (244 g)', 149, 7.7, 12, 8, 0, 'Whole milk'),
  U('yogurt', '170 g', 100, 17, 6, 0.7, 0, 'Greek yogurt plain nonfat'), U('wwbread', '1 rebanada (32 g)', 81, 4, 14, 1.1, 1.9, 'Whole wheat bread'),
  U('chicken', '100 g', 165, 31, 0, 3.6, 0, 'Chicken breast cooked'), U('salmon', '100 g', 206, 22, 0, 12, 0, 'Salmon cooked'),
  U('tuna', '1 lata (165 g)', 191, 42, 0, 1.4, 0, 'Tuna canned in water'), U('pbutter', '2 cdas (32 g)', 190, 7, 7, 16, 1.9, 'Peanut butter'),
  U('almonds', '28 g', 164, 6, 6, 14, 3.5, 'Almonds'), U('broccoli', '1 taza (91 g)', 31, 2.5, 6, 0.3, 2.4, 'Broccoli raw'),
  U('sweetpotato', '1 u (130 g)', 103, 2.3, 24, 0.2, 3.8, 'Sweet potato baked'), U('lentils', '1 taza (198 g)', 230, 18, 40, 0.8, 15.6, 'Lentils cooked'),
  U('tortilla', '1 u (26 g)', 52, 1.4, 11, 0.7, 1.5, 'Corn tortilla'), U('cheddar', '28 g', 114, 7, 0.4, 9.4, 0, 'Cheddar cheese'),
];
const CURATED: VFood[] = LATIN_FOODS.map((x) => ({ id: x.id, key: '', nameKey: `foods.${x.id}`, name: x.name.en, alt: [x.name.es, x.name.pt], portion: x.portion, kcal: x.kcal, p: x.p, c: x.c, f: x.f, verified: true, source: 'curated' }));

const STOP = new Set(['de', 'con', 'la', 'el', 'y', 'a', 'the', 'with', 'and', 'of', 'in', 'raw', 'cooked', 'crudo', 'cocido', 'u']);
/** Clave canónica: minúsculas, sin acentos ni signos, sin palabras vacías, singular simple, palabras ordenadas, + marca. */
export function normKey(name: string, brand = '') {
  const w = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter((x) => x && !STOP.has(x)).map((x) => (x.length > 4 && x.endsWith('es') ? x.slice(0, -2) : x.length > 3 && x.endsWith('s') ? x.slice(0, -1) : x));
  return [...new Set(w(name))].sort().join(' ') + (brand ? '|' + w(brand).join(' ') : '');
}
/** Una entrada por clave: gana la verificada; entre iguales, la de más reportes pierde. */
export function dedupe(list: VFood[], label?: (f: VFood) => string): VFood[] {
  const m = new Map<string, VFood>(); const alias = new Map<string, string>();
  for (const x of list) {
    const names = [x.name || x.id, ...(x.alt || []), ...(label && x.nameKey ? [label(x)] : [])].map((n) => normKey(n, x.brand));
    const k = x.key || names[0]; const hit = names.map((n) => alias.get(n)).find(Boolean) || k; const y = { ...x, key: hit }; const cur = m.get(hit);
    if (!cur || (y.verified && !cur.verified) || (y.verified === cur.verified && (y.reports || 0) < (cur.reports || 0))) m.set(hit, y);
    names.forEach((n) => { if (!alias.has(n)) alias.set(n, hit); });
  }
  return [...m.values()];
}
export const BASE: VFood[] = dedupe([...USDA, ...CURATED]);
/** Busca en la base canónica (+ alimentos propios del usuario). Orden: verificados primero, luego mejor coincidencia. */
export function searchFoods(q: string, label: (f: VFood) => string, extra: VFood[] = []) {
  const all = dedupe([...BASE, ...extra], label); const nq = normKey(q); const words = nq.split(' ').filter(Boolean);
  const score = (f: VFood) => { const hay = normKey(label(f) + ' ' + (f.name || '')); if (!words.length) return 1; const hit = words.filter((w) => hay.includes(w)).length; return hit === words.length ? 2 + (hay.startsWith(words[0]) ? 1 : 0) : 0; };
  return all.map((f) => ({ f, sc: score(f) })).filter((x) => x.sc > 0).sort((a, b) => Number(b.f.verified) - Number(a.f.verified) || b.sc - a.sc || label(a.f).localeCompare(label(b.f))).map((x) => x.f);
}
export type Report = { key: string; name: string; reason: 'kcal' | 'macros' | 'portion' | 'dup'; at: number };
export const REASONS = ['kcal', 'macros', 'portion', 'dup'] as const;
