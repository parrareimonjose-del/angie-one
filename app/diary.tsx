import { useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, T, s } from '../src/ui';
import { useStore, today, dailyTarget } from '../src/store';
import { C } from '../src/theme';

const ICON = { photo: '📸', barcode: '🏷️', manual: '✍️' };
export default function Diary() {
  const { t } = useTranslation(); const { s: st, set } = useStore();
  const [off, setOff] = useState(0);
  const dt = new Date(); dt.setDate(dt.getDate() + off); const d = today(dt);
  const ents = st.entries.filter((e) => e.date === d).sort((a, b) => a.time - b.time);
  const total = ents.reduce((a, e) => a + e.kcal, 0);
  return (
    <Screen title={t('diary.title')}>
      <View style={s.row}>
        <Btn small kind="ghost" label="◀" a11y={t('diary.prev')} onPress={() => setOff(off - 1)} style={{ width: 64 }} />
        <Text style={[s.h2, { flex: 1, textAlign: 'center' }]}>{off === 0 ? t('diary.today') : dt.toLocaleDateString()}</Text>
        <Btn small kind="ghost" label="▶" a11y={t('diary.nextDay')} onPress={() => off < 0 && setOff(off + 1)} style={{ width: 64 }} />
      </View>
      <Card style={{ backgroundColor: C.primary }}>
        <Text style={[s.h2, { color: C.white }]}>{t('diary.total')}: {total} / {dailyTarget(st.profile).kcal} kcal</Text>
      </Card>
      {ents.length === 0 ? <Card><T>{t('diary.empty')}</T><Btn label={`📸  ${t('nav.scan')}`} onPress={() => router.push('/scan')} /></Card>
        : ents.map((e) => (
          <Card key={e.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 26 }}>{ICON[e.source]}</Text>
            <View style={{ flex: 1 }}><T style={{ fontWeight: '800' }}>{e.name}</T><Text style={s.muted}>{new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · P {e.p} · C {e.c} · G {e.f}</Text></View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={{ fontWeight: '900', fontSize: 18, color: C.primary }}>{e.kcal}</Text>
              <Btn small kind="danger" label={t('diary.remove')} onPress={() => set((x) => ({ ...x, entries: x.entries.filter((y) => y.id !== e.id) }))} />
            </View>
          </Card>))}
    </Screen>
  );
}
