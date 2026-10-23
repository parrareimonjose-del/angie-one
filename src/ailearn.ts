/** Aprendizaje legal de la IA por usuario (solo en el dispositivo).
 *  Guarda preferencias, platos y correcciones de porción. NUNCA peso, kcal de diagnóstico,
 *  sueño clínico ni datos de salud vendibles. El Panel del Fundador solo ve conteos y etiquetas
 *  neutras para verificar que la IA gana conocimiento de cada usuario. */
export type LearnKind = 'preference' | 'portion' | 'dish' | 'correction' | 'chat_fact';
export type LearnEvent = { id: string; at: string; kind: LearnKind; label: string };
export type LearnLog = { events: LearnEvent[] };

export const LEARN0: LearnLog = { events: [] };
const MAX = 200;
const LAB_MAX = 80;

/** Etiquetas seguras: sin números de peso/kcal/BMI ni palabras clínicas. */
const FORBIDDEN = /\b(\d+\s*(kg|lb|bmi|kcal|cal)|peso|weight|diagnos|enferm|disease|medic|insulin|glucos|presi[oó]n|blood pressure)\b/i;

export function safeLabel(raw: string): string {
  let s = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, LAB_MAX);
  if (!s || FORBIDDEN.test(s)) return '';
  return s;
}

export function pushLearn(log: LearnLog, kind: LearnKind, label: string, now = new Date()): LearnLog {
  const lab = safeLabel(label);
  if (!lab) return log;
  const ev: LearnEvent = { id: `ln-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`, at: now.toISOString(), kind, label: lab };
  // Evita duplicar el mismo label+kind en las últimas 5 entradas
  const last = log.events.slice(-5);
  if (last.some((e) => e.kind === kind && e.label.toLowerCase() === lab.toLowerCase())) return log;
  return { events: [...log.events, ev].slice(-MAX) };
}

export type LearnSummary = {
  total: number;
  byKind: Record<LearnKind, number>;
  last7: number;
  last30: number;
  firstAt?: string;
  lastAt?: string;
  recent: LearnEvent[];
  growing: boolean;
};

export function summarizeLearn(log: LearnLog, now = Date.now()): LearnSummary {
  const byKind: Record<LearnKind, number> = { preference: 0, portion: 0, dish: 0, correction: 0, chat_fact: 0 };
  let last7 = 0, last30 = 0;
  const d7 = now - 7 * 86400000, d30 = now - 30 * 86400000;
  for (const e of log.events) {
    byKind[e.kind] = (byKind[e.kind] || 0) + 1;
    const t = Date.parse(e.at) || 0;
    if (t >= d7) last7++;
    if (t >= d30) last30++;
  }
  const firstAt = log.events[0]?.at;
  const lastAt = log.events.length ? log.events[log.events.length - 1].at : undefined;
  return {
    total: log.events.length,
    byKind,
    last7,
    last30,
    firstAt,
    lastAt,
    recent: log.events.slice(-8).reverse(),
    growing: last7 > 0 || log.events.length > 0,
  };
}

/** Vista agregada anónima para el fundador (1 dispositivo = 1 usuario en web de prueba). */
export function founderLearnView(log: LearnLog, memOn: boolean, memFacts: number, now = Date.now()) {
  const s = summarizeLearn(log, now);
  return {
    usersTracked: 1, // web de prueba: este dispositivo
    memoryOn: memOn,
    memoryFacts: memFacts,
    learnEvents: s.total,
    last7: s.last7,
    last30: s.last30,
    byKind: s.byKind,
    growing: s.growing && (s.last7 > 0 || memFacts > 0),
    recent: s.recent,
    legal: 'device_only_no_health_sale' as const,
  };
}

/** Aplica aprendizaje al guardar una comida afinada (plato + porción + toques). */
export function applyMealLearn(log: LearnLog, name: string, q: { portion: number; oil?: boolean; sauce?: boolean; fried?: boolean }, now = new Date()): LearnLog {
  let L = pushLearn(log, 'dish', name, now);
  if (q.portion !== 1) L = pushLearn(L, 'portion', `${name} · ${q.portion}×`, now);
  if (q.oil === true) L = pushLearn(L, 'correction', `${name} · aceite`, now);
  if (q.sauce === true) L = pushLearn(L, 'correction', `${name} · salsa`, now);
  if (q.fried === true) L = pushLearn(L, 'correction', `${name} · frito`, now);
  return L;
}
