import { useState } from 'react';
import { Text, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Screen, Card, Btn, T, s } from '../src/ui';
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
    <Card><T>{t('fx.delWhat')}</T><T>{t('fx.delCloud')}</T></Card>
    {done ? <Card testID="del-done"><T style={{ color: C.success, fontWeight: '900' }}>✓ {t('fx.delDone')}</T><Btn label={t('fx.start')} onPress={() => router.replace('/onboarding')} /></Card>
      : <Btn testID="del-btn" kind="danger" label={`🗑️ ${t('fx.delBtn')}`} onPress={del} />}
    <Text style={s.muted}>✉️ angieoneapp.support@gmail.com</Text><Note k="fx.delNote" /></Screen>;
}
