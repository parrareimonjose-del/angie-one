// npm run test:faltantes — entrada local, reparto 55/5/25/15, Panel Maestro, IA admin/programadora, pagos y banderas.
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
if (!(globalThis as any).crypto) (globalThis as any).crypto = webcrypto;
import { createAuth, checkSecret, validSecret, needsUnlock, MAX_FAILS } from '../src/auth';
import { split3, SAMPLE_CHARGES, decideCharge, totals, toCsv, net, receiptLines } from '../src/ledger';
import { buildSummary, validSummary } from '../src/panelmaestro';
import { adminProposals, toSpec, specMarkdown, canAct, GUARD } from '../src/adminai';
import { APP_AI, makeAiConfig, aiUrl } from '../src/ai-config';
import { providerFor, purchase, PLANS } from '../src/payments';
import { FEATURES } from '../src/flags';
let n = 0; const ok = (c: any, m: string) => { assert.ok(c, m); n++; };

// 1) Entrada
ok(validSecret('pin', '12') === 'pinLen' && validSecret('pin', '1111') === 'weakPin' && validSecret('pin', '1234') === 'weakPin' && validSecret('pin', '2580') === '', 'reglas PIN');
ok(validSecret('password', 'abc') === 'pwLen' && validSecret('password', 'abcdef') === '', 'reglas contraseña');
let a = await createAuth('Ana', 'pin', '2580', false);
ok(!JSON.stringify(a).includes('2580') && a.hash.length === 64, 'PIN nunca en texto, hash PBKDF2');
ok((await checkSecret(a, '2580')).ok, 'PIN correcto entra');
let r = await checkSecret(a, '0000'); ok(!r.ok && r.auth.fails === 1, 'PIN incorrecto cuenta fallo');
for (let i = 1; i < MAX_FAILS; i++) r = await checkSecret(r.auth, '0000', 1000);
ok(r.locked && r.auth.lockUntil > 1000, '5 fallos bloquean 30 s');
ok(!(await checkSecret(r.auth, '2580', 2000)).ok, 'bloqueado aunque sea correcto');
ok((await checkSecret(r.auth, '2580', 1000 + 31000)).ok, 'tras la espera entra');
ok(needsUnlock(a, false) && !needsUnlock({ ...a, remember: true }, false) && !needsUnlock(a, true) && !needsUnlock(null, false), 'recordar dispositivo y saltar');

// 2) Reparto 55/5/25/15 exacto en centavos
for (const v of [1.63, 14.26, 0.66, 0.01, 999.99]) { const s = split3(v); ok(Math.round((s.founder + s.family + s.app + s.taxes) * 100) === Math.round(v * 100), 'cuadra ' + v); }
ok(split3(100).founder === 55 && split3(100).family === 5 && split3(100).app === 25 && split3(100).taxes === 15, '55/5/25/15');
let L = decideCharge(SAMPLE_CHARGES, 'ej-1', 'approved', new Date('2026-10-15')); ok(L[0].receipt === 'AO-2026-0001', 'recibo numerado');
L = decideCharge(L, 'ej-1', 'rejected'); ok(L[0].status === 'approved', 'no se puede cambiar un cargo ya decidido');
const tt = totals(L); ok(tt.count === 1 && tt.pending === 3 && tt.net === net(SAMPLE_CHARGES[0]), 'totales');
const csv = toCsv(L); ok(csv.split('\n')[0].includes('founder_55') && csv.split('\n')[0].includes('angie_family_5') && csv.includes('AO-2026-0001') && csv.includes(',YES'), 'CSV contador con marca de ejemplo');
ok(receiptLines(L[0], (k) => k).some((x) => x.includes('sample')), 'recibo marca datos de ejemplo');
ok(!SAMPLE_CHARGES.some((c) => /prop[oó]sito|don/i.test(c.desc)), 'sin cargos de donación/tienda');

// 3) Panel Maestro
const sum = buildSummary({ users: 1, activeDays7: 2, entries: 5 }, L, '0.6.0', new Date('2026-10-15T12:00:00Z'));
ok(validSummary(sum).length === 0, 'resumen válido: ' + validSummary(sum).join());
ok(sum.revenueSplit.buckets.map((b) => b.key).join() === 'jose,family,growth,reserve' && sum.privacy.healthDataIncluded === false, 'claves del Panel Maestro y sin salud');
ok(!/weight|kcal|sleep|memory/i.test(JSON.stringify(sum.metrics)), 'sin métricas de salud en el resumen');
ok(validSummary({ ...sum, privacy: { healthDataIncluded: true } }).includes('privacy.healthDataIncluded'), 'rechaza salud');

// 4) IA admin y programadora
const m = { users: 1, activeDays7: 1, activeDays30: 3, entries: 10, avgKcal7: 2600, targetKcal: 1800, overDays7: 3, underDays7: 0, avgWater7: 3, streak: 0, photo: 1, barcode: 1, manual: 8, daysSinceWeigh: 10, avgSleep7: 5.5, feedback: 1, phase: 'trial' as const, pendingCharges: 2 };
const P = adminProposals(m, ['la foto tarda']); const rules = P.map((p) => p.rule);
for (const k of ['retention', 'overGoal', 'water', 'weigh', 'sleep', 'quickLog', 'speed', 'charges']) ok(rules.includes(k), 'propuesta ' + k);
ok(P.find((p) => p.rule === 'overGoal')!.n === 3, 'usa el número real');
const prop = { ...P[0], id: 'x1', status: 'proposed' as const, at: '' };
ok(toSpec(prop) === null, 'sin aprobar no hay tarea');
const sp = toSpec({ ...prop, status: 'approved' })!; ok(sp && sp.status === 'draft_for_review' && sp.guard === GUARD && sp.files.length && sp.patch.startsWith('---'), 'tarea + borrador');
ok(specMarkdown(sp).includes('no aplicado'), 'markdown de revisión');
for (const act of ['publish', 'deploy', 'move_money', 'bank', 'transfer_funds', 'pay', 'send_message', 'sell_data']) ok(!canAct(act), 'nunca: ' + act);

// 5) IA portátil
const other = makeAiConfig({ appId: 'cuidajuntos', appName: 'CuidaJuntos', workerBase: 'https://x.workers.dev' });
ok(aiUrl('chat', other) === 'https://x.workers.dev/chat' && other.locales.length === 13 && APP_AI.appId === 'angie-one', 'config reutilizable');

// 6) Pagos por plataforma + banderas
ok(providerFor('web').id === 'stripe' && providerFor('android').id === 'play' && providerFor('ios').id === 'apple', 'proveedor por plataforma');
ok(PLANS.monthly.usd === 2.49 && PLANS.yearly.usd === 24.99 && Object.keys(PLANS).join() === 'monthly,yearly', 'precio único mundial 2,49 $/mes y 24,99 $/año, sin regional');
for (const os of ['web', 'android', 'ios']) { const x = await purchase('monthly', os); ok(!x.ok && x.reason === 'pending_connection', 'nunca simula cobro ' + os); }
ok(FEATURES.purposeStore === false && FEATURES.donations === false, 'tienda oculta y sin donaciones');

// 9) Aprendizaje legal + precios Premium actuales
import { LEARN0, pushLearn, founderLearnView, safeLabel } from '../src/ailearn';
ok(safeLabel('70 kg') === '' && pushLearn(LEARN0, 'dish', 'empanada').events.length === 1, 'ailearn filtra salud y guarda plato');
ok(founderLearnView(LEARN0, true, 0).legal === 'device_only_no_health_sale', 'fundador: sin venta de salud');
ok(PLANS.monthly.usd === 2.49 && PLANS.yearly.usd === 24.99, 'Premium 2.49/24.99 mundial');

console.log(`✓ faltantes: ${n} pruebas`);
