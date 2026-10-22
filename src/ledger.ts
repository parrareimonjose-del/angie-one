// Registro de cargos con reparto 60/25/15 (fundador / app-crecimiento / impuestos). Nunca mueve dinero:
// solo registra. Cada cargo necesita el toque de José ("Aprobar reparto") para emitir recibo.
export type Charge = { id: string; date: string; desc: string; gross: number; fee: number; currency: 'USD'; sample: boolean; status: 'pending' | 'approved' | 'rejected'; receipt?: string; decidedAt?: string };
export const SPLIT = { founder: 60, app: 25, taxes: 15 } as const;
const c2 = (n: number) => Math.round(n * 100);
/** Reparto exacto en centavos: impuestos = resto, así la suma siempre cuadra. */
export function split3(net: number) {
  const n = c2(net); const founder = Math.floor((n * SPLIT.founder) / 100); const app = Math.floor((n * SPLIT.app) / 100);
  return { founder: founder / 100, app: app / 100, taxes: (n - founder - app) / 100 };
}
export const net = (c: Charge) => (c2(c.gross) - c2(c.fee)) / 100;
export const SAMPLE_CHARGES: Charge[] = [
  { id: 'ej-1', date: '2026-10-01', desc: 'Premium mensual (EJEMPLO)', gross: 2.49, fee: 0.37, currency: 'USD', sample: true, status: 'pending' },
  { id: 'ej-2', date: '2026-10-03', desc: 'Premium anual (EJEMPLO)', gross: 24.99, fee: 1.02, currency: 'USD', sample: true, status: 'pending' },
  { id: 'ej-3', date: '2026-10-07', desc: 'Premium mensual (EJEMPLO)', gross: 2.49, fee: 0.37, currency: 'USD', sample: true, status: 'pending' },
  { id: 'ej-4', date: '2026-10-12', desc: 'Premium mensual (EJEMPLO)', gross: 2.49, fee: 0.37, currency: 'USD', sample: true, status: 'pending' },
];
export function decideCharge(list: Charge[], id: string, v: 'approved' | 'rejected', now = new Date()): Charge[] {
  const n = list.filter((x) => x.receipt).length + 1;
  return list.map((c) => (c.id !== id || c.status !== 'pending' ? c : { ...c, status: v, decidedAt: now.toISOString().slice(0, 10), receipt: v === 'approved' ? `AO-${now.getFullYear()}-${String(n).padStart(4, '0')}` : undefined }));
}
export function totals(list: Charge[]) {
  const ok = list.filter((c) => c.status === 'approved'); const sum = (f: (c: Charge) => number) => Math.round(ok.reduce((a, c) => a + c2(f(c)), 0)) / 100;
  return { count: ok.length, gross: sum((c) => c.gross), fee: sum((c) => c.fee), net: sum(net), founder: sum((c) => split3(net(c)).founder), app: sum((c) => split3(net(c)).app), taxes: sum((c) => split3(net(c)).taxes), pending: list.filter((c) => c.status === 'pending').length };
}
const q = (v: string | number) => { const s = String(v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
/** CSV para el contador (UTF-8, coma, punto decimal). */
export function toCsv(list: Charge[]) {
  const head = ['receipt', 'date', 'description', 'currency', 'gross', 'processor_fee', 'net', 'founder_60', 'app_growth_25', 'taxes_15', 'status', 'sample_data'];
  const rows = list.map((c) => { const sp = split3(net(c)); return [c.receipt || '', c.date, c.desc, c.currency, c.gross.toFixed(2), c.fee.toFixed(2), net(c).toFixed(2), sp.founder.toFixed(2), sp.app.toFixed(2), sp.taxes.toFixed(2), c.status, c.sample ? 'YES' : 'NO'].map(q).join(','); });
  return [head.join(','), ...rows].join('\n') + '\n';
}
export const money = (n: number) => '$' + n.toFixed(2);
/** Líneas del recibo PDF de un cargo aprobado. */
export function receiptLines(c: Charge, L: (k: string) => string) {
  const sp = split3(net(c));
  return ['Angie One - Parra Apps', `${L('rcpt')} ${c.receipt || '-'}`, `${L('date')}: ${c.date}   ${L('approvedOn')}: ${c.decidedAt || '-'}`, '', `${L('concept')}: ${c.desc}`,
    `${L('gross')}: ${money(c.gross)}   ${L('fee')}: ${money(c.fee)}   ${L('net')}: ${money(net(c))}`, '',
    `60% ${L('founder')}: ${money(sp.founder)}`, `25% ${L('app')}: ${money(sp.app)}`, `15% ${L('taxes')}: ${money(sp.taxes)}`, '',
    c.sample ? `!! ${L('sample')}` : '', L('never')];
}
/** Líneas del resumen PDF para el contador. */
export function accountantLines(list: Charge[], L: (k: string) => string) {
  const t = totals(list);
  return ['Angie One - Parra Apps', L('accTitle'), '', `${L('approved')}: ${t.count}   ${L('pending')}: ${t.pending}`, `${L('gross')}: ${money(t.gross)}   ${L('fee')}: ${money(t.fee)}   ${L('net')}: ${money(t.net)}`,
    `60% ${L('founder')}: ${money(t.founder)}`, `25% ${L('app')}: ${money(t.app)}`, `15% ${L('taxes')}: ${money(t.taxes)}`, '',
    ...list.map((c) => `${c.receipt || '(' + c.status + ')'}  ${c.date}  ${c.desc}  ${money(net(c))}`), '', list.some((c) => c.sample) ? `!! ${L('sample')}` : '', L('never')];
}
