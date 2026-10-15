/** 5 funciones que faltaban frente a MyFitnessPal (José 2026-10-15): metas de macros en gramos por día y por comida,
 *  importación de salud (Apple Health / Health Connect), copiar comidas y añadir rápido, preparación semanal con lista
 *  de compras, carbohidratos netos y hora de cada comida. Lógica pura (probada en tests/mfp5.test.ts). */
import type { Entry, State } from './store';
import { today, uid } from './store';
import { coachTarget, MEALS, type Meal } from './coach';

// ---------- 1) Metas de macros ----------
export type Macro = { p: number; c: number; f: number };
export type MacroGoals = { day: Macro; meals?: Macro[]; net?: boolean };
export const SLOTS = 4; // desayuno, almuerzo, merienda, cena
export const SHARE = [0.25, 0.35, 0.1, 0.3];
export const kcalOf = (m: Macro) => Math.round(m.p * 4 + m.c * 4 + m.f * 9);
export const clampG = (n: number) => Math.max(0, Math.min(600, Math.round(Number.isFinite(n) ? n : 0)));
export function dayGoals(st: State): Macro & { kcal: number; custom: boolean } {
  const g = st.macros?.day; const base = coachTarget(st);
  if (!g) return { ...base, custom: false };
  return { ...g, kcal: kcalOf(g), custom: true };
}
export function mealGoals(st: State): Macro[] {
  const d = dayGoals(st);
  if (st.macros?.meals?.length === SLOTS) return st.macros.meals;
  return SHARE.map((k) => ({ p: Math.round(d.p * k), c: Math.round(d.c * k), f: Math.round(d.f * k) }));
}

// ---------- 5) Hora y comida de cada registro, carbohidratos netos ----------
/** Comida por la hora (si el usuario no la eligió): <11 desayuno, <16 almuerzo, <19 merienda, resto cena. */
export const slotOfTime = (ms: number) => { const h = new Date(ms).getHours(); return h < 11 ? 0 : h < 16 ? 1 : h < 19 ? 2 : 3; };
export const slotOf = (e: Entry) => (typeof e.meal === 'number' && e.meal >= 0 && e.meal < SLOTS ? e.meal : slotOfTime(e.time));
export const netCarbs = (e: { c: number; fiber?: number }) => Math.max(0, Math.round((e.c || 0) - (e.fiber || 0)));
export const hhmm = (ms: number) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
/** "8:05", "08:05", "805", "20.30" → ms en el día de la entrada; null si no es válida. */
export function parseTime(txt: string, dayIso: string): number | null {
  const m = txt.trim().match(/^(\d{1,2})\s*[:.h]?\s*(\d{2})$/); if (!m) return null;
  const h = +m[1], mi = +m[2]; if (h > 23 || mi > 59) return null;
  const [y, mo, d] = dayIso.split('-').map(Number); return new Date(y, mo - 1, d, h, mi).getTime();
}
export const atTime = (dayIso: string, ms: number) => { const t = new Date(ms); const [y, mo, d] = dayIso.split('-').map(Number); return new Date(y, mo - 1, d, t.getHours(), t.getMinutes()).getTime(); };
export function totals(es: Entry[]) {
  return es.reduce((a, e) => ({ kcal: a.kcal + e.kcal, p: a.p + e.p, c: a.c + e.c, f: a.f + e.f, fiber: a.fiber + (e.fiber || 0), net: a.net + netCarbs(e) }), { kcal: 0, p: 0, c: 0, f: 0, fiber: 0, net: 0 });
}

// ---------- 3) Copiar comidas y añadir rápido ----------
export function copyEntries(entries: Entry[], ids: string[], days: string[]): Entry[] {
  const src = entries.filter((e) => ids.includes(e.id));
  return days.flatMap((d) => src.map((e) => ({ ...e, id: uid(), date: d, time: atTime(d, e.time), meal: slotOf(e) })));
}
export type Quick = { kcal?: number; p?: number; c?: number; f?: number; fiber?: number; meal: number; name?: string };
/** Añadir rápido: si no pone calorías se calculan de los macros (4/4/9). Nunca negativos. */
export function quickEntry(q: Quick, dayIso = today(), now = Date.now()): Entry | null {
  const p = clampG(q.p || 0), c = clampG(q.c || 0), f = clampG(q.f || 0), fiber = Math.min(clampG(q.fiber || 0), c);
  const kcal = q.kcal && q.kcal > 0 ? Math.min(5000, Math.round(q.kcal)) : kcalOf({ p, c, f });
  if (!kcal) return null;
  return { id: uid(), date: dayIso, time: atTime(dayIso, now), name: q.name?.trim() || '⚡', kcal, p, c, f, fiber, meal: q.meal, source: 'quick' };
}

// ---------- 4) Preparación semanal y lista de compras ----------
export const FIBER: Record<string, number> = { oats: 4, beans: 7, lentils: 8, fruit: 3, banana: 3, vegetables: 3, salad: 2, avocado: 5, yuca: 2, plantain: 3, bread: 2, tortillas: 3, cornflour: 2, rice: 1, potato: 2, peanuts: 2, tomato: 1, onion: 1 };
export const mealFiber = (m: Meal) => { const t = MEALS.find((x) => x.key === m.key); return t ? Math.round(t.ing.reduce((a, i) => a + (FIBER[i] || 0), 0) * (m.scale || 1)) : 0; };
export const GROUP: Record<string, 'prot' | 'veg' | 'grain' | 'dairy' | 'pantry'> = {
  eggs: 'prot', chicken: 'prot', fish: 'prot', beef: 'prot', tuna: 'prot', beans: 'prot', lentils: 'prot',
  tomato: 'veg', onion: 'veg', banana: 'veg', fruit: 'veg', avocado: 'veg', salad: 'veg', yuca: 'veg', plantain: 'veg', potato: 'veg', vegetables: 'veg',
  cornflour: 'grain', oats: 'grain', tortillas: 'grain', bread: 'grain', rice: 'grain', cheese: 'dairy', milk: 'dairy', yogurt: 'dairy', peanuts: 'pantry' };
export const GROUPS = ['prot', 'veg', 'grain', 'dairy', 'pantry'] as const;
export type Prep = { week: string; days: { meals: Meal[] }[]; checked: string[]; logged: string[] };
export const mondayOf = (d = new Date()) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return today(x); };
export const dayOfWeek = (week: string, i: number) => { const [y, m, d] = week.split('-').map(Number); return today(new Date(y, m - 1, d + i)); };
/** Lista agrupada: ingrediente → veces que aparece en la semana. */
export function grocery(prep: Prep) {
  const n = new Map<string, number>();
  prep.days.forEach((d) => d.meals.forEach((m) => MEALS.find((x) => x.key === m.key)?.ing.forEach((i) => n.set(i, (n.get(i) || 0) + 1))));
  return GROUPS.map((g) => ({ g, items: [...n].filter(([i]) => (GROUP[i] || 'pantry') === g).sort((a, b) => a[0].localeCompare(b[0])) })).filter((x) => x.items.length);
}
export function groceryText(prep: Prep, title: string, tGroup: (g: string) => string, tIng: (i: string) => string) {
  return [title, ...grocery(prep).flatMap(({ g, items }) => ['', tGroup(g) + ':', ...items.map(([i, n]) => `${prep.checked.includes(i) ? '☑' : '☐'} ${tIng(i)}${n > 1 ? ` ×${n}` : ''}`)])].join('\n');
}

// ---------- 2) Salud: Apple Health / Health Connect ----------
export type HealthWorkout = { date: string; type: string; min: number; kcal: number };
export type HealthData = { steps: Record<string, number>; weights: { date: string; kg: number }[]; workouts: HealthWorkout[]; source?: string; at?: number };
export const EMPTY_HEALTH: HealthData = { steps: {}, weights: [], workouts: [] };
const attr = (tag: string, k: string) => { const m = tag.match(new RegExp(`\\b${k}="([^"]*)"`)); return m ? m[1] : ''; };
const dayOfStamp = (s: string) => s.slice(0, 10);
/** Apple Health «export.xml» (Salud → perfil → Exportar). Solo pasos, peso y entrenamientos; el resto se ignora y nunca sale del teléfono. */
export function parseAppleHealth(xml: string, since = '0000'): HealthData {
  const out: HealthData = { steps: {}, weights: [], workouts: [], source: 'apple' }; const w = new Map<string, number>();
  for (const m of xml.matchAll(/<Record\b[^>]*>/g)) {
    const tag = m[0]; const type = attr(tag, 'type'); const d = dayOfStamp(attr(tag, 'startDate')); if (!d || d < since) continue;
    const v = parseFloat(attr(tag, 'value')); if (!Number.isFinite(v)) continue;
    if (type === 'HKQuantityTypeIdentifierStepCount') out.steps[d] = (out.steps[d] || 0) + Math.round(v);
    else if (type === 'HKQuantityTypeIdentifierBodyMass') { const u = attr(tag, 'unit'); const kg = u === 'lb' ? v * 0.45359237 : u === 'g' ? v / 1000 : v; if (kg > 25 && kg < 350) w.set(d, Math.round(kg * 10) / 10); }
  }
  for (const m of xml.matchAll(/<Workout\b[^>]*>/g)) {
    const tag = m[0]; const d = dayOfStamp(attr(tag, 'startDate')); if (!d || d < since) continue;
    let min = parseFloat(attr(tag, 'duration')) || 0; const du = attr(tag, 'durationUnit'); if (du === 's') min /= 60; if (du === 'h') min *= 60;
    const kcal = parseFloat(attr(tag, 'totalEnergyBurned')) || 0;
    out.workouts.push({ date: d, type: attr(tag, 'workoutActivityType').replace('HKWorkoutActivityType', '') || 'Workout', min: Math.round(min), kcal: Math.round(kcal) });
  }
  out.weights = [...w].map(([date, kg]) => ({ date, kg })).sort((a, b) => a.date.localeCompare(b.date));
  return out;
}
const splitCsv = (line: string) => { const r: string[] = []; let cur = '', q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { r.push(cur); cur = ''; } else cur += ch; } r.push(cur); return r.map((x) => x.trim()); };
/** CSV de Google Fit (Takeout «Daily activity metrics»), Health Connect/Fitbit o genérico: fecha + pasos/peso/minutos/calorías. */
export function parseHealthCsv(txt: string): HealthData {
  const out: HealthData = { steps: {}, weights: [], workouts: [], source: 'csv' };
  const lines = txt.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim()); if (lines.length < 2) return out;
  const h = splitCsv(lines[0]).map((x) => x.toLowerCase());
  const col = (...re: RegExp[]) => h.findIndex((x) => re.some((r) => r.test(x)));
  const iD = col(/^date$/, /^fecha$/, /^day$/, /date/), iS = col(/step/, /pasos/), iW = col(/weight/, /peso/), iM = col(/move minutes/, /active minutes/, /exercise min/, /minut/), iK = col(/^calories/, /calor/, /energy/);
  const lb = iW >= 0 && /\(lb|lbs/.test(h[iW]);
  for (const l of lines.slice(1)) {
    const c = splitCsv(l); const raw = c[iD] || ''; const m = raw.match(/(\d{4})-(\d{2})-(\d{2})/) || raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!m) continue; const d = m[0].includes('-') ? m[0] : `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    const st = iS >= 0 ? parseFloat(c[iS]) : NaN; if (st > 0) out.steps[d] = Math.round(st);
    let kg = iW >= 0 ? parseFloat(c[iW]) : NaN; if (lb) kg *= 0.45359237; if (kg > 25 && kg < 350) out.weights.push({ date: d, kg: Math.round(kg * 10) / 10 });
    const min = iM >= 0 ? parseFloat(c[iM]) : NaN; if (min >= 10) out.workouts.push({ date: d, type: 'Activity', min: Math.round(min), kcal: iK >= 0 ? Math.round(parseFloat(c[iK]) || 0) : 0 });
  }
  return out;
}
export function parseHealthFile(name: string, txt: string): HealthData {
  return /\.xml$/i.test(name) || txt.trimStart().startsWith('<') ? parseAppleHealth(txt) : parseHealthCsv(txt);
}
/** Une sin duplicar (pasos y peso: el último gana por día; entrenamientos por fecha+tipo+minutos). */
export function mergeHealth(a: HealthData, b: HealthData): HealthData {
  const w = new Map(a.weights.map((x) => [x.date, x.kg])); b.weights.forEach((x) => w.set(x.date, x.kg));
  const k = (x: HealthWorkout) => `${x.date}|${x.type}|${x.min}`; const wk = new Map(a.workouts.map((x) => [k(x), x])); b.workouts.forEach((x) => wk.set(k(x), x));
  return { steps: { ...a.steps, ...b.steps }, weights: [...w].map(([date, kg]) => ({ date, kg })).sort((x, y) => x.date.localeCompare(y.date)),
    workouts: [...wk.values()].sort((x, y) => x.date.localeCompare(y.date)), source: b.source || a.source, at: Date.now() };
}
