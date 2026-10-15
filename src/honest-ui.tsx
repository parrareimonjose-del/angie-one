/** Cobro honesto + lista verificada (UI). */
import { useEffect, useState } from 'react';
import { View, Text, Pressable, Platform, Linking } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, Chip, T, s } from './ui';
import { C } from './theme';
import { useStore, today } from './store';
import { fmtDate, fmtNum } from './i18n';
import { isPremium } from './coach';
import { Row } from './coach-ui';
import { Pending } from './ext';
import { reminderDue, nextCharge, CANCEL_URL, platformProvider, takeUpsell, notifyOnce, type Sub } from './billing';
import { restore } from './payments';
import { REASONS, type VFood } from './verified';
import { reportCloud } from './fooddb';

/** Aviso 1 día antes del fin de la prueba o de la renovación (en la app + notificación local si hay permiso). */
export function BillingReminder() {
  const { t } = useTranslation(); const { s: st } = useStore(); const r = reminderDue(st.trialStart, st.sub);
  const [perm, setPerm] = useState(Platform.OS === 'web' && typeof Notification !== 'undefined' ? Notification.permission : 'denied');
  const msg = r ? t(r.kind === 'trial' ? 'hb.remTrial' : 'hb.remRenew', { date: fmtDate(new Date(r.at)) }) : '';
  useEffect(() => { if (r) notifyOnce('Angie One', msg, today()); }, [!!r, perm]);
  if (!r) return null;
  return <Card testID="bill-reminder" style={{ backgroundColor: '#FFF1DC', borderWidth: 2, borderColor: C.warning }}>
    <T style={{ fontWeight: '800' }}>⏰ {msg}</T><Text style={s.muted}>{t('hb.remNoSurprise')}</Text>
    <Row><Btn small kind="secondary" testID="bill-manage" label={t('hb.manage')} onPress={() => router.push('/subscription')} />
      {perm === 'default' ? <Btn small kind="ghost" label={`🔔 ${t('hb.notifOn')}`} onPress={async () => setPerm(await Notification.requestPermission())} /> : null}</Row></Card>;
}
/** Como mucho 1 aviso de Premium por sesión; nunca si ya es Premium. Se puede cerrar. */
export function UpsellNudge() {
  const { t } = useTranslation(); const { s: st } = useStore(); const prem = isPremium(st);
  const [show, setShow] = useState(() => !prem && !!st.trialStart && takeUpsell(prem));
  if (!show || prem) return null;
  return <Card testID="upsell"><T>⭐ {t('hb.upsell')}</T><Row><Btn small label={t('hb.see')} onPress={() => { setShow(false); router.push('/paywall'); }} /><Btn small kind="ghost" testID="upsell-close" label={t('hb.notNow')} onPress={() => setShow(false)} /></Row></Card>;
}
/** Mi suscripción: estado, próximo cobro, cancelar en 2 toques (aquí 1 + botón de la tienda), restaurar compra. */
export function SubscriptionScreen() {
  const { t } = useTranslation(); const { s: st, set } = useStore(); const prov: Sub['provider'] = st.sub?.provider || platformProvider();
  const [steps, setSteps] = useState(false); const [rmsg, setRmsg] = useState(''); const n = nextCharge(st.trialStart, st.sub); const prem = isPremium(st);
  const store = { stripe: 'Stripe', play: 'Google Play', apple: 'App Store' }[prov];
  return <Screen title={`💳 ${t('hb.title')}`}>
    <Card testID="sub-status"><Text style={s.h2}>{prem ? `⭐ ${t('hb.premium')}` : t('hb.free')}</Text>
      <T>{n ? t(n.kind === 'trial' ? 'hb.trialEnds' : 'hb.renews', { date: fmtDate(new Date(n.at)) }) : t('hb.noCharge')}</T>
      <Text style={s.muted}>{t('hb.trialFree')}</Text></Card>
    <Btn testID="cancel-1" kind="danger" label={`✖ ${t('hb.cancel')}`} onPress={() => setSteps(true)} />
    {steps ? <Card testID="cancel-steps"><Text style={s.h2}>{t('hb.howTo', { store })}</Text>
      {(t(`hb.steps.${prov}`) as unknown as string[]).map((x, i) => <T key={i}>{i + 1}. {x}</T>)}
      {CANCEL_URL[prov] ? <Btn testID="cancel-2" label={`↗ ${t('hb.openStore', { store })}`} onPress={() => Linking.openURL(CANCEL_URL[prov])} />
        : <><Btn testID="cancel-2" label={`↗ ${t('hb.openStore', { store })}`} onPress={() => setRmsg(t('hb.portalSoon'))} /><Pending what="Stripe" /></>}
      {!st.sub?.active ? <Text testID="cancel-trial" style={[s.muted, { fontWeight: '700' }]}>{t('hb.trialNoCard')}</Text> : null}</Card> : null}
    <Btn testID="restore" kind="secondary" label={`↺ ${t('hb.restore')}`} onPress={async () => { const r = await restore(); setRmsg(r.ok ? t('hb.restored') : t(prov === 'stripe' ? 'hb.restoreWeb' : 'hb.restorePending')); }} />
    {rmsg ? <Card><Text testID="restore-msg" style={{ fontWeight: '800', fontSize: 16 }}>{rmsg}</Text></Card> : null}
    <Text style={s.muted}>ℹ️ {t('hb.promise')}</Text>
  </Screen>;
}
/** Fila de alimento con «Verificado ✓» y botón para reportar datos erróneos. */
export function FoodRow({ f, label, onAdd }: { f: VFood; label: string; onAdd: () => void }) {
  const { t } = useTranslation(); const { s: st, set } = useStore(); const [rep, setRep] = useState(false);
  const done = (st.reports || []).some((r) => r.key === f.key);
  return <View testID="food-row" style={{ borderBottomWidth: 1, borderColor: C.border, paddingVertical: 6, gap: 4 }}>
    <Pressable accessibilityRole="button" onPress={onAdd} style={({ pressed }) => [s.row, { minHeight: 56, justifyContent: 'space-between', opacity: pressed ? 0.6 : 1 }]}>
      <View style={{ flex: 1 }}><T style={{ fontWeight: '700' }}>{label}</T>
        <Text style={s.muted}>{f.portion} · {t('u.p')} {fmtNum(f.p)} · {t('u.c')} {fmtNum(f.c)} · {t('u.f')} {fmtNum(f.f)}</Text>
        {f.verified ? <Text testID="verified" style={{ color: C.success, fontWeight: '800' }}>{t('hb.verified')} · {f.source === 'usda' ? 'USDA' : f.source === 'off' ? 'Open Food Facts' : 'Angie One'}</Text> : <Text testID="unverified" style={s.muted}>{t('hb.unverified')}</Text>}</View>
      <Text style={{ fontWeight: '900', color: C.primary, fontSize: 17 }}>{fmtNum(f.kcal)} {t('u.kcal')}  ＋</Text>
    </Pressable>
    {done ? <Text testID="reported" style={[s.muted, { fontWeight: '700' }]}>✓ {t('hb.reported')}</Text>
      : rep ? <Row>{REASONS.map((r) => <Chip key={r} label={t(`hb.r.${r}`)} onPress={() => { set((x) => ({ ...x, reports: [...(x.reports || []), { key: f.key, name: label, reason: r, at: Date.now() }] })); if (f.key.startsWith('db:')) reportCloud({ id: f.id, name: label, reason: r }); setRep(false); }} />)}</Row>
      : <Pressable testID="report" accessibilityRole="button" onPress={() => setRep(true)} style={{ minHeight: 40, justifyContent: 'center' }}><Text style={{ color: C.muted, fontWeight: '700' }}>⚠️ {t('hb.report')}</Text></Pressable>}
  </View>;
}
export const SubscriptionRoute = SubscriptionScreen;
