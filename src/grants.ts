/** Premium gratis concedido por el fundador (José 2026-10-21): a personas elegidas por correo o ID de usuario, revocable y con caducidad opcional.
 *  Cumple las tiendas: WEB → derecho en el servidor (Worker /grants, código de canje). ANDROID → códigos promocionales de Google Play
 *  (o el mismo derecho del servidor, permitido para contenido sin pago externo). iOS → Offer Codes de Apple: la guía 3.1.1 no permite
 *  desbloquear con códigos propios, así que en iPhone el canje abre la página de Apple. Ver docs/premium-gratis.md. */
import { APP_AI } from './ai-config';
export type Grant = { id: string; who: string; note?: string; code: string; createdAt: number; expiresAt?: number; revokedAt?: number; synced?: boolean };
export type MyGrant = { code: string; who: string; until?: number; checkedAt: number };
export const normWho = (w: string) => w.trim().toLowerCase().replace(/\s+/g, '');
export const validWho = (w: string) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(normWho(w)) || /^[a-z0-9_-]{4,40}$/i.test(normWho(w));
const ALPH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const newCode = (rnd: () => number = Math.random) => Array.from({ length: 10 }, (_, i) => (i === 5 ? '-' : '') + ALPH[Math.floor(rnd() * ALPH.length)]).join('');
export function addGrant(list: Grant[], who: string, days: number | null, note = '', now = Date.now(), rnd?: () => number): Grant[] | null {
  const w = normWho(who); if (!validWho(w)) return null;
  const g: Grant = { id: now.toString(36) + Math.floor((rnd || Math.random)() * 1e6).toString(36), who: w, note: note.trim().slice(0, 80) || undefined, code: newCode(rnd), createdAt: now, expiresAt: days ? now + days * 864e5 : undefined };
  return [g, ...list.filter((x) => !(x.who === w && grantState(x, now) === 'active'))];
}
export const revokeGrant = (list: Grant[], id: string, now = Date.now()) => list.map((g) => (g.id === id && !g.revokedAt ? { ...g, revokedAt: now, synced: false } : g));
export const grantState = (g: Grant, now = Date.now()): 'active' | 'expired' | 'revoked' => (g.revokedAt ? 'revoked' : g.expiresAt && g.expiresAt <= now ? 'expired' : 'active');
export const activeFor = (list: Grant[], who: string, now = Date.now()) => list.find((g) => g.who === normWho(who) && grantState(g, now) === 'active');
/** ¿El canje guardado en este teléfono sigue valiendo? Se revalida con el servidor cada 24 h; sin red se respeta 7 días. */
export const grantValid = (m: MyGrant | undefined, now = Date.now()) => !!m && (!m.until || m.until > now) && now - m.checkedAt < 7 * 864e5;
export const redeemStore = (os: string) => (os === 'ios' ? 'apple' : os === 'android' ? 'play' : 'server');
export const STORE_REDEEM = { apple: 'https://apps.apple.com/redeem', play: 'https://play.google.com/redeem' } as const;
const GRANTS = APP_AI.workerBase + '/grants';
/** Fundador → servidor (requiere la clave de fundador, que nunca está en la app publicada: se escribe en el panel y vive solo en este teléfono). */
export async function pushGrant(g: Grant, key: string) {
  const r = await fetch(GRANTS + (g.revokedAt ? '/revoke' : '/add'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-founder-key': key }, body: JSON.stringify(g) });
  if (!r.ok) throw new Error(String(r.status)); return true;
}
export async function redeem(code: string, who: string): Promise<{ ok: boolean; until?: number; err?: string }> {
  try { const r = await fetch(GRANTS + '/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code.trim().toUpperCase(), who: normWho(who) }) });
    if (r.status === 404) return { ok: false, err: 'invalid' }; if (!r.ok) return { ok: false, err: 'server' }; const j = await r.json(); return { ok: !!j.ok, until: j.until || undefined, err: j.ok ? undefined : 'invalid' };
  } catch { return { ok: false, err: 'offline' }; }
}
