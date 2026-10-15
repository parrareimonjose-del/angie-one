// Resumen para el Panel Maestro de Parra Apps (mismo formato que lee /workspace/panel-maestro/app.js en apps tipo "api").
import { Charge, totals, SPLIT } from './ledger';
export const PM_SCHEMA = 'parra-apps/panel-maestro-summary@1';
export type PmSummary = {
  schema: string; app: { id: string; name: string; emoji: string; color: string; version: string; founderPanelUrl: string };
  generatedAt: string; sampleData: boolean; cards: [string, number | string][]; metrics: Record<string, number | string | boolean>;
  revenue: { note: string; currency: 'USD' }; socialFund: { rule: string };
  revenueSplit: { rule: string; buckets: { key: 'jose' | 'growth' | 'reserve'; name: string; pct: number; balanceUsd: number | null }[]; pendingApprovals: number };
  approvals: { pending: number; kinds: string[] }; privacy: { healthDataIncluded: false; personalData: false };
};
export function buildSummary(m: Record<string, number | string | boolean>, ledger: Charge[], version: string, now = new Date()): PmSummary {
  const t = totals(ledger); const sample = ledger.some((c) => c.sample);
  return {
    schema: PM_SCHEMA,
    app: { id: 'angie-one', name: 'Angie One', emoji: '🥗', color: '#E11D48', version, founderPanelUrl: 'https://parrareimonjose-del.github.io/angie-one/founder' },
    generatedAt: now.toISOString(), sampleData: sample,
    cards: [['Usuarios', Number(m.users) || 0], ['Días activos (7)', Number(m.activeDays7) || 0], ['Registros', Number(m.entries) || 0], ['Cargos aprobados', t.count]],
    metrics: m,
    revenue: { note: sample ? 'DATOS DE EJEMPLO: aún no hay cobros reales (pagos pendientes de conexión).' : `Neto aprobado ${t.net.toFixed(2)} USD`, currency: 'USD' },
    socialFund: { rule: 'Sin donaciones ni fondos de impacto (decisión de José 2026-10-15). Solo reparto de ingresos 60/25/15, cada uno con su toque.' },
    revenueSplit: { rule: `${SPLIT.founder}% fundador / ${SPLIT.app}% app (crecimiento) / ${SPLIT.taxes}% impuestos`,
      buckets: [{ key: 'jose', name: 'Para José', pct: SPLIT.founder, balanceUsd: t.founder }, { key: 'growth', name: 'Crecimiento', pct: SPLIT.app, balanceUsd: t.app }, { key: 'reserve', name: 'Impuestos', pct: SPLIT.taxes, balanceUsd: t.taxes }],
      pendingApprovals: t.pending },
    approvals: { pending: t.pending, kinds: ['reparto', 'lista de datos', 'propuesta IA'] },
    privacy: { healthDataIncluded: false, personalData: false },
  };
}
/** Comprueba que un objeto cumple el formato (lo usa la prueba y sirve a otras apps). */
export function validSummary(s: any): string[] {
  const e: string[] = [];
  if (s?.schema !== PM_SCHEMA) e.push('schema'); if (!s?.app?.id) e.push('app.id'); if (isNaN(Date.parse(s?.generatedAt))) e.push('generatedAt');
  if (!Array.isArray(s?.cards) || !s.cards.every((c: any) => Array.isArray(c) && c.length === 2)) e.push('cards');
  const b = s?.revenueSplit?.buckets; if (!Array.isArray(b) || b.reduce((a: number, x: any) => a + x.pct, 0) !== 100) e.push('revenueSplit.buckets');
  if (s?.privacy?.healthDataIncluded !== false) e.push('privacy.healthDataIncluded');
  return e;
}
