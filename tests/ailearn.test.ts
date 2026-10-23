// npm run test:ailearn — aprendizaje legal por usuario (sin datos de salud vendibles)
import assert from 'node:assert/strict';
import { LEARN0, pushLearn, applyMealLearn, summarizeLearn, founderLearnView, safeLabel } from '../src/ailearn';

let n = 0; const ok = (c: any, m: string) => { assert.ok(c, m); n++; };

ok(safeLabel('arroz con pollo') === 'arroz con pollo', 'etiqueta limpia');
ok(safeLabel('peso 70 kg') === '', 'bloquea peso/kg');
ok(safeLabel('500 kcal') === '', 'bloquea kcal');
ok(safeLabel('') === '', 'vacío');

let L = LEARN0;
L = pushLearn(L, 'dish', 'arepa de queso');
ok(L.events.length === 1 && L.events[0].kind === 'dish', 'plato registrado');
L = pushLearn(L, 'dish', 'arepa de queso'); // dup reciente
ok(L.events.length === 1, 'no duplica label+kind reciente');

L = applyMealLearn(L, 'bandeja paisa', { portion: 1.5, oil: true, sauce: false, fried: true });
ok(L.events.some((e) => e.kind === 'portion') && L.events.some((e) => e.kind === 'correction'), 'porción y corrección');
ok(!JSON.stringify(L).match(/\b\d+\s*kcal\b/i), 'sin kcal en log');

const s = summarizeLearn(L);
ok(s.total >= 3 && s.byKind.dish >= 1 && s.growing, 'resumen crece');

const v = founderLearnView(L, true, 4);
ok(v.usersTracked === 1 && v.memoryFacts === 4 && v.legal === 'device_only_no_health_sale', 'vista fundador legal');
ok(v.growing && v.recent.length > 0, 'fundador ve crecimiento');
ok(!JSON.stringify(v.recent).match(/diagnos|insulin|bmi/i), 'recientes sin clínico');

console.log(`ailearn: ${n} ok`);
