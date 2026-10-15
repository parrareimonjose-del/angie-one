import { kcalOf, dayGoals, mealGoals, slotOfTime, slotOf, netCarbs, parseTime, totals, copyEntries, quickEntry, grocery, groceryText, mealFiber,
  parseAppleHealth, parseHealthCsv, parseHealthFile, mergeHealth, EMPTY_HEALTH, mondayOf, dayOfWeek, type Prep } from '../src/mfp5';
import { rulesPlan, DEFAULT_PREFS } from '../src/coach';
const ok = (n: string, c: boolean) => { if (!c) { console.error('FAIL', n); process.exitCode = 1; } else console.log('PASS', n); };
const prof = { goal: 'lose', weight: 80, height: 170, age: 40, sex: 'female', activity: 2 } as const;
const st: any = { profile: prof, entries: [] };
const g = dayGoals(st); ok('sin metas propias usa las recomendadas', !g.custom && g.p > 0 && g.kcal > 1000);
const st2: any = { ...st, macros: { day: { p: 120, c: 150, f: 60 } } };
ok('metas propias en gramos → kcal 4/4/9', dayGoals(st2).kcal === 120 * 4 + 150 * 4 + 60 * 9 && dayGoals(st2).custom);
const mg = mealGoals(st2); ok('4 comidas repartidas', mg.length === 4 && Math.abs(mg.reduce((a, m) => a + m.p, 0) - 120) <= 2);
ok('metas por comida guardadas se respetan', mealGoals({ ...st2, macros: { ...st2.macros, meals: [{ p: 1, c: 1, f: 1 }, { p: 2, c: 2, f: 2 }, { p: 3, c: 3, f: 3 }, { p: 4, c: 4, f: 4 }] } })[3].p === 4);
ok('kcalOf', kcalOf({ p: 10, c: 10, f: 10 }) === 170);
ok('hora → comida', slotOfTime(new Date(2026, 0, 1, 8).getTime()) === 0 && slotOfTime(new Date(2026, 0, 1, 13).getTime()) === 1 && slotOfTime(new Date(2026, 0, 1, 17).getTime()) === 2 && slotOfTime(new Date(2026, 0, 1, 21).getTime()) === 3);
ok('comida elegida gana a la hora', slotOf({ time: new Date(2026, 0, 1, 8).getTime(), meal: 3 } as any) === 3);
ok('netos = carbs − fibra, nunca negativo', netCarbs({ c: 30, fiber: 8 }) === 22 && netCarbs({ c: 3, fiber: 8 }) === 0 && netCarbs({ c: 10 }) === 10);
const t1 = parseTime('8:05', '2026-10-15')!; ok('parseTime 8:05', new Date(t1).getHours() === 8 && new Date(t1).getMinutes() === 5 && new Date(t1).getDate() === 15);
ok('parseTime 2030 y 20.30', new Date(parseTime('2030', '2026-10-15')!).getHours() === 20 && new Date(parseTime('20.30', '2026-10-15')!).getMinutes() === 30);
ok('parseTime inválida', parseTime('25:00', '2026-10-15') === null && parseTime('hola', '2026-10-15') === null);
const E = (id: string, h: number, kcal = 100, c = 20, fiber = 5) => ({ id, date: '2026-10-15', time: new Date(2026, 9, 15, h).getTime(), name: id, kcal, p: 5, c, f: 2, fiber, source: 'manual' as const });
const tt = totals([E('a', 8), E('b', 13, 200, 30, 0)]); ok('totales con netos', tt.kcal === 300 && tt.net === 45 && tt.fiber === 5);
const cp = copyEntries([E('a', 8), E('b', 13)], ['a'], ['2026-10-16', '2026-10-17']);
ok('copiar 1 comida a 2 días', cp.length === 2 && cp.every((e) => e.id !== 'a') && cp[0].date === '2026-10-16' && new Date(cp[1].time).getDate() === 17 && new Date(cp[1].time).getHours() === 8);
ok('copiar conserva la comida', cp[0].meal === 0);
const q = quickEntry({ p: 20, c: 30, f: 10, meal: 1 }, '2026-10-15'); ok('añadir rápido: kcal desde macros', !!q && q.kcal === 290 && q.meal === 1 && q.source === 'quick');
ok('añadir rápido: solo kcal', quickEntry({ kcal: 350, meal: 2 })!.kcal === 350);
ok('añadir rápido vacío = null', quickEntry({ meal: 0 }) === null);
ok('añadir rápido: fibra ≤ carbs', quickEntry({ c: 5, fiber: 20, meal: 0 })!.fiber === 5);
const plan = rulesPlan(prof as any, { ...DEFAULT_PREFS, meals: 4 }, 1800);
const prep: Prep = { week: mondayOf(new Date(2026, 9, 15)), days: plan.diet.days, checked: ['rice'], logged: [] };
ok('lunes de la semana', prep.week === '2026-10-12' && dayOfWeek(prep.week, 6) === '2026-10-18');
const gl = grocery(prep); ok('lista agrupada', gl.length >= 3 && gl.every((x) => x.items.length > 0));
const txt = groceryText(prep, 'Lista', (x) => x, (x) => x); ok('lista como texto con marcas', txt.startsWith('Lista') && txt.includes('☑ rice') && txt.includes('☐'));
ok('fibra estimada de comidas', plan.diet.days[0].meals.some((m) => mealFiber(m) > 0));
const xml = `<?xml version="1.0"?><HealthData>
<Record type="HKQuantityTypeIdentifierStepCount" unit="count" startDate="2026-10-14 08:00:00 -0400" value="4000"/>
<Record type="HKQuantityTypeIdentifierStepCount" unit="count" startDate="2026-10-14 18:00:00 -0400" value="2500"/>
<Record type="HKQuantityTypeIdentifierBodyMass" unit="lb" startDate="2026-10-14 07:00:00 -0400" value="176"/>
<Record type="HKQuantityTypeIdentifierHeartRate" unit="count/min" startDate="2026-10-14 07:00:00 -0400" value="70"/>
<Workout workoutActivityType="HKWorkoutActivityTypeWalking" duration="0.5" durationUnit="h" totalEnergyBurned="150" startDate="2026-10-14 09:00:00 -0400"/></HealthData>`;
const a = parseAppleHealth(xml); ok('Apple: pasos sumados por día', a.steps['2026-10-14'] === 6500);
ok('Apple: peso lb→kg', a.weights.length === 1 && Math.abs(a.weights[0].kg - 79.8) < 0.1);
ok('Apple: entrenamiento 30 min', a.workouts.length === 1 && a.workouts[0].min === 30 && a.workouts[0].type === 'Walking');
ok('Apple: ignora otros tipos (ritmo cardiaco)', Object.keys(a).every((k) => !/heart/i.test(k)) && !JSON.stringify(a).includes('70,'));
const csv = 'Date,Move Minutes count,Calories (kcal),Step count,Average weight (kg)\n2026-10-13,45,300,8000,80.2\n2026-10-14,5,50,1200,\n';
const b = parseHealthCsv(csv); ok('Google Fit CSV', b.steps['2026-10-13'] === 8000 && b.steps['2026-10-14'] === 1200 && b.weights.length === 1 && b.workouts.length === 1);
ok('CSV genérico en español', parseHealthCsv('fecha,pasos,peso\n10/14/2026,5000,70').steps['2026-10-14'] === 5000);
ok('detecta tipo de archivo', parseHealthFile('export.xml', xml).source === 'apple' && parseHealthFile('x.csv', csv).source === 'csv');
const m = mergeHealth(mergeHealth(EMPTY_HEALTH, a), a); ok('importar 2 veces no duplica', m.workouts.length === 1 && m.weights.length === 1);
ok('archivo vacío = nada', Object.keys(parseHealthFile('x.csv', 'hola').steps).length === 0);
// ---------- Lista verificada ----------
import { normKey, dedupe, searchFoods, BASE, USDA } from '../src/verified';
import { reminderDue, nextCharge, canUpsell, CANCEL_URL } from '../src/billing';
import { isPremium } from '../src/coach';
ok('normKey ignora acentos, mayúsculas, plural y orden', normKey('Plátanos Fritos') === normKey('frito platano') && normKey('Arroz Blanco (1 taza)') === normKey('blanco arroz'));
ok('normKey separa por marca', normKey('Yogur', 'Danone') !== normKey('Yogur', 'Alpina'));
const dd = dedupe([{ id: 'x', key: '', name: 'Arroz blanco', portion: '1', kcal: 999, p: 0, c: 0, f: 0, verified: false, source: 'user' }, { id: 'y', key: '', name: 'arroz  BLANCO', portion: '1', kcal: 205, p: 4, c: 45, f: 0, verified: true, source: 'curated' }]);
ok('duplicados → una entrada, gana la verificada', dd.length === 1 && dd[0].kcal === 205 && dd[0].verified);
ok('base sin duplicados', new Set(BASE.map((f) => f.key)).size === BASE.length && BASE.length >= USDA.length + 20);
const lab = (f: any) => f.name || f.id;
const r = searchFoods('banana', lab, [{ id: 'u1', key: '', name: 'Banana split casera', portion: '1', kcal: 500, p: 0, c: 0, f: 0, verified: false, source: 'user' }]);
ok('verificados primero', r[0].verified && r[r.length - 1].verified === false);
ok('búsqueda vacía devuelve todo', searchFoods('', lab).length === BASE.length);
// ---------- Cobro honesto ----------
const D = 86400000, now = Date.now();
ok('aviso 1 día antes del fin de prueba', reminderDue(now - 6.2 * D, undefined, now)?.kind === 'trial');
ok('sin aviso a mitad de prueba', reminderDue(now - 2 * D, undefined, now) === null);
ok('aviso 1 día antes de renovar', reminderDue(undefined, { active: true, plan: 'monthly', renewAt: now + 0.5 * D, provider: 'play' }, now)?.kind === 'renew');
ok('sin cobro pendiente tras la prueba', nextCharge(now - 30 * D, undefined, now) === null);
ok('máx 1 aviso Premium por sesión', canUpsell(false, 0) && !canUpsell(false, 1));
ok('nunca aviso a Premium', !canUpsell(true, 0));
ok('enlaces oficiales de cancelar', CANCEL_URL.play.startsWith('https://play.google.com/') && CANCEL_URL.apple.startsWith('https://apps.apple.com/'));
ok('quien paga es Premium aunque acabe la prueba', isPremium({ trialStart: now - 30 * D, sub: { active: true, plan: 'yearly', renewAt: now + 100 * D, provider: 'stripe' } } as any));
ok('suscripción vencida no es Premium', !isPremium({ trialStart: now - 30 * D, sub: { active: true, plan: 'yearly', renewAt: now - D, provider: 'stripe' } } as any));
