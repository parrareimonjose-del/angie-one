// IA Administrativa (métricas reales del dispositivo → propuestas) e IA Programadora (propuesta aprobada → especificación
// de tarea + borrador de parche para revisar). Ninguna publica, despliega, mueve dinero ni toca bancos: solo escriben borradores.
import { dailyTarget, today, DAY, streak, trialPhase, type State } from './store';
import { aiMayDo } from './ai-config';
import type { Charge } from './ledger';
import { dataHubAdminReview, type HubSummary } from './datahub';

const dayStr = (n: number, now: number) => today(new Date(now - n * DAY));
export function adminMetrics(st: State, ledger: Charge[] = [], now = Date.now()) {
  const ext: any = (st as any).ext || {}; const tgt = dailyTarget(st.profile).kcal;
  const d7 = Array.from({ length: 7 }, (_, i) => dayStr(i, now)), d30 = Array.from({ length: 30 }, (_, i) => dayStr(i, now));
  const kcalBy: Record<string, number> = {}; st.entries.forEach((e) => { kcalBy[e.date] = (kcalBy[e.date] || 0) + e.kcal; });
  const logged7 = d7.filter((d) => kcalBy[d]);
  const avgKcal7 = logged7.length ? Math.round(logged7.reduce((a, d) => a + kcalBy[d], 0) / logged7.length) : 0;
  const weights: { date: string; kg: number }[] = ext.weights || []; const lastW = weights.map((w) => w.date).sort().pop();
  const sleep: { h: number; date: string }[] = (ext.sleep || []).filter((x: any) => d7.includes(x.date));
  const src = (k: string) => st.entries.filter((e) => e.source === k).length;
  const waterDays = d7.filter((d) => st.water[d] !== undefined); const avgWater7 = waterDays.length ? +(waterDays.reduce((a, d) => a + (st.water[d] || 0), 0) / waterDays.length).toFixed(1) : 0;
  return {
    users: 1, activeDays7: logged7.length, activeDays30: d30.filter((d) => kcalBy[d]).length, entries: st.entries.length,
    avgKcal7, targetKcal: tgt, overDays7: logged7.filter((d) => kcalBy[d] > tgt * 1.15).length, underDays7: logged7.filter((d) => kcalBy[d] < tgt * 0.6).length,
    avgWater7, streak: streak(st.challengeDays), photo: src('photo'), barcode: src('barcode'), manual: src('manual'),
    daysSinceWeigh: lastW ? Math.round((new Date(today(new Date(now))).getTime() - new Date(lastW).getTime()) / DAY) : -1,
    avgSleep7: sleep.length ? +(sleep.reduce((a, x) => a + x.h, 0) / sleep.length).toFixed(1) : 0,
    feedback: (ext.feedback || []).length, phase: trialPhase(st.trialStart, now).phase,
    pendingCharges: ledger.filter((c) => c.status === 'pending').length,
  };
}
export type AdminMetrics = ReturnType<typeof adminMetrics>;
export type Proposal = { id: string; rule: string; n: number; impact: 'high' | 'medium' | 'low'; effort: 'S' | 'M'; status: 'proposed' | 'approved' | 'rejected'; at: string };
/** Reglas claras y explicables (las mismas que puede mejorar la IA del Worker). Siempre con el número real que las dispara. */
export function adminProposals(m: AdminMetrics, fb: string[] = []): Omit<Proposal, 'id' | 'status' | 'at'>[] {
  const out: Omit<Proposal, 'id' | 'status' | 'at'>[] = []; const all = fb.join(' ').toLowerCase();
  if (m.activeDays7 < 4) out.push({ rule: 'retention', n: m.activeDays7, impact: 'high', effort: 'S' });
  if (m.overDays7 >= 2) out.push({ rule: 'overGoal', n: m.overDays7, impact: 'high', effort: 'M' });
  if (m.underDays7 >= 2) out.push({ rule: 'underGoal', n: m.underDays7, impact: 'high', effort: 'S' });
  if (m.avgWater7 < 6) out.push({ rule: 'water', n: m.avgWater7, impact: 'medium', effort: 'S' });
  if (m.daysSinceWeigh < 0 || m.daysSinceWeigh > 7) out.push({ rule: 'weigh', n: m.daysSinceWeigh, impact: 'medium', effort: 'S' });
  if (m.avgSleep7 && m.avgSleep7 < 6.5) out.push({ rule: 'sleep', n: m.avgSleep7, impact: 'medium', effort: 'S' });
  if (m.entries > 0 && m.manual / m.entries > 0.6) out.push({ rule: 'quickLog', n: Math.round((m.manual / m.entries) * 100), impact: 'medium', effort: 'M' });
  if (/lent|tarda|slow/.test(all)) out.push({ rule: 'speed', n: fb.filter((f) => /lent|tarda|slow/i.test(f)).length, impact: 'medium', effort: 'M' });
  if (m.pendingCharges > 0) out.push({ rule: 'charges', n: m.pendingCharges, impact: 'low', effort: 'S' });
  return out;
}
export type TaskSpec = { id: string; proposalId: string; rule: string; title: string; files: string[]; steps: string[]; tests: string[]; patch: string; createdAt: string; status: 'draft_for_review'; guard: string };
const PLAN: Record<string, { title: string; files: string[]; steps: string[]; tests: string[]; patch: string }> = {
  retention: { title: 'Recordatorio amable si no registra en 2 días', files: ['src/p2.tsx (SmartTips/Reminders)', 'src/locales/*.json'], steps: ['Calcular días sin registro con adminMetrics().activeDays7', 'Mostrar tarjeta "¿Te ayudo a registrar?" con botón de voz', 'Traducir a 13 idiomas'], tests: ['QA ES/EN: tarjeta visible con 0 registros en 2 días'],
    patch: "--- a/src/p2.tsx\n+++ b/src/p2.tsx\n@@ SmartTips @@\n+  if (daysWithoutLog(st) >= 2) tips.unshift({ k: 'nudge', go: '/voice' });" },
  overGoal: { title: 'Coach sugiere cambios suaves cuando se pasa de la meta', files: ['src/coach.ts', 'src/coach-ui.tsx'], steps: ['Detectar días >115% de la meta', 'Proponer 1 cambio (porción, bebida, cena) sin bajar del mínimo seguro', 'Nunca menos de 1200/1500 kcal'], tests: ['tests/safety: nunca recomienda bajo el mínimo'],
    patch: "--- a/src/coach.ts\n+++ b/src/coach.ts\n+export const softSwap = (over: number) => over >= 2 ? 'swap.dinner' : null;" },
  underGoal: { title: 'Aviso de seguridad cuando come muy poco', files: ['src/safety.ts', 'app/index.tsx'], steps: ['Detectar días <60% de la meta', 'Mostrar mensaje cálido y sugerir hablar con un profesional', 'Sin números agresivos'], tests: ['tests/safety: mensaje aparece con 2 días bajos'],
    patch: "--- a/src/safety.ts\n+++ b/src/safety.ts\n+export const lowIntakeWarn = (days: number) => days >= 2;" },
  water: { title: 'Recordatorio de agua cada 2 h (opcional)', files: ['app/reminders.tsx'], steps: ['Añadir aviso de agua activable', 'Botón grande "+1 vaso" en el aviso'], tests: ['QA: activar y ver el aviso'], patch: "--- a/app/reminders.tsx\n+++ b/app/reminders.tsx\n+  { k: 'water', every: 120 }," },
  weigh: { title: 'Pedir el peso semanal con un toque', files: ['src/p2.tsx', 'app/weight.tsx'], steps: ['Si pasan 7 días sin peso, tarjeta en inicio', 'Botones −/+ grandes'], tests: ['QA: tarjeta visible tras 8 días'], patch: "--- a/src/p2.tsx\n+++ b/src/p2.tsx\n+  if (daysSinceWeigh > 7) tips.unshift({ k: 'weigh', go: '/weight' });" },
  sleep: { title: 'Rutina de sueño de 5 minutos', files: ['app/sleep.tsx'], steps: ['Si duerme <6.5 h, ofrecer respiración guiada por voz por la noche'], tests: ['QA: botón visible con 5 h'], patch: "--- a/app/sleep.tsx\n+++ b/app/sleep.tsx\n+  {avg < 6.5 ? <Btn label={routineLabel} /> : null}" },
  quickLog: { title: 'Registro rápido: últimas 5 comidas con un toque', files: ['app/diary.tsx'], steps: ['Lista de comidas frecuentes', 'Un toque = añadir'], tests: ['QA: añadir comida frecuente'], patch: "--- a/app/diary.tsx\n+++ b/app/diary.tsx\n+  <Frequent entries={top5(st.entries)} />" },
  speed: { title: 'Foto más rápida: reducir imagen antes de enviar', files: ['src/img.ts'], steps: ['Bajar a 768 px y calidad 0.7', 'Medir tiempo antes/después'], tests: ['QA: foto < 8 s'], patch: "--- a/src/img.ts\n+++ b/src/img.ts\n-const MAX = 1024;\n+const MAX = 768;" },
  charges: { title: 'Recordar a José los repartos pendientes', files: ['app/founder.tsx'], steps: ['Insignia con el número de cargos pendientes', 'Nunca aprueba sola'], tests: ['QA: insignia con 4 pendientes'], patch: "--- a/app/founder.tsx\n+++ b/app/founder.tsx\n+  <Badge n={pending} />" },
};
export const GUARD = 'BORRADOR PARA REVISAR. La IA Programadora no publica, no despliega, no mueve dinero ni toca bancos. Aplicarlo necesita el toque de José.';
export function toSpec(p: Proposal, now = new Date()): TaskSpec | null {
  if (p.status !== 'approved') return null; // solo propuestas aprobadas por José
  const pl = PLAN[p.rule]; if (!pl) return null;
  return { id: 'spec-' + p.id, proposalId: p.id, rule: p.rule, ...pl, createdAt: now.toISOString(), status: 'draft_for_review', guard: GUARD };
}
export function specMarkdown(s: TaskSpec) {
  return [`# ${s.title}`, `ID: ${s.id} · Estado: ${s.status} · ${s.createdAt}`, '', `> ${s.guard}`, '', '## Archivos', ...s.files.map((f) => `- ${f}`), '', '## Pasos', ...s.steps.map((x, i) => `${i + 1}. ${x}`), '', '## Pruebas', ...s.tests.map((x) => `- ${x}`), '', '## Borrador de parche (no aplicado)', '```diff', s.patch, '```', ''].join('\n');
}
/** Las IAs nunca pueden hacer estas acciones. */
export const canAct = (action: string) => aiMayDo(action);

/** IA admin revisa el avance de las listas comerciales del hub (sin vender). */
export function adminDataHubReview(sum: HubSummary | null | undefined) {
  if (!sum) return { status: 'unknown', action: 'keep_collecting', ready_lists: [], progress: [], estimated_value_usd: 0, estimated: true as const, million_alert: false, note: 'Sin resumen del hub.' };
  const r = dataHubAdminReview(sum);
  return r;
}
