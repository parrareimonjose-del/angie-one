/**
 * Filtro duro de seguridad por lesiones. Se aplica DESPUÉS de generar el plan (IA o reglas):
 * cualquier ejercicio prohibido para las lesiones elegidas se cambia por uno seguro del catálogo.
 * Los nombres de la IA llegan en 13 idiomas, por eso los patrones son multilingües.
 */
export type Inj = 'knees' | 'back' | 'shoulders' | 'wrists';
type Ex = { key?: string; name?: string; desc?: string; sets: number; reps: number; secs: number; rest: number; met: number };

const R = (s: string) => new RegExp(s, 'i');
// Claves del catálogo propio que nunca valen para cada lesión
const BAN_KEYS: Record<Inj, string[]> = {
  knees: ['chairSquat', 'stepUp', 'legPress', 'gobletSquat', 'jacks'],
  back: ['gobletSquat', 'bottleRow', 'plank', 'jacks'],
  shoulders: ['wallPush', 'armCircles', 'latPull', 'chestPress', 'plank'],
  wrists: ['wallPush', 'chestPress', 'birdDog', 'plank'],
};
const SQUAT = 'squat|sentadill|agachament|accosciat|kniebeug|深蹲|蹲起|スクワット|스쿼트|स्क्वाट|القرفصاء|قرفصاء|присед|çömel|squat';
const LUNGE = 'lunge|zancad|estocad|desplante|afundo|avanço|fente|ausfallschritt|affond|弓步|弓箭步|ランジ|런지|लंज|طعن|اندفاع|выпад|hamle';
const JUMP = 'jump|salto|saltar|saltos|brinc|pular|pulo|polichinel|saut|sprung|spring|hampelmann|saltell|跳|ジャンプ|점프|कूद|قفز|прыж|выпрыг|zıpla|sıçra|burpee|jacks|skipping|plyo|pliom|box ?jump|step[- ]?up|subida al (banco|escal)|subir escal|leg press|prensa de piernas';
const DEAD = 'deadlift|peso muerto|levantamiento muerto|levantamento terra|soulevé de terre|souleve de terre|kreuzheben|stacco|硬拉|デッドリフト|데드리프트|डेडलिफ्ट|الرفعة الميتة|становая|становой|ölü kaldırma|good ?morning|buenos días con barra|back squat|sentadilla (con|trasera)|barbell row|remo con barra|remo inclinado|bent[- ]over row|clean and|cargada|snatch|arranque|hip thrust con barra|heavy|pesad[oa]';
const OHP = 'overhead|over[- ]head|military press|press militar|press (de|de los) hombros|press sobre (la )?cabeza|press arnold|arnold press|shoulder press|desenvolvimento|développé (militaire|épaules)|schulterdrücken|überkopf|lento avanti|spinte sopra|肩推|推举|过头|ショルダープレス|オーバーヘッド|오버헤드|숄더 ?프레스|ओवरहेड|कंधे.*प्रेस|فوق الرأس|ضغط الكتف|жим над головой|жим стоя|армейский жим|жим плеч|omuz pres|baş üstü|pike push|handstand|pino';
const PUSH = 'push[- ]?up|press[- ]?up|flexi[oó]n|flexiones|lagartij|pechada|flexão|flexões|pompe|liegestütz|piegament|俯卧撑|腕立て|팔굽혀펴기|푸시업|पुश[- ]?अप|تمرين الضغط|الضغط على|отжиман|şınav|mountain climber|escalador|plank on hands|plancha (alta|con (las )?manos)|burpee';
const PATTERNS: Record<Inj, RegExp> = { knees: R(`${SQUAT}|${LUNGE}|${JUMP}`), back: R(DEAD), shoulders: R(OHP), wrists: R(PUSH) };

// Reemplazos seguros (claves del catálogo con traducción en 13 idiomas), en orden de preferencia
type Safe = { key: string; kind: 'r' | 's'; met: number; ok: Inj[] };
const ALL: Inj[] = ['knees', 'back', 'shoulders', 'wrists'];
const SAFE: Safe[] = [
  { key: 'bridge', kind: 'r', met: 3.5, ok: ALL },
  { key: 'deadBug', kind: 'r', met: 3, ok: ALL },
  { key: 'calf', kind: 'r', met: 2.8, ok: ALL },
  { key: 'sideLeg', kind: 'r', met: 3, ok: ALL },
  { key: 'seatedRow', kind: 'r', met: 4.5, ok: ['knees', 'wrists', 'shoulders'] },
  { key: 'bike', kind: 's', met: 5.5, ok: ['back', 'shoulders', 'wrists'] },
  { key: 'march', kind: 's', met: 3.5, ok: ['back', 'shoulders', 'wrists'] },
  { key: 'stretch', kind: 's', met: 2.3, ok: ALL },
];

export function unsafeFor(e: Ex, injuries: Inj[]): Inj | null {
  const txt = `${e.key || ''} ${e.name || ''}`; // solo nombre: la descripción puede decir "sin saltos"
  for (const i of injuries) {
    if (e.key && BAN_KEYS[i].includes(e.key)) return i;
    if (e.name && PATTERNS[i].test(txt)) return i;
  }
  return null;
}

/** Devuelve una copia del día con los ejercicios inseguros cambiados por seguros (sin repetir si se puede). */
export function safeExercises(list: Ex[], injuries: Inj[]): { list: Ex[]; swapped: number } {
  if (!injuries.length) return { list, swapped: 0 };
  const pool = SAFE.filter((s) => injuries.every((i) => s.ok.includes(i)));
  const used = new Set(list.map((e) => e.key).filter(Boolean) as string[]); let swapped = 0;
  const out = list.map((e) => {
    if (!unsafeFor(e, injuries)) return e;
    swapped++;
    const s = pool.find((p) => !used.has(p.key)) || pool[0]; used.add(s.key);
    const lv = Math.max(1, e.sets || 2);
    return { key: s.key, sets: lv, reps: s.kind === 'r' ? Math.min(15, e.reps || 10) : 0, secs: s.kind === 's' ? Math.max(20, e.secs || 30) : 0, rest: e.rest || 45, met: s.met };
  });
  return { list: out, swapped };
}

export function safePlanDays<D extends { rest: boolean; exercises: Ex[] }>(days: D[], injuries: Inj[]): { days: D[]; swapped: number } {
  let n = 0;
  const out = days.map((d) => { if (d.rest) return d; const r = safeExercises(d.exercises || [], injuries); n += r.swapped; return { ...d, exercises: r.list }; });
  return { days: out, swapped: n };
}
