import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Btn } from '../src/ui';
export default function More() {
  const { t } = useTranslation();
  return (
    <Screen title={t('more.title')}>
      <Btn label={`💪  ${t('coach.title')}`} onPress={() => router.push('/coach')} />
      <Btn label={`🏷️  ${t('more.barcode')}`} onPress={() => router.push('/barcode')} />
      <Btn kind="secondary" label={`✍️  ${t('more.manual')}`} onPress={() => router.push('/manual')} />
      <Btn kind="accent" label={`⭐  ${t('more.premium')}`} onPress={() => router.push('/paywall')} />
      <Btn kind="ghost" label={`⚙️  ${t('more.settings')}`} onPress={() => router.push('/settings')} />
      <Btn kind="ghost" label={`👑  ${t('more.founder')}`} onPress={() => router.push('/founder')} />
    </Screen>
  );
}
