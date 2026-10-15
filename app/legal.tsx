import { Text, Linking, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, T, s, CardTitle } from '../src/ui';
import { CONTACT } from '../src/legal';
type DocKey = 'privacy' | 'terms' | 'medical';
import { C } from '../src/theme';
import { ATTRIBUTION } from '../src/fooddb';

export default function Legal() {
  const { t, i18n } = useTranslation(); const { doc } = useLocalSearchParams<{ doc?: string }>();
  const key: DocKey = doc === 'terms' || doc === 'medical' ? doc : 'privacy';
  const d = t(`docs.${key}`, { returnObjects: true }) as unknown as { title: string; updated: string; sections: [string, string][] };
  return (
    <Screen title={d.title}>
      <View style={{ backgroundColor: C.accent, borderRadius: 12, padding: 10 }}><Text style={{ color: C.onAccent, fontWeight: '800' }}>{t('legal.draft')}</Text></View>
      <Text style={s.muted}>{d.updated}</Text>
      {d.sections.map(([h, b]) => <Card key={h}><CardTitle>{h}</CardTitle><T>{b}</T></Card>)}
      <Text style={[s.t, { color: C.secondary, fontWeight: '800', textAlign: 'center' }]} onPress={() => Linking.openURL(`mailto:${CONTACT}`)}>✉️ {CONTACT}</Text>
      <Text testID="legal-attrib" style={s.muted}>{t('fdb.source')}: {ATTRIBUTION}. Open Food Facts © contributors, ODbL 1.0 (opendatacommons.org/licenses/odbl). USDA FoodData Central: public domain.</Text>
    </Screen>
  );
}
