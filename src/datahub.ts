/** Cliente del Parra Data Hub vía proxy del Worker Angie One (la clave de app nunca va en el cliente).
 *  Si el hub cae, la app sigue con copia local (fallback). */
import { aiUrl } from './ai-config';
import type { DataState, ListId, Rec } from './datos';
import { LISTS, MIN_GROUP } from './datos';

const base = () => aiUrl('estimate').replace(/\/estimate$/, '');

export type HubSummary = {
  status: 'ACTIVE' | 'local_fallback' | string;
  storage?: string;
  sales_enabled?: boolean;
  totalRecords?: number;
  totalConsents?: number;
  estimated_value_usd?: number;
  estimated?: boolean;
  estimated_note?: string;
  million_alert?: boolean;
  million_alert_sent?: boolean;
  apps?: Record<string, { name: string; records: number; consents: number; users: number }>;
  lists?: Record<string, {
    users: number; records: number; ready: boolean; progress: number; goalUsers: number;
    oneTime?: [number, number]; sub?: [number, number]; estimatedHigh?: number; estimated?: boolean;
    decision?: { id: string; v: 'approved' | 'later'; at: number; sold: false } | null;
  }>;
  admin_ai?: {
    ready_lists: { id: string; users: number; records: number; estimatedHigh: number }[];
    progress: { id: string; progress: number; users: number; goal: number }[];
    action: string;
  };
  error?: string;
};

async function call(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; body: any }> {
  try {
    const res = await fetch(base() + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: { error: 'hub_down', status: 'local_fallback' } };
  }
}

/** Pseudonym estable y anónimo (no es correo ni teléfono). */
export async function hubPseudonym(seed: string): Promise<string> {
  const raw = `angie-one:${seed || 'anon'}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  }
  // Fallback no-crypto
  let h = 0; for (let i = 0; i < raw.length; i++) h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
  return ('u' + Math.abs(h).toString(16) + 'xxxxxxxx').slice(0, 16);
}

export async function hubHealth(): Promise<{ status: string }> {
  const r = await call('/datahub/health');
  return { status: r.body?.status || (r.ok ? 'ACTIVE' : 'local_fallback') };
}

export async function hubConsent(pseudonym: string, action: 'grant' | 'revoke' | 'delete') {
  return call('/datahub/consent', { method: 'POST', body: JSON.stringify({ action, pseudonym, version: 'parra-data-hub-v1' }) });
}

export async function hubIngest(pseudonym: string, source: 'receipt' | 'survey', id: string, payload: any) {
  const body: any = { pseudonym, source, id };
  if (source === 'receipt') body.receipt = payload;
  else body.survey = payload;
  return call('/datahub/ingest', { method: 'POST', body: JSON.stringify(body) });
}

export async function hubPurge(pseudonym: string) {
  return call('/datahub/purge', { method: 'POST', body: JSON.stringify({ pseudonym }) });
}

export async function hubSummary(): Promise<HubSummary> {
  const r = await call('/datahub/summary');
  if (!r.ok) return { status: r.body?.status || 'local_fallback', error: r.body?.error || 'hub_down', estimated: true };
  return r.body as HubSummary;
}

export async function hubDecide(listId: ListId, v: 'approved' | 'later', founderKey: string) {
  return call('/datahub/decide', {
    method: 'POST',
    headers: { 'x-founder-key': founderKey },
    body: JSON.stringify({ listId, v }),
  });
}

/** Revisión de la IA admin: progreso de listas + alerta millón. */
export function dataHubAdminReview(sum: HubSummary) {
  const lists = sum.lists || {};
  const ready = Object.entries(lists).filter(([, v]) => v.ready).map(([id, v]) => ({ id, users: v.users, records: v.records, estimatedHigh: v.estimatedHigh || 0 }));
  const progress = LISTS.map((id) => {
    const v = lists[id] || { users: 0, progress: 0 };
    return { id, users: v.users || 0, progress: v.progress ?? Math.min(1, (v.users || 0) / MIN_GROUP), goal: MIN_GROUP };
  });
  const million = !!sum.million_alert || (sum.estimated_value_usd || 0) >= 1_000_000;
  return {
    status: sum.status || 'unknown',
    ready_lists: ready,
    progress,
    estimated_value_usd: sum.estimated_value_usd || 0,
    estimated: true,
    million_alert: million,
    action: million ? 'notify_jose_million' : (ready.length ? 'review_ready_lists' : 'keep_collecting'),
    note: sum.estimated_note || 'ESTIMATED — no buyer quote; no sale without José.',
  };
}

/** Sync best-effort after local ingest (never blocks UX). */
export async function syncIngestToHub(seed: string, rec: Rec) {
  try {
    const p = await hubPseudonym(seed);
    if (rec.source === 'receipt' && rec.receipt) await hubIngest(p, 'receipt', rec.id, rec.receipt);
    else if (rec.source === 'survey' && rec.survey) await hubIngest(p, 'survey', rec.id, rec.survey);
  } catch { /* local fallback */ }
}

export async function syncConsentToHub(seed: string, action: 'grant' | 'revoke' | 'delete') {
  try {
    const p = await hubPseudonym(seed);
    await hubConsent(p, action);
    if (action !== 'grant') await hubPurge(p);
  } catch { /* local fallback */ }
}

export function localListCounts(d: DataState): Record<ListId, number> {
  return Object.fromEntries(LISTS.map((l) => [l, (d.lists[l] || []).length])) as Record<ListId, number>;
}
