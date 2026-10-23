// Capa de pagos según la plataforma (decisión de José 2026-10-15):
//  web → Stripe (Checkout / Payment Links) · Android → Google Play Billing · iPhone → Apple In-App Purchase.
// Hoy NADA cobra: todos los proveedores están «Pendiente de conexión» (sin claves). No hay dinero real.
// Las tiendas obligan a usar su sistema para contenido digital dentro de la app: nunca mostrar Stripe en Android/iOS.
import { Platform } from 'react-native';
import { IAP_NATIVE_READY, IAP_PRODUCTS, purchaseIap, restoreIap } from './iap';
export { IAP_PRODUCTS };
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
/** Modo de cobro web (variable de compilación). 'off' = sitio público (sin botón de compra) · 'test' = Stripe modo prueba
 *  (solo build local, con aviso PRUEBA) · 'live' = cuando José conecte Stripe en vivo. Nunca en Android/iOS. */
export const PAY_MODE: 'off' | 'test' | 'live' = ((process.env.EXPO_PUBLIC_PAY_MODE as any) === 'test' || (process.env.EXPO_PUBLIC_PAY_MODE as any) === 'live') ? (process.env.EXPO_PUBLIC_PAY_MODE as any) : 'off';
/**
 * Modo efectivo en runtime. Metro pliega PAY_MODE en builds `off`, así que el dist de prueba
 * (8803) puede forzar test con `globalThis.__ANGIE_PAY_MODE__='test'` (lo inyecta angie-serve)
 * sin recompilar. Público (8801) no inyecta nada → sigue off.
 */
export function effectivePayMode(): 'off' | 'test' | 'live' {
  try {
    const g = (globalThis as any).__ANGIE_PAY_MODE__;
    if (g === 'test' || g === 'live' || g === 'off') return g;
  } catch { /* ignore */ }
  return PAY_MODE;
}
export function payModeOn(): boolean { const m = effectivePayMode(); return m === 'test' || m === 'live'; }
export function providerFor(os: string = Platform.OS): Provider {
  if (os === 'android') return { id: 'play', name: 'Google Play', connected: false, manageUrl: 'https://play.google.com/store/account/subscriptions', canRestore: true };
  // connected = StoreKit nativo listo (IAP_NATIVE_READY). Sin cuenta Developer sigue false → UI «pendiente» amable.
  if (os === 'ios') return { id: 'apple', name: 'App Store', connected: IAP_NATIVE_READY, manageUrl: 'https://apps.apple.com/account/subscriptions', canRestore: true };
  return { id: 'stripe', name: 'Stripe', connected: payModeOn() || Object.values(STRIPE_LINKS).some(Boolean), manageUrl: '', canRestore: false };
}
export type PurchaseResult = { ok: true; url?: string } | { ok: false; reason: 'pending_connection' | 'cancelled' };
/** Inicia la compra. Mientras no haya conexión devuelve pending_connection (nunca simula un cobro). */
export async function purchase(plan: PlanId, os: string = Platform.OS): Promise<PurchaseResult> {
  const p = providerFor(os);
  if (p.id === 'stripe' && payModeOn()) { try { const r = await payPost('/pay/checkout', { uid: payUid(), plan, back: payBack('paywall') }); return r.url ? { ok: true, url: r.url } : { ok: false, reason: 'pending_connection' }; } catch { return { ok: false, reason: 'pending_connection' }; } }
  if (p.id === 'stripe') { const url = STRIPE_LINKS[plan]; return url ? { ok: true, url } : { ok: false, reason: 'pending_connection' }; }
  if (p.id === 'apple') {
    const r = await purchaseIap(plan);
    if (r.ok) return { ok: true };
    return { ok: false, reason: r.reason === 'cancelled' ? 'cancelled' : 'pending_connection' };
  }
  return { ok: false, reason: 'pending_connection' }; // Play Billing se conecta en la versión nativa
}
export async function restore(os: string = Platform.OS): Promise<{ ok: boolean; reason?: string; plan?: PlanId }> {
  const p = providerFor(os);
  if (p.id === 'apple') {
    const r = await restoreIap();
    if (r.ok) return { ok: true, plan: r.plan };
    return { ok: false, reason: r.reason === 'cancelled' ? 'cancelled' : 'pending_connection' };
  }
  return p.canRestore ? { ok: false, reason: 'pending_connection' } : { ok: false, reason: 'not_supported' };
}

// ---- Stripe web (Checkout + Portal + estado). El Worker guarda la suscripción por un ID anónimo del dispositivo (sin correo en la app).
import { APP_AI } from './ai-config';
const UKEY = 'angie:payuid';
export function payUid(): string {
  try { let u = localStorage.getItem(UKEY); if (!u || !/^[a-z0-9]{16,40}$/.test(u)) { u = (Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => (b % 36).toString(36)).join('') + Date.now().toString(36)).slice(0, 32); localStorage.setItem(UKEY, u); } return u; } catch { return ''; }
}
const payBack = (route: string) => { try { return location.origin + location.pathname.replace(/[^/]*$/, '') + route; } catch { return ''; } };
async function payPost(path: string, body: object, key?: string) {
  const r = await fetch(APP_AI.workerBase + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { 'x-founder-key': key } : {}) }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'pay'); return j;
}
export type PayStatus = { active: boolean; plan?: PlanId; renewAt?: number; cancelAt?: number; test?: boolean };
export async function payStatus(): Promise<PayStatus | null> { if (PAY_MODE === 'off') return null; try { return await payPost('/pay/status', { uid: payUid() }); } catch { return null; } }
export async function payPortal(): Promise<string> { const r = await payPost('/pay/portal', { uid: payUid(), back: payBack('subscription') }); return r.url || ''; }
export type PayLedgerItem = { kind: 'charge' | 'refund' | 'failed'; id: string; ts: number; amount: number; currency: string; test: boolean; sub?: string };
export const payLedger = async (key: string): Promise<PayLedgerItem[]> => (await payPost('/pay/ledger', {}, key)).items || [];
export const payRefund = (key: string, invoice: string) => payPost('/pay/refund', { invoice }, key);
