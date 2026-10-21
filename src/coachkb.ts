/** Coach profesional: recetas según el plan + base de conocimiento (equipo de profesionales) + seguridad.
 *  Todo local y gratis: los textos para la persona están en i18n (13 idiomas); los "briefs" en inglés van como contexto a la IA (/chat). */
import type { State, Entry } from './store';
import type { Dislike } from './coach';
import { RECIPES } from './recipes-data';
import { DISHES } from './dishes-data';
import { LATIN_FOODS } from './foods';

export type Goal = 'lose' | 'keep' | 'gain';
export type Sugg = { kind: 'recipe' | 'dish'; id: string; kcal: number; p: number; c: number; f: number; emoji: string; min?: number; name: { es: string; en: string; pt: string }; portion?: string };

// ---------- 1) Recetas según el plan ----------
const ING_BAN: Record<string, Dislike[]> = { fish: ['fish'], tuna: ['fish'], eggs: ['eggs'], milk: ['dairy'], cheese: ['dairy'], yogurt: ['dairy'], beef: ['beef'], chicken: ['chicken'], beans: ['legumes'], lentils: ['legumes'] };
const MEAT = /(pollo|chicken|frango|carne|beef|cerdo|pork|porco|res\b|pescado|fish|peixe|camar|shrimp|jam[oó]n|ham|chorizo|chicharr|birria|lech[oó]n|pernil|asado|bistec|steak|cordero|lamb|at[uú]n|tuna|salm[oó]n|marisc|seafood|pulpo|octopus|tripa|tripe|menudo|mondongo|morcilla|tocino|bacon|chivito|completo|salchich|sausage|pavo|turkey|bacalao|cod|ceviche|anticucho|hamburg|burger|picadillo|pastor|ropa vieja|barbacoa|carnitas|suadero|lomo)/i;
const DIS_RE: Partial<Record<Dislike, RegExp>> = {
  fish: /(pescado|fish|peixe|at[uú]n|tuna|salm[oó]n|bacalao|cod|ceviche|marisc|seafood|camar|shrimp|pulpo|octopus|moqueca|encebollado)/i,
  eggs: /(huevo|egg|ovo|tortilla de patatas|perico|mang[uú])/i, dairy: /(queso|cheese|queijo|leche|milk|leite|yogur|yogurt|crema|cream|cuajada|nata|reques|tres leches|flan|arroz con leche|batido)/i,
  beef: /(carne|beef|res\b|bistec|steak|ropa vieja|asado|birria|picadillo|pabell[oó]n|hamburg|burger|chivito|lomo)/i, chicken: /(pollo|chicken|frango|gallina)/i,
  legumes: /(frijol|bean|feij|lenteja|lentil|garbanzo|chickpea|caraota|gallo pinto|hummus|fabada|cocido|arvej)/i, nuts: /(nuez|nueces|nut|man[ií]|peanut|almendra|almond|castañ|cashew)/i,
};
export const eatenToday = (entries: Entry[], d: string) => entries.filter((e) => e.date === d && !e.planned).reduce((a, e) => a + (e.kcal || 0), 0);
export const kcalLeft = (target: number, entries: Entry[], d: string) => Math.max(0, Math.round(target - eatenToday(entries, d)));
function allowed(s: Sugg, ban: Dislike[], ing: string[] = []) {
  const txt = `${s.name.es} ${s.name.en} ${s.name.pt}`;
  for (const d of ban) { if (d === 'veg') { if (ing.some((i) => ['beef', 'chicken', 'fish', 'tuna'].includes(i)) || (s.kind === 'dish' && MEAT.test(txt))) return false; continue; }
    if (ing.some((i) => (ING_BAN[i] || []).includes(d))) return false; if (s.kind === 'dish' && DIS_RE[d]?.test(txt)) return false; }
  return true;
}
export function allSuggestible(): { s: Sugg; ing: string[] }[] {
  const r = RECIPES.map((x) => ({ s: { kind: 'recipe' as const, id: x.id, kcal: x.kcal, p: x.p, c: x.c, f: x.f, emoji: x.emoji, min: x.min, name: x.n }, ing: x.ing }));
  const seen = new Set<string>(); const d: { s: Sugg; ing: string[] }[] = [];
  for (const x of DISHES) { if (seen.has(x[0])) continue; seen.add(x[0]); d.push({ s: { kind: 'dish', id: x[0], name: { es: x[1], en: x[2], pt: x[3] }, portion: x[4], kcal: x[5], p: x[6], c: x[7], f: x[8], emoji: '🍽️' }, ing: [] }); }
  for (const x of LATIN_FOODS) if (!seen.has(x.id)) { seen.add(x.id); d.push({ s: { kind: 'dish', id: x.id, name: x.name, portion: x.portion, kcal: x.kcal, p: x.p, c: x.c, f: x.f, emoji: '🍽️' }, ing: [] }); }
  return [...r, ...d];
}
/** 2-3 sugerencias que caben en las kcal que quedan hoy, según la meta y lo que no come la persona. */
export function suggestRecipes(left: number, goal: Goal, ban: Dislike[] = [], n = 3): Sugg[] {
  const room = Math.max(150, left); const pool = allSuggestible().filter(({ s, ing }) => s.kcal >= 80 && s.kcal <= room * 1.05 && allowed(s, ban, ing));
  const score = (s: Sugg) => { const pd = (s.p * 4) / Math.max(1, s.kcal); const fit = s.kcal / room; // 0..1
    const base = goal === 'lose' ? pd * 3 + (fit > 0.85 ? -0.5 : 0) + (s.kcal <= 500 ? 0.3 : 0) : goal === 'gain' ? fit * 1.5 + pd + (s.kcal >= 450 ? 0.3 : 0) : pd * 1.5 + (1 - Math.abs(0.6 - fit));
    return base + (s.kind === 'recipe' ? 0.6 : 0); };
  const sorted = pool.sort((a, b) => score(b.s) - score(a.s) || a.s.id.localeCompare(b.s.id)).map((x) => x.s);
  const out: Sugg[] = []; const recs = sorted.filter((s) => s.kind === 'recipe'); const dishes = sorted.filter((s) => s.kind === 'dish');
  if (recs[0]) out.push(recs[0]); if (dishes[0]) out.push(dishes[0]);
  for (const s of sorted) { if (out.length >= n) break; if (!out.includes(s)) out.push(s); }
  return out.slice(0, n);
}

// ---------- 2) Base de conocimiento profesional ----------
export const AREAS = ['nutrition', 'diets', 'training', 'physio', 'habits', 'sleep', 'hydration', 'sportsmed'] as const;
export type Area = (typeof AREAS)[number];
export const AREA_ICON: Record<Area, string> = { nutrition: '🥗', diets: '📋', training: '🏋️', physio: '🧘', habits: '🧠', sleep: '😴', hydration: '💧', sportsmed: '🩺' };
/** Resumen profesional (inglés) que se envía a la IA como contexto; basado en guías públicas (OMS, ACSM, ISSN, AASM, EFSA). */
export const BRIEF: Record<Area, string> = {
  nutrition: 'Dietitian: deficit 300-500 kcal (~0.5-1%/wk loss); protein 1.6-2.2 g/kg in deficit or gain; half plate veg, fiber 25-35 g; whole foods; no foods banned.',
  diets: 'Diet styles: Mediterranean best evidence; high-protein, flexible/IIFYM, plant-based (B12), low-carb, 16:8 fasting all work only if adherent; avoid crash/detox diets.',
  training: 'Trainer (ACSM): 150-300 min/wk moderate cardio + strength 2-3x/wk all muscles; progressive overload (+1 rep or +2-5% load/wk); deload every 4-6 wk; RPE 6-8.',
  physio: 'Physio: 5-10 min warm-up, mobility hips/shoulders/thoracic, pain >3/10 or sharp = stop and regress; posture breaks every 30-60 min; no rehab plans, refer injuries.',
  habits: 'Habit psychology: tiny habits + cue, implementation intentions (when-where), track streaks, 80/20 not perfection, self-compassion after slips, identity-based goals.',
  sleep: 'Sleep (AASM): 7-9 h, fixed wake time, no screens/caffeine late, cool dark room; poor sleep raises hunger and cravings.',
  hydration: 'Hydration: ~30-35 ml/kg/day, more with heat/exercise; pale-yellow urine; water before meals helps fullness.',
  sportsmed: 'Sports medicine basics: build volume ≤10%/wk, rest days, protein+carbs after training; red flags (chest pain, fainting, severe pain, swelling) = stop, see a doctor.',
};
const KW: Record<Area, RegExp> = {
  nutrition: /(prote|calor|kcal|macro|fibra|fiber|az[uú]car|sugar|comer|eat|comida|food|carb|grasa|fat|vitamin|nutri|alimen|питан|食|영양|पोषण|غذ|beslen)/i,
  diets: /(dieta|diet|keto|ayuno|fasting|vegan|vegetar|mediterr|low.?carb|paleo|r[eé]gimen|regime|di[aä]t|dieta|диет|ダイエット|다이어트|डाइट|حمية|diyet)/i,
  training: /(ejercicio|exercise|entren|train|gym|pesas|weight|cardio|correr|run|fuerza|strength|m[uú]scul|muscle|rutina|routine|sentadilla|squat|treino|sport|упраж|運動|운동|व्यायाम|تمرين|egzersiz)/i,
  physio: /(dolor|pain|lesi[oó]n|injur|espalda|back|rodilla|knee|hombro|shoulder|estir|stretch|movilidad|mobility|postura|posture|fisio|physio|dor\b|douleur|schmerz|боль|痛|통증|दर्द|ألم|ağrı)/i,
  habits: /(motiva|h[aá]bito|habit|ansiedad|anxiety|antojo|craving|disciplin|constan|estr[eé]s|stress|ganas|lazy|pereza|recaída|slip|привыч|習慣|습관|आदत|عادة|alışkan)/i,
  sleep: /(sue[ñn]o|sleep|dormir|insomn|descans|rest|cansad|tired|sono|sommeil|schlaf|сон|睡眠|수면|नींद|نوم|uyku)/i,
  hydration: /(agua|water|hidrat|hydrat|beber|drink|sed\b|thirst|água|eau|wasser|вода|水|물|पानी|ماء|su\b)/i,
  sportsmed: /(m[eé]dic|doctor|suplement|supplement|creatina|creatine|recuper|recover|calambre|cramp|lesi|injur|card[ií]a|heart|presi[oó]n|pressure)/i,
};
export function areasFor(q: string, goal?: Goal): Area[] {
  const hit = AREAS.filter((a) => KW[a].test(q)); if (hit.length) return hit.slice(0, 3);
  return goal === 'gain' ? ['nutrition', 'training'] : goal === 'lose' ? ['nutrition', 'habits'] : ['nutrition', 'training'];
}
/** Contexto compacto para la IA (el Worker corta a 700 caracteres en la versión publicada; la nueva acepta 1400). */
export function kbContext(q: string, goal: Goal | undefined, userCtx: string, max = 1400) {
  const kb = areasFor(q, goal).map((a) => BRIEF[a]).join(' ');
  const safety = 'Safety: no diagnosis, no medication or supplement doses, refer red flags to a professional.';
  return `${userCtx}. Pro knowledge: ${kb} ${safety}`.slice(0, max);
}

// ---------- 3) Seguridad: señales de alarma → profesional ----------
const RED = /(dolor (en el|de) pecho|chest pain|dor no peito|douleur (à la|thoracique)|brustschmerz|dolore al petto|боль в груди|胸痛|가슴 통증|सीने में दर्द|ألم في الصدر|göğüs ağrısı|desmay|faint|desmai|évanoui|ohnmacht|svenim|обморок|気絶|기절|बेहोश|إغماء|bayıl|sangr|blood|sangue|sang\b|blut|кровь|血|피가|खून|دم|kan\b|vomit|vómit|purg|laxante|laxative|no como nada|stopped eating|anorex|bulim|atrac[oó]n|binge|suicid|matarme|hacerme daño|self.?harm|embaraz|pregnan|grávida|enceinte|schwanger|incinta|беремен|妊娠|임신|गर्भ|حامل|hamile|insulin|diabet|medicamento|medication|medicine|pastilla|pill|ozempic|semaglut|presión alta|high blood pressure|hipertens|fractur|hinchaz|swelling|no puedo apoyar|can't put weight|mareo fuerte|severe dizz|falta de aire|short(ness)? of breath|palpita|entumec|numb)/i;
export const redFlag = (q: string) => RED.test(q);

// ---------- 4) Guía por meta: plan semanal, progresión y checklist ----------
export const WEEKS = ['w1', 'w2', 'w3', 'w4'] as const;
export const CHECK = ['c1', 'c2', 'c3', 'c4', 'c5'] as const;
export function toggleCheck(all: Record<string, string[]> | undefined, d: string, k: string): Record<string, string[]> {
  const cur = new Set(all?.[d] || []); cur.has(k) ? cur.delete(k) : cur.add(k);
  const keep = Object.keys(all || {}).sort().slice(-13); const out: Record<string, string[]> = {}; for (const x of keep) if (x !== d) out[x] = all![x]; out[d] = [...cur]; return out;
}
/** Semana del programa (1-4, luego repite con progresión) desde la creación del plan. */
export const programWeek = (created: number | undefined, now = Date.now()) => (created ? (Math.floor((now - created) / (7 * 864e5)) % 4) + 1 : 1);
