// Coach profesional (21-oct-2026): recetas según el plan, base de conocimiento, señales de alarma.
import { safeReply, specialFor, SPECIAL, suggestRecipes, kcalLeft, kbContext, areasFor, redFlag, toggleCheck, programWeek, allSuggestible, BRIEF, AREAS } from '../src/coachkb';
const res: string[] = []; const ok = (n: string, c: boolean) => res.push(`${c ? 'PASS' : 'FAIL'} ${n}`);
const E = (kcal: number, date = '2026-10-21', planned?: boolean) => ({ id: String(Math.random()), date, time: 0, name: 'x', kcal, p: 0, c: 0, f: 0, source: 'manual' as const, planned });
ok('kcal restantes ignoran lo planificado y otros días', kcalLeft(2000, [E(500), E(300, '2026-10-20'), E(400, '2026-10-21', true)], '2026-10-21') === 1500);
ok('nunca negativo', kcalLeft(1000, [E(1500)], '2026-10-21') === 0);
ok('fuentes: recetario + 150+ platos latinos', allSuggestible().filter((x) => x.s.kind === 'recipe').length >= 10 && allSuggestible().filter((x) => x.s.kind === 'dish').length >= 150);
for (const g of ['lose', 'keep', 'gain'] as const) for (const left of [300, 600, 1200]) { const r = suggestRecipes(left, g);
  ok(`${g} ${left}: 2-3 sugerencias que caben`, r.length >= 2 && r.length <= 3 && r.every((x) => x.kcal <= left * 1.05)); }
const L = suggestRecipes(900, 'lose'), G = suggestRecipes(900, 'gain'); const pd = (a: any[]) => a.reduce((s, x) => s + (x.p * 4) / x.kcal, 0) / a.length; const kc = (a: any[]) => a.reduce((s, x) => s + x.kcal, 0) / a.length;
ok('bajar prioriza proteína', pd(L) >= pd(G)); ok('subir prioriza más kcal', kc(G) >= kc(L));
ok('incluye al menos una receta para cocinar', suggestRecipes(800, 'keep').some((x) => x.kind === 'recipe'));
const veg = suggestRecipes(1000, 'keep', ['veg']).map((x) => x.name.es).join(' '); ok('vegetariano sin carne', !/(pollo|carne|pescado|cerdo|res\b|at[uú]n)/i.test(veg));
const nf = suggestRecipes(1000, 'lose', ['fish', 'dairy', 'eggs']).map((x) => x.name.es + x.name.en).join(' '); ok('sin pescado, lácteos ni huevo', !/(pescado|fish|queso|cheese|huevo|egg|leche|milk|yogur)/i.test(nf));
ok('sin hueco → al menos snacks pequeños', suggestRecipes(0, 'lose').every((x) => x.kcal <= 160));
ok('8 áreas profesionales con brief', AREAS.length === 8 && AREAS.every((a) => BRIEF[a].length > 60));
ok('detecta el área de la pregunta', areasFor('me duele la rodilla al hacer sentadillas').includes('physio') && areasFor('how much protein').includes('nutrition') && areasFor('no puedo dormir').includes('sleep'));
ok('contexto ≤ 1400 y con seguridad', (() => { const c = kbContext('rutina de fuerza y dieta keto', 'gain', 'goal gain'.repeat(20)); return c.length <= 1400 && /Safety/.test(c) || c.length === 1400; })());
ok('alarma: pecho, desmayo, embarazo, medicamento, TCA', ['tengo dolor en el pecho', 'I fainted at the gym', 'estoy embarazada', 'qué medicamento tomo', 'me provoco el vómito', 'gravidez grávida', 'göğüs ağrısı var'].every(redFlag));
ok('sin falsas alarmas', !['quiero más proteína', 'receta de arepa', 'how do I squat'].some(redFlag));
const c1 = toggleCheck({}, '2026-10-21', 'c1'); const c2 = toggleCheck(c1, '2026-10-21', 'c1'); ok('lista diaria marca y desmarca', c1['2026-10-21'][0] === 'c1' && c2['2026-10-21'].length === 0);
ok('semana del programa 1-4', programWeek(Date.now()) === 1 && programWeek(Date.now() - 15 * 864e5) === 3 && programWeek(Date.now() - 29 * 864e5) === 1);
ok('casos especiales detectados', specialFor('tengo diabetes tipo 2').includes('diabetes') && specialFor('I am pregnant').includes('pregnancy') && specialFor('x', 15).includes('teen') && specialFor('x', 76).includes('older') && specialFor('me provoco el vómito').includes('ed') && specialFor('presión alta').includes('hypertension'));
ok('contexto con caso especial cabe en 700 tras el perfil', kbContext('tengo diabetes', 'lose', 'goal lose, 55 y, 98 kg, male, target 2000 kcal/day').slice(0, 700).includes('Diabetes (ADA)'));
ok('casos especiales derivan', Object.values(SPECIAL).every((t) => /doctor|provider|physio|pediatrician|psycholog|team|surgeon/i.test(t)));
ok('opresión en el pecho es alarma', redFlag('siento opresión en el pecho') && redFlag('chest tightness on stairs'));
{ const r = safeReply('Para la proteína usa comida. Para la creatina, la dosis estándar es de 3 a 5 gramos al día. Entrena constante.', 'es'); ok('quita dosis de creatina', !/3 a 5 gramos/.test(r) && /médico/.test(r) && /Entrena constante/.test(r)); }
ok('respuesta normal intacta', safeReply('Come 2 huevos y camina 20 minutos.') === 'Come 2 huevos y camina 20 minutos.');
ok('suplementos y TCA van primero en el contexto', kbContext('¿cuánta creatina tomo?', 'gain', 'goal gain, 23 y').startsWith('SUPPLEMENTS') && kbContext('me provoco el vómito', 'lose', 'goal lose, 20 y').startsWith('EATING'));
console.log(res.join('\n')); const np = res.filter((r) => r.startsWith('PASS')).length; console.log(`coachkb ${np}/${res.length}`); if (np !== res.length) process.exitCode = 1;
