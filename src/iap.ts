/** StoreKit / IAP (decisión José 23-oct-2026): productos 2,49/mes y 24,99/año.
 *  Listo para conectar cuando exista la cuenta Apple Developer. Sin el módulo nativo
 *  purchase/restore responden «pendiente» (nunca simulan un cobro). Stripe solo en web. */
import { Platform } from 'react-native';
export type IapPlan = 'monthly' | 'yearly';
export const IAP_PRODUCTS: Record<IapPlan, string> = {
  monthly: 'angieone_premium_monthly',
  yearly: 'angieone_premium_yearly',
};

/** false hasta instalar/conectar el módulo nativo (p. ej. react-native-iap / StoreKit 2). */
export const IAP_NATIVE_READY = false;

type NativeIap = {
  initConnection?: () => Promise<boolean>;
  getSubscriptions?: (ids: string[]) => Promise<unknown[]>;
  requestSubscription?: (sku: string) => Promise<{ productId?: string } | null>;
  getAvailablePurchases?: () => Promise<{ productId: string }[]>;
  finishTransaction?: (p: { productId: string }) => Promise<void>;
};

async function native(): Promise<NativeIap | null> {
  if (!IAP_NATIVE_READY || Platform.OS !== 'ios') return null;
  try {
    // Nombre opaco para que Metro no falle el bundle web si el paquete no está.
    const req = (globalThis as any).require as undefined | ((m: string) => any);
    if (!req) return null;
    return req('react-native-iap') as NativeIap;
  } catch { return null; }
}

export async function iapConnected(): Promise<boolean> {
  const L = await native();
  if (!L) return false;
  try { return !!(await L.initConnection?.()); } catch { return false; }
}

export type IapResult =
  | { ok: true; plan: IapPlan }
  | { ok: false; reason: 'pending_connection' | 'cancelled' | 'not_ios' };

export async function purchaseIap(plan: IapPlan): Promise<IapResult> {
  if (Platform.OS !== 'ios') return { ok: false, reason: 'not_ios' };
  const L = await native();
  if (!L?.requestSubscription) return { ok: false, reason: 'pending_connection' };
  try {
    const sku = IAP_PRODUCTS[plan];
    await L.initConnection?.();
    await L.getSubscriptions?.(Object.values(IAP_PRODUCTS));
    const r = await L.requestSubscription(sku);
    if (!r) return { ok: false, reason: 'cancelled' };
    await L.finishTransaction?.({ productId: sku });
    return { ok: true, plan };
  } catch { return { ok: false, reason: 'cancelled' }; }
}

export async function restoreIap(): Promise<IapResult> {
  if (Platform.OS !== 'ios') return { ok: false, reason: 'not_ios' };
  const L = await native();
  if (!L?.getAvailablePurchases) return { ok: false, reason: 'pending_connection' };
  try {
    await L.initConnection?.();
    const list = await L.getAvailablePurchases();
    const ids = new Set(Object.values(IAP_PRODUCTS));
    const hit = (list || []).find((p) => ids.has(p.productId));
    if (!hit) return { ok: false, reason: 'cancelled' };
    const plan = (Object.entries(IAP_PRODUCTS).find(([, id]) => id === hit.productId)?.[0] || 'monthly') as IapPlan;
    return { ok: true, plan };
  } catch { return { ok: false, reason: 'pending_connection' }; }
}
