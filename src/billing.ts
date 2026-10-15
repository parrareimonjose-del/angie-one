/** Cobro honesto (quejas MyFitnessPal nº 5 y de cobros sorpresa): aviso 1 día antes del fin de la prueba o de la renovación,
 *  cancelar en 2 toques con pasos por plataforma, «Restaurar compra» claro, máximo 1 aviso de Premium por sesión y nunca a quien
 *  ya es Premium, y sin anuncios para Premium. */
import { Platform } from 'react-native';
import { DAY, TRIAL_DAYS } from './store';

export type Sub = { active: boolean; plan: 'monthly' | 'yearly'; renewAt: number; provider: 'stripe' | 'play' | 'apple' };
/** Momento del próximo cobro o fin de prueba; null si no hay nada pendiente. */
export function nextCharge(trialStart?: number, sub?: Sub, now = Date.now()): { kind: 'trial' | 'renew'; at: number } | null {
  if (sub?.active && sub.renewAt > now) return { kind: 'renew', at: sub.renewAt };
  if (trialStart) { const end = trialStart + TRIAL_DAYS * DAY; if (end > now) return { kind: 'trial', at: end }; }
  return null;
}
/** Aviso cuando falta 1 día o menos. */
export function reminderDue(trialStart?: number, sub?: Sub, now = Date.now()) { const n = nextCharge(trialStart, sub, now); return n && n.at - now <= DAY ? n : null; }
export const CANCEL_URL = { play: 'https://play.google.com/store/account/subscriptions', apple: 'https://apps.apple.com/account/subscriptions', stripe: '' } as const;
export const platformProvider = (os: string = Platform.OS): Sub['provider'] => (os === 'android' ? 'play' : os === 'ios' ? 'apple' : 'stripe');
/** Máximo 1 aviso de Premium por sesión, nunca a usuarios Premium. */
export function canUpsell(premium: boolean, shownThisSession: number) { return !premium && shownThisSession < 1; }
const SKEY = 'angie:upsell';
export function takeUpsell(premium: boolean): boolean {
  try { if (Platform.OS !== 'web' || typeof sessionStorage === 'undefined') return canUpsell(premium, 0) && !(globalThis as any).__aoUp && ((globalThis as any).__aoUp = 1) === 1;
    const n = +(sessionStorage.getItem(SKEY) || 0); if (!canUpsell(premium, n)) return false; sessionStorage.setItem(SKEY, String(n + 1)); return true; } catch { return false; }
}
/** Notificación local en la web si el usuario dio permiso (en el teléfono: expo-notifications al compilar la app). Una vez por día. */
export function notifyOnce(title: string, body: string, dayKey: string) {
  try { if (Platform.OS !== 'web' || typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
    const k = 'angie:notif:' + dayKey; if (localStorage.getItem(k)) return false; new Notification(title, { body }); localStorage.setItem(k, '1'); return true; } catch { return false; }
}
