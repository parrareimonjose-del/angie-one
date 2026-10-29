/** Apple In-App Purchase vía RevenueCat (decisión José 28-oct-2026): IAP en todos los países;
 *  botón «Pagar en la web» (Stripe) solo si la cuenta App Store es de EE. UU. (storefront de StoreKit, nunca el idioma).
 *  Productos = precios web: angieone_premium_monthly 2,49 USD/mes · angieone_premium_yearly 24,99 USD/año.
 *  Clave pública EXPO_PUBLIC_RC_IOS_KEY (appl_…). Sin clave, todo responde «pendiente» (nunca simula un cobro). */
import { Platform } from 'react-native';
export type IapPlan = 'monthly' | 'yearly';
export const IAP_PRODUCTS: Record<IapPlan, string> = {
  monthly: 'angieone_premium_monthly',
  yearly: 'angieone_premium_yearly',
};
export const RC_ENTITLEMENT = 'premium';
export const RC_IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY || '';
/** true solo en iPhone con clave de RevenueCat compilada. */
export const IAP_NATIVE_READY = Platform.OS === 'ios' && /^appl_/.test(RC_IOS_KEY);
export const WEB_PAYWALL = 'https://parrareimonjose-del.github.io/angie-one/paywall';

/** Botón web: web siempre; iPhone solo con storefront USA; Android nunca. */
export function showWebPayButton(os: string, storefront: string | null): boolean {
  if (os === 'web') return true;
  if (os === 'ios') { const c = (storefront || '').toUpperCase(); return c === 'USA' || c === 'US'; }
  return false;
}
export const webPayUrl = (uid: string) => WEB_PAYWALL + (uid ? '?uid=' + encodeURIComponent(uid) : '');

function rc(): any | null {
  if (!IAP_NATIVE_READY) return null;
  try { return require('react-native-purchases').default; } catch { return null; }
}
let configured = false;
/** Configura RevenueCat con el mismo ID anónimo que usa Stripe → un solo interruptor Premium en el Worker. */
export async function configureIap(uid: string): Promise<boolean> {
  const P = rc(); if (!P || !uid) return false;
  try {
    if (!configured) { P.configure({ apiKey: RC_IOS_KEY, appUserID: uid }); configured = true; }
    await P.setAttributes({ app: 'angieone' });
    return true;
  } catch { return false; }
}
export async function storefrontCountry(): Promise<string | null> {
  const P = rc(); if (!P) return null;
  try { return (await P.getStorefront())?.countryCode ?? null; } catch { return null; }
}
const activeFrom = (info: any): { active: boolean; plan: IapPlan; renewAt: number } => {
  const e = info?.entitlements?.active?.[RC_ENTITLEMENT];
  return { active: !!e, plan: /yearly/.test(e?.productIdentifier || '') ? 'yearly' : 'monthly', renewAt: e?.expirationDate ? Date.parse(e.expirationDate) : 0 };
};
export async function iapConnected(): Promise<boolean> { return !!rc() && configured; }

export type IapResult =
  | { ok: true; plan: IapPlan; renewAt?: number }
  | { ok: false; reason: 'pending_connection' | 'cancelled' | 'not_ios' | 'none' };

export async function purchaseIap(plan: IapPlan): Promise<IapResult> {
  if (Platform.OS !== 'ios') return { ok: false, reason: 'not_ios' };
  const P = rc(); if (!P || !configured) return { ok: false, reason: 'pending_connection' };
  try {
    const off = await P.getOfferings();
    const pkg = (off?.current?.availablePackages || []).find((p: any) => p.product?.identifier === IAP_PRODUCTS[plan]);
    if (!pkg) return { ok: false, reason: 'pending_connection' };
    const r = await P.purchasePackage(pkg); const a = activeFrom(r?.customerInfo);
    return a.active ? { ok: true, plan: a.plan, renewAt: a.renewAt } : { ok: false, reason: 'cancelled' };
  } catch { return { ok: false, reason: 'cancelled' }; }
}

/** Precios localizados de StoreKit (Apple 3.1.2: el precio mostrado debe ser el del storefront del usuario). */
export async function iapPrices(): Promise<Partial<Record<IapPlan, string>>> {
  const P = rc(); if (!P || !configured) return {};
  try {
    const off = await P.getOfferings(); const out: Partial<Record<IapPlan, string>> = {};
    for (const p of off?.current?.availablePackages || []) for (const k of ['monthly', 'yearly'] as IapPlan[]) if (p.product?.identifier === IAP_PRODUCTS[k] && p.product?.priceString) out[k] = p.product.priceString;
    return out;
  } catch { return {}; }
}

export async function restoreIap(): Promise<IapResult> {
  if (Platform.OS !== 'ios') return { ok: false, reason: 'not_ios' };
  const P = rc(); if (!P || !configured) return { ok: false, reason: 'pending_connection' };
  try { const a = activeFrom(await P.restorePurchases()); return a.active ? { ok: true, plan: a.plan, renewAt: a.renewAt } : { ok: false, reason: 'none' }; }
  catch { return { ok: false, reason: 'pending_connection' }; }
}
export async function iapManage(): Promise<void> { const P = rc(); try { await P?.showManageSubscriptions(); } catch { /* el enlace de Apple queda en la pantalla */ } }
