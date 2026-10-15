import { useState } from 'react';
import { View, Text, TextInput, Image, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Screen, Card, Btn, Chip, T, s } from '../src/ui';
import { useStore, today, uid } from '../src/store';
import { lookupBarcode, light, Product } from '../src/off';
import { curLang, region, fmtNum } from '../src/i18n';
import { C } from '../src/theme';

const LIGHT = { green: C.success, amber: C.accent, red: C.primary, na: C.border };

export default function Barcode() {
  const { t } = useTranslation(); const { set } = useStore();
  const [code, setCode] = useState(''); const [prod, setProd] = useState<Product | null>(null);
  const [msg, setMsg] = useState(''); const [grams, setGrams] = useState(100); const [cam, setCam] = useState(false);
  const [perm, ask] = useCameraPermissions();
  const search = async (c = code) => {
    setProd(null);
    if (!/^\d{6,14}$/.test(c.trim())) { setMsg(t('bar.badCode')); return; }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { setMsg(t('aiErr.offline')); return; }
    setMsg(`⏳ ${t('bar.searching')}`);
    try { const p = await lookupBarcode(c.trim(), curLang(), region()); setProd(p); setMsg(p ? '' : t('bar.notFound')); } catch { setMsg(typeof navigator !== 'undefined' && navigator.onLine === false ? t('aiErr.offline') : t('bar.notFound')); }
  };
  const k = grams / 100;
  const log = () => { if (!prod) return; set((x) => ({ ...x, entries: [...x.entries, { id: uid(), date: today(), time: Date.now(), name: prod.name, kcal: Math.round(prod.kcal100 * k), p: Math.round(prod.p100 * k), c: Math.round(prod.c100 * k), f: Math.round(prod.f100 * k), source: 'barcode' }] })); router.replace('/diary'); };
  return (
    <Screen title={t('bar.title')}>
      <Text style={s.muted}>{t('bar.hint')}</Text>
      <TextInput accessibilityLabel={t('bar.title')} style={s.input} keyboardType="number-pad" value={code} onChangeText={setCode} placeholder="7501055363063" onSubmitEditing={() => search()} />
      <Btn label={`🔎  ${t('bar.search')}`} onPress={() => search()} />
      {Platform.OS !== 'web' && <Btn kind="secondary" label={`📷  ${t('bar.scanCam')}`} onPress={async () => { if (!perm?.granted) await ask(); setCam(true); }} />}
      {cam && Platform.OS !== 'web' && <CameraView style={{ height: 260, borderRadius: 24 }} barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={({ data }) => { setCam(false); setCode(data); search(data); }} />}
      {msg ? <T>{msg}</T> : null}
      {prod && <>
        <Card>
          <View style={s.row}>{prod.image ? <Image source={{ uri: prod.image }} style={{ width: 64, height: 64, borderRadius: 12 }} /> : null}<Text style={[s.h2, { flex: 1 }]}>{prod.name}</Text></View>
          <Text style={s.muted}>{fmtNum(prod.kcal100)} {t('u.kcal')} {t('bar.per100')} · {t('u.p')} {fmtNum(prod.p100, 1)} · {t('u.c')} {fmtNum(prod.c100, 1)} · {t('u.f')} {fmtNum(prod.f100, 1)}</Text>
          <Text style={[s.h2, { fontSize: 17 }]}>{t('bar.semaphore')}</Text>
          <View style={[s.row, { flexWrap: 'wrap' }]}>
            {([['sugar', prod.sugar100], ['salt', prod.salt100], ['satfat', prod.sat100]] as const).map(([n, v]) => (
              <View key={n} style={[s.row, { gap: 6 }]}><View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: LIGHT[light(n === 'satfat' ? 'sat' : n, v as any)] }} /><T>{t(`bar.${n}`)}</T></View>))}
          </View>
        </Card>
        <Card>
          <T style={{ fontWeight: '700' }}>{t('bar.grams')}: {fmtNum(grams)} {t('u.g')} → {fmtNum(prod.kcal100 * k)} {t('u.kcal')}</T>
          <View style={[s.row, { flexWrap: 'wrap' }]}>{[30, 50, 100, 150, 250].map((g) => <Chip key={g} label={`${fmtNum(g)} ${t('u.g')}`} active={grams === g} onPress={() => setGrams(g)} />)}</View>
        </Card>
        <Btn label={`✓  ${t('scan.log')}`} onPress={log} />
      </>}
    </Screen>
  );
}
