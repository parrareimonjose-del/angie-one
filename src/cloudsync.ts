/** Copia en la nube cifrada de extremo a extremo (gratis, Cloudflare).
 *  - El teléfono crea un código de recuperación (se muestra una sola vez). De ese código salen, en el teléfono:
 *    el id del usuario, el token de acceso y la clave AES-256-GCM (PBKDF2). El servidor solo recibe bytes cifrados.
 *  - Nunca se suben: fotos del Clon IA (se guardan aparte), imágenes, PIN/huella ni el propio código.
 *  - Los datos jamás se venden. Recibos/encuestas de "Mis datos" siguen con su propio consentimiento. */
import { APP_AI } from './ai-config';
import type { State } from './store';
export const SYNC_URL = APP_AI.workerBase + '/sync/backup';
export const AUTO_EVERY = 6 * 3600e3; // cuida el límite gratis de escrituras
const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const enc = new TextEncoder();
const cr = () => (globalThis as any).crypto as Crypto;
export function newCode(): string {
  const b = cr().getRandomValues(new Uint8Array(20)); const s = [...b].map((x) => ALPH[x % 32]).join('');
  return s.match(/.{4}/g)!.join('-');
}
export const cleanCode = (c: string) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const validCode = (c: string) => cleanCode(c).length === 20 && [...cleanCode(c)].every((x) => ALPH.includes(x));
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const b64 = (b: Uint8Array) => { let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export async function derive(code: string) {
  const c = cleanCode(code);
  const id = hex(await cr().subtle.digest('SHA-256', enc.encode('angie-id:' + c)));
  const tok = hex(await cr().subtle.digest('SHA-256', enc.encode('angie-tok:' + c)));
  const base = await cr().subtle.importKey('raw', enc.encode(c), 'PBKDF2', false, ['deriveKey']);
  const key = await cr().subtle.deriveKey({ name: 'PBKDF2', salt: enc.encode('angie-one-e2e-v1'), iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return { id, tok, key };
}
/** Lo que se copia: todo el estado menos la configuración de la copia y cualquier imagen. */
export function snapshot(s: State): any {
  const strip = (v: any): any => typeof v === 'string' ? (/^(data:|blob:|file:)/.test(v) ? undefined : v) : Array.isArray(v) ? v.map(strip) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, strip(x)]).filter(([, x]) => x !== undefined)) : v;
  const { sync, ...rest } = s as any; return strip(rest);
}
export async function encryptState(s: State, code: string) {
  const { key } = await derive(code); const iv = cr().getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await cr().subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify({ app: 'angie-one', at: Date.now(), state: snapshot(s) }))));
  return { v: 1, iv: b64(iv), ct: b64(ct) };
}
export async function decryptBackup(b: { iv: string; ct: string }, code: string) {
  const { key } = await derive(code);
  const pt = await cr().subtle.decrypt({ name: 'AES-GCM', iv: unb64(b.iv) }, key, unb64(b.ct));
  return JSON.parse(new TextDecoder().decode(pt)) as { at: number; state: State };
}
export type SyncErr = 'offline' | 'auth' | 'empty' | 'server' | 'badcode';
async function call(method: string, code: string, body?: string) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('offline');
  const { id, tok } = await derive(code);
  let r: Response; try { r = await fetch(`${SYNC_URL}?id=${id}`, { method, headers: { Authorization: 'Bearer ' + tok, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body }); } catch { throw new Error('offline'); }
  if (r.status === 401) throw new Error('auth'); if (r.status === 404) throw new Error('empty'); if (!r.ok) throw new Error('server');
  return r.json();
}
export async function uploadBackup(s: State, code: string): Promise<number> { const j = await call('PUT', code, JSON.stringify(await encryptState(s, code))); return j.at || Date.now(); }
export async function downloadBackup(code: string) {
  if (!validCode(code)) throw new Error('badcode');
  const b = await call('GET', code); try { return await decryptBackup(b, code); } catch { throw new Error('auth'); }
}
export async function deleteBackup(code: string) { await call('DELETE', code); }
