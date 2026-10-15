import { View, Text } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, T, s, IconCard, IconTile, StatRow, Ring } from '../src/ui';
import { C } from '../src/theme';
import { today } from '../src/store';
import { fmtNum } from '../src/i18n';
import { useCoach, CoachLocked, useNames, Disclaimer } from '../src/coach-ui';
import { coachTarget, weekday, burnedOn, workoutStreak, weekWorkouts, nextCheckInDays, planBurn } from '../src/coach';

export default function CoachHub() {
  const { t } = useTranslation(); const { st, c, ready, premium } = useCoach(); const N = useNames();
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  if (!st.profile) return <Redirect href="/onboarding" />;
  if (!premium) return <CoachLocked />;
  if (!c.plan) return (
    <Screen title={`💪 ${t('coach.title')}`}>
      <IconCard icon="✨" title={t('coach.introTitle')} sub={t('coach.introBody')}>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>{[['🍽️', t('coach.diet')], ['🏋️', t('coach.workout')], ['⚖️', t('coach.checkin')]].map(([i, l]) => <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6, padding: 10, borderRadius: 16, backgroundColor: C.tint }}><IconTile icon={i} size={44} /><Text style={{ fontWeight: '700', color: C.text, fontSize: 13, textAlign: 'center' }}>{l}</Text></View>)}</View>
      </IconCard>
      <Btn label={`✨ ${t('coach.create')}`} onPress={() => router.push('/coach-setup')} />
      <Disclaimer />
    </Screen>
  );
  const tg = coachTarget(st); const day = c.plan.workout.days[weekday()]; const ww = weekWorkouts(c);
  const done = c.workouts.some((w) => w.date === today()); const due = nextCheckInDays(c) === 0;
  return (
    <Screen title={`💪 ${t('coach.title')}`}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Ring value={ww.done} max={Math.max(1, ww.planned)} size={120} stroke={13}><Text style={{ fontSize: 26, fontWeight: '900', color: C.text }}>{ww.done}/{ww.planned}</Text><Text style={[s.muted, { fontSize: 12 }]}>{t('coach.week')}</Text></Ring>
        <View style={{ flex: 1, gap: 4 }}><Text style={[s.h2, { color: C.primary }]}>{t('coach.target', { kcal: fmtNum(tg.kcal) })}</Text><Text style={s.muted}>{t('coach.source.' + c.plan.source)}</Text></View>
      </Card>
      <StatRow items={[{ icon: '🔥', value: fmtNum(burnedOn(c, today())), label: t('coach.burnedToday') }, { icon: '⚡', value: workoutStreak(c), label: t('coach.streak') }, { icon: '📅', value: `${ww.done}/${ww.planned}`, label: t('coach.week') }]} />
      <IconCard icon={day.rest ? '😌' : '🏋️'} title={t('coach.today')}>
        <T>{day.rest ? `😌 ${t('coach.restDay')}` : `🏋️ ${N.dayTitle(day)} · ~${fmtNum(planBurn(day, st.profile.weight, c.boost))} ${t('u.kcal')}`}</T>
        {!day.rest && (done ? <Text style={{ color: C.success, fontWeight: '800', fontSize: 17 }}>✓ {t('coach.doneToday')}</Text>
          : <Btn label={`▶️ ${t('coach.startToday')}`} onPress={() => router.push({ pathname: '/player', params: { day: String(weekday()) } })} />)}
      </IconCard>
      <Btn label={`🍽️  ${t('coach.diet')}`} onPress={() => router.push('/diet')} />
      <Btn kind="secondary" label={`🏋️  ${t('coach.workout')}`} onPress={() => router.push('/workout')} />
      <Btn kind={due ? 'accent' : 'ghost'} label={`⚖️  ${t('coach.checkin')}${due ? ' · ' + t('coach.due') : ''}`} onPress={() => router.push('/checkin')} />
      <Btn kind="ghost" label={`💬  ${t('coach.chat')}`} onPress={() => router.push('/chat')} />
      <Btn kind="ghost" small label={`✏️  ${t('coach.edit')}`} onPress={() => router.push('/coach-setup')} />
      <Disclaimer />
    </Screen>
  );
}
