/** 6 funciones gratis (estudio top 10): puntuación de hábitos, gasto estimado, progreso, lecciones, amigos y metas por nutriente.
 *  Lenguaje de bienestar, nada médico. Los datos de salud nunca se venden: se quedan en el teléfono (o en la copia cifrada). */
import { DV } from './yazio5';

// ---------- 1) Puntuación diaria de hábitos (0-100) y colores por alimento ----------
export type HabitIn = { kcal: number; target: number; meals: number; water: number; sleepH?: number; steps?: number };
export const HABIT_W = { food: 40, water: 20, sleep: 20, steps: 20 } as const;
const cl = (x: number) => Math.max(0, Math.min(1, x));
export function habitScore(h: HabitIn) {
  const r = h.target ? h.kcal / h.target : 0;
  const near = r <= 0 ? 0 : r < 0.8 ? r / 0.8 : r <= 1.1 ? 1 : cl(1 - (r - 1.1) / 0.4);
  const food = Math.round(HABIT_W.food * (0.4 * cl(h.meals / 3) + 0.6 * near));
  const water = Math.round(HABIT_W.water * cl(h.water / 8));
  const sleep = h.sleepH == null ? 0 : Math.round(HABIT_W.sleep * (h.sleepH >= 7 && h.sleepH <= 9 ? 1 : h.sleepH < 7 ? cl(h.sleepH / 7) : cl(1 - (h.sleepH - 9) / 3)));
  const steps = h.steps == null ? 0 : Math.round(HABIT_W.steps * cl(h.steps / 8000));
  return { total: food + water + sleep + steps, food, water, sleep, steps };
}
export type FoodColor = 'green' | 'yellow' | 'orange';
/** Color por densidad (proteína + fibra por caloría). Nunca "malo": naranja = "disfrutar con medida". */
export function foodColor(e: { kcal: number; p: number; fiber?: number }): FoodColor {
  if (!e.kcal) return 'green';
  const prot = (e.p * 4) / e.kcal; const fib = ((e.fiber || 0) * 100) / e.kcal;
  if (prot >= 0.25 || fib >= 3 || e.kcal <= 60) return 'green';
  if (prot < 0.08 && fib < 1 && e.kcal >= 250) return 'orange';
  return 'yellow';
}
export const COLOR_HEX: Record<FoodColor, string> = { green: '#22A06B', yellow: '#E2B203', orange: '#F18D13' };

// ---------- 2) Gasto energético estimado semanal (coach adaptativo) ----------
/** Gasto ≈ ingesta media − (cambio de peso × 7700 kcal/kg) / días. Necesita ≥ 7 días con comida y 2 pesos. */
export function estExpenditure(days: { date: string; kcal: number }[], weights: { date: string; kg: number }[], formula: number) {
  const logged = days.filter((d) => d.kcal > 0);
  const ws = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  if (logged.length < 7 || ws.length < 2) return { ready: false, kcal: formula, intake: 0, formula, days: logged.length };
  const intake = logged.reduce((a, d) => a + d.kcal, 0) / logged.length;
  const span = Math.max(7, (Date.parse(ws[ws.length - 1].date) - Date.parse(ws[0].date)) / 864e5);
  const est = intake - ((ws[ws.length - 1].kg - ws[0].kg) * 7700) / span;
  const kcal = Math.round(Math.max(formula * 0.7, Math.min(formula * 1.3, est)) / 10) * 10; // límites prudentes
  return { ready: true, kcal, intake: Math.round(intake), formula, days: logged.length };
}

// ---------- 3) Medidas corporales (fotos en otra clave local, nunca en la nube) ----------
export const MEASURES = ['waist', 'hip', 'chest', 'arm', 'thigh'] as const;
export type Measure = { date: string } & Partial<Record<(typeof MEASURES)[number], number>>;
export function addMeasure(list: Measure[], m: Measure): Measure[] {
  const clean: Measure = { date: m.date }; MEASURES.forEach((k) => { const v = +(m[k] || 0); if (v >= 10 && v <= 300) clean[k] = Math.round(v * 10) / 10; });
  if (Object.keys(clean).length === 1) return list;
  return [...list.filter((x) => x.date !== m.date), clean].sort((a, b) => a.date.localeCompare(b.date)).slice(-120);
}
export function measureDelta(list: Measure[], k: (typeof MEASURES)[number]) {
  const v = list.filter((x) => x[k] != null); if (v.length < 2) return null; return Math.round(((v[v.length - 1][k] as number) - (v[0][k] as number)) * 10) / 10;
}
export const PHOTO_KEY = 'angieone:progress'; export const MAX_PHOTOS = 24;

// ---------- 4) Lecciones de hábitos de 2 minutos ----------
export const LESSONS = ['plate', 'hunger', 'water', 'sleep', 'protein', 'slip', 'move', 'plan'] as const;
export function nextLesson(done: string[]) { return LESSONS.find((l) => !done.includes(l)) || LESSONS[0]; }

// ---------- 5) Amigos y retos (solo apodo y puntos del reto; nunca datos de salud) ----------
export const NICK_MAX = 20;
const BAD = /(fuck|shit|puta|puto|mierda|pendej|cabr[oó]n|bitch|nazi|idiot|imb[eé]cil|marica|verga|coño|http|www\.|@)/i;
export function cleanNick(n: string) { const v = String(n || '').replace(/[<>]/g, '').trim().slice(0, NICK_MAX); return v.length >= 2 && !BAD.test(v) ? v : ''; }
export const validGroup = (c: string) => /^[A-Z0-9]{6}$/.test(c);
export function inviteLink(code: string, base = 'https://parrareimonjose-del.github.io/angie-one') { return `${base}/friends?join=${code}`; }
export function whatsappLink(code: string, text: string) { return `https://wa.me/?text=${encodeURIComponent(`${text} ${inviteLink(code)}`)}`; }
/** Puntos del reto semanal = suma de la puntuación de hábitos de la semana / 10 (máximo 70). */
export const challengePoints = (scores: number[]) => Math.round(scores.reduce((a, b) => a + b, 0) / 10);

// ---------- 7) Metas por nutriente ----------
export type NutGoals = Record<string, number>;
export function setNutGoal(g: NutGoals | undefined, k: string, v: number | null): NutGoals {
  const n = { ...(g || {}) }; if (!DV[k] && k !== 'fiber') return n;
  if (v == null || !(v > 0)) delete n[k]; else n[k] = Math.round(v * 10) / 10; return n;
}
export const goalOf = (g: NutGoals | undefined, k: string) => g?.[k] ?? (k === 'fiber' ? 28 : DV[k]?.[0] ?? 0);
/** Lo que falta hoy (menos del 50 % de la meta), para un aviso suave. */
export function nutGaps(g: NutGoals | undefined, sum: Record<string, number>) {
  return Object.keys(g || {}).filter((k) => (sum[k] || 0) < goalOf(g, k) * 0.5);
}
export function tdeeOf(p?: { weight: number; height: number; age: number; sex: 'male' | 'female'; activity: 1 | 2 | 3 | 4 }) {
  if (!p) return 2000; const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  return Math.round((bmr * [1.2, 1.375, 1.55, 1.725][p.activity - 1]) / 10) * 10;
}
