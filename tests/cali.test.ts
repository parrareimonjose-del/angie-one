import assert from 'node:assert';
import { EXS, TREES, PROGRAMS, wod, buildSteps, kcalStep, EX } from '../src/cali-data';
import { POSES } from '../src/cali-poses';
import { drawAthlete, look, ik } from '../src/cali-geo';
assert.ok(EXS.length >= 40, 'al menos 40 ejercicios');
for (const e of EXS) { assert.ok(POSES[e.id], 'pose ' + e.id); assert.ok(e.es.n && e.en.n && e.es.c.length === 3 && e.en.x.length === 2, 'texto ' + e.id); }
for (const ids of Object.values(TREES)) for (const i of ids) assert.ok(EX[i], 'árbol ' + i);
for (const p of PROGRAMS) for (const d of p.days) for (const x of d) assert.ok(EX[x.id]);
assert.equal(wod(1, '2026-10-23').length, 5);
assert.equal(buildSteps(PROGRAMS[0].days[0], 'tabata').filter((s) => s.kind === 'work').length, 8);
assert.ok(Math.abs(kcalStep(8, 70, 3600) - 560) < 1e-6);
const [j] = ik([0, 0], [0, 60], 30, 30, 1); assert.ok(Math.abs(j[1] - 30) < 0.5);
for (const sx of ['m', 'f'] as const) for (const [k, a] of Object.entries(POSES)) for (const f of a.fr) { const sh = drawAthlete(f, look(sx), a.eq); assert.ok(sh.length > 20, k); assert.ok(!JSON.stringify(sh).includes('NaN'), 'NaN ' + k); }
console.log('✓ cali', EXS.length, 'ejercicios');
