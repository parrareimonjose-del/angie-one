/** Revisión Apple/Google (21-oct-2026): reportar contenido de IA, aportar productos, moderación del fundador. Sin datos de salud. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_AI } from './ai-config';
export const WB = APP_AI.workerBase;
export const FKEY = 'angieone:fkey';
const post = async (path: string, body: object, key?: string) => {
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 12000);
  try { const r = await fetch(WB + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { 'x-founder-key': key } : {}) }, body: JSON.stringify(body), signal: ctl.signal });
    const o = await r.json().catch(() => ({})); if (!r.ok) throw new Error(o.error || 'server'); return o; } finally { clearTimeout(tm); }
};
/** Reporte de una respuesta de IA (Apple 1.2 / política de IA de Google Play). Solo el texto de la respuesta, sin datos del usuario. */
export function aiReportBody(kind: string, text: string) { return { id: ('ai:' + kind).slice(0, 40), reason: 'ai', name: String(text || '').replace(/\s+/g, ' ').slice(0, 80), value: String(text || '').slice(80, 200) }; }
export async function reportAI(kind: string, text: string) {
  const q = JSON.parse((await AsyncStorage.getItem('angieone:aireports').catch(() => null)) || '[]'); q.push({ kind, at: Date.now() }); AsyncStorage.setItem('angieone:aireports', JSON.stringify(q.slice(-50))).catch(() => {});
  try { await post('/foods/report', aiReportBody(kind, text)); } catch { /* queda anotado en el teléfono */ }
}
/** Misma validación que el servidor (worker/foods.js checkContribution). */
export function validContribution(x: { code: string; name: string; k: string; p: string; c: string; f: string }) {
  const n = (v: string, max: number) => { const y = +String(v).replace(',', '.'); return String(v).trim() !== '' && y >= 0 && y <= max ? y : NaN; };
  const k = n(x.k, 950), p = n(x.p, 100), c = n(x.c, 100), f = n(x.f, 100);
  if (!/^\d{8,14}$/.test(x.code.replace(/\D/g, '')) || x.name.trim().length < 2) return false;
  if ([k, p, c, f].some(isNaN) || p + c + f > 101) return false;
  return Math.abs(k - (4 * p + 4 * c + 9 * f)) <= Math.max(60, 0.35 * k);
}
export const contribute = (x: object) => post('/foods/contribute', x);
export const founderKey = async () => (await AsyncStorage.getItem(FKEY).catch(() => null)) || '';
export const loadQueue = async (key: string) => { const [a, b] = await Promise.all([post('/foods/queue', {}, key), post('/friends/reports', {}, key)]); return { reports: a.reports || [], contributions: a.contributions || [], friends: b.items || [] }; };
export const delQueue = (key: string, k: string) => post('/foods/queue/delete', { key: k }, key);
export const dismissFriend = (key: string, k: string) => post('/friends/dismiss', { key: k }, key);
export const removeFriend = (key: string, code: string, target: string, k: string) => post('/friends/remove', { code, target, key: k }, key);
/** Al borrar la cuenta: salir de todos los grupos de amigos en el servidor. */
export async function leaveAllFriends(fr?: { id?: string; groups?: string[] }) {
  if (!fr?.id || !fr.groups?.length) return; await Promise.all(fr.groups.map((code) => post('/friends/leave', { code, id: fr.id }).catch(() => {})));
}
