import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Btn } from './ui';
export function LegalLinks() {
  const { t } = useTranslation();
  return <View style={{ gap: 8 }}>{(['privacy', 'terms', 'medical'] as const).map((k) =>
    <Btn key={k} small kind="ghost" label={t(`legal.${k}`)} onPress={() => router.push(`/legal?doc=${k}` as any)} />)}</View>;
}
