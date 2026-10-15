/** Clon IA: fotos guiadas (solo en el teléfono) → avatar estilizado con tu altura y peso que cambia contigo. */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Rect, Ellipse, Path, Defs, ClipPath, Image as SvgImage, G } from 'react-native-svg';
import { Screen, Card, Btn, T, s, InfoNote, CardTitle, IconCard, IconTile } from './ui';
import { C } from './theme';
import { fmtNum, curLang } from './i18n';
import { useStore, today } from './store';
import { coachOf } from './coach';
import { useWeights } from './p2';
import { useExt } from './ext';
import { aiUrl } from './ai-config';
import { Body, bodyOf, CloneData, CLONE_KEY, cleanTraits, DEFAULT_TRAITS, goalKg, Shot, SHOTS, strengthOf, Traits } from './clone';

export function useClone(): [CloneData | null, (c: CloneData | null) => void, boolean] {
  const [c, setC] = useState<CloneData | null>(null); const [ready, setReady] = useState(false);
  useEffect(() => { AsyncStorage.getItem(CLONE_KEY).then((r) => { if (r) setC(JSON.parse(r)); setReady(true); }).catch(() => setReady(true)); }, []);
  const save = (v: CloneData | null) => { setC(v); if (v) AsyncStorage.setItem(CLONE_KEY, JSON.stringify(v)).catch(() => {}); else AsyncStorage.removeItem(CLONE_KEY); };
  return [c, save, ready];
}

/** Reduce la foto a 360 px (JPEG) para guardarla en el teléfono sin llenar la memoria. */
async function small(uri: string, b64?: string | null): Promise<string> {
  if (Platform.OS !== 'web') return `data:image/jpeg;base64,${b64}`;
  const img: HTMLImageElement = await new Promise((ok, bad) => { const i = new (window as any).Image(); i.onload = () => ok(i); i.onerror = bad; i.src = uri; });
  const k = Math.min(1, 360 / Math.max(img.width, img.height)); const cv = document.createElement('canvas');
  cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/jpeg', 0.75);
}
/** Tono de piel aproximado leyendo los píxeles de las mejillas (en el teléfono, sin internet). */
async function localSkin(dataUri?: string): Promise<string | null> {
  if (!dataUri || Platform.OS !== 'web') return null;
  try {
    const img: HTMLImageElement = await new Promise((ok, bad) => { const i = new (window as any).Image(); i.onload = () => ok(i); i.onerror = bad; i.src = dataUri; });
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const g = cv.getContext('2d')!; g.drawImage(img, 0, 0);
    const d = g.getImageData(Math.round(img.width * 0.38), Math.round(img.height * 0.55), Math.max(1, Math.round(img.width * 0.24)), Math.max(1, Math.round(img.height * 0.12))).data;
    let r = 0, gg = 0, b = 0, n = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
    const h = (v: number) => Math.round(v / n).toString(16).padStart(2, '0'); return `#${h(r)}${h(gg)}${h(b)}`;
  } catch { return null; }
}

export function Avatar({ body, tr, face, view = 'front', w = 110, id }: { body: Body; tr: Traits; face?: string; view?: 'front' | 'side' | 'back'; w?: number; id: string }) {
  const k = view === 'side' ? 0.55 : 1; const sw = body.chest * 0.62 * k, ww = body.waist * 0.6 * k, hw = body.hip * 0.62 * k, arm = body.arm * 0.9, leg = body.leg * 0.9 * (view === 'side' ? 1.2 : 1);
  const h = body.h; const tf = `translate(${60 * (1 - h)} ${236 * (1 - h)}) scale(${h})`;
  const hairPath = tr.hairLen === 'short' ? 'M42 34 Q44 14 60 14 Q76 14 78 34 Q72 22 60 22 Q48 22 42 34 Z' : tr.hairLen === 'medium' ? 'M41 44 Q38 12 60 12 Q82 12 79 44 Q76 24 60 22 Q44 24 41 44 Z' : 'M40 66 Q34 12 60 12 Q86 12 80 66 Q78 30 60 22 Q42 30 40 66 Z';
  return <Svg width={w} height={w * 2} viewBox="0 0 120 240">
    <Defs><ClipPath id={`f${id}`}><Circle cx={60} cy={38} r={17} /></ClipPath></Defs>
    <Ellipse cx={60} cy={234} rx={36} ry={5} fill="#0002" />
    <G transform={tf}>
      {view === 'side' ? <Rect x={60 - leg / 2} y={134} width={leg} height={96} rx={7} fill={C.secondary} />
        : <><Rect x={60 - 2 - leg} y={134} width={leg} height={96} rx={7} fill={C.secondary} /><Rect x={62} y={134} width={leg} height={96} rx={7} fill={C.secondary} /></>}
      {view !== 'side' && <><Rect x={60 - sw - arm + 2} y={64} width={arm} height={70} rx={arm / 2} fill={tr.skin} /><Rect x={60 + sw - 2} y={64} width={arm} height={70} rx={arm / 2} fill={tr.skin} /></>}
      {body.muscle > 0.4 && view !== 'side' && <><Ellipse cx={60 - sw - arm / 2 + 2} cy={82} rx={arm / 2 + 1.5} ry={8} fill={tr.skin} /><Ellipse cx={60 + sw + arm / 2 - 2} cy={82} rx={arm / 2 + 1.5} ry={8} fill={tr.skin} /></>}
      <Rect x={55} y={52} width={10} height={14} fill={tr.skin} />
      <Path d={`M${60 - sw} 62 Q${60 - sw - 2} 90 ${60 - ww} 108 Q${60 - hw} 124 ${60 - hw} 138 L${60 + hw} 138 Q${60 + hw} 124 ${60 + ww} 108 Q${60 + sw + 2} 90 ${60 + sw} 62 Z`} fill={C.primary} />
      {view === 'side' && <Rect x={60 - arm / 2} y={66} width={arm} height={66} rx={arm / 2} fill={tr.skin} />}
      {tr.hairLen === 'long' && <Path d={hairPath} fill={tr.hair} />}
      <Circle cx={60} cy={38} r={17} fill={tr.skin} />
      {face && view === 'front' ? <SvgImage href={{ uri: face }} x={43} y={21} width={34} height={34} preserveAspectRatio="xMidYMid slice" clipPath={`url(#f${id})`} />
        : view === 'front' ? <><Circle cx={54} cy={37} r={2} fill={C.text} /><Circle cx={66} cy={37} r={2} fill={C.text} /><Path d="M54 45 Q60 50 66 45" stroke={C.primary} strokeWidth={2} fill="none" /></> : null}
      {view === 'back' ? <Circle cx={60} cy={38} r={17} fill={tr.hair} /> : tr.hairLen !== 'long' ? <Path d={hairPath} fill={tr.hair} /> : null}
    </G></Svg>;
}

const Check = ({ on, label, onPress, testID }: { on: boolean; label: string; onPress: () => void; testID: string }) =>
  <Pressable testID={testID} role="checkbox" aria-checked={on} accessibilityState={{ checked: on }} onPress={onPress} style={[s.row, { minHeight: 64, gap: 12 }]}>
    <View style={{ width: 34, height: 34, borderRadius: 8, borderWidth: 3, borderColor: C.secondary, backgroundColor: on ? C.secondary : C.white, alignItems: 'center', justifyContent: 'center' }}>{on ? <Text style={{ color: C.white, fontWeight: '900', fontSize: 20 }}>✓</Text> : null}</View>
    <T style={{ flex: 1 }}>{label}</T></Pressable>;

function Guide({ shot }: { shot: Shot }) {
  const face = shot.startsWith('face'); const turn = shot === 'faceLeft' || shot === 'bodySide' ? -1 : shot === 'faceRight' ? 1 : 0;
  return <View testID={`guide-${shot}`} style={{ alignSelf: 'center', backgroundColor: '#1A1423', borderRadius: 20, padding: 10 }}>
    <Svg width={200} height={260} viewBox="0 0 200 260">
      {face ? <><Ellipse cx={100 + turn * 12} cy={120} rx={turn ? 58 : 66} ry={88} stroke={C.accent} strokeWidth={4} strokeDasharray="10 8" fill="none" />
        {turn ? <Path d={turn < 0 ? 'M60 120 l-24 0 m0 0 l10 -10 m-10 10 l10 10' : 'M140 120 l24 0 m0 0 l-10 -10 m10 10 l-10 10'} stroke={C.white} strokeWidth={4} /> : null}</>
        : <><Circle cx={100} cy={34} r={18} stroke={C.accent} strokeWidth={4} strokeDasharray="8 6" fill="none" />
          <Path d={shot === 'bodySide' ? 'M92 54 L108 54 L112 140 L106 250 L94 250 L88 140 Z' : 'M70 56 L130 56 L136 140 L124 250 L104 250 L100 160 L96 250 L76 250 L64 140 Z'} stroke={C.accent} strokeWidth={4} strokeDasharray="8 6" fill="none" /></>}
    </Svg></View>;
}

export function Clone() {
  const { t } = useTranslation(); const { s: st } = useStore(); const [c, save, ready] = useClone(); const [ws] = useWeights();
  const [consent, setConsent] = useState(false); const [adult, setAdult] = useState(false); const [i, setI] = useState(-1);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [view, setView] = useState<'front' | 'side' | 'back'>('front'); const [ask, setAsk] = useState(false);
  const p = st.profile; if (!ready) return <Screen title={`🧬 ${t('cl.title')}`}><T>…</T></Screen>;
  const take = async (camera: boolean) => {
    setMsg('');
    try {
      if (camera && Platform.OS !== 'web') { const pr = await ImagePicker.requestCameraPermissionsAsync(); if (!pr.granted) { setMsg(t('cl.noCam')); return; } }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.3, base64: true, cameraType: SHOTS[i].startsWith('face') ? ImagePicker.CameraType.front : ImagePicker.CameraType.back };
      const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled || !r.assets?.[0]) return; const a = r.assets[0];
      const uri = await small(a.uri, a.base64); const base = c || { consent: Date.now(), adult: true, photos: {} };
      save({ ...base, photos: { ...base.photos, [SHOTS[i]]: uri } }); setI(i + 1 < SHOTS.length ? i + 1 : -2);
    } catch { setMsg(t('cl.camErr')); }
  };
  const build = async () => {
    if (!c) return; setBusy(true); setMsg(''); let tr: Traits | null = null;
    const strip = (u?: string) => (u ? u.split(',')[1] : undefined);
    if (st.aiEnabled) try {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 30000);
      const r = await fetch(aiUrl('clone'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal, body: JSON.stringify({ face: strip(c.photos.faceFront), body: strip(c.photos.bodyFront), lang: curLang() }) });
      clearTimeout(tm); if (r.ok) tr = cleanTraits(await r.json(), 'ai'); else if (r.status === 422) { setBusy(false); setMsg(t('cl.noPerson')); return; }
    } catch { /* sin IA: seguimos con lo que se puede leer en el teléfono */ }
    if (!tr) { const sk = await localSkin(c.photos.faceFront); tr = { ...DEFAULT_TRAITS, ...(sk ? { skin: sk } : {}), source: 'local' }; setMsg(t('cl.localOnly')); }
    const kgNow = ws.length ? ws[ws.length - 1].kg : p?.weight || 70;
    save({ ...c, traits: tr, start: c.start || { kg: kgNow, date: today() }, createdAt: c.createdAt || Date.now() }); setBusy(false);
  };
  // 1) Permiso aparte (casillas sin marcar) y mayor de edad
  if (!c && i === -1) return <Screen title={`🧬 ${t('cl.title')}`}>
    <IconCard icon="🧬" title={t('cl.intro')} sub={t('cl.how')}>
      <View style={{ flexDirection: 'row', gap: 6 }}>{['🙂', '👤', '🙃', '🧍', '🚶', '🔙'].map((e, k) => <View key={k} style={{ flex: 1, alignItems: 'center', gap: 4 }}><IconTile icon={e} size={42} /><Text style={[s.muted, { fontSize: 12 }]}>{k + 1}</Text></View>)}</View>
    </IconCard>
    <Card><CardTitle>🔒 {t('cl.rule')}</CardTitle><T>{t('cl.ruleTxt')}</T><T>👕 {t('cl.clothes')}</T></Card>
    <Check testID="cl-consent" on={consent} label={t('cl.consent')} onPress={() => setConsent(!consent)} />
    <Check testID="cl-adult" on={adult} label={t('cl.adult')} onPress={() => setAdult(!adult)} />
    <Btn testID="cl-start" label={`📸  ${t('cl.start')}`} kind={consent && adult ? 'primary' : 'ghost'} onPress={() => { if (consent && adult) { setMsg(''); save({ consent: Date.now(), adult: true, photos: {} }); setI(0); } else setMsg(t('cl.needBoth')); }} />
    {msg ? <T style={{ color: C.primary, fontWeight: '700' }}>{msg}</T> : null}
    <InfoNote text={t('cl.notMed')} /></Screen>;
  // 2) Fotos guiadas
  if (i >= 0) { const sh = SHOTS[i]; const must = sh === 'faceFront' || sh === 'bodyFront';
    return <Screen title={`📸 ${i + 1}/6 · ${t(`cl.shot.${sh}`)}`}>
      <Guide shot={sh} /><Card><T style={{ fontWeight: '800' }}>{t(`cl.tip.${sh}`)}</T><T>👕 {t('cl.clothes')}</T></Card>
      <Btn testID="cl-cam" label={`📸  ${t('cl.take')}`} onPress={() => take(true)} />
      <Btn kind="secondary" label={`🖼️  ${t('cl.pick')}`} onPress={() => take(false)} />
      {!must && <Btn kind="ghost" testID="cl-skip" label={t('cl.skipShot')} onPress={() => setI(i + 1 < SHOTS.length ? i + 1 : -2)} />}
      {msg ? <T style={{ color: C.primary, fontWeight: '700' }}>{msg}</T> : null}
      <Text style={[s.muted, { fontSize: 14 }]}>🔒 {t('cl.onDevice')}</Text></Screen>; }
  if (!c) return null;
  // 3) Revisar fotos y crear el clon
  if (!c.traits) { const missing = !c.photos.faceFront || !c.photos.bodyFront;
    return <Screen title={`🧬 ${t('cl.title')}`}>
      <Card><CardTitle>{t('cl.review')}</CardTitle><View style={[s.row, { flexWrap: 'wrap', gap: 8 }]}>{SHOTS.map((sh, k) => <Pressable key={sh} onPress={() => setI(k)} accessibilityRole="button" accessibilityLabel={t(`cl.shot.${sh}`)} style={{ width: 92, alignItems: 'center' }}>
        {c.photos[sh] ? <Svg width={84} height={84}><SvgImage href={{ uri: c.photos[sh]! }} width={84} height={84} preserveAspectRatio="xMidYMid slice" /></Svg> : <View style={{ width: 84, height: 84, borderRadius: 12, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 28 }}>＋</Text></View>}
        <Text style={[s.muted, { fontSize: 13, textAlign: 'center' }]}>{t(`cl.shot.${sh}`)}</Text></Pressable>)}</View></Card>
      {missing ? <><T style={{ color: C.primary, fontWeight: '700' }}>{t('cl.needFront')}</T><Btn label={`📸  ${t('cl.take')}`} onPress={() => setI(c.photos.faceFront ? 3 : 0)} /></>
        : <Btn testID="cl-build" label={busy ? `⏳ ${t('cl.building')}` : `🧬  ${t('cl.build')}`} onPress={busy ? undefined : build} />}
      <Text style={[s.muted, { fontSize: 14 }]}>🔒 {t('cl.sendOnce')}</Text>
      <Btn kind="danger" testID="cl-del" label={`🗑️  ${t('cl.del')}`} onPress={() => { save(null); setI(-1); setConsent(false); setAdult(false); }} /></Screen>; }
  // 4) Antes / ahora / meta
  const kgNow = ws.length ? ws[ws.length - 1].kg : p?.weight || 70; const cm = p?.height || 165; const sex = p?.sex || 'female';
  const strNow = strengthOf(coachOf(st).workouts.length); const kg0 = c.start?.kg || kgNow; const kgG = goalKg(kgNow, cm, p?.goal || 'keep');
  const cols: [string, number, number][] = [['before', kg0, 0], ['now', kgNow, strNow], ['goal', kgG, Math.max(strNow, 0.6)]];
  const diff = Math.round((kgNow - kg0) * 10) / 10;
  return <Screen title={`🧬 ${t('cl.title')}`}>
    <View style={{ alignSelf: 'flex-start', backgroundColor: c.traits.source === 'ai' ? C.secondary : C.accent, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}><Text style={{ color: c.traits.source === 'ai' ? C.white : C.onAccent, fontWeight: '800' }}>{t(c.traits.source === 'ai' ? 'cl.byAi' : 'cl.byPhone')}</Text></View>
    <Card testID="clone" style={{ backgroundColor: C.tint }}><View style={[s.row, { justifyContent: 'space-around', alignItems: 'flex-end' }]}>
      {cols.map(([k, kg, str]) => <View key={k} style={{ alignItems: 'center' }}><Avatar id={k} body={bodyOf(kg, cm, sex, str, c.traits!)} tr={c.traits!} face={c.photos.faceFront} view={view} w={k === 'now' ? 104 : 86} />
        <Text style={{ fontWeight: '900', fontSize: 17, color: k === 'now' ? C.primary : C.text }}>{t(`cl.${k}`)}</Text><Text testID={`cl-kg-${k}`} style={s.muted}>{fmtNum(kg, 1)} kg</Text></View>)}</View>
      <T style={{ textAlign: 'center', fontWeight: '700' }}>{diff ? t(diff < 0 ? 'cl.down' : 'cl.up', { kg: fmtNum(Math.abs(diff), 1) }) : t('cl.same')} · 💪 {fmtNum(Math.round(strNow * 100))}%</T></Card>
    <View style={[s.row, { gap: 8 }]}>{(['front', 'side', 'back'] as const).map((v) => <Btn key={v} small kind={view === v ? 'secondary' : 'ghost'} style={{ flex: 1 }} label={t(`cl.v.${v}`)} onPress={() => setView(v)} />)}</View>
    <T>{t('cl.morph')}</T>
    <Btn label={`⚖️  ${t('cl.logW')}`} onPress={() => router.push('/weight')} />
    <Btn kind="secondary" label={`🏋️  ${t('cl.train')}`} onPress={() => router.push('/gym')} />
    <Btn kind="ghost" label={`📸  ${t('cl.redo')}`} onPress={() => save({ ...c, traits: undefined })} />
    {ask ? <Card><T style={{ fontWeight: '800' }}>{t('cl.delQ')}</T><View style={[s.row, { gap: 8 }]}>
      <Btn kind="danger" style={{ flex: 1 }} testID="cl-del-yes" label={t('cl.delYes')} onPress={() => { save(null); setAsk(false); setI(-1); setConsent(false); setAdult(false); }} />
      <Btn kind="ghost" style={{ flex: 1 }} label={t('cl.delNo')} onPress={() => setAsk(false)} /></View></Card>
      : <Btn kind="danger" testID="cl-del" label={`🗑️  ${t('cl.del')}`} onPress={() => setAsk(true)} />}
    <InfoNote icon="🔒" text={`${t('cl.onDevice')} ${t('cl.notMed')}`} /></Screen>;
}

/** Tarjeta en Inicio: invita a crear el clon (se puede ocultar). */
export function CloneNudge() {
  const { t } = useTranslation(); const [c, , ready] = useClone(); const [off, setOff] = useExt<boolean>('cloneNudgeOff', false);
  if (!ready || off || c?.traits) return null;
  return <Card testID="clone-nudge" style={{ backgroundColor: C.tint }}><T style={{ fontWeight: '800' }}>🧬 {t('cl.nudge')}</T>
    <View style={[s.row, { gap: 8 }]}><Btn small style={{ flex: 1 }} label={t('cl.nudgeGo')} onPress={() => router.push('/clon' as any)} /><Btn small kind="ghost" style={{ flex: 1 }} label={t('cl.notNow')} onPress={() => setOff(() => true)} /></View></Card>;
}
