import { useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Screen, Card, Btn, T, s, IconCard, IconTile, InfoNote } from '../src/ui';
import { C } from '../src/theme';
import { useStore } from '../src/store';
import { useAuth } from '../src/faltantes-ui';
import { Note } from '../src/ext';
import { deleteBackup } from '../src/cloudsync';
// Borrar cuenta y datos desde la app (Google Play y App Store lo exigen). También es la página web pública de borrado:
// https://parrareimonjose-del.github.io/angie-one/delete-account
export default function DeleteAccount() {
  const { t } = useTranslation(); const { s: st, reset } = useStore(); const { setAuth } = useAuth(); const [done, setDone] = useState(false);
  const del = async () => { if (Platform.OS === 'web' && !window.confirm(t('fx.delQ'))) return;
    if (st.sync?.code) { try { await deleteBackup(st.sync.code); } catch { /* sin red: se avisa en la nota */ } }
    setAuth(null); reset(); try { const ks = await AsyncStorage.getAllKeys(); await AsyncStorage.multiRemove(ks.filter((k) => k.startsWith('angieone'))); } catch {}
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear(); setDone(true); };
  return <Screen title={`🗑️ ${t('fx.delTitle')}`}>
    <IconCard icon="🗑️" title={t('fx.delTitle')} sub={t('fx.delWhat')} style={{ borderColor: C.primary + '55' }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><IconTile icon="☁️" size={36} /><T style={{ flex: 1 }}>{t('fx.delCloud')}</T></View></IconCard>
    {done ? <Card testID="del-done"><T style={{ color: C.success, fontWeight: '900' }}>✓ {t('fx.delDone')}</T><Btn label={t('fx.start')} onPress={() => router.replace('/onboarding')} /></Card>
      : <Btn testID="del-btn" kind="danger" label={`🗑️ ${t('fx.delBtn')}`} onPress={del} />}
    <InfoNote icon="✉️" text="angieoneapp.support@gmail.com" /><Note k="fx.delNote" /></Screen>;
}
