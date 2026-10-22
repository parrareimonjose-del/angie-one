// Capa de pagos según la plataforma (decisión de José 2026-10-15):
//  web → Stripe (Checkout / Payment Links) · Android → Google Play Billing · iPhone → Apple In-App Purchase.
// Hoy NADA cobra: todos los proveedores están «Pendiente de conexión» (sin claves). No hay dinero real.
// Las tiendas obligan a usar su sistema para contenido digital dentro de la app: nunca mostrar Stripe en Android/iOS.
import { Platform } from 'react-native';
// Decisión de José 2026-10-22: UN solo precio mundial: 2,49 USD/mes o 24,99 USD/año. Sin precio regional.
export type PlanId = 'monthly' | 'yearly';
export const PLANS: Record<PlanId, { usd: number; period: 'month' | 'year'; productId: string }> = {
  monthly: { usd: 2.49, period: 'month', productId: 'angieone_premium_monthly' },
  yearly: { usd: 24.99, period: 'year', productId: 'angieone_premium_yearly' },
};
export const TRIAL_DAYS = 7;
export type ProviderId = 'stripe' | 'play' | 'apple';
export type Provider = { id: ProviderId; name: string; connected: boolean; manageUrl: string; canRestore: boolean };
/** Enlaces de pago de Stripe: se rellenan cuando José cree su cuenta (solo enlaces públicos; las claves secretas nunca van en la app). */
export const STRIPE_LINKS: Record<PlanId, string> = { monthly: '', yearly: '' };
export function providerFor(os: string = Platform.OS): Provider {
  if (os === 'android') return { id: 'play', name: 'Google Play', connected: false, manageUrl: 'https://play.google.com/store/account/subscriptions', canRestore: true };
  if (os === 'ios') return { id: 'apple', name: 'App Store', connected: false, manageUrl: 'https://apps.apple.com/account/subscriptions', canRestore: true };
  return { id: 'stripe', name: 'Stripe', connected: Object.values(STRIPE_LINKS).some(Boolean), manageUrl: '', canRestore: false };
}
export type PurchaseResult = { ok: true; url?: string } | { ok: false; reason: 'pending_connection' | 'cancelled' };
/** Inicia la compra. Mientras no haya conexión devuelve pending_connection (nunca simula un cobro). */
export async function purchase(plan: PlanId, os: string = Platform.OS): Promise<PurchaseResult> {
  const p = providerFor(os);
  if (p.id === 'stripe') { const url = STRIPE_LINKS[plan]; return url ? { ok: true, url } : { ok: false, reason: 'pending_connection' }; }
  return { ok: false, reason: 'pending_connection' }; // Play Billing / StoreKit se conectan en la versión nativa
}
export async function restore(os: string = Platform.OS): Promise<{ ok: boolean; reason?: string }> { return providerFor(os).canRestore ? { ok: false, reason: 'pending_connection' } : { ok: false, reason: 'not_supported' }; }
