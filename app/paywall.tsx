import { TestBadge, usePaySync } from '../src/pay-ui';
import { useEffect, useState } from 'react';
import { View, Text, Pressable, Platform, Linking } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, T, s, CardTitle } from '../src/ui';
import { C } from '../src/theme';
import { useStore, trialPhase, fmtCountdown } from '../src/store';
import { LegalLinks } from '../src/legal-links';
import { providerFor, purchase, restore, PLANS, PAY_MODE, effectivePayMode, payModeOn, ensurePayUid } from '../src/payments';
import { configureIap, storefrontCountry, showWebPayButton, webPayUrl, iapManage, IAP_NATIVE_READY, iapPrices } from '../src/iap';
import { Pending } from '../src/ext';
import { RedeemCard } from '../src/grants-ui';

// Pagos por plataforma (src/payments.ts): web Stripe, Android Google Play Billing, iPhone Apple IAP. Hoy NO cobra nada.
export default function Paywall() {
  const { t } = useTranslation(); const [plan, setPlan] = useState<'y' | 'm'>('y'); const [note, setNote] = useState(false);
  const { s: st, set } = useStore(); const [now, setNow] = useState(Date.now());
  const ios = Platform.OS === 'ios'; const [ready, setReady] = useState(false); const [webBtn, setWebBtn] = useState(false); const [uid, setUid] = useState(''); const [rmsg, setRmsg] = useState(''); const [pr, setPr] = useState<{ monthly?: string; yearly?: string }>({});
  // iPhone: RevenueCat con el mismo ID anónimo que Stripe; el botón web depende SOLO del storefront (cuenta App Store de EE. UU.).
  useEffect(() => { if (!ios) return; (async () => { const u = await ensurePayUid(); setUid(u); const ok = await configureIap(u); setReady(ok); if (ok) setPr(await iapPrices()); setWebBtn(showWebPayButton('ios', await storefrontCountry())); })(); }, []);
  const setApple = (p: 'monthly' | 'yearly', renewAt = 0) => set((x) => ({ ...x, sub: { active: true, plan: p, renewAt, provider: 'apple' } }));
  const doRestore = async () => { const r = await restore(); if (r.ok) { setApple(r.plan || 'monthly', r.renewAt); setRmsg(t('hb.restored')); } else setRmsg(t(r.reason === 'none' ? 'hb.restoreNone' : 'hb.restorePending')); };
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(i); }, []);
  const tp = trialPhase(st.trialStart, now); const prov = providerFor();
  const paid = usePaySync();
  const buy = async () => { const pl = plan === 'y' ? 'yearly' : 'monthly'; const r = await purchase(pl); if (ios) { if (r.ok) { setApple(pl, r.renewAt); router.replace('/'); } else if (r.reason !== 'cancelled') setNote(true); return; } if (r.ok && r.url && typeof window !== 'undefined') { if (payModeOn()) window.location.assign(r.url); else window.open(r.url, '_blank'); } else setNote(true); };
  const opt = (k: 'y' | 'm', label: string, extra?: string) => (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: plan === k }} onPress={() => setPlan(k)}
      style={{ minHeight: 72, borderRadius: 20, borderWidth: 3, borderColor: plan === k ? C.primary : C.border, backgroundColor: C.card, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={[s.h2]}>{label}</Text>
      {extra ? <View style={{ backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}><Text style={{ color: C.onAccent, fontWeight: '900' }}>{extra}</Text></View> : null}
    </Pressable>
  );
  return (
    <Screen nav={false}>
      <Card style={{ backgroundColor: C.secondary }}>
        <Text style={[s.h1, { color: C.white }]}>⭐ {t('pay.title')}</Text>
        <Text style={[s.t, { color: C.white }]}>{t('pay.sub')}</Text>
      </Card>
      <TestBadge />
      {paid ? <Card testID="pay-ok"><T style={{ fontWeight: '800', color: C.success }}>{t('pay.ok')}</T></Card> : null}
      <Card>{(['f1', 'f2', 'f3', 'f4', 'f5'] as const).map((f) => <T key={f}>✅ {t(`pay.${f}`)}</T>)}</Card>
      {opt('y', ios && pr.yearly ? `${pr.yearly} ${t('fx.perYear')}` : t('pay.yearly'), t('pay.yearlySave'))}
      {opt('m', ios && pr.monthly ? `${pr.monthly} ${t('fx.perMonth')}` : t('pay.monthly'))}
      <Card style={{ backgroundColor: C.warnBg }}><T>⏳ {t('pay.offer')}</T>
        <T style={{ fontWeight: '800', color: tp.phase === 'offer' ? C.primary : C.text }}>{tp.phase === 'offer' ? t('pay.offerLive', { time: fmtCountdown(tp.offerMsLeft) }) : tp.phase === 'free' ? t('pay.offerGone') : t('pay.offerAfter')}</T></Card>
      <Card testID="sub-terms"><CardTitle>📋 {t('fx.termsT')}</CardTitle>
        <T>{t('fx.terms', { price: plan === 'y' ? (ios && pr.yearly) || '$' + PLANS.yearly.usd : (ios && pr.monthly) || '$' + PLANS.monthly.usd, period: t(plan === 'y' ? 'fx.perYear' : 'fx.perMonth'), store: prov.name })}</T>
        <Text style={[s.muted, { fontSize: 15 }]}>{t('pay.renew')}</Text><Text style={[s.muted, { fontSize: 15 }]}>⚕️ {t('fx.healthDisc')}</Text></Card>
      <Text testID="pay-provider" style={[s.muted, { textAlign: 'center' }]}>🔒 {t('fx.payVia', { store: prov.name })}</Text>
      {prov.connected ? <Btn testID="pay-buy" label={(effectivePayMode() === 'test' ? '🧪 TEST · ' : '') + t('pay.cta')} onPress={buy} /> : <Card testID="pay-soon"><Pending /><T style={{ color: C.warning, fontWeight: '700' }}>{t('pay.soon')}</T></Card>}
      {note && <Card><Pending /><T style={{ color: C.warning, fontWeight: '700' }}>{t('pay.soon')}</T></Card>}
      <RedeemCard />
      {ios && webBtn ? <Card testID="pay-web-us"><Btn testID="pay-web" kind="secondary" label={t('pay.webPay')} onPress={() => Linking.openURL(webPayUrl(uid))} /><Text style={s.muted}>{t('pay.webPayNote')}</Text></Card> : null}
      {ios ? <Btn testID="pay-restore" kind="secondary" label={`↺ ${t('pay.restoreIap')}`} onPress={doRestore} />
        : <Btn testID="pay-restore" kind="secondary" label={`↺ ${t('hb.restore')}`} onPress={() => router.push('/subscription')} />}
      {rmsg ? <Card><Text testID="restore-msg" style={{ fontWeight: '800', fontSize: 16 }}>{rmsg}</Text></Card> : null}
      {ios && ready ? <Btn testID="pay-manage" kind="ghost" label={t('pay.manageApple')} onPress={iapManage} /> : null}
      <Text style={[s.muted, { textAlign: 'center' }]}>{t('hb.cancelAny')}</Text>
      <Btn kind="ghost" label={t('pay.free')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <LegalLinks />
    </Screen>
  );
}
