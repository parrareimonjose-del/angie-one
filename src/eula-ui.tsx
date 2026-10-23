import { Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card, Btn, T, s, CardTitle } from './ui';
import { C } from './theme';
import { useStore } from './store';
import { eulaAccepted, acceptEula } from './eula';

/** Pantalla/tarjeta: aceptar Términos (tolerancia cero) antes de Amigos o aportes. */
export function EulaGate({ children, testID = 'eula-gate' }: { children: React.ReactNode; testID?: string }) {
  const { t } = useTranslation();
  const { s: st, set } = useStore();
  if (eulaAccepted(st)) return <>{children}</>;
  return (
    <Card testID={testID}>
      <CardTitle>📜 {t('eula.title')}</CardTitle>
      <T>{t('eula.body')}</T>
      <T style={{ fontWeight: '800', color: C.primary }}>{t('eula.zero')}</T>
      <Btn small kind="ghost" testID="eula-read" label={t('eula.read')} onPress={() => router.push('/legal?doc=terms' as any)} />
      <Btn testID="eula-accept" label={`✓ ${t('eula.accept')}`} onPress={() => set((x) => ({ ...x, eula: acceptEula() }))} />
      <Text style={[s.muted, { fontSize: 13 }]}>{t('eula.mod')}</Text>
    </Card>
  );
}
