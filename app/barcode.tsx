import { useState } from 'react';
import { View, Text, TextInput, Image, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Screen, Card, Btn, Chip, T, s } from '../src/ui';
import { useStore, today, uid } from '../src/store';
import { lookupBarcode, light, Product } from '../src/off';
import { barcodeCloud, ATTRIBUTION } from '../src/fooddb';
import { curLang, region, fmtNum } from '../src/i18n';
import { C } from '../src/theme';
import * as ImagePicker from 'expo-image-picker';
import WebScanner from '../src/webscan';
import { estimateLabel, Estimate } from '../src/ai';
import { EstimateResult, aiErrorText } from '../src/estimate';
import { shrinkForUpload } from '../src/img';

const LIGHT = { green: C.success, amber: C.accent, red: C.primary, na: C.border };

export default function Barcode() {
  const { t } = useTranslation(); const { set } = useStore();
  const [code, setCode] = useState(''); const [prod, setProd] = useState<Product | null>(null);
  const [msg, setMsg] = useState(''); const [grams, setGrams] = useState(100); const [cam, setCam] = useState(false);
  const [perm, ask] = useCameraPermissions(); const [wcam, setWcam] = useState(false); const [nf, setNf] = useState(false);
  const [lest, setLest] = useState<Estimate | null>(null); const [lbusy, setLbusy] = useState(false); const [mName, setMName] = useState(''); const [mKcal, setMKcal] = useState('');
  const addE = (e: { name: string; kcal: number; p?: number; c?: number; f?: number; fiber?: number }) => { set((x) => ({ ...x, entries: [...x.entries, { id: uid(), date: today(), time: Date.now(), name: e.name, kcal: e.kcal, p: e.p || 0, c: e.c || 0, f: e.f || 0, fiber: e.fiber, source: 'barcode' }] })); router.replace('/diary'); };
  const labelPhoto = async () => {
    const opt = { base64: true, quality: 0.7, mediaTypes: ['images'] as any };
    const r = Platform.OS !== 'web' ? await ImagePicker.launchCameraAsync(opt) : await ImagePicker.launchImageLibraryAsync(opt);
    if (r.canceled || !r.assets?.[0]?.base64) return; const a = r.assets[0];
    setLbusy(true); setLest(null); setMsg('');
    try { const x = await shrinkForUpload(a.uri, a.base64!, a.mimeType || 'image/jpeg'); setLest(await estimateLabel(x.b64, x.mime, curLang())); }
    catch (e) { setMsg(aiErrorText(t, e)); } finally { setLbusy(false); }
  };
  const search = async (c = code) => {
    setProd(null); setNf(false); setLest(null);
    if (!/^\d{6,14}$/.test(c.trim())) { setMsg(t('bar.badCode')); return; }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { setMsg(t('aiErr.offline')); return; }
    setMsg(`⏳ ${t('bar.searching')}`);
    try { let p: Product | null; try { p = await barcodeCloud(c.trim(), curLang()); } catch { p = await lookupBarcode(c.trim(), curLang(), region()); } setProd(p); setMsg(p ? '' : t('bar.notFound2')); setNf(!p); } catch { const off = typeof navigator !== 'undefined' && navigator.onLine === false; setMsg(off ? t('aiErr.offline') : t('bar.notFound2')); setNf(!off); }
  };
  const k = grams / 100;
  const log = () => { if (!prod) return; set((x) => ({ ...x, entries: [...x.entries, { id: uid(), date: today(), time: Date.now(), name: prod.name, kcal: Math.round(prod.kcal100 * k), p: Math.round(prod.p100 * k), c: Math.round(prod.c100 * k), f: Math.round(prod.f100 * k), fiber: prod.fiber100 == null ? undefined : Math.round(prod.fiber100 * k * 10) / 10, source: 'barcode' }] })); router.replace('/diary'); };
  return (
    <Screen title={t('bar.title')}>
      <Text style={s.muted}>{t('bar.hint')}</Text>
      <TextInput accessibilityLabel={t('bar.title')} style={s.input} keyboardType="number-pad" value={code} onChangeText={setCode} placeholder="7501055363063" onSubmitEditing={() => search()} />
      <Btn label={wcam ? `✕  ${t('bar.closeCam')}` : `📷  ${t('bar.scanCam')}`} onPress={() => { if (Platform.OS === 'web') { setMsg(''); setWcam(!wcam); } else (async () => { if (!perm?.granted) await ask(); setCam(true); })(); }} />
      {wcam && Platform.OS === 'web' && <><WebScanner onCode={(c) => { setWcam(false); setCode(c); search(c); }} onError={(e) => { setWcam(false); setMsg(t(e === 'denied' ? 'bar.camDenied' : 'bar.noCam')); }} /><T>{t('bar.aim')}</T></>}
      <Btn kind="secondary" label={`🔎  ${t('bar.search')}`} onPress={() => search()} />
      {cam && Platform.OS !== 'web' && <CameraView style={{ height: 260, borderRadius: 24 }} barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={({ data }) => { setCam(false); setCode(data); search(data); }} />}
      {msg ? <T testID="bar-msg">{msg}</T> : null}
      {nf && !prod && <Card testID="bar-nf">
        <Btn label={lbusy ? `⏳ ${t('scan.analyzing')}` : `🏷️  ${t('bar.labelPhoto')}`} onPress={labelPhoto} />
        {lest && <EstimateResult key={lest.name + lest.kcalMin} est={lest} onLog={(x) => addE(x)} />}
        <Text style={s.h2}>✍️ {t('manual.exact')}</Text>
        <TextInput accessibilityLabel={t('manual.name')} style={s.input} placeholder={t('manual.name')} value={mName} onChangeText={setMName} />
        <TextInput accessibilityLabel={t('manual.kcal')} style={s.input} placeholder={t('manual.kcal')} keyboardType="numeric" value={mKcal} onChangeText={(v) => setMKcal(v.replace(/[^0-9]/g, ''))} />
        <Btn kind="secondary" label={t('add')} onPress={() => { if (mName.trim() && +mKcal > 0 && +mKcal < 5000) addE({ name: mName.trim(), kcal: +mKcal }); }} />
      </Card>}
      {prod && <>
        <Card>
          <View style={s.row}>{prod.image ? <Image source={{ uri: prod.image }} style={{ width: 64, height: 64, borderRadius: 12 }} /> : null}<Text style={[s.h2, { flex: 1 }]}>{prod.name}</Text></View>
          <Text style={s.muted}>{fmtNum(prod.kcal100)} {t('u.kcal')} {t('bar.per100')} · {t('u.p')} {fmtNum(prod.p100, 1)} · {t('u.c')} {fmtNum(prod.c100, 1)} · {t('u.f')} {fmtNum(prod.f100, 1)}{prod.fiber100 != null ? ` · ${t('mf.fiber')} ${fmtNum(prod.fiber100, 1)}` : ''}</Text>
          {prod.verified ? <Text testID="bar-verified" style={{ color: C.success, fontWeight: '800' }}>{t('hb.verified')}</Text> : null}
          <Text testID="bar-attrib" style={[s.muted, { fontSize: 13 }]}>{t('fdb.source')}: {ATTRIBUTION}</Text>
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
