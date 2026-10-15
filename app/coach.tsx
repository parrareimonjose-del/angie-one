import { View, Text } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, T, s } from '../src/ui';
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
      <Card><Text style={s.h2}>{t('coach.introTitle')}</Text><T>{t('coach.introBody')}</T></Card>
      <Btn label={`✨ ${t('coach.create')}`} onPress={() => router.push('/coach-setup')} />
      <Disclaimer />
    </Screen>
  );
  const tg = coachTarget(st); const day = c.plan.workout.days[weekday()]; const ww = weekWorkouts(c);
  const done = c.workouts.some((w) => w.date === today()); const due = nextCheckInDays(c) === 0;
  return (
    <Screen title={`💪 ${t('coach.title')}`}>
      <Card>
        <Text style={s.h2}>{t('coach.today')}</Text>
        <T>{day.rest ? `😌 ${t('coach.restDay')}` : `🏋️ ${N.dayTitle(day)} · ~${fmtNum(planBurn(day, st.profile.weight, c.boost))} ${t('u.kcal')}`}</T>
        {!day.rest && (done ? <Text style={{ color: C.success, fontWeight: '800', fontSize: 17 }}>✓ {t('coach.doneToday')}</Text>
          : <Btn label={`▶️ ${t('coach.startToday')}`} onPress={() => router.push({ pathname: '/player', params: { day: String(weekday()) } })} />)}
        <View style={[s.row, { justifyContent: 'space-around' }]}>
          <View style={{ alignItems: 'center' }}><Text style={s.h2}>🔥 {fmtNum(burnedOn(c, today()))}</Text><Text style={s.muted}>{t('coach.burnedToday')}</Text></View>
          <View style={{ alignItems: 'center' }}><Text style={s.h2}>⚡ {workoutStreak(c)}</Text><Text style={s.muted}>{t('coach.streak')}</Text></View>
          <View style={{ alignItems: 'center' }}><Text style={s.h2}>{ww.done}/{ww.planned}</Text><Text style={s.muted}>{t('coach.week')}</Text></View>
        </View>
      </Card>
      <Card style={{ alignItems: 'center' }}><Text style={[s.h2, { color: C.primary }]}>{t('coach.target', { kcal: fmtNum(tg.kcal) })}</Text>
        <Text style={s.muted}>{t('coach.source.' + c.plan.source)}</Text></Card>
      <Btn label={`🍽️  ${t('coach.diet')}`} onPress={() => router.push('/diet')} />
      <Btn kind="secondary" label={`🏋️  ${t('coach.workout')}`} onPress={() => router.push('/workout')} />
      <Btn kind={due ? 'accent' : 'ghost'} label={`⚖️  ${t('coach.checkin')}${due ? ' · ' + t('coach.due') : ''}`} onPress={() => router.push('/checkin')} />
      <Btn kind="ghost" label={`💬  ${t('coach.chat')}`} onPress={() => router.push('/chat')} />
      <Btn kind="ghost" small label={`✏️  ${t('coach.edit')}`} onPress={() => router.push('/coach-setup')} />
      <Disclaimer />
    </Screen>
  );
}
