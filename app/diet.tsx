import { useState } from 'react';
import { View, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, Chip, T, s } from '../src/ui';
import { C } from '../src/theme';
import { fmtNum } from '../src/i18n';
import { today, uid } from '../src/store';
import { useCoach, CoachLocked, useNames, dayName, speak, Row, Disclaimer } from '../src/coach-ui';
import { coachTarget, weekday, Meal } from '../src/coach';

export default function Diet() {
  const { t } = useTranslation(); const { st, c, set, premium } = useCoach(); const N = useNames();
  const [d, setD] = useState(weekday()); const [shop, setShop] = useState(false); const [added, setAdded] = useState<string[]>([]);
  if (!premium) return <CoachLocked />;
  if (!c.plan) return <Redirect href="/coach" />;
  const k = coachTarget(st).kcal / c.plan.kcal; // la meta cambió con el check-in → reescala el plan sin gastar IA
  const sc = (m: Meal) => ({ kcal: Math.round(m.kcal * k), p: Math.round(m.p * k), c: Math.round(m.c * k), f: Math.round(m.f * k) });
  const meals = c.plan.diet.days[d].meals; const total = meals.reduce((a, m) => a + sc(m).kcal, 0);
  const slots = (t('coach.slots' + meals.length) as unknown as string[]);
  const log = (m: Meal, i: number) => {
    const v = sc(m); set((x) => ({ ...x, entries: [...x.entries, { id: uid(), date: today(), time: Date.now(), name: N.meal(m), kcal: v.kcal, p: v.p, c: v.c, f: v.f, source: 'manual' }] }));
    setAdded([...added, `${d}-${i}`]);
  };
  const shopping = c.plan.diet.shoppingKeys?.length ? c.plan.diet.shoppingKeys.map((x) => t(`cing.${x}`)) : c.plan.diet.shopping;
  return (
    <Screen title={`🍽️ ${t('coach.diet')}`}>
      <Row>{[0, 1, 2, 3, 4, 5, 6].map((i) => <Chip key={i} label={dayName(i)} active={i === d} onPress={() => setD(i)} />)}</Row>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Text style={s.h2}>{dayName(d, true)} · {fmtNum(total)} {t('u.kcal')}</Text>
        <Btn small kind="ghost" label="🔊" a11y={t('home.readAloud')} style={{ width: 56 }} onPress={() => speak(meals.map((m, i) => `${slots[i] || ''}: ${N.meal(m)}, ${sc(m).kcal} ${t('u.kcal')}`).join('. '))} />
      </View>
      {meals.map((m, i) => { const v = sc(m); const ok = added.includes(`${d}-${i}`) || st.entries.some((e) => e.date === today() && e.name === N.meal(m) && e.kcal === v.kcal); return (
        <Card key={i}>
          <Text style={[s.muted, { fontWeight: '800' }]}>{slots[i] || ''}</Text>
          {N.meal(m) !== slots[i] && <Text style={s.h2}>{N.meal(m)}</Text>}
          <T>{N.items(m)}{m.scale && Math.abs(m.scale * k - 1) > 0.05 ? ` · ${t('coach.portion', { x: fmtNum(m.scale * k, 1) })}` : ''}</T>
          <Text style={[s.t, { fontWeight: '800', color: C.primary }]}>{fmtNum(v.kcal)} {t('u.kcal')} · {t('u.p')} {v.p}{t('u.g')} · {t('u.c')} {v.c}{t('u.g')} · {t('u.f')} {v.f}{t('u.g')}</Text>
          {d === weekday() && (ok ? <Text style={{ color: C.success, fontWeight: '800' }}>✓ {t('coach.logged')}</Text> : <Btn small kind="secondary" label={`+ ${t('coach.logMeal')}`} onPress={() => log(m, i)} />)}
        </Card>); })}
      <Btn kind="accent" label={`🛒 ${t('coach.shopping')}`} onPress={() => setShop(!shop)} />
      {shop && <Card>{shopping.map((x, i) => <T key={i}>• {x}</T>)}</Card>}
      <Disclaimer />
    </Screen>
  );
}
