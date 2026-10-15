/** Taxes automáticos: la IA prepara el informe mensual al cerrar cada mes (con los recibos de ese mes) y,
 *  en temporada de impuestos, el informe anual del año fiscal anterior con sus deducciones.
 *  Abrirlo/guardarlo sigue la orden maestra: cuesta puntos y su hueco se cubre con una encuesta (canRedeem/redeem). */
import { DataState, monthReceipts, summarize, deductions } from './datos';

/** Temporada por país (MM-DD, inclusive). Configurable. Por defecto EE. UU.: finales de enero → 15 de abril. */
export const TAX_SEASONS: Record<string, { start: string; end: string }> = {
  US: { start: '01-27', end: '04-15' }, PR: { start: '01-27', end: '04-15' }, MX: { start: '04-01', end: '04-30' }, ES: { start: '04-02', end: '06-30' },
  CO: { start: '08-12', end: '10-24' }, CL: { start: '04-01', end: '04-30' }, AR: { start: '06-01', end: '06-30' }, PE: { start: '03-01', end: '03-31' },
  BR: { start: '03-15', end: '05-31' }, CA: { start: '02-24', end: '04-30' }, GB: { start: '04-06', end: '01-31' }, DE: { start: '03-01', end: '07-31' },
  FR: { start: '04-10', end: '06-05' }, IT: { start: '04-30', end: '09-30' },
};
export const seasonOf = (country = 'US') => TAX_SEASONS[country] || TAX_SEASONS.US;
const md = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const inRange = (x: string, a: string, b: string) => (a <= b ? x >= a && x <= b : x >= a || x <= b);

export function inSeason(now: Date, country = 'US') { const s = seasonOf(country); return inRange(md(now), s.start, s.end); }
/** Año fiscal que se declara ahora (el anterior; si la temporada cruza año, el de inicio). */
export function taxYear(now: Date, country = 'US') { const s = seasonOf(country); const y = now.getFullYear(); return String(s.start > s.end && md(now) >= s.start ? y : y - 1); }
/** Días hasta que empiece la temporada (0 si ya estamos en ella). */
export function daysToSeason(now: Date, country = 'US') {
  if (inSeason(now, country)) return 0; const s = seasonOf(country); const [m, d] = s.start.split('-').map(Number);
  let t = new Date(now.getFullYear(), m - 1, d); if (t < now) t = new Date(now.getFullYear() + 1, m - 1, d);
  return Math.ceil((t.getTime() - now.getTime()) / 864e5);
}
export function seasonEnd(now: Date, country = 'US') { const s = seasonOf(country); const [m, d] = s.end.split('-').map(Number); let t = new Date(now.getFullYear(), m - 1, d); if (t < now) t = new Date(now.getFullYear() + 1, m - 1, d); return t; }

export type AutoReport = { kind: 'month' | 'year'; period: string; readyAt: number; total: number; count: number; ded?: number; seen?: boolean };
export type TaxState = { country: string; auto: AutoReport[] };
export const INIT_TAX: TaxState = { country: 'US', auto: [] };

const receiptsOfYear = (d: DataState, y: string) => Object.values(d.master).filter((m) => m.source === 'receipt' && m.receipt!.date.startsWith(y)).map((m) => m.receipt!);

/** Prepara solo lo que falta: meses ya cerrados con recibos y, en temporada, el anual. Idempotente. */
export function autoGenerate(d: DataState, tx: TaxState, now = new Date()): { tx: TaxState; fresh: AutoReport[] } {
  const have = new Set(tx.auto.map((a) => a.kind + a.period)); const fresh: AutoReport[] = [];
  const months = new Set(Object.values(d.master).filter((m) => m.source === 'receipt').map((m) => m.receipt!.date.slice(0, 7)));
  const cur = ym(now);
  for (const p of [...months].sort()) {
    if (p >= cur || have.has('month' + p)) continue;
    const sm = summarize(monthReceipts(d, p)); if (!sm.count) continue;
    fresh.push({ kind: 'month', period: p, readyAt: now.getTime(), total: sm.total, count: sm.count });
  }
  if (inSeason(now, tx.country)) {
    const y = taxYear(now, tx.country); const rs = receiptsOfYear(d, y);
    if (rs.length && !have.has('year' + y)) { const ded = Object.values(deductions(rs)).reduce((a, b) => a + b, 0); const sm = summarize(rs);
      fresh.push({ kind: 'year', period: y, readyAt: now.getTime(), total: sm.total, count: sm.count, ded: Math.round(ded * 100) / 100 }); }
  }
  return { tx: fresh.length ? { ...tx, auto: [...tx.auto, ...fresh] } : tx, fresh };
}
