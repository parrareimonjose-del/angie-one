import { View, Text, Switch, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, Chip, T, s } from '../src/ui';
import { useStore } from '../src/store';
import i18n, { deviceLang, Lang, SUPPORTED, NATIVE } from '../src/i18n';
import { C } from '../src/theme';
import { LegalLinks } from '../src/legal-links';
import { FeedbackBox } from '../src/p2';

export default function Settings() {
  const { t } = useTranslation(); const { s: st, set, reset } = useStore();
  const setLang = (l: Lang | null) => { set((x) => ({ ...x, langOverride: l })); i18n.changeLanguage(l || deviceLang()); };
  const doReset = () => {
    const ok = () => { reset(); router.replace('/onboarding'); };
    if (Platform.OS === 'web') { if (window.confirm(t('set.resetQ'))) ok(); }
    else Alert.alert(t('set.reset'), t('set.resetQ'), [{ text: t('cancel') }, { text: t('set.reset'), style: 'destructive', onPress: ok }]);
  };
  return (
    <Screen title={t('set.title')}>
      <Card>
        <Text style={s.h2}>🌐 {t('set.language')}</Text>
        <Chip label={`${t('set.auto')} · ${NATIVE[deviceLang()]}`} active={!st.langOverride} onPress={() => setLang(null)} />
        <View style={[s.row, { flexWrap: 'wrap' }]}>
          {SUPPORTED.map((k) => [k, NATIVE[k]] as const).map(([k, n]) => <Chip key={k} label={n} active={st.langOverride === k} onPress={() => setLang(k)} />)}
        </View>
      </Card>
      <Card>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <Text style={s.h2}>🤖 {t('set.ai')}</Text>
          <Switch accessibilityLabel={t('set.ai')} value={st.aiEnabled} onValueChange={(v) => set((x) => ({ ...x, aiEnabled: v }))} trackColor={{ true: C.secondary, false: C.border }} thumbColor={C.white} style={{ transform: [{ scale: 1.3 }] }} />
        </View>
        <Text style={s.muted}>{t('set.aiDesc')}</Text>
      </Card>
      <Btn kind="ghost" label={`🧠  ${t('p2.t.memory')}`} onPress={() => router.push('/memory')} />
      <Btn kind="ghost" label={`🔔  ${t('p2.t.rem')}`} onPress={() => router.push('/reminders')} />
      <FeedbackBox />
      <Card><T>🔒 {t('set.privacy')}</T><Text style={s.h2}>📄 {t('legal.section')}</Text><LegalLinks /></Card>
      <Btn kind="ghost" label={t('set.profile')} onPress={() => router.push('/onboarding')} />
      <Btn kind="danger" label={t('set.reset')} onPress={doReset} />
      <Text style={[s.muted, { textAlign: 'center' }]}>Angie One · {t('set.version')} 0.5.0 · Parra Apps</Text>
    </Screen>
  );
}
