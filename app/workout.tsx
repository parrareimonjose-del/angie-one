import { useState } from 'react';
import { View, Text } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, Chip, T, s } from '../src/ui';
import { C } from '../src/theme';
import { fmtNum } from '../src/i18n';
import { useCoach, CoachLocked, useNames, dayName, Row, Disclaimer } from '../src/coach-ui';
import { weekday, planBurn, applyBoost, workoutStreak } from '../src/coach';

export default function Workout() {
  const { t } = useTranslation(); const { st, c, premium } = useCoach(); const N = useNames(); const [d, setD] = useState(weekday());
  if (!premium) return <CoachLocked />;
  if (!c.plan) return <Redirect href="/coach" />;
  const day = c.plan.workout.days[d];
  return (
    <Screen title={`🏋️ ${t('coach.workout')}`}>
      <Row>{[0, 1, 2, 3, 4, 5, 6].map((i) => <Chip key={i} label={`${dayName(i)}${c.plan!.workout.days[i].rest ? '' : ' •'}`} active={i === d} onPress={() => setD(i)} />)}</Row>
      <Text style={s.muted}>⚡ {t('coach.streak')}: {workoutStreak(c)}</Text>
      {day.rest ? <Card><Text style={s.h2}>😌 {t('coach.restDay')}</Text><T>{t('coach.restBody')}</T></Card> : <>
        <Card>
          <Text style={s.h2}>{dayName(d, true)} · {N.dayTitle(day)}</Text>
          <T>🔥 ~{fmtNum(planBurn(day, st.profile!.weight, c.boost))} {t('u.kcal')}</T>
        </Card>
        {day.exercises.map((e, i) => (
          <Card key={i}>
            <Text style={s.h2}>{i + 1}. {N.ex(e)}</Text>
            <Text style={[s.t, { fontWeight: '800', color: C.secondary }]}>{applyBoost(e, c.boost)} × {e.reps ? t('coach.reps', { n: e.reps }) : t('coach.secs', { n: e.secs })} · {t('coach.restS', { n: e.rest })}</Text>
            <T>{N.desc(e)}</T>
          </Card>
        ))}
        <Btn label={`▶️ ${t('coach.start')}`} onPress={() => router.push({ pathname: '/player', params: { day: String(d) } })} />
      </>}
      <Card style={{ backgroundColor: C.warnBg }}><T>⚠️ {c.plan.workout.safety || t('coach.safety')}</T></Card>
      <Disclaimer />
    </Screen>
  );
}
