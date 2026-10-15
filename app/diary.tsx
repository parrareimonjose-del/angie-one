import { useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, T, s } from '../src/ui';
import { useStore, today } from '../src/store';
import { coachTarget } from '../src/coach';
import { fmtDate, fmtNum } from '../src/i18n';
import { C } from '../src/theme';
import { DiaryMeals } from '../src/mfp5-ui';
import { Row } from '../src/coach-ui';
import { totals } from '../src/mfp5';

export default function Diary() {
  const { t } = useTranslation(); const { s: st, set } = useStore();
  const [off, setOff] = useState(0);
  const dt = new Date(); dt.setDate(dt.getDate() + off); const d = today(dt);
  const ents = st.entries.filter((e) => e.date === d).sort((a, b) => a.time - b.time);
  const tt = totals(ents); const total = tt.kcal;
  return (
    <Screen title={off === 0 ? t('diary.title') : t('diary.day')}>
      <View style={s.row}>
        <Btn small kind="ghost" label="◀" a11y={t('diary.prev')} onPress={() => setOff(off - 1)} style={{ width: 64 }} />
        <Text style={[s.h2, { flex: 1, textAlign: 'center' }]}>{off === 0 ? t('diary.today') : fmtDate(dt)}</Text>
        <Btn small kind="ghost" label="▶" a11y={t('diary.nextDay')} onPress={() => off < 0 && setOff(off + 1)} style={{ width: 64 }} />
      </View>
      <Card style={{ backgroundColor: C.primary }}>
        <Text style={[s.h2, { color: C.white }]}>{t('diary.total')}: {fmtNum(total)} / {fmtNum(coachTarget(st).kcal)} {t('u.kcal')}</Text>
        <Text testID="diary-net" style={{ color: C.white, fontWeight: '700' }}>{t('mf.netLine', { net: fmtNum(tt.net), fiber: fmtNum(tt.fiber) })}</Text>
      </Card>
      <Row><Btn small kind="secondary" testID="diary-quick" label={`⚡ ${t('mf.quick')}`} onPress={() => router.push({ pathname: '/quickadd', params: { date: d } })} />
        {ents.length ? <Btn small kind="secondary" testID="diary-copy" label={`📋 ${t('mf.copy')}`} onPress={() => router.push({ pathname: '/copy', params: { date: d } })} /> : null}</Row>
      {ents.length === 0 ? <Card><T>{t('diary.empty')}</T><Btn label={`📸  ${t('nav.scan')}`} onPress={() => router.push('/scan')} /></Card> : <DiaryMeals d={d} ents={ents} />}
    </Screen>
  );
}
