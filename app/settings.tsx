import { View, Text, Switch, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, Chip, T, s, ThemePicker, CardTitle, ListRow } from '../src/ui';
import { useStore } from '../src/store';
import { useAuth } from '../src/faltantes-ui';
import i18n, { deviceLang, Lang, SUPPORTED, NATIVE } from '../src/i18n';
import { C } from '../src/theme';
import { LegalLinks } from '../src/legal-links';
import { FeedbackBox } from '../src/p2';

export default function Settings() {
  const { t } = useTranslation(); const { s: st, set, reset } = useStore(); const { setAuth } = useAuth();
  const setLang = (l: Lang | null) => { set((x) => ({ ...x, langOverride: l })); i18n.changeLanguage(l || deviceLang()); };
  const wipe = () => { setAuth(null); reset(); router.replace('/onboarding'); };
  const doReset = () => {
    if (Platform.OS === 'web') { if (window.confirm(t('set.resetQ'))) wipe(); }
    else Alert.alert(t('set.reset'), t('set.resetQ'), [{ text: t('cancel') }, { text: t('set.reset'), style: 'destructive', onPress: wipe }]);
  };
  const doSignOut = () => {
    if (Platform.OS === 'web') { if (window.confirm(t('set.signOutQ'))) wipe(); }
    else Alert.alert(t('set.signOut'), t('set.signOutQ'), [{ text: t('cancel') }, { text: t('set.signOut'), style: 'destructive', onPress: wipe }]);
  };
  return (
    <Screen title={t('set.title')}>
      <Card style={{ gap: 2 }}>
        <ListRow testID="go-sub" icon="💳" label={t('hb.title')} onPress={() => router.push('/subscription')} />
        <ListRow testID="go-backup" icon="☁️" label={t('bk.title')} onPress={() => router.push('/backup')} />
        <ListRow testID="go-security" icon="🔐" label={t('fx.secTitle')} onPress={() => router.push('/security')} />
      </Card>
      <Btn kind="ghost" testID="sign-out" label={`🚪  ${t('set.signOut')}`} onPress={doSignOut} />
      <ThemePicker />
      <Card>
        <CardTitle>🌐 {t('set.language')}</CardTitle>
        <Chip label={`${t('set.auto')} · ${NATIVE[deviceLang()]}`} active={!st.langOverride} onPress={() => setLang(null)} />
        <View style={[s.row, { flexWrap: 'wrap' }]}>
          {SUPPORTED.map((k) => [k, NATIVE[k]] as const).map(([k, n]) => <Chip key={k} label={n} active={st.langOverride === k} onPress={() => setLang(k)} />)}
        </View>
      </Card>
      <Card>
        <View style={[s.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={[s.h2, { flex: 1, minWidth: 0, paddingRight: 12 }]}>🤖 {t('set.ai')}</Text>
          <View style={{ flexShrink: 0 }}>
            <Switch accessibilityLabel={t('set.ai')} value={st.aiEnabled} onValueChange={(v) => set((x) => ({ ...x, aiEnabled: v }))} trackColor={{ true: C.secondary, false: C.border }} thumbColor={C.white} />
          </View>
        </View>
        <Text style={s.muted}>{t('set.aiDesc')}</Text>
      </Card>
      <Card>
        <View style={[s.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={[s.h2, { flex: 1, minWidth: 0, paddingRight: 12 }]}>🔥 {t('hb.streaks')}</Text>
          <View style={{ flexShrink: 0 }}>
            <Switch testID="streak-toggle" accessibilityLabel={t('hb.streaks')} value={!st.streakOff} onValueChange={(v) => set((x) => ({ ...x, streakOff: !v }))} trackColor={{ true: C.secondary, false: C.border }} thumbColor={C.white} />
          </View>
        </View>
        <Text style={s.muted}>{t('hb.streaksDesc')}</Text>
      </Card>
      <Btn kind="ghost" label={`🧠  ${t('p2.t.memory')}`} onPress={() => router.push('/memory')} />
      <Btn kind="ghost" label={`🔔  ${t('p2.t.rem')}`} onPress={() => router.push('/reminders')} />
      <FeedbackBox />
      <Btn kind="ghost" testID="go-historia" label={`💖  ${t('faces.historiaTitle')}`} onPress={() => router.push('/historia')} />
      <Card testID="set-sources"><CardTitle>📚 {t('set.sources')}</CardTitle>
        <T>• {t('set.srcOms')}</T>
        <T>• {t('set.srcDga')}</T>
        <T>• {t('set.srcAcsm')}</T>
        <T>• {t('set.srcIssn')}</T>
        <T style={{ marginTop: 6 }}>{t('set.sourcesNote')}</T>
      </Card>
      <Card><T>🔒 {t('set.privacy')}</T><T>{t('set.privacyGemini')}</T><CardTitle>📄 {t('legal.section')}</CardTitle><LegalLinks /></Card>
      <Btn kind="ghost" label={t('set.profile')} onPress={() => router.push('/onboarding')} />
      <Btn kind="danger" label={t('set.reset')} onPress={doReset} />
      <Text style={[s.muted, { textAlign: 'center' }]}>Angie One · {t('set.version')} 0.5.0 · Parra Apps</Text>
    </Screen>
  );
}
