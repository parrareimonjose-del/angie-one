import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, T, s } from '../src/ui';
import { C } from '../src/theme';
import { useStore, trialPhase, fmtCountdown } from '../src/store';
import { LegalLinks } from '../src/legal-links';

// TODO: integrar RevenueCat (plan gratuito hasta 2.500 $/mes de ingresos) + App Store / Google Play Billing. Hoy NO cobra nada.
export default function Paywall() {
  const { t } = useTranslation(); const [plan, setPlan] = useState<'y' | 'm'>('y'); const [note, setNote] = useState(false);
  const { s: st } = useStore(); const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(i); }, []);
  const tp = trialPhase(st.trialStart, now);
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
      <Card>{(['f1', 'f2', 'f3', 'f4', 'f5'] as const).map((f) => <T key={f}>✅ {t(`pay.${f}`)}</T>)}</Card>
      {opt('y', t('pay.yearly'), t('pay.yearlySave'))}
      {opt('m', t('pay.monthly'))}
      <Text style={[s.muted, { textAlign: 'center' }]}>{t('pay.latam')}</Text>
      <Card style={{ backgroundColor: '#FFF1DC' }}><T>⏳ {t('pay.offer')}</T>
        <T style={{ fontWeight: '800', color: tp.phase === 'offer' ? C.primary : C.text }}>{tp.phase === 'offer' ? t('pay.offerLive', { time: fmtCountdown(tp.offerMsLeft) }) : tp.phase === 'free' ? t('pay.offerGone') : t('pay.offerAfter')}</T></Card>
      <Text style={[s.muted, { fontSize: 13 }]}>{t('pay.renew')}</Text>
      <Btn label={t('pay.cta')} onPress={() => setNote(true)} />
      {note && <Card><T style={{ color: C.warning, fontWeight: '700' }}>{t('pay.soon')}</T></Card>}
      <Btn kind="ghost" label={t('pay.free')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <LegalLinks />
    </Screen>
  );
}
