/** Stripe web en la app: aviso MODO PRUEBA, sincronizar la suscripción tras volver de Checkout, Portal para cancelar
 *  y la tarjeta de ingresos/reembolsos del Panel del fundador (reembolso solo con clic del fundador + confirmación). */
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, CardTitle, Btn, T, s } from './ui';
import { C } from './theme';
import { useStore } from './store';
import { PAY_MODE, payStatus, payPortal, payLedger, payRefund, PayLedgerItem } from './payments';
import { founderKey } from './review';

export function TestBadge() {
  const { t } = useTranslation(); if (PAY_MODE !== 'test') return null;
  return <View testID="pay-test" style={{ backgroundColor: C.warning, borderRadius: 10, padding: 8 }}><Text style={{ color: C.white, fontWeight: '900', textAlign: 'center' }}>🧪 {t('pay.testBadge')}</Text></View>;
}
/** Pide al Worker el estado real (lo fija el webhook firmado de Stripe). Nunca se da Premium desde la URL de vuelta. */
export function usePaySync() {
  const { s: st, set } = useStore(); const [msg, setMsg] = useState('');
  useEffect(() => { if (PAY_MODE === 'off') return; let n = 0, stop = false;
    const back = typeof location !== 'undefined' && /[?&]pay=ok/.test(location.search);
    const tick = async () => { const r = await payStatus(); if (stop) return;
      if (r && (r.active || st.sub?.provider === 'stripe')) set((v) => ({ ...v, sub: { active: !!r.active, plan: r.plan || 'monthly', renewAt: r.renewAt || 0, provider: 'stripe' } }));
      if (r?.active && back) setMsg('ok'); else if (back && ++n < 10) setTimeout(tick, 3000); };
    tick(); return () => { stop = true; }; }, []);
  return msg;
}
export async function openPortal(onErr: () => void) { try { const u = await payPortal(); if (u) location.assign(u); else onErr(); } catch { onErr(); } }

const money = (c: number, cur: string) => (c / 100).toFixed(2) + ' ' + cur.toUpperCase();
export function StripeLedgerCard() {
  const { t } = useTranslation(); const [items, setItems] = useState<PayLedgerItem[] | null>(null); const [err, setErr] = useState('');
  if (PAY_MODE === 'off') return null;
  const load = async () => { setErr(''); const k = await founderKey(); if (!k) { setErr(t('rv.modNeedKey')); return; } try { setItems(await payLedger(k)); } catch { setErr(t('fo.payErr')); } };
  const gross = (items || []).filter((i) => i.kind === 'charge').reduce((a, i) => a + i.amount, 0), ref = (items || []).filter((i) => i.kind === 'refund').reduce((a, i) => a + i.amount, 0);
  const refund = async (i: PayLedgerItem) => { if (typeof confirm !== 'undefined' && !confirm(t('fo.refundAsk', { amt: money(i.amount, i.currency) }))) return; const k = await founderKey(); try { await payRefund(k, i.id); setTimeout(load, 4000); } catch { setErr(t('fo.payErr')); } };
  return <Card testID="stripe-ledger"><CardTitle>💳 {t('fo.stripeT')}</CardTitle><TestBadge />
    <Btn testID="stripe-load" small kind="secondary" label={`↻ ${t('fo.payLoad')}`} onPress={load} />
    {err ? <Text style={{ color: C.primary, fontWeight: '700' }}>{err}</Text> : null}
    {items ? <T testID="stripe-tot">{t('fo.payTot', { g: money(gross, 'usd'), r: money(ref, 'usd'), n: money(gross - ref, 'usd') })}</T> : null}
    {(items || []).map((i) => <View key={i.id + i.ts} testID={'stripe-' + i.kind} style={{ borderTopWidth: 1, borderColor: C.border, paddingTop: 6, gap: 4 }}>
      <Text style={s.t}>{new Date(i.ts).toLocaleDateString()} · {t('fo.k_' + i.kind)} · {money(i.amount, i.currency)}{i.test ? ' · TEST' : ''}</Text>
      {i.kind === 'charge' && i.id.startsWith('in_') ? <Btn testID="stripe-refund" small kind="danger" label={t('fo.refund')} onPress={() => refund(i)} /> : null}
    </View>)}
  </Card>;
}
