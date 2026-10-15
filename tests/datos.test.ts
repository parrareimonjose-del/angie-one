// Ejecutar: npm run test:datos — Sección de Datos: la salud NUNCA entra; solo recibos y encuestas.
import assert from 'node:assert/strict';
import { INIT_DATA, grant, revoke, ingest, danglingPointers, monthlyCost, monthGap, canRedeem, redeem, gapSurveyId, listInfo, filteredView, decideList, MIN_GROUP, LISTS, FORBIDDEN, ALLOWED_SOURCES, deductions, tagLists } from '../src/datos';

let n = 0; const ok = (c: any, m: string) => { assert.ok(c, m); n++; };
const NOW = new Date('2026-10-15T12:00:00').getTime();
const R = (i: number, extra: any = {}) => ({ store: 'Super ' + i, date: '2026-10-1' + (i % 5), category: 'groceries', total: 20 + i, currency: 'USD', items: [{ name: 'pan', price: 2 }], ...extra });

// 1) Sin permiso no entra nada
ok(ingest(INIT_DATA, 'receipt', R(1), 'a', NOW).error === 'no_consent', 'sin permiso no entra');
let d = grant(INIT_DATA, NOW); ok(d.consent && d.log[0].action === 'grant', 'permiso registrado con versión');

// 2) SALUD NUNCA: fuentes de salud rechazadas
for (const src of ['weight', 'meal', 'entries', 'sleep', 'memory', 'chat', 'coach', 'workout', 'profile']) ok(ingest(d, src, { x: 1 }, 'h' + src, NOW).error === 'source_forbidden', 'fuente de salud rechazada: ' + src);
ok(ALLOWED_SOURCES.length === 2 && ALLOWED_SOURCES.join() === 'receipt,survey', 'solo recibos y encuestas');
// claves de salud escondidas dentro de un recibo o encuesta → rechazadas
for (const k of ['weight', 'kcal', 'sleep', 'memory', 'chat', 'allergies']) {
  ok(ingest(d, 'receipt', { ...R(2), extra: { [k]: 80 } }, 'x' + k, NOW).error === 'health_forbidden', 'clave de salud en recibo rechazada: ' + k);
  ok(ingest(d, 'survey', { id: 's-' + k, answers: {}, [k]: 1 }, 'y' + k, NOW).error === 'health_forbidden', 'clave de salud en encuesta rechazada: ' + k);
}
// recibo de farmacia/salud: se guarda para el informe del usuario pero no va a ninguna lista vendible
const ph = ingest(d, 'receipt', R(3, { category: 'pharmacy' }), 'ph', NOW).d;
ok(LISTS.every((l) => !ph.lists[l].includes('ph')), 'farmacia fuera de listas vendibles');

// 3) Puntos: 3 por recibo, máx. 5 al día; 2 por encuesta
for (let i = 0; i < 5; i++) { const r = ingest(d, 'receipt', R(i), 'r' + i, NOW); ok(!r.error && r.pts === 3, 'recibo +3'); d = r.d; }
ok(ingest(d, 'receipt', R(9), 'r9', NOW).error === 'limit', 'sexto recibo del día rechazado');
ok(d.points === 15, '5 recibos = 15 puntos');
const sv = ingest(d, 'survey', { id: 'shop1', answers: { a: 'online' } }, 's1', NOW); ok(sv.pts === 2, 'encuesta +2'); d = sv.d;
ok(ingest(d, 'survey', { id: 'shop1', answers: {} }, 's1b', NOW).error === 'done', 'encuesta no se repite');

// Copia maestra con punteros: un dato una sola vez, en varias listas sin duplicarse
ok(Object.keys(d.master).length === 6, 'copia maestra sin duplicados');
ok(LISTS.filter((l) => d.lists[l].includes('r0')).length >= 2, 'un recibo en varias listas por puntero');
ok(danglingPointers(d).length === 0, 'punteros válidos');
// Ningún dato guardado tiene claves de salud
const walk = (o: any): string[] => o && typeof o === 'object' ? Object.entries(o).flatMap(([k, v]) => [k, ...walk(v)]) : [];
ok(walk(d.master).every((k) => !FORBIDDEN.includes(k.toLowerCase())), 'copia maestra sin claves de salud');

// 5) Informe mensual 15-20 con hueco que cubre una encuesta
for (let i = 0; i <= 10; i++) { const c = monthlyCost(i); ok(c >= 15 && c <= 20, 'costo mensual 15-20 con ' + i + ' recibos'); }
ok(monthGap(d, '2026-10') >= 0, 'hueco mensual calculado');
ok(!canRedeem(d, 'month', '2026-10').ok, 'sin encuesta del hueco no se canjea');
d = ingest(d, 'survey', { id: gapSurveyId('month', '2026-10'), answers: { a: 'b' } }, 'g1', NOW).d;
const c = canRedeem(d, 'month', '2026-10'); ok(c.gapDone && c.ok === d.points >= c.cost, 'hueco cubierto con encuesta');
if (c.ok) { const before = d.points; d = redeem(d, 'month', '2026-10', NOW)!; ok(d.points === before - c.cost, 'canje resta puntos'); }
// 6) Anual 100
ok(canRedeem(d, 'year', '2026').cost === 100 && !canRedeem(d, 'year', '2026').ok, 'anual 100 y requiere encuesta + puntos');
ok(deductions([{ store: 'U', date: '2026-01-01', category: 'education', total: 100, currency: 'USD', items: [] }]).education === 100, 'posibles deducciones');

// 7-9) Listas: mínimo 50, dos precios, Aprobar nunca vende
ok(!listInfo('consumo', 49, 300).ready && listInfo('consumo', 50, 300).ready, 'grupo mínimo 50');
const li = listInfo('consumo', 64, 900); ok(li.oneTime[0] > 0 && li.sub[0] > 0 && li.oneTime[1] >= li.oneTime[0], 'dos precios con rango');
ok(filteredView('consumo', Object.values(d.master), 49) === null, 'vista filtrada bloqueada con <50');
const v = filteredView('consumo', Object.values(d.master), MIN_GROUP)!; ok(v && !JSON.stringify(v).includes('Super') && !JSON.stringify(v).includes('"id"'), 'vista filtrada sin datos individuales');
ok(decideList('consumo', 'approved').sold === false && decideList('consumo', 'later').sold === false, 'aprobar/todavía no nunca vende');

// 10) Retirar permiso / borrar cuenta: cascada
const r = revoke(d, NOW); ok(!r.consent && Object.keys(r.master).length === 0 && LISTS.every((l) => r.lists[l].length === 0), 'retirar borra copia maestra y listas');
ok(revoke(d, NOW, 'delete').log.at(-1)!.action === 'delete', 'borrar cuenta registrado');
ok(tagLists({ id: 'z', source: 'survey', at: NOW, day: '2026-10-15', survey: { id: 'q', answers: {} } }, {}, NOW).includes('segment'), 'encuesta → segmentación');
console.log(`✓ datos: ${n} comprobaciones OK (la salud nunca entra)`);
// Código: la sección de datos nunca lee el estado de salud de la app
import { readFileSync } from 'node:fs';
for (const f of ['src/datos.ts', 'src/datos-ui.tsx']) {
  const src = readFileSync(f, 'utf8');
  for (const bad of ['st.entries', 'st.profile', 'st.coach', 'aiPhotos', 'st.water']) assert.ok(!src.includes(bad), `${f} no debe leer ${bad}`);
  assert.ok(!/useExt[^(]*\(\s*'(weights|sleep|memory|chat|coach)/.test(src), `${f} no debe abrir datos de salud`);
}
console.log('✓ datos: el código de la sección no lee datos de salud');
