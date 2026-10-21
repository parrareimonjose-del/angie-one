/** 5 funciones que faltaban frente a Yazio (José 2026-10-21). Lógica pura, probada en tests/yazio5.test.ts.
 *  1) Calorías distintas por día de la semana  2) Ánimo, sensaciones y notas (bienestar, NO médico; nunca se vende)
 *  3) Vitaminas y minerales con %VD  4) Recetario con filtros + modo cocina  5) Diario personalizable + planificar comidas. */
import type { Entry } from './store';

// ---------- 1) Metas por día de la semana ----------
export type DayPlan = { mode: 'same' | 'weekend' | 'alt' | 'custom'; extra?: number; deltas?: number[] };
export const dow = (d: Date) => (d.getDay() + 6) % 7; // 0 = lunes
const epochDay = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
/** Diferencia en kcal frente a la meta base. "weekend": +extra sáb/dom y −2·extra/5 lun-vie (misma media). "alt": −extra/+extra alternos. "custom": una cifra por día. */
export function planDelta(p: DayPlan | undefined, d: Date): number {
  if (!p || p.mode === 'same') return 0; const x = Math.max(0, Math.min(800, p.extra ?? 300)); const w = dow(d);
  if (p.mode === 'weekend') return w >= 5 ? x : -Math.round((2 * x) / 5 / 10) * 10;
  if (p.mode === 'alt') return epochDay(d) % 2 === 0 ? -x : x;
  return Math.max(-800, Math.min(800, Math.round(p.deltas?.[w] || 0)));
}
/** Aplica el plan nunca por debajo del mínimo seguro. */
export const withPlan = (base: number, p: DayPlan | undefined, d: Date, min: number) => Math.max(min, Math.round((base + planDelta(p, d)) / 10) * 10);
export function weekTargets(base: number, p: DayPlan | undefined, min: number, d = new Date()) {
  const m = new Date(d); m.setDate(d.getDate() - dow(d));
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(m); x.setDate(m.getDate() + i); return withPlan(base, p, x, min); });
}
export const weekAvg = (a: number[]) => Math.round(a.reduce((s, x) => s + x, 0) / Math.max(1, a.length));

// ---------- 2) Ánimo, sensaciones y notas ----------
export type Wellness = { mood?: number; tags?: string[]; note?: string };
export const MOODS = ['😣', '😕', '😐', '🙂', '😄'];
export const FEEL = ['energy', 'tired', 'calm', 'stressed', 'hungry', 'full', 'bloated', 'cravings', 'sleptWell', 'sleptBad', 'focused', 'motivated'] as const;
export const NOTE_MAX = 500;
export function setWellness(all: Record<string, Wellness> | undefined, d: string, w: Wellness): Record<string, Wellness> {
  const tags = [...new Set((w.tags || []).filter((x) => (FEEL as readonly string[]).includes(x)))];
  const mood = w.mood && w.mood >= 1 && w.mood <= 5 ? Math.round(w.mood) : undefined; const note = (w.note || '').slice(0, NOTE_MAX);
  const next = { ...(all || {}) }; if (!mood && !tags.length && !note.trim()) delete next[d]; else next[d] = { mood, tags, note };
  return next;
}
export function wellnessWeek(all: Record<string, Wellness> | undefined, days: string[]) {
  const ws = days.map((d) => all?.[d]).filter(Boolean) as Wellness[]; const ms = ws.map((w) => w.mood).filter(Boolean) as number[];
  const cnt: Record<string, number> = {}; ws.forEach((w) => w.tags?.forEach((x) => (cnt[x] = (cnt[x] || 0) + 1)));
  return { days: ws.length, mood: ms.length ? Math.round((ms.reduce((a, b) => a + b, 0) / ms.length) * 10) / 10 : 0, top: Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k) };
}

// ---------- 3) Vitaminas y minerales ----------
/** Valores diarios FDA (adultos, 21 CFR 101.9). */
export const DV: Record<string, [number, 'mg' | 'µg']> = {
  vitA: [900, 'µg'], vitC: [90, 'mg'], vitD: [20, 'µg'], vitE: [15, 'mg'], vitK: [120, 'µg'], b1: [1.2, 'mg'], b2: [1.3, 'mg'], b3: [16, 'mg'], b6: [1.7, 'mg'],
  b9: [400, 'µg'], b12: [2.4, 'µg'], ca: [1300, 'mg'], fe: [18, 'mg'], mg: [420, 'mg'], p: [1250, 'mg'], k: [4700, 'mg'], zn: [11, 'mg'], na: [2300, 'mg'], se: [55, 'µg'],
};
export const VITS = ['vitA', 'vitC', 'vitD', 'vitE', 'vitK', 'b1', 'b2', 'b3', 'b6', 'b9', 'b12'];
export const MINS = ['ca', 'fe', 'mg', 'p', 'k', 'zn', 'na', 'se'];
export type Micro = Partial<Record<string, number>>;
const OFFK: Record<string, string> = { vitA: 'vitamin-a', vitC: 'vitamin-c', vitD: 'vitamin-d', vitE: 'vitamin-e', vitK: 'vitamin-k', b1: 'vitamin-b1', b2: 'vitamin-b2', b3: 'vitamin-pp',
  b6: 'vitamin-b6', b9: 'vitamin-b9', b12: 'vitamin-b12', ca: 'calcium', fe: 'iron', mg: 'magnesium', p: 'phosphorus', k: 'potassium', zn: 'zinc', na: 'sodium', se: 'selenium' };
const r2 = (x: number) => Math.round(x * 100) / 100;
/** Open Food Facts da g por 100 g → mg o µg. */
export function microFromOFF(n: Record<string, any> | undefined): Micro | undefined {
  if (!n) return undefined; const o: Micro = {};
  for (const [k, ok] of Object.entries(OFFK)) { const v = n[ok + '_100g']; if (v == null || v === '' || isNaN(+v) || +v < 0) continue; o[k] = r2(+v * (DV[k][1] === 'mg' ? 1000 : 1e6)); }
  return Object.keys(o).length ? o : undefined;
}
export const scaleMicro = (m: Micro | undefined, k: number): Micro | undefined => (m ? Object.fromEntries(Object.entries(m).map(([a, v]) => [a, r2((v || 0) * k)])) : undefined);
/** Referencias por 100 g (USDA FoodData Central, redondeadas) para estimar fotos por palabra clave. */
export const REF: { w: RegExp; kcal: number; m: Micro }[] = [
  { w: /pollo|chicken|frango|poulet|huhn/i, kcal: 165, m: { b3: 13.7, b6: 0.6, b12: 0.3, p: 228, k: 256, zn: 1, se: 27.6, fe: 1, mg: 29, na: 74 } },
  { w: /res|carne|beef|boeuf|rind|ropa vieja/i, kcal: 250, m: { b12: 2.6, zn: 6.3, fe: 2.6, b3: 5.4, b6: 0.4, p: 198, k: 318, se: 21, na: 72 } },
  { w: /pescado|salm[oó]n|fish|peixe|tuna|at[uú]n/i, kcal: 170, m: { vitD: 11, b12: 3.2, b3: 8, b6: 0.6, se: 36, p: 252, k: 384, mg: 30, na: 60 } },
  { w: /huevo|egg|ovo|oeuf/i, kcal: 143, m: { vitA: 160, vitD: 2, b2: 0.46, b12: 0.9, b9: 47, se: 31, p: 198, fe: 1.8, zn: 1.3, ca: 56, na: 142 } },
  { w: /arroz|rice/i, kcal: 130, m: { b1: 0.1, b3: 1.5, mg: 12, p: 43, fe: 0.2, k: 35, zn: 0.5, se: 7.5, na: 1 } },
  { w: /frijol|caraota|bean|feij[aã]o|lenteja|lentil/i, kcal: 130, m: { b9: 140, fe: 2.5, mg: 45, k: 400, p: 140, zn: 1.1, b1: 0.2, ca: 30, na: 2 } },
  { w: /arepa|ma[ií]z|corn|tortilla/i, kcal: 220, m: { b1: 0.2, b3: 1.5, fe: 1.3, mg: 50, p: 140, k: 150, zn: 0.9, ca: 80, na: 300 } },
  { w: /queso|cheese|queijo|fromage/i, kcal: 300, m: { ca: 600, p: 400, vitA: 200, b12: 1, zn: 3, na: 600, se: 14 } },
  { w: /leche|yogur|milk|leite|iogurte/i, kcal: 61, m: { ca: 120, vitD: 1.2, b2: 0.18, b12: 0.45, p: 95, k: 150, vitA: 46, na: 45 } },
  { w: /avena|oat|aveia/i, kcal: 380, m: { b1: 0.7, mg: 140, p: 420, fe: 4.5, zn: 3.6, k: 360, se: 28, na: 6 } },
  { w: /pl[aá]tano|banan|guineo/i, kcal: 89, m: { vitC: 8.7, b6: 0.37, k: 358, mg: 27, b9: 20 } },
  { w: /naranja|orange|laranja|mango|papaya|lechosa|pi[ñn]a|fruta|fruit/i, kcal: 55, m: { vitC: 45, vitA: 30, b9: 25, k: 180, ca: 20, mg: 10 } },
  { w: /espinaca|spinach|br[oó]coli|broccoli|ensalada|salad|verdura|vegetable|lechuga/i, kcal: 30, m: { vitK: 200, vitA: 300, vitC: 40, b9: 120, ca: 70, fe: 1.5, mg: 50, k: 400, na: 40 } },
  { w: /aguacate|avocado|abacate/i, kcal: 160, m: { vitK: 21, vitE: 2.1, b9: 81, k: 485, mg: 29, b6: 0.26, vitC: 10, na: 7 } },
  { w: /papa|patata|potato|batata|yuca/i, kcal: 90, m: { vitC: 13, b6: 0.3, k: 420, mg: 23, p: 57, fe: 0.8, na: 6 } },
  { w: /pan|bread|p[aã]o|toast/i, kcal: 260, m: { b1: 0.4, b3: 4.5, b9: 100, fe: 3, se: 25, ca: 140, mg: 40, na: 480 } },
];
export function estimateMicro(name: string, kcal: number): Micro | undefined {
  const r = REF.find((x) => x.w.test(name)); if (!r || !kcal) return undefined; return scaleMicro(r.m, kcal / r.kcal);
}
export function dayMicro(es: (Entry & { micro?: Micro; planned?: boolean })[]) {
  const sum: Record<string, number> = {}; let known = 0; const eat = es.filter((e) => !e.planned);
  eat.forEach((e) => { if (e.micro) { known++; Object.entries(e.micro).forEach(([k, v]) => (sum[k] = r2((sum[k] || 0) + (v || 0)))); } });
  return { sum, known, total: eat.length };
}
export const pctDV = (k: string, v: number) => Math.round(((v || 0) / DV[k][0]) * 100);

// ---------- 4) Recetario y modo cocina ----------
export type Recipe = { id: string; emoji: string; meal: 'breakfast' | 'lunch' | 'dinner' | 'snack'; tags: string[]; min: number; kcal: number; p: number; c: number; f: number; ing: string[]; steps: { t?: number }[] };
export type RFilter = { q?: string; meal?: string; tags?: string[]; maxMin?: number; maxKcal?: number };
const fold = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export function filterRecipes<R extends Recipe>(list: R[], f: RFilter, nameOf: (r: R) => string) {
  const q = fold((f.q || '').trim());
  return list.filter((r) => (!f.meal || r.meal === f.meal) && (f.tags || []).every((x) => r.tags.includes(x)) && (!f.maxMin || r.min <= f.maxMin) && (!f.maxKcal || r.kcal <= f.maxKcal) && (!q || fold(nameOf(r)).includes(q)));
}
export const stepNext = (i: number, n: number) => Math.min(n - 1, i + 1);
export const stepPrev = (i: number) => Math.max(0, i - 1);
export const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

// ---------- 5) Diario personalizable + planificar ----------
export const MAX_MEALS = 6;
export function cleanMeals(names: string[] | undefined): string[] | undefined {
  if (!names) return undefined; const n = names.map((x) => x.trim().slice(0, 24)).filter(Boolean).slice(0, MAX_MEALS); return n.length ? n : undefined;
}
export const slotIn = (slot: number, n: number) => Math.max(0, Math.min(n - 1, slot));
export const markEaten = <E extends { planned?: boolean; date: string; time: number }>(e: E, nowIso: string, now = Date.now()): E => ({ ...e, planned: undefined, time: e.date === nowIso ? now : e.time });
export const eatenOnly = <E extends { planned?: boolean }>(es: E[]) => es.filter((e) => !e.planned);
