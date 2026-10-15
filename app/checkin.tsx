import { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, Chip, T, s } from '../src/ui';
import { C } from '../src/theme';
import { fmtNum, fmtDate } from '../src/i18n';
import { today } from '../src/store';
import { useCoach, CoachLocked, Row, Disclaimer, speak } from '../src/coach-ui';
import { checkIn, CheckAnswers, nextCheckInDays } from '../src/coach';

export default function CheckInScreen() {
  const { t } = useTranslation(); const { st, c, set, premium } = useCoach();
  const [w, setW] = useState(st.profile?.weight || 70); const [a, setA] = useState<CheckAnswers>({ energy: 'ok', skipped: false, binge: false });
  const [res, setRes] = useState<ReturnType<typeof checkIn> | null>(null);
  if (!premium) return <CoachLocked />;
  if (!c.plan || !st.profile) return <Redirect href="/coach" />;
  const bump = (d: number) => setW(Math.round((w + d) * 10) / 10);
  const save = () => {
    if (!(w >= 30 && w <= 300)) return;
    const r = checkIn(st, w, a); setRes(r);
    set((x) => ({ ...x, profile: { ...x.profile!, weight: w }, coach: { ...c, adjust: r.adjust, boost: r.boost, checkins: [...c.checkins, { date: today(), weight: w, kcal: r.kcal, msg: r.msg, warn: r.warn }] } }));
    speak(`${t('ci.' + r.msg)} ${t('ci.newTarget', { kcal: r.kcal })}`);
  };
  if (res) return (
    <Screen title={`⚖️ ${t('coach.checkin')}`}>
      <Card style={{ backgroundColor: C.secondary }}><Text style={[s.h2, { color: C.white }]}>{t('ci.' + res.msg)}</Text>
        <Text testID="ci-target" style={[s.t, { color: C.white, fontWeight: '800' }]}>{t('ci.newTarget', { kcal: fmtNum(res.kcal) })}</Text>
        <Text style={[s.t, { color: C.white }]}>{t('ci.' + res.train)}</Text></Card>
      {res.warn && <Card style={{ backgroundColor: '#FFF1DC' }} ><Text testID="ci-warn" style={[s.h2, { color: C.warning }]}>💛 {t('ci.warnTitle')}</Text><T>{t('ci.warnBody')}</T></Card>}
      <Btn label={`💪 ${t('coach.title')}`} onPress={() => router.replace('/coach')} />
      <Disclaimer />
    </Screen>
  );
  const due = nextCheckInDays(c);
  return (
    <Screen title={`⚖️ ${t('coach.checkin')}`}>
      {due > 0 && <Card><T>{t('ci.notYet', { n: due })}</T></Card>}
      <Card style={{ alignItems: 'center' }}>
        <Text style={s.h2}>{t('ci.weightQ')}</Text>
        <TextInput testID="ci-weight" accessibilityLabel={t('ob.weight')} style={[s.input, { fontSize: 36, textAlign: 'center', minWidth: 180, fontWeight: '900' }]} keyboardType="decimal-pad"
          value={String(w)} onChangeText={(v) => setW(Number(v.replace(',', '.').replace(/[^0-9.]/g, '')) || 0)} />
        <View style={s.row}>{[-0.5, -0.1, 0.1, 0.5].map((d) => <Btn key={d} small kind="ghost" style={{ minWidth: 72 }} label={(d > 0 ? '+' : '−') + fmtNum(Math.abs(d), 1)} onPress={() => bump(d)} />)}</View>
      </Card>
      <Card><Text style={s.h2}>{t('ci.energyQ')}</Text>
        <Row>{(['low', 'ok', 'good'] as const).map((k) => <Chip key={k} label={t('ci.e_' + k)} active={a.energy === k} onPress={() => setA({ ...a, energy: k })} />)}</Row></Card>
      <Card><T>{t('ci.skippedQ')}</T><Row><Chip label={t('ci.no')} active={!a.skipped} onPress={() => setA({ ...a, skipped: false })} /><Chip label={t('ci.yes')} active={a.skipped} onPress={() => setA({ ...a, skipped: true })} /></Row>
        <T>{t('ci.bingeQ')}</T><Row><Chip label={t('ci.no')} active={!a.binge} onPress={() => setA({ ...a, binge: false })} /><Chip label={t('ci.yes')} active={a.binge} onPress={() => setA({ ...a, binge: true })} /></Row>
        <Text style={s.muted}>{t('ci.private')}</Text></Card>
      <Btn label={`✓ ${t('ci.save')}`} onPress={save} />
      {c.checkins.length > 0 && <Card><Text style={s.h2}>{t('ci.history')}</Text>
        {c.checkins.slice(-6).reverse().map((x, i) => <T key={i}>{fmtDate(new Date(x.date + 'T12:00:00'))} · {fmtNum(x.weight, 1)} kg · {fmtNum(x.kcal)} {t('u.kcal')}</T>)}</Card>}
      <Disclaimer />
    </Screen>
  );
}
