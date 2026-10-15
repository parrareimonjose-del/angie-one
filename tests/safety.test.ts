// Ejecutar: npm run test:safety
import assert from 'node:assert/strict';
import { safeExercises, unsafeFor, Inj } from '../src/safety';
import { rulesPlan, withSafety, EXERCISES, Prefs, DEFAULT_PREFS, Plan } from '../src/coach';

const ex = (name: string) => ({ name, sets: 3, reps: 10, secs: 0, rest: 60, met: 5 });
const cases: [Inj, string[], string[]][] = [
  ['knees', ['Sentadillas', 'Sentadilla en silla', 'Chair squats', 'Zancadas alternas', 'Lunges', 'Saltos de tijera', 'Jumping jacks', 'Burpees', 'Agachamento', 'Kniebeugen', 'Fentes', 'スクワット', 'Приседания', 'Step-ups'], ['Puente de glúteos', 'Remo sentado']],
  ['back', ['Peso muerto rumano', 'Deadlift', 'Good mornings', 'Sentadilla con barra', 'Remo con barra', 'Kreuzheben', 'Становая тяга'], ['Puente de glúteos', 'Bicicleta estática']],
  ['shoulders', ['Press militar', 'Overhead press', 'Press de hombros con mancuernas', 'Arnold press', 'Desenvolvimento', 'Schulterdrücken', 'Pike push-ups'], ['Puente de glúteos', 'Sentadilla']],
  ['wrists', ['Flexiones', 'Push-ups', 'Flexiones en la pared', 'Lagartijas', 'Pompes', 'Liegestütze', 'Mountain climbers', '腕立て伏せ', 'Şınav'], ['Puente de glúteos', 'Bicicleta']],
];
for (const [inj, bad, good] of cases) {
  for (const n of bad) assert.equal(unsafeFor(ex(n), [inj]), inj, `${inj} debe bloquear "${n}"`);
  for (const n of good) assert.equal(unsafeFor(ex(n), [inj]), null, `${inj} no debe bloquear "${n}"`);
}
// Reemplazo: nada inseguro queda y se conservan las series
const all: Inj[] = ['knees', 'back', 'shoulders', 'wrists'];
const r = safeExercises([ex('Sentadillas'), ex('Flexiones'), ex('Press militar'), ex('Peso muerto'), ex('Puente')], all);
assert.equal(r.swapped, 4);
for (const e of r.list) assert.equal(unsafeFor(e, all), null);
assert.equal(new Set(r.list.map((e) => e.key || e.name)).size, 5, 'sin repetir');
// Plan IA simulado y plan por reglas, todas las combinaciones de lesiones y lugar
const profile: any = { sex: 'female', age: 60, weight: 80, height: 160, goal: 'lose', activity: 'low' };
const combos: Inj[][] = [[], ...all.map((x) => [x]), all];
for (const injuries of combos) for (const place of ['home', 'gym'] as const) {
  const prefs: Prefs = { ...DEFAULT_PREFS, place, days: 6, minutes: 45, injuries };
  const rules = withSafety(rulesPlan(profile, prefs, 1600), prefs);
  const ai: Plan = { ...rules, source: 'ai', workout: { days: rules.workout.days.map((d) => d.rest ? d : { ...d, exercises: [ex('Sentadilla en silla'), ex('Zancadas'), ex('Peso muerto'), ex('Press militar'), ex('Flexiones'), ...d.exercises] }) } };
  for (const p of [rules, withSafety(ai, prefs)]) for (const d of p.workout.days) for (const e of d.exercises) {
    assert.equal(unsafeFor(e, injuries), null, `${place} ${injuries} → ${e.key || e.name}`);
    if (e.key) assert.ok(e.key === 'stretch' || EXERCISES.some((x) => x.key === e.key), 'clave con traducción: ' + e.key);
  }
}
console.log('safety: OK');
