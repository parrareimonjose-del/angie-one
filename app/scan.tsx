import { useState } from 'react';
import { View, Text, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, T, s } from '../src/ui';
import { useStore, today, uid, trialPhase } from '../src/store';
import { estimateMeal, Estimate } from '../src/ai';
import { EstimateResult, aiErrorText } from '../src/estimate';
import { shrinkForUpload } from '../src/img';
import { C } from '../src/theme';
import { estimateMicro } from '../src/yazio5';

export default function Scan() {
  const { t, i18n } = useTranslation(); const { s: st, set } = useStore();
  const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [est, setEst] = useState<Estimate | null>(null);
  const d = today(); const premium = trialPhase(st.trialStart).phase === 'trial';
  const usedToday = st.aiPhotos[d] || 0; const blocked = !premium && usedToday >= 1;

  const go = async (camera: boolean) => {
    setErr(''); setEst(null);
    if (camera) { const p = await ImagePicker.requestCameraPermissionsAsync(); if (!p.granted) { setErr(t('scan.noCam')); return; } }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5, base64: true };
    const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0]; setImg(a.uri); setBusy(true);
    try {
      let b64 = a.base64 || ''; if (b64.startsWith('data:')) b64 = b64.split(',')[1];
      if (!b64 && a.uri.startsWith('data:')) b64 = a.uri.split(',')[1];
      const up = await shrinkForUpload(a.uri, b64, a.mimeType || 'image/jpeg');
      const e = await estimateMeal(up.b64, up.mime, i18n.language);
      setEst(e);
      set((x) => ({ ...x, aiPhotos: { ...x.aiPhotos, [d]: (x.aiPhotos[d] || 0) + 1 } })); // solo cuenta si la IA respondió
    } catch (e) { setErr(aiErrorText(t, e)); } finally { setBusy(false); }
  };
  return (
    <Screen title={t('scan.title')}>
      <View style={{ alignSelf: 'flex-start', backgroundColor: C.success, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
        <Text style={{ color: C.white, fontWeight: '800' }}>{t('scan.live')}</Text>
      </View>
      {!st.aiEnabled ? <Card><T>{t('scan.aiOff')}</T><Btn kind="ghost" label={t('more.manual')} onPress={() => router.push('/manual')} /></Card>
        : blocked && !est ? <Card><T>{t('scan.limit')}</T><Btn kind="accent" label={t('more.premium')} onPress={() => router.push('/paywall')} /><Btn kind="ghost" label={t('more.manual')} onPress={() => router.push('/manual')} /></Card>
        : <>
          <Btn label={`📷  ${t('scan.take')}`} onPress={() => go(true)} />
          <Btn kind="secondary" label={`🖼️  ${t('scan.pick')}`} onPress={() => go(false)} />
        </>}
      {img && <Image source={{ uri: img }} style={{ width: '100%', height: 240, borderRadius: 24 }} resizeMode="cover" />}
      {busy && <Card><T>⏳ {t('scan.analyzing')}</T></Card>}
      {err ? <Card><T style={{ color: C.primary, fontWeight: '700' }}>{err}</T><Btn small kind="ghost" label={t('more.manual')} onPress={() => router.push('/manual')} /></Card> : null}
      {est && <EstimateResult key={est.name + est.kcalMin} est={est} onLog={(x) => {
        set((s0) => ({ ...s0, entries: [...s0.entries, { id: uid(), date: d, time: Date.now(), ...x, micro: estimateMicro(x.name, x.kcal), source: 'photo' }] }));
        router.replace('/diary');
      }} />}
    </Screen>
  );
}
