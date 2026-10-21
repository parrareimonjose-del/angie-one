import { useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, T, s } from '../src/ui';
import { useStore, today } from '../src/store';
import { coachTarget } from '../src/coach';
import { fmtDate, fmtNum } from '../src/i18n';
import { C } from '../src/theme';
import { DiaryMeals } from '../src/mfp5-ui';
import { Row } from '../src/coach-ui';
import { totals } from '../src/mfp5';
import { eatenOnly } from '../src/yazio5';
import { DayTargetLine, WellnessCard } from '../src/yazio5-ui';

const offOf = (iso?: string) => { if (!iso || !/^\d{4}-\d\d-\d\d$/.test(iso)) return 0; const [y, m, d] = iso.split('-').map(Number); const b = new Date(); b.setHours(0, 0, 0, 0); return Math.round((new Date(y, m - 1, d).getTime() - b.getTime()) / 864e5); };
export default function Diary() {
  const { t } = useTranslation(); const { s: st } = useStore(); const prm = useLocalSearchParams<{ date?: string }>();
  const [off, setOff] = useState(Math.max(-365, Math.min(7, offOf(prm.date))));
  const dt = new Date(); dt.setDate(dt.getDate() + off); const d = today(dt);
  const ents = st.entries.filter((e) => e.date === d).sort((a, b) => a.time - b.time);
  const tt = totals(eatenOnly(ents)); const planned = ents.filter((e) => e.planned).reduce((a, e) => a + e.kcal, 0);
  return (
    <Screen title={off === 0 ? t('diary.title') : off > 0 ? t('y5.planTitle') : t('diary.day')}>
      <View style={s.row}>
        <Btn small kind="ghost" label="◀" a11y={t('diary.prev')} onPress={() => setOff(off - 1)} style={{ width: 64 }} />
        <Text testID="diary-date" style={[s.h2, { flex: 1, textAlign: 'center' }]}>{off === 0 ? t('diary.today') : fmtDate(dt)}</Text>
        <Btn small kind="ghost" testID="diary-next" label="▶" a11y={t('diary.nextDay')} onPress={() => off < 7 && setOff(off + 1)} style={{ width: 64 }} />
      </View>
      <Card style={{ backgroundColor: C.primary }}>
        <Text style={[s.h2, { color: C.white }]}>{t('diary.total')}: {fmtNum(tt.kcal)} / {fmtNum(coachTarget(st, dt).kcal)} {t('u.kcal')}</Text>
        <Text testID="diary-net" style={{ color: C.white, fontWeight: '700' }}>{t('mf.netLine', { net: fmtNum(tt.net), fiber: fmtNum(tt.fiber) })}</Text>
        {planned ? <Text testID="diary-planned" style={{ color: C.white, fontWeight: '700' }}>🗓️ {t('y5.plannedSum', { kcal: fmtNum(planned) })}</Text> : null}
        <DayTargetLine d={dt} />
      </Card>
      <Row><Btn small kind="secondary" testID="diary-quick" label={off > 0 ? `🗓️ ${t('y5.planMeal')}` : `⚡ ${t('mf.quick')}`} onPress={() => router.push({ pathname: '/quickadd', params: { date: d } })} />
        {ents.length ? <Btn small kind="secondary" testID="diary-copy" label={`📋 ${t('mf.copy')}`} onPress={() => router.push({ pathname: '/copy', params: { date: d } })} /> : null}
        <Btn small kind="ghost" testID="diary-nutri" label={`🧪 ${t('y5.nShort')}`} onPress={() => router.push({ pathname: '/nutrients', params: { date: d } })} />
        <Btn small kind="ghost" testID="diary-setup" label={`🛠️ ${t('y5.dsShort')}`} onPress={() => router.push('/diarysetup')} /></Row>
      {ents.length === 0 ? <Card><T>{off > 0 ? t('y5.planEmpty') : t('diary.empty')}</T>{off > 0 ? <Btn label={`🍲 ${t('y5.rTitle')}`} onPress={() => router.push('/recipes')} /> : <Btn label={`📸  ${t('nav.scan')}`} onPress={() => router.push('/scan')} />}</Card> : <DiaryMeals d={d} ents={ents} />}
      {off <= 0 ? <WellnessCard d={d} /> : null}
    </Screen>
  );
}
