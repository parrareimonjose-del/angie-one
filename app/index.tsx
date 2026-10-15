import { useEffect, useState } from 'react';
import { View, Text, Image } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Speech from 'expo-speech';
import { Screen, Card, Btn, Ring, T, s } from '../src/ui';
import { fmtLocale, fmtNum } from '../src/i18n';
import { useStore, today, trialPhase, fmtCountdown, streak } from '../src/store';
import { C } from '../src/theme';
import { SmartTips } from '../src/p2';
import { SecurityNudge } from '../src/faltantes-ui';
import { CloneNudge } from '../src/clone-ui';
import { MacroRings } from '../src/mfp5-ui';
import { BillingReminder, UpsellNudge } from '../src/honest-ui';
import { dayGoals } from '../src/mfp5';
import { coachTarget, coachOf, burnedOn, isPremium, weekday } from '../src/coach';

export default function Home() {
  const { t, i18n } = useTranslation(); const { s: st, ready, set } = useStore();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(i); }, []);
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  if (!st.profile) return <Redirect href="/onboarding" />;
  const d = today(); const target = dayGoals(st); const co = coachOf(st); const burned = burnedOn(co, d);
  const ents = st.entries.filter((e) => e.date === d);
  const sum = ents.reduce((a, e) => ({ kcal: a.kcal + e.kcal, p: a.p + e.p, c: a.c + e.c, f: a.f + e.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  const water = st.water[d] || 0; const tp = trialPhase(st.trialStart, now); const left = tp.daysLeft;
  const challenges = t('home.challenges') as unknown as string[];
  const ch = challenges[new Date().getDate() % challenges.length];
  const doneToday = st.challengeDays.includes(d);
  const speak = () => Speech.speak(t('home.summary', { eaten: Math.round(sum.kcal), goal: target.kcal, water }) + (burned ? ' ' + t('coach.sayBurned', { kcal: burned }) : ''), { language: fmtLocale() });
  return (
    <Screen>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <View style={s.row}><Image source={require('../assets/logo-icon.png')} style={{ width: 44, height: 44, borderRadius: 12 }} /><Text style={[s.h2, { fontSize: 24 }]}>Angie One</Text></View>
        <Btn small kind="ghost" label={'🔊'} a11y={t('home.readAloud')} onPress={speak} style={{ width: 56 }} />
      </View>
      <Text style={[s.t, { fontWeight: '700' }]}>{t('home.hello')} ✨</Text>
      <Btn kind="accent" small label={tp.phase === 'trial' ? `⭐ ${t('home.trialDays', { n: left })}` : tp.phase === 'offer' ? t('trial.offer', { time: fmtCountdown(tp.offerMsLeft) }) : t('home.trialOver')} onPress={() => router.push('/paywall')} />
      {tp.phase === 'trial' && left <= 2 ? <Card style={{ backgroundColor: '#FFF1DC' }}><T style={{ fontWeight: '700' }}>{t(left === 2 ? 'trial.remind2' : 'trial.remind1')}</T></Card> : null}
      <Card style={{ alignItems: 'center' }}>
        <Ring value={sum.kcal} max={target.kcal + burned} size={220}>
          <Text style={{ fontSize: 44, fontWeight: '900', color: C.text }}>{fmtNum(Math.max(0, target.kcal + burned - Math.round(sum.kcal)))}</Text>
          <Text style={s.muted}>{t('u.kcal')} {t('home.left')}</Text>
        </Ring>
        <View style={[s.row, { justifyContent: 'space-around', alignSelf: 'stretch' }]}>
          <View style={{ alignItems: 'center' }}><Text style={s.h2}>{fmtNum(sum.kcal)}</Text><Text style={s.muted}>{t('home.eaten')}</Text></View>
          <View style={{ alignItems: 'center' }}><Text style={s.h2}>{fmtNum(target.kcal)}</Text><Text style={s.muted}>{t('home.goal')}</Text></View>
          <View style={{ alignItems: 'center' }}><Text testID="home-burned" style={[s.h2, { color: C.warning }]}>🔥 {fmtNum(burned)}</Text><Text style={s.muted}>{t('coach.burned')}</Text></View>
        </View>
      </Card>
      <MacroRings />
      <View style={[s.row, { alignItems: 'stretch' }]}>
        <Card style={{ flex: 1 }}>
          <Text style={s.h2}>💧 {t('home.water')}</Text>
          <Text style={{ fontSize: 30, fontWeight: '900', color: C.water }}>{water}/8</Text>
          <Btn small kind="secondary" label={t('home.addWater')} onPress={() => set((x) => ({ ...x, water: { ...x.water, [d]: (x.water[d] || 0) + 1 } }))} />
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={s.h2}>🔥 {t('home.challenge')}</Text>
          <T>{ch}</T>
          {st.streakOff ? null : <Text testID="streak" style={[s.muted, { fontWeight: '700' }]}>{t('home.streak', { n: streak(st.challengeDays) })}</Text>}
          {doneToday ? <Text style={{ color: C.success, fontWeight: '800', fontSize: 16 }}>✓ {t('home.challengeDone')}</Text>
            : <Btn small kind="primary" label={t('home.markDone')} onPress={() => set((x) => ({ ...x, challengeDays: [...x.challengeDays, d] }))} />}
        </Card>
      </View>
      {isPremium(st) && co.plan && !co.plan.workout.days[weekday()].rest && !co.workouts.some((w) => w.date === d) ? <Btn kind="secondary" label={`🏋️  ${t('coach.startToday')}`} onPress={() => router.push({ pathname: '/player', params: { day: String(weekday()) } })} /> : null}
      <BillingReminder />
      <UpsellNudge />
      <SecurityNudge />
      <CloneNudge />
      <SmartTips />
      <Btn label={`📸  ${t('nav.scan')}`} onPress={() => router.push('/scan')} />
      <Btn kind="ghost" label={`🌱  ${t('p2.hub')}`} onPress={() => router.push('/plus')} />
    </Screen>
  );
}
