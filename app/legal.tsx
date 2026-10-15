import { Text, Linking, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, T, s } from '../src/ui';
import { LEGAL, CONTACT, DocKey } from '../src/legal';
import { C } from '../src/theme';

export default function Legal() {
  const { t, i18n } = useTranslation(); const { doc } = useLocalSearchParams<{ doc?: string }>();
  const lang = (['es', 'en', 'pt'].includes(i18n.language) ? i18n.language : 'en') as 'es';
  const key: DocKey = doc === 'terms' || doc === 'medical' ? doc : 'privacy';
  const d = LEGAL[lang][key];
  return (
    <Screen title={d.title}>
      <View style={{ backgroundColor: C.accent, borderRadius: 12, padding: 10 }}><Text style={{ color: C.onAccent, fontWeight: '800' }}>{t('legal.draft')}</Text></View>
      <Text style={s.muted}>{d.updated}</Text>
      {d.sections.map(([h, b]) => <Card key={h}><Text style={s.h2}>{h}</Text><T>{b}</T></Card>)}
      <Text style={[s.t, { color: C.secondary, fontWeight: '800', textAlign: 'center' }]} onPress={() => Linking.openURL(`mailto:${CONTACT}`)}>✉️ {CONTACT}</Text>
    </Screen>
  );
}
