/** Sección de Datos (orden maestra Parra Apps, 10 puntos) — lógica pura, sin pantalla.
 *  Decisión de José (15-oct-2026): SOLO recibos y encuestas. Los datos de salud (peso, comidas, sueño,
 *  memoria, chat, ejercicio) NUNCA entran ni se venden. Todo es local/ejemplo hasta aprobar un servidor. */

export const CONSENT_VERSION = 'anexo-datos-v1-borrador';
export const ALLOWED_SOURCES = ['receipt', 'survey'] as const;
export type Source = typeof ALLOWED_SOURCES[number];
/** Campos y fuentes de salud prohibidos en la sección de datos (se comprueba en código y en pruebas). */
export const FORBIDDEN = ['weight', 'weights', 'kg', 'kcal', 'calories', 'entries', 'meal', 'meals', 'sleep', 'stress', 'memory', 'chat', 'coach', 'profile', 'height', 'bmi', 'workout', 'exercise', 'water', 'injury', 'injuries', 'health', 'diagnosis', 'allergy', 'allergies'];
/** Categorías de recibo que se guardan para el informe del usuario pero NUNCA van a listas vendibles. */
export const PRIVATE_CATS = ['health', 'pharmacy'];
export const CATS = ['groceries', 'restaurant', 'home', 'clothing', 'services', 'transport', 'education', 'charity', 'business', 'health', 'pharmacy', 'other'] as const;
export const LISTS = ['segment', 'fresh', 'consumo', 'exclusive', 'predict', 'trends'] as const;
export type ListId = typeof LISTS[number];
export const MIN_GROUP = 50;
export const PTS_RECEIPT = 3, PTS_SURVEY = 2, MAX_RECEIPTS_DAY = 5, ANNUAL_COST = 100;

export type Receipt = { store: string; date: string; category: string; total: number; currency: string; items: { name: string; price: number }[] };
export type Rec = { id: string; source: Source; at: number; day: string; receipt?: Receipt; survey?: { id: string; answers: Record<string, string> } };
export type ConsentEv = { at: number; action: 'grant' | 'revoke' | 'delete'; version: string };
export type DataState = { consent: boolean; consentAt?: number; log: ConsentEv[]; master: Record<string, Rec>; lists: Record<ListId, string[]>;
  points: number; ptsLog: { at: number; why: string; pts: number }[]; reports: { kind: 'month' | 'year'; period: string; at: number }[] };
export const emptyLists = () => Object.fromEntries(LISTS.map((l) => [l, [] as string[]])) as unknown as Record<ListId, string[]>;
export const INIT_DATA: DataState = { consent: false, log: [], master: {}, lists: emptyLists(), points: 0, ptsLog: [], reports: [] };

const dayOf = (at: number) => { const d = new Date(at); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Lanza error si el objeto trae cualquier clave de salud (a cualquier profundidad). */
export function assertNoHealth(o: unknown, path = ''): void {
  if (!o || typeof o !== 'object') return;
  for (const [k, v] of Object.entries(o as any)) {
    if (FORBIDDEN.includes(k.toLowerCase())) throw new Error('health_forbidden:' + path + k);
    assertNoHealth(v, path + k + '.');
  }
}
/** Solo campos permitidos de un recibo (lista blanca). */
export function cleanReceipt(r: any): Receipt {
  const cat = (CATS as readonly string[]).includes(r?.category) ? r.category : 'other';
  return { store: String(r?.store || '?').slice(0, 60), date: /^\d{4}-\d{2}-\d{2}$/.test(r?.date) ? r.date : dayOf(Date.now()), category: cat,
    total: Math.max(0, Math.round((+r?.total || 0) * 100) / 100), currency: String(r?.currency || 'USD').slice(0, 3).toUpperCase(),
    items: (Array.isArray(r?.items) ? r.items : []).slice(0, 40).map((x: any) => ({ name: String(x?.name || '').slice(0, 50), price: Math.max(0, +x?.price || 0) })).filter((x: any) => x.name) };
}

/** Etiquetado automático: a qué listas va cada dato (punteros). Recibos de salud/farmacia → ninguna. */
export function tagLists(rec: Rec, master: Record<string, Rec>, now = Date.now()): ListId[] {
  if (rec.source === 'survey') return ['segment', 'trends'];
  const r = rec.receipt!; if (PRIVATE_CATS.includes(r.category)) return [];
  const out: ListId[] = ['consumo'];
  if (now - new Date(r.date + 'T12:00:00').getTime() <= 30 * 864e5) out.push('fresh');
  if (r.total >= 150 || ['education', 'services'].includes(r.category)) out.push('exclusive');
  if (Object.values(master).filter((m) => m.source === 'receipt').length >= 3) out.push('predict');
  if (['restaurant', 'clothing', 'groceries'].includes(r.category)) out.push('trends');
  return out;
}

export function receiptsToday(d: DataState, now = Date.now()) { return Object.values(d.master).filter((m) => m.source === 'receipt' && m.day === dayOf(now)).length; }

/** Guarda un dato una sola vez en la copia maestra y pone punteros en sus listas. Solo recibos y encuestas. */
export function ingest(d: DataState, source: string, payload: any, id: string, now = Date.now()): { d: DataState; error?: string; pts?: number } {
  if (!d.consent) return { d, error: 'no_consent' };
  if (!(ALLOWED_SOURCES as readonly string[]).includes(source)) return { d, error: 'source_forbidden' };
  try { assertNoHealth(payload); } catch { return { d, error: 'health_forbidden' }; }
  let rec: Rec;
  if (source === 'receipt') {
    if (receiptsToday(d, now) >= MAX_RECEIPTS_DAY) return { d, error: 'limit' };
    rec = { id, source: 'receipt', at: now, day: dayOf(now), receipt: cleanReceipt(payload) };
  } else {
    if (Object.values(d.master).some((m) => m.survey?.id === payload?.id)) return { d, error: 'done' };
    const answers: Record<string, string> = {}; for (const [k, v] of Object.entries(payload?.answers || {})) answers[String(k).slice(0, 20)] = String(v).slice(0, 40);
    rec = { id, source: 'survey', at: now, day: dayOf(now), survey: { id: String(payload?.id).slice(0, 30), answers } };
  }
  const master = { ...d.master, [id]: rec }; const lists = { ...d.lists };
  for (const l of tagLists(rec, d.master, now)) lists[l] = [...(lists[l] || []), id];
  const pts = source === 'receipt' ? PTS_RECEIPT : PTS_SURVEY;
  return { d: { ...d, master, lists, points: d.points + pts, ptsLog: [...d.ptsLog, { at: now, why: source, pts }] }, pts };
}

export function grant(d: DataState, now = Date.now()): DataState { return { ...d, consent: true, consentAt: now, log: [...d.log, { at: now, action: 'grant', version: CONSENT_VERSION }] }; }
/** Retirar permiso o borrar cuenta: borra de la copia maestra y desaparece de todas las listas y vistas. */
export function revoke(d: DataState, now = Date.now(), action: 'revoke' | 'delete' = 'revoke'): DataState {
  return { ...d, consent: false, consentAt: undefined, master: {}, lists: emptyLists(), log: [...d.log, { at: now, action, version: CONSENT_VERSION }] };
}
/** Integridad: todo puntero apunta a un dato existente de la copia maestra. */
export const danglingPointers = (d: DataState) => LISTS.flatMap((l) => (d.lists[l] || []).filter((id) => !d.master[id]));

// ---------- Informes ----------
const monthOf = (s: string) => s.slice(0, 7);
export function monthReceipts(d: DataState, month: string) { return Object.values(d.master).filter((m) => m.source === 'receipt' && monthOf(m.receipt!.date) === month).map((m) => m.receipt!); }
/** Costo del informe mensual: 15-20 puntos y SIEMPRE más que lo ganado con recibos del mes (hueco ≥ 2 = una encuesta). */
export function monthlyCost(receiptsInMonth: number) { return Math.min(20, Math.max(15, Math.min(receiptsInMonth, 6) * PTS_RECEIPT + PTS_SURVEY)); }
export function monthGap(d: DataState, month: string) { const n = monthReceipts(d, month).length; return Math.max(0, monthlyCost(n) - n * PTS_RECEIPT); }
export const gapSurveyId = (kind: 'month' | 'year', period: string) => `gap-${kind}-${period}`;
export function canRedeem(d: DataState, kind: 'month' | 'year', period: string) {
  const cost = kind === 'year' ? ANNUAL_COST : monthlyCost(monthReceipts(d, period).length);
  const gapDone = Object.values(d.master).some((m) => m.survey?.id === gapSurveyId(kind, period));
  return { cost, gapDone, ok: gapDone && d.points >= cost };
}
export function redeem(d: DataState, kind: 'month' | 'year', period: string, now = Date.now()): DataState | null {
  const c = canRedeem(d, kind, period); if (!c.ok) return null;
  return { ...d, points: d.points - c.cost, ptsLog: [...d.ptsLog, { at: now, why: kind + '-report', pts: -c.cost }], reports: [...d.reports, { kind, period, at: now }] };
}
export function summarize(rs: Receipt[]) {
  const by: Record<string, number> = {}; let total = 0;
  for (const r of rs) { by[r.category] = (by[r.category] || 0) + r.total; total += r.total; }
  return { total: Math.round(total * 100) / 100, count: rs.length, by: Object.entries(by).sort((a, b) => b[1] - a[1]).map(([cat, v]) => ({ cat, v: Math.round(v * 100) / 100 })) };
}
/** Posibles deducciones (solo informativo, lo revisa un contador). */
export const DEDUCTIBLE: Record<string, string> = { health: 'medical', pharmacy: 'medical', education: 'education', charity: 'charity', business: 'business', services: 'business', transport: 'business' };
export function deductions(rs: Receipt[]) { const o: Record<string, number> = {}; for (const r of rs) { const k = DEDUCTIBLE[r.category]; if (k) o[k] = Math.round(((o[k] || 0) + r.total) * 100) / 100; } return o; }
export const ACCOUNTANT_QS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];

// ---------- Panel del fundador (DATOS DE EJEMPLO hasta tener servidor) ----------
export type ListInfo = { id: ListId; users: number; records: number; week: number; goalUsers: number; ready: boolean; progress: number; oneTime: [number, number]; sub: [number, number]; buyers: string[]; access: string[] };
/** Base de precios: /workspace/activo-base-de-datos/precios-mercado-listas-datos.md (estimados). */
const PRICE: Record<ListId, { one: [number, number]; sub: [number, number]; buyers: string[]; access: string[] }> = {
  consumo: { one: [1000, 10000], sub: [1500, 8000], buyers: ['cpg', 'retail'], access: ['agency'] },
  fresh: { one: [1000, 5000], sub: [1000, 4000], buyers: ['cpg', 'agency'], access: ['retail'] },
  segment: { one: [1000, 4950], sub: [500, 2500], buyers: ['agency', 'brand'], access: ['adtech'] },
  exclusive: { one: [1500, 10000], sub: [800, 3000], buyers: ['brand', 'investor'], access: ['investor'] },
  predict: { one: [2000, 10000], sub: [2000, 10000], buyers: ['investor', 'retail'], access: ['investor'] },
  trends: { one: [1000, 4950], sub: [500, 2000], buyers: ['brand', 'cpg'], access: ['agency'] },
};
export const SAMPLE_USERS: Record<ListId, number> = { consumo: 64, fresh: 52, segment: 41, exclusive: 12, predict: 23, trends: 57 };
export function listInfo(id: ListId, users: number, records: number, week = 0): ListInfo {
  const ready = users >= MIN_GROUP; const p = PRICE[id]; const k = Math.min(1, users / 500);
  const scale = (r: [number, number]): [number, number] => [r[0], Math.round(r[0] + (r[1] - r[0]) * k)];
  return { id, users, records, week, goalUsers: MIN_GROUP, ready, progress: Math.min(1, users / MIN_GROUP), oneTime: scale(p.one), sub: scale(p.sub), buyers: p.buyers, access: p.access };
}
/** Vista filtrada: solo agregados anónimos de la lista. Nunca la copia maestra, nunca un dato de una sola persona. */
export function filteredView(id: ListId, recs: Rec[], users: number) {
  if (users < MIN_GROUP) return null;
  const rs = recs.filter((r) => r.source === 'receipt' && !PRIVATE_CATS.includes(r.receipt!.category)).map((r) => r.receipt!);
  const s = summarize(rs);
  return { list: id, users, records: recs.length, byCategory: s.by.map((x) => ({ cat: x.cat, share: s.total ? Math.round((x.v / s.total) * 1000) / 10 : 0 })) };
}
/** Decisión de José sobre una lista lista: NUNCA vende ni da acceso aquí; solo registra la decisión. */
export type Decision = { id: ListId; v: 'approved' | 'later'; at: number; sold: false };
export const decideList = (id: ListId, v: 'approved' | 'later', now = Date.now()): Decision => ({ id, v, at: now, sold: false });
