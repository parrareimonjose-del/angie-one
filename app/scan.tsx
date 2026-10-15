import { useState } from 'react';
import { View, Text, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, Chip, T, s } from '../src/ui';
import { useStore, today, uid, trialDaysLeft } from '../src/store';
import { estimateMeal, refine, Estimate } from '../src/ai';
import { C } from '../src/theme';

const PORTIONS = [0.5, 0.75, 1, 1.5, 2];

export default function Scan() {
  const { t, i18n } = useTranslation(); const { s: st, set } = useStore();
  const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [est, setEst] = useState<Estimate | null>(null);
  const [q, setQ] = useState<{ oil?: boolean; sauce?: boolean; fried?: boolean; portion: number }>({ portion: 1 });
  const d = today(); const premium = trialDaysLeft(st.trialStart) > 0;
  const usedToday = st.aiPhotos[d] || 0; const blocked = !premium && usedToday >= 1;

  const go = async (camera: boolean) => {
    setErr(''); setEst(null);
    if (camera) { const p = await ImagePicker.requestCameraPermissionsAsync(); if (!p.granted && !p.canAskAgain) return; }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5, base64: true };
    const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0]; setImg(a.uri); setBusy(true);
    try {
      let b64 = a.base64 || ''; if (b64.startsWith('data:')) b64 = b64.split(',')[1];
      const e = await estimateMeal(b64, a.mimeType || 'image/jpeg', i18n.language);
      setEst(e); setQ({ portion: 1 });
      set((x) => ({ ...x, aiPhotos: { ...x.aiPhotos, [d]: (x.aiPhotos[d] || 0) + 1 } }));
    } catch { setErr(t('scan.error')); } finally { setBusy(false); }
  };
  const r = est ? refine(est, q) : null;
  const aiMode = est?.mode ?? 'live';
  const yn = (k: 'oil' | 'sauce' | 'fried') => (
    <View key={k} style={[s.row, { justifyContent: 'space-between' }]}><T style={{ fontWeight: '700' }}>{t(`scan.${k}`)}</T>
      <View style={s.row}><Chip label={t('scan.yes')} active={q[k] === true} onPress={() => setQ({ ...q, [k]: true })} /><Chip label={t('scan.no')} active={q[k] === false} onPress={() => setQ({ ...q, [k]: false })} /></View></View>
  );
  const log = () => {
    if (!est || !r) return;
    set((x) => ({ ...x, entries: [...x.entries, { id: uid(), date: d, time: Date.now(), name: est.name, kcal: Math.round((r.min + r.max) / 2), p: r.p, c: r.c, f: r.f, source: 'photo' }] }));
    router.replace('/diary');
  };
  return (
    <Screen title={t('scan.title')}>
      <View style={{ alignSelf: 'flex-start', backgroundColor: aiMode === 'demo' ? C.accent : C.success, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
        <Text style={{ color: aiMode === 'demo' ? C.onAccent : C.white, fontWeight: '800' }}>{aiMode === 'demo' ? t('scan.demo') : t('scan.live')}</Text>
      </View>
      {!st.aiEnabled ? <Card><T>{t('scan.aiOff')}</T><Btn kind="ghost" label={t('more.manual')} onPress={() => router.push('/manual')} /></Card>
        : blocked ? <Card><T>{t('scan.limit')}</T><Btn kind="accent" label={t('more.premium')} onPress={() => router.push('/paywall')} /></Card>
        : <>
          <Btn label={`📷  ${t('scan.take')}`} onPress={() => go(true)} />
          <Btn kind="secondary" label={`🖼️  ${t('scan.pick')}`} onPress={() => go(false)} />
        </>}
      {img && <Image source={{ uri: img }} style={{ width: '100%', height: 240, borderRadius: 24 }} resizeMode="cover" />}
      {busy && <Card><T>⏳ {t('scan.analyzing')}</T></Card>}
      {err ? <Card><T style={{ color: C.primary }}>{err}</T></Card> : null}
      {est && r && <>
        <Card>
          <Text style={s.h2}>{est.name}</Text>
          <Text style={s.muted}>{t('scan.range')}</Text>
          <Text style={{ fontSize: 40, fontWeight: '900', color: C.primary }}>{r.min}–{r.max} kcal</Text>
          <Text style={s.muted}>{t('scan.confidence')}: {t(`scan.${est.confidence}`)} · P {r.p} g · C {r.c} g · G {r.f} g</Text>
          <Text style={[s.muted, { fontSize: 13 }]}>{t('scan.disclaimer')}</Text>
        </Card>
        <Card>
          <Text style={s.h2}>{t('scan.questions')}</Text>
          {(['oil', 'sauce', 'fried'] as const).map(yn)}
          <T style={{ fontWeight: '700' }}>{t('scan.portion')}</T>
          <View style={[s.row, { flexWrap: 'wrap' }]}>{PORTIONS.map((p) => <Chip key={p} label={`${p}×`} active={q.portion === p} onPress={() => setQ({ ...q, portion: p })} />)}</View>
        </Card>
        <Btn label={`✓  ${t('scan.log')}`} onPress={log} />
      </>}
    </Screen>
  );
}
