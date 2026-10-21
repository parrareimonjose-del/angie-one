/**
 * Coach personal: plan semanal de dieta y ejercicio, MET, check-in adaptativo y chat.
 * La IA (Worker /plan y /chat) es la primera opción; si falla, hay un plan por reglas, determinista y traducido.
 */
import { AI_URL } from './ai';
import { withPlan } from './yazio5';
import { grantValid } from './grants';
import { State, Profile, dailyTarget, trialPhase, today, DAY } from './store';
import { safePlanDays } from './safety';

export type Place = 'home' | 'gym';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Injury = 'knees' | 'back' | 'shoulders' | 'wrists';
export type Dislike = 'fish' | 'eggs' | 'dairy' | 'beef' | 'chicken' | 'legumes' | 'nuts' | 'veg';
export type Cuisine = 'latin' | 'mexican' | 'caribbean' | 'andean' | 'brazilian' | 'international';
export type Prefs = {
  place: Place; days: number; minutes: number; level: Level; injuries: Injury[]; injuryNote: string;
  dislikes: Dislike[]; cuisine: Cuisine; budget: 'low' | 'medium' | 'high'; meals: 3 | 4 | 5;
};
export const DEFAULT_PREFS: Prefs = { place: 'home', days: 3, minutes: 30, level: 'beginner', injuries: [], injuryNote: '', dislikes: [], cuisine: 'latin', budget: 'medium', meals: 4 };

export type Meal = { key?: string; scale?: number; name?: string; items?: string; kcal: number; p: number; c: number; f: number; slot: number };
export type Exercise = { key?: string; name?: string; desc?: string; sets: number; reps: number; secs: number; rest: number; met: number };
export type WorkoutDay = { rest: boolean; title?: string; titleKey?: string; exercises: Exercise[] };
export type Plan = {
  source: 'ai' | 'rules'; created: number; lang: string; kcal: number;
  diet: { days: { meals: Meal[] }[]; shopping: string[]; shoppingKeys?: string[] };
  workout: { days: WorkoutDay[]; safety?: string };
};
export type CheckIn = { date: string; weight: number; kcal: number; msg: string; warn: boolean };
export type WorkoutLog = { date: string; kcal: number; min: number; day: number };
export type ChatMsg = { role: 'user' | 'coach'; text: string };
export type Coach = { prefs?: Prefs; plan?: Plan; adjust: number; boost: number; checkins: CheckIn[]; workouts: WorkoutLog[]; chat: ChatMsg[]; chatCount: Record<string, number> };
export const EMPTY_COACH: Coach = { adjust: 0, boost: 0, checkins: [], workouts: [], chat: [], chatCount: {} };
export const coachOf = (s: State): Coach => {
  const c: Coach = { ...EMPTY_COACH, ...(s.coach || {}) };
  // Planes guardados antes del filtro también pasan por él
  return c.plan && c.prefs?.injuries?.length ? { ...c, plan: withSafety(c.plan, c.prefs) } : c;
};

/** Premium = prueba de 7 días activa o suscripción pagada vigente (así quien paga nunca pierde Premium). */
export const isPremium = (s: State, now = Date.now()) => trialPhase(s.trialStart, now).phase === 'trial' || !!(s.sub?.active && s.sub.renewAt > now) || grantValid(s.myGrant, now);
export const safeMin = (p?: Profile) => (p?.sex === 'male' ? 1500 : 1200);
/** Meta diaria con el ajuste del coach, nunca por debajo del mínimo seguro. */
export function coachTarget(s: State, d: Date = new Date()) {
  const base = dailyTarget(s.profile); const adj = s.coach?.adjust || 0;
  const kcal = withPlan(Math.max(safeMin(s.profile), Math.round((base.kcal + adj) / 10) * 10), s.dayPlan, d, safeMin(s.profile));
  const fat = Math.round((kcal * 0.28) / 9); const carbs = Math.max(0, Math.round((kcal - base.p * 4 - fat * 9) / 4));
  return { kcal, p: base.p, c: carbs, f: fat };
}
export const weekday = (d = new Date()) => (d.getDay() + 6) % 7; // 0 = lunes

// ---------- Plan por reglas (respaldo determinista) ----------
type MealT = { key: string; slot: 'b' | 'l' | 's' | 'd'; kcal: number; p: number; c: number; f: number; tags: string[]; ing: string[] };
export const MEALS: MealT[] = [
  { key: 'b1', slot: 'b', kcal: 420, p: 22, c: 45, f: 16, tags: ['eggs', 'dairy'], ing: ['cornflour', 'eggs', 'cheese', 'tomato'] },
  { key: 'b2', slot: 'b', kcal: 380, p: 14, c: 62, f: 8, tags: ['dairy'], ing: ['oats', 'banana', 'milk'] },
  { key: 'b3', slot: 'b', kcal: 400, p: 20, c: 38, f: 18, tags: ['eggs'], ing: ['eggs', 'tortillas', 'tomato', 'onion'] },
  { key: 'b4', slot: 'b', kcal: 360, p: 18, c: 52, f: 9, tags: ['dairy'], ing: ['yogurt', 'fruit', 'oats'] },
  { key: 'b5', slot: 'b', kcal: 390, p: 14, c: 50, f: 15, tags: ['legumes'], ing: ['bread', 'avocado', 'beans'] },
  { key: 'l1', slot: 'l', kcal: 600, p: 42, c: 70, f: 14, tags: ['chicken', 'legumes', 'meat'], ing: ['rice', 'beans', 'chicken', 'salad'] },
  { key: 'l2', slot: 'l', kcal: 560, p: 38, c: 60, f: 16, tags: ['fish', 'meat'], ing: ['fish', 'yuca', 'salad'] },
  { key: 'l3', slot: 'l', kcal: 640, p: 38, c: 72, f: 20, tags: ['beef', 'meat'], ing: ['beef', 'rice', 'plantain'] },
  { key: 'l4', slot: 'l', kcal: 560, p: 26, c: 88, f: 10, tags: ['legumes'], ing: ['lentils', 'rice', 'salad'] },
  { key: 'l5', slot: 'l', kcal: 580, p: 42, c: 55, f: 18, tags: ['chicken', 'meat'], ing: ['chicken', 'potato', 'vegetables'] },
  { key: 's1', slot: 's', kcal: 200, p: 7, c: 22, f: 10, tags: ['nuts'], ing: ['fruit', 'peanuts'] },
  { key: 's2', slot: 's', kcal: 180, p: 10, c: 26, f: 4, tags: ['dairy'], ing: ['yogurt', 'fruit'] },
  { key: 's3', slot: 's', kcal: 170, p: 7, c: 26, f: 5, tags: ['eggs'], ing: ['fruit', 'eggs'] },
  { key: 's4', slot: 's', kcal: 160, p: 6, c: 30, f: 3, tags: [], ing: ['fruit', 'banana'] },
  { key: 'd1', slot: 'd', kcal: 480, p: 34, c: 46, f: 16, tags: ['chicken', 'meat'], ing: ['tortillas', 'chicken', 'tomato', 'onion'] },
  { key: 'd2', slot: 'd', kcal: 420, p: 32, c: 40, f: 12, tags: ['chicken', 'meat'], ing: ['chicken', 'vegetables', 'potato'] },
  { key: 'd3', slot: 'd', kcal: 430, p: 32, c: 30, f: 20, tags: ['fish', 'meat'], ing: ['tuna', 'avocado', 'salad'] },
  { key: 'd4', slot: 'd', kcal: 420, p: 26, c: 32, f: 20, tags: ['eggs', 'dairy'], ing: ['eggs', 'vegetables', 'cheese', 'bread'] },
  { key: 'd5', slot: 'd', kcal: 460, p: 20, c: 70, f: 11, tags: ['legumes', 'dairy'], ing: ['beans', 'rice', 'cheese'] },
];
const SHARES: Record<number, [MealT['slot'], number][]> = {
  3: [['b', 0.3], ['l', 0.4], ['d', 0.3]],
  4: [['b', 0.25], ['l', 0.35], ['s', 0.1], ['d', 0.3]],
  5: [['b', 0.22], ['s', 0.1], ['l', 0.32], ['s', 0.1], ['d', 0.26]],
};
type ExT = { key: string; place: 'h' | 'g' | 'b'; kind: 'r' | 's'; met: number; avoid: Injury[]; group: 'warm' | 'legs' | 'upper' | 'core' | 'cardio' | 'cool' };
export const EXERCISES: ExT[] = [
  { key: 'march', place: 'h', kind: 's', met: 3.5, avoid: [], group: 'warm' },
  { key: 'treadmill', place: 'g', kind: 's', met: 4.3, avoid: [], group: 'warm' },
  { key: 'chairSquat', place: 'h', kind: 'r', met: 5, avoid: ['knees'], group: 'legs' },
  { key: 'bridge', place: 'b', kind: 'r', met: 3.5, avoid: [], group: 'legs' },
  { key: 'calf', place: 'b', kind: 'r', met: 2.8, avoid: [], group: 'legs' },
  { key: 'sideLeg', place: 'h', kind: 'r', met: 3, avoid: [], group: 'legs' },
  { key: 'stepUp', place: 'h', kind: 'r', met: 5, avoid: ['knees'], group: 'legs' },
  { key: 'legPress', place: 'g', kind: 'r', met: 5, avoid: ['knees'], group: 'legs' },
  { key: 'gobletSquat', place: 'g', kind: 'r', met: 5, avoid: ['knees', 'back'], group: 'legs' },
  { key: 'wallPush', place: 'h', kind: 'r', met: 3.8, avoid: ['shoulders', 'wrists'], group: 'upper' },
  { key: 'armCircles', place: 'h', kind: 's', met: 2.8, avoid: ['shoulders'], group: 'upper' },
  { key: 'bottleRow', place: 'h', kind: 'r', met: 3.5, avoid: ['back'], group: 'upper' },
  { key: 'latPull', place: 'g', kind: 'r', met: 4.5, avoid: ['shoulders'], group: 'upper' },
  { key: 'seatedRow', place: 'g', kind: 'r', met: 4.5, avoid: [], group: 'upper' },
  { key: 'chestPress', place: 'g', kind: 'r', met: 4.5, avoid: ['shoulders', 'wrists'], group: 'upper' },
  { key: 'birdDog', place: 'b', kind: 'r', met: 3, avoid: ['wrists'], group: 'core' },
  { key: 'deadBug', place: 'b', kind: 'r', met: 3, avoid: [], group: 'core' },
  { key: 'plank', place: 'b', kind: 's', met: 3.8, avoid: ['shoulders', 'wrists', 'back'], group: 'core' },
  { key: 'jacks', place: 'h', kind: 's', met: 7, avoid: ['knees', 'back'], group: 'cardio' },
  { key: 'bike', place: 'g', kind: 's', met: 5.5, avoid: [], group: 'cardio' },
  { key: 'stretch', place: 'b', kind: 's', met: 2.3, avoid: [], group: 'cool' },
];
const SCHEDULE: Record<number, number[]> = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5] };
const DAY_TYPES: { key: string; groups: ExT['group'][] }[] = [
  { key: 'dLegs', groups: ['legs', 'core', 'legs', 'cardio', 'core', 'legs'] },
  { key: 'dUpper', groups: ['upper', 'core', 'upper', 'cardio', 'upper', 'core'] },
  { key: 'dFull', groups: ['legs', 'upper', 'core', 'cardio', 'legs', 'upper'] },
];

export function rulesPlan(p: Profile, prefs: Prefs, kcal: number): Plan {
  const banned = new Set<string>(prefs.dislikes.flatMap((d) => (d === 'veg' ? ['meat'] : [d])));
  const ok = MEALS.filter((m) => !m.tags.some((t) => banned.has(t)));
  const pick = (slot: MealT['slot'], i: number) => { let list = ok.filter((m) => m.slot === slot); if (!list.length) list = MEALS.filter((m) => m.slot === slot); return list[i % list.length]; };
  const ing = new Set<string>();
  const days = Array.from({ length: 7 }, (_, d) => ({
    meals: SHARES[prefs.meals].map(([slot, share], j) => {
      const m = pick(slot, d + j * 2); const k = Math.round(((kcal * share) / m.kcal) * 10) / 10; m.ing.forEach((x) => ing.add(x));
      return { key: m.key, scale: k, kcal: Math.round(m.kcal * k), p: Math.round(m.p * k), c: Math.round(m.c * k), f: Math.round(m.f * k), slot: j };
    }),
  }));
  const lv = { beginner: { sets: 2, reps: 10, secs: 30, rest: 60 }, intermediate: { sets: 3, reps: 12, secs: 40, rest: 60 }, advanced: { sets: 4, reps: 12, secs: 45, rest: 45 } }[prefs.level];
  const fits = (e: ExT) => (e.place === 'b' || e.place === (prefs.place === 'gym' ? 'g' : 'h')) && !e.avoid.some((a) => prefs.injuries.includes(a));
  const n = Math.min(6, Math.max(3, Math.round((prefs.minutes - 6) / 5)));
  const train = SCHEDULE[Math.min(6, Math.max(1, prefs.days))];
  const wdays: WorkoutDay[] = Array.from({ length: 7 }, (_, d) => {
    const ti = train.indexOf(d); if (ti < 0) return { rest: true, titleKey: 'dRest', exercises: [] };
    const type = DAY_TYPES[ti % 3]; const used = new Set<string>(); const ex: Exercise[] = [];
    const warm = EXERCISES.find((e) => e.group === 'warm' && fits(e)) || EXERCISES[0];
    ex.push({ key: warm.key, sets: 1, reps: 0, secs: 180, rest: 20, met: warm.met });
    type.groups.slice(0, n).forEach((g, gi) => {
      const pool = EXERCISES.filter((e) => fits(e) && !used.has(e.key) && (e.group === g)).concat(EXERCISES.filter((e) => fits(e) && !used.has(e.key) && ['legs', 'core', 'upper'].includes(e.group)));
      const e = pool[(d + gi) % Math.max(1, Math.min(pool.length, 2))] || pool[0]; if (!e) return; used.add(e.key);
      ex.push({ key: e.key, sets: lv.sets, reps: e.kind === 'r' ? lv.reps : 0, secs: e.kind === 's' ? lv.secs : 0, rest: lv.rest, met: e.met });
    });
    ex.push({ key: 'stretch', sets: 1, reps: 0, secs: 120, rest: 0, met: 2.3 });
    return { rest: false, titleKey: type.key, exercises: ex };
  });
  return { source: 'rules', created: Date.now(), lang: '', kcal, diet: { days, shopping: [], shoppingKeys: [...ing] }, workout: { days: wdays } };
}

// ---------- IA (Worker) ----------
const BASE = AI_URL.replace(/\/estimate$/, '');
async function post(path: string, body: object, ms: number) {
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), ms);
  let hard: any; const guard = new Promise<never>((_, rej) => { hard = setTimeout(() => { ctl.abort(); rej(new Error('timeout')); }, ms + 2000); });
  const run = (async () => {
    const r = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
    const o = await r.json().catch(() => ({})); if (!r.ok) throw new Error(o.error || 'server'); return o;
  })();
  // Tope duro: aunque el navegador no corte la lectura de la respuesta, nunca se queda colgado.
  try { return await Promise.race([run, guard]); } finally { clearTimeout(tm); clearTimeout(hard); run.catch(() => {}); }
}
const DISLIKE_EN: Record<Dislike, string> = { fish: 'fish and seafood', eggs: 'eggs', dairy: 'dairy', beef: 'red meat', chicken: 'chicken', legumes: 'beans and lentils', nuts: 'nuts and peanuts', veg: 'any meat or fish (vegetarian)' };
const CUISINE_EN: Record<Cuisine, string> = { latin: 'Latin American', mexican: 'Mexican', caribbean: 'Caribbean (Venezuelan, Dominican, Puerto Rican, Cuban)', andean: 'Colombian, Peruvian and Andean', brazilian: 'Brazilian', international: 'international, simple' };
const INJ_EN: Record<Injury, string> = { knees: 'knees', back: 'lower back', shoulders: 'shoulders', wrists: 'wrists' };

/** Valida lo que llega de la IA; si algo no cuadra devuelve null (y se usa el plan por reglas). */
export function validatePlan(o: any, kcal: number, min: number): Plan | null {
  const d = o?.plan?.diet, w = o?.plan?.workout;
  if (!d?.days || d.days.length !== 7 || !w?.days || w.days.length !== 7) return null;
  for (const day of d.days) { const sum = (day.meals || []).reduce((a: number, m: Meal) => a + (+m.kcal || 0), 0); if (!day.meals?.length || sum < min * 0.95) return null; }
  if (!w.days.some((x: WorkoutDay) => !x.rest && x.exercises?.length)) return null;
  return { source: 'ai', created: Date.now(), lang: '', kcal, diet: { days: d.days.map((x: any) => ({ meals: x.meals.map((m: Meal, i: number) => ({ ...m, slot: i })) })), shopping: d.shopping || [] }, workout: { days: w.days, safety: w.safety } };
}

/** Filtro duro: cambia ejercicios inseguros para las lesiones elegidas (IA y reglas). */
export function withSafety(plan: Plan, prefs: Prefs): Plan {
  const r = safePlanDays(plan.workout.days, prefs.injuries);
  return { ...plan, workout: { ...plan.workout, days: r.days } };
}

export async function makePlan(p: Profile, prefs: Prefs, kcal: number, prot: number, lang: string): Promise<Plan> {
  try {
    const injury = [...prefs.injuries.map((x) => INJ_EN[x]), prefs.injuryNote.trim()].filter(Boolean).join(', ');
    const o = await post('/plan', {
      lang, kcal, prot, sex: p.sex, age: p.age, weight: p.weight, goal: p.goal, meals: prefs.meals, days: prefs.days, minutes: prefs.minutes,
      place: prefs.place, level: prefs.level, injury, dislike: prefs.dislikes.map((x) => DISLIKE_EN[x]).join(', '), cuisine: CUISINE_EN[prefs.cuisine], budget: prefs.budget,
    }, 60000);
    const plan = validatePlan(o, kcal, safeMin(p));
    if (plan) return withSafety({ ...plan, lang }, prefs);
  } catch { /* respaldo abajo */ }
  return withSafety({ ...rulesPlan(p, prefs, kcal), lang }, prefs);
}

export async function askCoach(msgs: ChatMsg[], lang: string, context: string): Promise<string> {
  const o = await post('/chat', { lang, context, messages: msgs.slice(-6).map((m) => ({ role: m.role, text: m.text })) }, 45000);
  if (!o.reply) throw new Error('empty'); return String(o.reply);
}

// ---------- Ejercicio: MET y rachas ----------
export const workSecs = (e: Exercise) => (e.reps ? e.reps * 3 : e.secs);
/** kcal = MET × kg × horas (solo tiempo activo; el descanso suma a MET 1,5). */
export const kcalFor = (met: number, kg: number, secs: number) => (met * kg * secs) / 3600;
export function planBurn(day: WorkoutDay, kg: number, boost = 0) {
  return Math.round(day.exercises.reduce((a, e) => { const sets = applyBoost(e, boost); return a + kcalFor(e.met, kg, workSecs(e) * sets) + kcalFor(1.5, kg, e.rest * Math.max(0, sets - 1)); }, 0));
}
export const applyBoost = (e: Exercise, boost: number) => (e.sets <= 1 ? 1 : Math.min(6, Math.max(1, e.sets + boost)));
export const burnedOn = (c: Coach, date: string) => Math.round(c.workouts.filter((w) => w.date === date).reduce((a, w) => a + w.kcal, 0));
/** Racha: días seguidos cumpliendo el plan (entreno hecho o día de descanso), desde que existe el plan. */
export function workoutStreak(c: Coach, now = new Date()) {
  if (!c.plan || !c.workouts.length) return 0;
  const done = new Set(c.workouts.map((w) => w.date)); const d = new Date(now); let n = 0;
  if (!done.has(today(d))) d.setDate(d.getDate() - 1);
  const start = c.plan.created - DAY;
  for (let i = 0; i < 400 && d.getTime() >= start; i++) {
    const rest = c.plan.workout.days[weekday(d)]?.rest;
    if (done.has(today(d))) n++; else if (!rest) break;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
export function weekWorkouts(c: Coach, now = new Date()) {
  const mon = new Date(now); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - weekday(now));
  const dates = new Set(c.workouts.filter((w) => new Date(w.date + 'T12:00:00').getTime() >= mon.getTime()).map((w) => w.date));
  return { done: dates.size, planned: c.plan ? c.plan.workout.days.filter((x) => !x.rest).length : 0 };
}

// ---------- Check-in semanal adaptativo (estilo MacroFactor, suave) ----------
export type CheckAnswers = { energy: 'low' | 'ok' | 'good'; skipped: boolean; binge: boolean };
export function checkIn(s: State, weight: number, a: CheckAnswers) {
  const c = coachOf(s); const p = s.profile!; const prev = c.checkins[c.checkins.length - 1];
  const bmi = weight / Math.pow(p.height / 100, 2);
  let delta = 0, msg = 'mFirst', rate = 0;
  if (prev) {
    const weeks = Math.max(1, (Date.now() - new Date(prev.date + 'T12:00:00').getTime()) / (7 * DAY));
    rate = ((weight - prev.weight) / prev.weight) * 100 / weeks; // % por semana
    if (p.goal === 'lose') { if (rate > -0.2) { delta = -100; msg = 'mPlateau'; } else if (rate < -1) { delta = 150; msg = 'mFast'; } else msg = 'mOnTrack'; }
    else if (p.goal === 'gain') { if (rate < 0.1) { delta = 100; msg = 'mGainMore'; } else if (rate > 0.5) { delta = -100; msg = 'mGainSlow'; } else msg = 'mOnTrack'; }
    else { if (rate > 0.5) { delta = -100; msg = 'mKeepDown'; } else if (rate < -0.5) { delta = 100; msg = 'mKeepUp'; } else msg = 'mOnTrack'; }
  }
  const warn = a.skipped || a.binge || rate < -1.5 || (bmi < 18.5 && p.goal === 'lose');
  if (warn) delta = Math.max(delta, rate < -1 ? 150 : 0); // con señales de alerta nunca se baja la comida
  const base = dailyTarget({ ...p, weight }).kcal;
  let adjust = Math.min(500, Math.max(-400, c.adjust + delta));
  if (base + adjust < safeMin(p)) adjust = safeMin(p) - base;
  const ww = weekWorkouts(c);
  let bd = 0; if (a.energy === 'low' || (ww.planned && ww.done < ww.planned / 2 && prev)) bd = -1; else if (a.energy === 'good' && ww.planned && ww.done >= ww.planned) bd = 1;
  const boost = Math.min(2, Math.max(-1, c.boost + bd));
  const kcal = Math.max(safeMin(p), Math.round((base + adjust) / 10) * 10);
  return { adjust, boost, kcal, msg, warn, train: bd > 0 ? 'tUp' : bd < 0 ? 'tDown' : 'tSame', bmiLow: bmi < 18.5 };
}
export const nextCheckInDays = (c: Coach) => { const l = c.checkins[c.checkins.length - 1]; if (!l) return 0; return Math.max(0, 7 - Math.floor((Date.now() - new Date(l.date + 'T12:00:00').getTime()) / DAY)); };
