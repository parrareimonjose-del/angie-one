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
/** Resumen profesional (inglés) que se envía a la IA como contexto. Fuentes públicas por área:
 *  nutrition: Dietary Guidelines for Americans 2020-2025; OMS (azúcares libres <10 %, sal <5 g/día); ISSN Position Stand Protein & Exercise (2017).
 *  diets: DGA 2020-2025; PREDIMED / OMS (mediterránea); revisiones Cochrane de ayuno intermitente; AND (dietas vegetarianas, 2016).
 *  training: OMS Actividad física 2020; ACSM Guidelines for Exercise Testing & Prescription (11.ª ed.) y Position Stand de progresión (2009).
 *  physio: ACSM/APTA prevención de lesiones; NICE NG59 (dolor lumbar: mantenerse activo); regla del 10 %.
 *  habits: Lally et al. 2010 (mediana 66 días); Gollwitzer 1999 (intenciones de implementación); Fogg (tiny habits); autocompasión (Neff).
 *  sleep: AASM/SRS 2015 (7+ h adultos); National Sleep Foundation; higiene del sueño y CBT-I como primera línea (ACP 2016).
 *  hydration: EFSA 2010 (2,0 L mujeres / 2,5 L hombres de agua total); AND/ACSM/DC Nutrition & Athletic Performance 2016.
 *  sportsmed: ACSM preparticipation screening; AHA (síntomas cardíacos); IOC consenso suplementos 2018 (comida primero). */
export const BRIEF: Record<Area, string> = {
  nutrition: 'Dietitian (DGA 2020-25, WHO, ISSN): deficit 300-500 kcal (~0.5-1%/wk); protein 1.2-1.6 g/kg (1.6-2.2 with strength training in deficit/gain), spread over meals; half plate veg/fruit; fiber 25-38 g; added sugar <10% kcal; salt <5 g/day; whole grains; carbs and fats are not bad, choose quality (olive oil, nuts, fish).',
  diets: 'Diet styles: Mediterranean best evidence; DASH for blood pressure; keto/low-carb, 16:8 fasting and flexible 80/20 work only through calorie deficit and adherence, not better long term; vegan needs B12 plus attention to protein, iron, calcium, omega-3, iodine; detox/juice cleanses have no evidence (liver and kidneys do that); never <1200 (women)/1500 (men) kcal.',
  training: 'Trainer (WHO 2020, ACSM): 150-300 min/wk moderate or 75-150 vigorous cardio + strength 2-3x/wk all major muscles; beginners full-body, 2-3 sets of 8-12 reps; progressive overload (+1 rep, then +2-5% load); 48 h between hard sessions for same muscle; RPE 6-8 of 10; deload every 4-6 wk; run-walk to start; steps 7,000-10,000.',
  physio: 'Physio (prevention only): 5-10 min dynamic warm-up, static stretching after; mobility hips/thoracic/ankles; desk breaks every 30-60 min; strengthen glutes/core/upper back for posture; sharp pain, swelling, numbness or pain >3/10 = stop, use a pain-free range or easier version; low back pain: stay gently active, avoid bed rest; never give rehab plans, refer injuries to a physiotherapist.',
  habits: 'Habit psychology (Lally 2010, Gollwitzer, Fogg): habits take ~2-8 months (median 66 days); start tiny and attach to an existing cue; implementation intention "when X, then I will Y"; track streaks; 80/20 consistency over perfection; one meal never ruins progress, resume next meal without guilt; identity-based goals; plan for cravings (protein, fiber, regular meals, sleep).',
  sleep: 'Sleep (AASM/SRS, NSF): adults 7-9 h, older adults 7-8; fixed wake time; dim screens 1 h before; no caffeine 6-8 h before bed; alcohol worsens sleep quality; cool dark room ~18-20 C; last big meal 2-3 h before; naps 20-30 min before 3 pm; short sleep raises hunger hormones and cravings; insomnia >3 months or loud snoring with daytime sleepiness = see a doctor (CBT-I, sleep apnea check).',
  hydration: 'Hydration (EFSA, AND/ACSM): ~2.0 L/day women, 2.5 L men from all drinks and food (~30-35 ml/kg), more with heat/exercise; pale-yellow urine; drink before, sip during (every 15-20 min), rehydrate after; sports drinks/electrolytes only for >60 min or heavy sweat; coffee and fruit count; too much plain water can cause hyponatremia.',
  sportsmed: 'Sports medicine (ACSM, IOC 2018): increase weekly volume ≤10%; 1-2 rest days/week; recover with protein + carbs within ~2 h; overtraining signs: fatigue, worse performance, poor sleep, mood, high resting HR; cramps: hydrate, electrolytes, stretch; cold: light exercise only if symptoms above the neck, rest with fever; food first, no supplement doses (refer to doctor/dietitian); chest pain, fainting, severe dizziness = stop and seek urgent medical care.',
};
/** Casos especiales: guía general segura + derivar al profesional que trata (ADA Standards of Care, AHA/ACC, ACOG 2020, OMS mayores, AAP, NEDA/APA). */
export const SPECIAL = {
  supps: 'SUPPLEMENTS: never give any dose, amount or timing of creatine, protein powder servings, vitamins, melatonin, caffeine pills or other supplements; say food first and that a doctor, pharmacist or dietitian decides doses.',
  diabetes: 'Diabetes (ADA): plate method, half non-starchy veg, quarter lean protein, quarter whole-grain/fiber carbs; consistent carb portions; regular activity; check glucose around exercise, carry fast carbs if on insulin/sulfonylureas; never change or stop medication or insulin: that is for their doctor/diabetes team.',
  hypertension: 'High blood pressure (AHA): DASH pattern, salt <5 g (sodium <2,000-2,300 mg), more potassium from fruit/veg/legumes, limit alcohol, regular cardio; strength with moderate loads and normal breathing (no breath holding); never stop or change medication (that is for their doctor); chest pain or tightness = urgent care.',
  pregnancy: 'Pregnancy/postpartum (ACOG 2020): no weight-loss dieting while pregnant; 150 min/wk moderate activity if their obstetric provider agrees (talk test, walking, swimming, avoid contact sports, lying flat after 1st trimester, overheating); avoid alcohol, raw/undercooked meat, fish high in mercury, unpasteurized foods; postpartum/breastfeeding: gradual loss ~0.5 kg/wk, extra ~300-500 kcal for milk; check with their provider.',
  older: 'Older adults 65+ (WHO 2020): strength 2+ days, balance training 3+ days to prevent falls (use a chair or wall for support), 150 min moderate activity as able; protein 1.0-1.2 g/kg spread over meals to protect muscle; check with doctor before starting if conditions.',
  teen: 'Teens under 18 (AAP, WHO): growing body, no calorie restriction diets or rapid weight loss; focus on balanced meals, 60 min activity daily, sleep 8-10 h; lifting is fine with good technique, supervision and gradual progress; involve family, pediatrician for weight concerns.',
  ed: 'EATING-DISORDER SIGNALS (NEDA/APA): never mention calories, kcal targets, numbers or weight; never help eat less, skip meals, purge or compensate; respond with empathy, no numbers or weight talk, encourage regular meals and suggest talking to a doctor, psychologist or eating-disorder helpline; they are not alone.',
  joints: 'Joint pain/arthritis/post-injury: low-impact activity (swimming, cycling, walking), strengthen around the joint in pain-free range; follow their physiotherapist/surgeon plan, do not create rehab or return-to-sport plans.',
  cholesterol: 'High cholesterol (AHA): more soluble fiber (oats, beans), nuts, olive oil, fatty fish, plants; less saturated and trans fat and processed meat; medication decisions are for their doctor.',
};
const SPECIAL_KW: Record<keyof typeof SPECIAL, RegExp> = {
  supps: /(suplement|supplement|creatin|whey|prote[ií]na en polvo|protein powder|batido de prote|melaton|vitamina [a-z]\b|vitamin [a-z]\b|pre.?work|bcaa|col[aá]geno|collagen|omega.?3 en c[aá]psula|pastillas|pills)/i,
  diabetes: /(diabet|insulin|metformin|gluc|azúcar en (la )?sangre|blood sugar|糖尿|당뇨|मधुमेह|سكري|диабет|şeker hastal)/i,
  hypertension: /(hipertens|hypertens|presi[oó]n (alta|arterial)|blood pressure|pressão alta|tension art|bluthochdruck|давлен|高血压|고혈압|रक्तचाप|ضغط الدم|tansiyon)/i,
  pregnancy: /(embaraz|pregnan|gr[aá]vid|enceinte|schwanger|incinta|беремен|妊娠|怀孕|임신|गर्भ|حامل|hamile|postpart|posparto|lactan|breastfe|amamant|baby weight|beb[eé])/i,
  older: /(\b(6[5-9]|[7-9]\d)\s*(y|a[ñn]os|years)|adulto mayor|older adult|elderly|tercera edad|jubilad|equilibrio|balance issue|ca[ií]das|falls)/i,
  teen: /(\b1[0-7]\s*(y\b|a[ñn]os|years)|adolescen|teen|colegio|high school)/i,
  ed: /(vomit|vómit|purg|laxant|atrac[oó]n|binge|no como nada|sin comer|solo com[ií] una|me siento gord|feel fat|anorex|bulim|compensat|throw up|make myself)/i,
  joints: /(artros|artritis|arthrit|osteoarth|rodilla|knee|lesi[oó]n|injur|cirug|surgery|ACL|ligament|menisc|tendin|hernia|lumbar)/i,
  cholesterol: /(colesterol|cholesterol|triglic|lípid|lipid)/i,
};
export function specialFor(text: string, age?: number): (keyof typeof SPECIAL)[] {
  const out = (Object.keys(SPECIAL) as (keyof typeof SPECIAL)[]).filter((k) => SPECIAL_KW[k].test(text));
  if (age != null && age < 18 && !out.includes('teen')) out.push('teen'); if (age != null && age >= 65 && !out.includes('older')) out.push('older');
  return out;
}
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
/** Contexto para la IA. Orden por prioridad (el Worker publicado corta a 700 caracteres; el nuevo acepta 1.400):
 *  perfil → seguridad → casos especiales → conocimiento del área. */
export const SAFETY = 'Safety: no diagnosis, med/insulin changes, supplement doses or rehab plans; with conditions, pain, pregnancy or meds give safe tips and say to check with their doctor/physio; red flags: stop, seek care. Personalize; end with 1 concrete step.';
export function kbContext(q: string, goal: Goal | undefined, userCtx: string, max = 1400) {
  const age = +(userCtx.match(/(\d{1,3}) y\b/)?.[1] || NaN); const sp = specialFor(q + ' ' + userCtx, isNaN(age) ? undefined : age);
  const kb = areasFor(q, goal).map((a) => BRIEF[a]).join(' ');
  return `${sp.map((k) => SPECIAL[k]).join(' ')} ${SAFETY} User: ${userCtx}. Pro knowledge: ${kb}`.replace(/\s+/g, ' ').slice(0, max);
}

// ---------- 3) Seguridad: señales de alarma → profesional ----------
const RED = /(dolor (en el|de) pecho|opresi[oó]n en el pecho|chest (pain|tightness)|dor no peito|douleur (à la|thoracique)|brustschmerz|dolore al petto|боль в груди|胸痛|가슴 통증|सीने में दर्द|ألم في الصدر|göğüs ağrısı|desmay|faint|desmai|évanoui|ohnmacht|svenim|обморок|気絶|기절|बेहोश|إغماء|bayıl|sangr|blood|sangue|sang\b|blut|кровь|血|피가|खून|دم|kan\b|vomit|vómit|purg|laxante|laxative|no como nada|stopped eating|anorex|bulim|atrac[oó]n|binge|suicid|matarme|hacerme daño|self.?harm|embaraz|pregnan|grávida|enceinte|schwanger|incinta|беремен|妊娠|임신|गर्भ|حامل|hamile|insulin|diabet|medicamento|medication|medicine|pastilla|pill|ozempic|semaglut|presión alta|high blood pressure|hipertens|fractur|hinchaz|swelling|no puedo apoyar|can't put weight|mareo fuerte|severe dizz|falta de aire|short(ness)? of breath|palpita|entumec|numb)/i;
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

// ---------- 5) Red de seguridad sobre la respuesta de la IA ----------
const DOSE_SENT = /[^.!?\n]*(creatin|suplement|supplement|whey|melaton|vitamin|cafe[ií]na en|caffeine pill|pre.?work|bcaa|col[aá]geno|collagen|insulin|metformin|medicamento|medication)[^.!?\n]*\b\d+([.,]\d+)?\s*((a|to|-|–)\s*\d+([.,]\d+)?\s*)?(g|gramos|grams|mg|mcg|µg|ui|iu|unidades|units)\b[^.!?\n]*[.!?]?/gi;
/** Quita frases con dosis de suplementos o medicamentos que la IA pudiera colar (Apple 1.4.1) y añade el aviso de consultar. */
export function safeReply(text: string, lang = 'es') {
  if (!DOSE_SENT.test(text)) return text; DOSE_SENT.lastIndex = 0;
  const note = lang === 'es' ? 'Las dosis de suplementos o medicamentos las decide tu médico, farmacéutico o nutricionista.' : lang === 'pt' ? 'Doses de suplementos ou remédios são definidas pelo seu médico, farmacêutico ou nutricionista.' : 'Supplement or medication doses are for your doctor, pharmacist or dietitian to decide.';
  return (text.replace(DOSE_SENT, '').replace(/\n{3,}/g, '\n\n').trim() + '\n\n' + note).trim();
}
