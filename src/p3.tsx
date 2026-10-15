/** Fase 3 (web): red social, recetas, gimnasio, conexiones, ayuno, gemelo digital, resumen en video,
 *  modos de salud, familia, informe médico, compras, viaje, anuncios y B2B. Datos locales o de ejemplo. */
import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Image, Platform, Animated, Easing } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Rect, Ellipse, Path } from 'react-native-svg';
import { Screen, Card, Btn, Chip, T, Bar, s, StatRow, IconCard, EmptyState, Pill, Ring, InfoNote, CardTitle } from './ui';
import { C } from './theme';
import { useStore, today, uid, DAY, trialPhase } from './store';
import { fmtNum, fmtDate } from './i18n';
import { coachTarget, coachOf, burnedOn } from './coach';
import { speak, Row, Disclaimer } from './coach-ui';
import { FEATURES } from './flags';
import { useExt, Pending, Example, Note, Sponsored, Tile } from './ext';

export function Explore() {
  const { t } = useTranslation();
  const p3: [string, string, string, boolean?][] = [['🤳', 'social', '/social'], ['🍲', 'recipes', '/recipes'], ['🏋️', 'gym', '/gym'], ['⌚', 'connect', '/connect', true], ['⏱️', 'fasting', '/fasting'], ['🧍', 'twin', '/twin'],
    ['🎬', 'video', '/video'], ['🥗', 'health', '/health'], ['👨‍👩‍👧', 'family', '/family'], ['📄', 'report', '/report'], ['🛒', 'shop', '/shopping', true], ['✈️', 'travel', '/travel'], ['🧑‍🏫', 'b2b', '/b2b']];
  const p4: [string, string, string, boolean?][] = [['🧑‍⚕️', 'market', '/market', true], ['🏢', 'corp', '/corporate'], ['🐶', 'pet', '/pet'], ['💬', 'whatsapp', '/whatsapp', true]];
  if (FEATURES.purposeStore) p4.splice(2, 0, ['🛍️', 'store', '/store', true]);
  const grid = (a: typeof p3) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>{a.map(([i, k, h, p]) => <Tile key={k} icon={i} label={t(`x.t.${k}`)} pending={p} onPress={() => router.push(h as any)} />)}</View>;
  return <Screen title={`✨ ${t('x.explore')}`}>{grid(p3)}<CardTitle>{t('x.more4')}</CardTitle>{grid(p4)}<Note k="x.pendingLegend" /></Screen>;
}

// ---------- Red social (local hasta tener servidor) ----------
type Post = { id: string; kind: 'gym' | 'run' | 'meal'; text: string; img?: string; likes: number; mine?: boolean; who: string; at: number };
const SEED_POSTS: Post[] = [{ id: 'd1', kind: 'run', text: '5K ✅', likes: 12, who: 'Ana (ej.)', at: Date.now() - 3600e3 }, { id: 'd2', kind: 'meal', text: 'Pabellón 🇻🇪', likes: 8, who: 'Luis (ej.)', at: Date.now() - 7200e3 }];
export function Social() {
  const { t } = useTranslation(); const [posts, setPosts] = useExt<Post[]>('posts', SEED_POSTS);
  const [follow, setFollow] = useExt<string[]>('follow', []); const [groups, setGroups] = useExt<string[]>('groups', []);
  const [kind, setKind] = useState<Post['kind']>('meal'); const [txt, setTxt] = useState(''); const [img, setImg] = useState<string>();
  const pick = async () => { const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.4 }); if (!r.canceled) setImg(r.assets[0].uri); };
  const pub = () => { if (!txt.trim() && !img) return; setPosts((p) => [{ id: uid(), kind, text: txt.trim(), img, likes: 0, mine: true, who: t('x.me'), at: Date.now() }, ...p].slice(0, 50)); setTxt(''); setImg(undefined); };
  const tog = (a: string[], v: string) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]);
  return <Screen title={`🤳 ${t('x.t.social')}`}>
    <Pending what={t('x.needServer')} />
    <Card><Row>{(['meal', 'gym', 'run'] as const).map((k) => <Chip key={k} label={t(`x.k.${k}`)} active={kind === k} onPress={() => setKind(k)} />)}</Row>
      <TextInput accessibilityLabel={t('x.postPh')} placeholder={t('x.postPh')} style={s.input} value={txt} onChangeText={setTxt} maxLength={200} />
      {img ? <Image source={{ uri: img }} style={{ width: '100%', height: 180, borderRadius: 16 }} /> : null}
      <Row><Btn small kind="ghost" label={`🖼️ ${t('x.addPhoto')}`} onPress={pick} /><Btn small label={t('x.publish')} onPress={pub} /></Row>
      <Note k="x.localOnly" /></Card>
    {posts.map((p) => <Card key={p.id} testID="post"><Text style={s.muted}>{p.who} · {t(`x.k.${p.kind}`)}</Text>
      {p.img ? <Image source={{ uri: p.img }} style={{ width: '100%', height: 200, borderRadius: 16 }} /> : null}<T>{p.text}</T>
      <Row><Btn small kind="ghost" label={`💗 ${p.likes}`} a11y={t('x.like')} onPress={() => setPosts((a) => a.map((x) => (x.id === p.id ? { ...x, likes: x.likes + 1 } : x)))} />
        {!p.mine && <Btn small kind={follow.includes(p.who) ? 'secondary' : 'ghost'} label={follow.includes(p.who) ? t('x.following') : t('x.follow')} onPress={() => setFollow((f) => tog(f, p.who))} />}
        {p.mine && <Btn small kind="danger" label={t('diary.remove')} onPress={() => setPosts((a) => a.filter((x) => x.id !== p.id))} />}</Row></Card>)}
    <Card><CardTitle>👥 {t('x.groups')}</CardTitle>
      {['g1', 'g2', 'g3'].map((g) => <Row key={g}><T style={{ flex: 1 }}>{t(`x.${g}`)}</T><Btn small kind={groups.includes(g) ? 'secondary' : 'ghost'} label={groups.includes(g) ? t('x.joined') : t('x.join')} onPress={() => setGroups((a) => tog(a, g))} /></Row>)}</Card>
    <Card><CardTitle>🏆 {t('x.challenges')}</CardTitle><T>{t('x.ch1')}</T><Bar value={groups.length} max={3} color={C.primary} /></Card>
    <Note k="x.socialSafety" />
  </Screen>;
}

// ---------- Recetas latinas con votos ----------
const RECIPES = [{ id: 'r1', kcal: 420, min: 30 }, { id: 'r2', kcal: 380, min: 20 }, { id: 'r3', kcal: 510, min: 45 }, { id: 'r4', kcal: 290, min: 15 }];
export function Recipes() {
  const { t } = useTranslation(); const [votes, setVotes] = useExt<Record<string, number>>('votes', {}); const [open, setOpen] = useState('');
  const base: Record<string, number> = { r1: 24, r2: 17, r3: 31, r4: 9 };
  const list = [...RECIPES].sort((a, b) => base[b.id] + (votes[b.id] || 0) - base[a.id] - (votes[a.id] || 0));
  return <Screen title={`🍲 ${t('x.t.recipes')}`}><Example />
    {list.map((r) => <Card key={r.id}><CardTitle>{t(`x.rec.${r.id}.n`)}</CardTitle><Text style={s.muted}>{fmtNum(r.kcal)} {t('u.kcal')} · {r.min} min</Text>
      {open === r.id && <T>{t(`x.rec.${r.id}.s`)}</T>}
      <Row><Btn small kind={votes[r.id] ? 'secondary' : 'ghost'} label={`👍 ${base[r.id] + (votes[r.id] || 0)}`} a11y={t('x.vote')} onPress={() => setVotes((v) => ({ ...v, [r.id]: v[r.id] ? 0 : 1 }))} />
        <Btn small kind="ghost" label={open === r.id ? t('x.close') : t('x.see')} onPress={() => setOpen(open === r.id ? '' : r.id)} /></Row></Card>)}
    <Sponsored i={0} /></Screen>;
}

// ---------- Gimnasio con animaciones propias (SVG, sin licencias de terceros) ----------
const MOVES = ['squat', 'pushup', 'jack', 'plank'] as const;
function MoveAnim({ m }: { m: typeof MOVES[number] }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { const a = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: false }), Animated.timing(v, { toValue: 0, duration: 900, useNativeDriver: false })])); a.start(); return () => a.stop(); }, []);
  const ty = v.interpolate({ inputRange: [0, 1], outputRange: [0, m === 'squat' ? 28 : m === 'pushup' ? 14 : m === 'jack' ? -16 : 2] });
  const sc = v.interpolate({ inputRange: [0, 1], outputRange: [1, m === 'jack' ? 1.25 : 1] });
  return <View accessibilityLabel="animation" style={{ height: 150, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft, borderRadius: 20 }}>
    <Animated.View style={{ transform: [{ translateY: ty }, { scaleX: sc }, { rotate: m === 'pushup' || m === 'plank' ? '90deg' : '0deg' }] }}>
      <Svg width={80} height={120}><Circle cx={40} cy={16} r={13} fill={C.primary} /><Rect x={30} y={32} width={20} height={44} rx={8} fill={C.secondary} />
        <Rect x={8} y={36} width={22} height={9} rx={4} fill={C.secondary} /><Rect x={50} y={36} width={22} height={9} rx={4} fill={C.secondary} />
        <Rect x={30} y={76} width={9} height={40} rx={4} fill={C.text} /><Rect x={41} y={76} width={9} height={40} rx={4} fill={C.text} /></Svg></Animated.View></View>;
}
export function Gym() {
  const { t } = useTranslation(); const [m, setM] = useState<typeof MOVES[number]>('squat');
  return <Screen title={`🏋️ ${t('x.t.gym')}`}><Row>{MOVES.map((k) => <Chip key={k} label={t(`x.mv.${k}`)} active={m === k} onPress={() => setM(k)} />)}</Row>
    <MoveAnim key={m} m={m} /><Card><CardTitle>{t(`x.mv.${m}`)}</CardTitle><T>{t(`x.mvd.${m}`)}</T>
      <Btn small kind="ghost" label={`🔊 ${t('home.readAloud')}`} onPress={() => speak(`${t(`x.mv.${m}`)}. ${t(`x.mvd.${m}`)}`)} /></Card>
    <Note k="x.animNote" /><Btn label={`💪 ${t('coach.workout')}`} onPress={() => router.push('/workout')} /><Disclaimer /></Screen>;
}

// ---------- Conexiones (Garmin, Fitbit, Samsung, Spotify, Apple Health/Health Connect) ----------
export const INTEGRATIONS = ['garmin', 'fitbit', 'samsung', 'spotify', 'health'] as const;
export function Connect() {
  const { t } = useTranslation(); const [steps, setSteps] = useExt<Record<string, number>>('steps', {});
  return <Screen title={`⌚ ${t('x.t.connect')}`}>
    <Card style={{ alignItems: 'center' }}><Ring value={steps[today()] || 0} max={8000} size={170} stroke={16}><Text style={{ fontSize: 26 }}>👣</Text><Text style={{ fontSize: 30, fontWeight: '900', color: C.text }}>{fmtNum(steps[today()] || 0)}</Text><Text style={s.muted}>/ {fmtNum(8000)}</Text></Ring></Card>
    <IconCard icon="👣" title={t('x.manualSteps')}><Row>{[2000, 5000, 8000].map((n) => <Chip key={n} label={fmtNum(n)} active={steps[today()] === n} onPress={() => setSteps((x) => ({ ...x, [today()]: n }))} />)}</Row></IconCard>
    {INTEGRATIONS.map((k, i) => <IconCard key={k} icon={['⌚', '🍎', '🤖', '💪', '🏃', '❤️', '📈'][i % 7]} title={t(`x.int.${k}`)} sub={t('x.intWhy')}>
      <Pending /><Btn small kind="ghost" label={t('x.connect')} onPress={() => alertPending(t)} /></IconCard>)}
  </Screen>;
}
export const alertPending = (t: (k: string) => string) => { if (Platform.OS === 'web') window.alert(t('x.pendingBody')); };

// ---------- Ayuno ----------
export function Fasting() {
  const { t } = useTranslation(); const [f, setF] = useExt<{ start?: number; hours: number; log: number[] }>('fast', { hours: 14, log: [] });
  const [now, setNow] = useState(Date.now()); useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const { s: st } = useStore(); const p = st.profile; const risky = !!p && p.age < 18;
  const el = f.start ? (now - f.start) / 3600e3 : 0;
  return <Screen title={`⏱️ ${t('x.t.fasting')}`}>
    {risky ? <Card style={{ backgroundColor: C.warnBg }}><T style={{ fontWeight: '800' }}>💛 {t('x.fastBlocked')}</T></Card> : <>
      <Row>{[12, 14, 16].map((h) => <Chip key={h} label={`${h}:${24 - h}`} active={f.hours === h} onPress={() => setF((x) => ({ ...x, hours: h }))} />)}</Row>
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}><Ring value={Math.min(el, f.hours)} max={f.hours} size={230} stroke={20}>
        <Text style={{ fontSize: 15 }}>{f.start ? '🔥' : '⏱️'}</Text>
        <Text testID="fast-timer" style={{ fontSize: 44, fontWeight: '900', color: C.text }}>{Math.floor(el)}h {String(Math.floor((el % 1) * 60)).padStart(2, '0')}m</Text>
        <Text style={s.muted}>{Math.round((Math.min(el, f.hours) / f.hours) * 100)}%</Text></Ring>
        <Text style={[s.muted, { marginTop: 6 }]}>{t('x.fastGoal', { h: f.hours })}</Text></Card>
      <StatRow items={[{ icon: '🎯', value: `${f.hours}h`, label: `${f.hours}:${24 - f.hours}` }, { icon: '📅', value: f.log.length, label: t('x.fastLog') }]} />
      {f.start ? <Btn label={t('x.fastEnd')} onPress={() => setF((x) => ({ ...x, start: undefined, log: [...x.log, Math.round(el * 10) / 10].slice(-14) }))} />
        : <Btn label={t('x.fastStart')} onPress={() => setF((x) => ({ ...x, start: Date.now() }))} />}
      {f.log.length > 0 && <IconCard icon="📊" title={t('x.fastLog')}><View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 90 }}>{f.log.map((h, i) => <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}><View style={{ width: '100%', height: Math.max(6, (h / 24) * 80), borderRadius: 6, backgroundColor: h >= f.hours ? C.secondary : C.primary }} /><Text style={[s.muted, { fontSize: 11 }]}>{fmtNum(h, 0)}</Text></View>)}</View></IconCard>}</>}
    <Note k="x.fastNote" /><Disclaimer /></Screen>;
}

// ---------- Gemelo digital (vista previa animada; 3D completo = Premium Plus) ----------
export function Twin() {
  const { t } = useTranslation(); const { s: st } = useStore(); const [act, setAct] = useState<'talk' | 'eat' | 'cook' | 'train'>('talk');
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { const a = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 600, useNativeDriver: false }), Animated.timing(v, { toValue: 0, duration: 600, useNativeDriver: false })])); a.start(); return () => a.stop(); }, [act]);
  const ty = v.interpolate({ inputRange: [0, 1], outputRange: [0, act === 'train' ? -18 : -4] });
  const p = st.profile; const w = p ? Math.min(1.35, Math.max(0.8, p.weight / p.height / 0.42)) : 1;
  const props = { eat: '🍽️', cook: '🍳', train: '🏋️', talk: '💬' };
  const go = (k: typeof act) => { setAct(k); speak(t(`x.tw.${k}`, { kcal: coachTarget(st).kcal })); };
  return <Screen title={`🧍 ${t('x.t.twin')}`}>
    <View style={{ alignSelf: 'flex-start', backgroundColor: C.secondary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}><Text style={{ color: C.white, fontWeight: '800' }}>Premium Plus · {t('x.preview')}</Text></View>
    <Card style={{ alignItems: 'center', backgroundColor: C.tint }}>
      <Animated.View testID="twin" style={{ transform: [{ translateY: ty }] }}><Svg width={140} height={200}>
        <Ellipse cx={70} cy={192} rx={44} ry={7} fill="#0002" /><Circle cx={70} cy={36} r={26} fill="#F2C7A5" />
        <Circle cx={61} cy={33} r={3} fill={C.text} /><Circle cx={79} cy={33} r={3} fill={C.text} /><Path d={act === 'talk' || act === 'eat' ? 'M60 46 Q70 56 80 46' : 'M62 47 L78 47'} stroke={C.primary} strokeWidth={3} fill="none" />
        <Rect x={70 - 24 * w} y={64} width={48 * w} height={70} rx={20} fill={C.primary} /><Rect x={70 - 22} y={132} width={18} height={56} rx={8} fill={C.secondary} /><Rect x={74} y={132} width={18} height={56} rx={8} fill={C.secondary} /></Svg></Animated.View>
      <Text style={{ fontSize: 40 }}>{props[act]}</Text><T style={{ textAlign: 'center' }}>{t(`x.tw.${act}`, { kcal: fmtNum(coachTarget(st).kcal) })}</T></Card>
    <Row>{(['talk', 'eat', 'cook', 'train'] as const).map((k) => <Chip key={k} label={t(`x.twa.${k}`)} active={act === k} onPress={() => go(k)} />)}</Row>
    <Btn label={`🧬  ${t('cl.fromTwin')}`} onPress={() => router.push('/clon' as any)} />
    <Note k="x.twinNote" /><Disclaimer /></Screen>;
}

// ---------- Resumen semanal en "video" (diapositivas con voz, sin servidor) ----------
export function Video() {
  const { t } = useTranslation(); const { s: st } = useStore(); const [i, setI] = useState(-1);
  const days = [...Array(7)].map((_, k) => today(new Date(Date.now() - k * DAY)));
  const kc = days.map((d) => st.entries.filter((e) => e.date === d).reduce((a, e) => a + e.kcal, 0)); const logged = kc.filter((x) => x > 0).length;
  const burn = days.reduce((a, d) => a + burnedOn(coachOf(st), d), 0); const water = days.reduce((a, d) => a + (st.water[d] || 0), 0);
  const slides = [t('x.v1', { n: logged }), t('x.v2', { kcal: fmtNum(Math.round(kc.reduce((a, b) => a + b, 0) / Math.max(1, logged))) }), t('x.v3', { kcal: fmtNum(burn) }), t('x.v4', { n: water }), t('x.v5')];
  useEffect(() => { if (i < 0 || i >= slides.length) return; speak(slides[i]); const tm = setTimeout(() => setI(i + 1), 3500); return () => clearTimeout(tm); }, [i]);
  return <Screen title={`🎬 ${t('x.t.video')}`}>
    <Card style={{ minHeight: 260, alignItems: 'center', justifyContent: 'center', backgroundColor: C.secondary }}>
      <Text testID="slide" style={[s.h1, { color: C.white, textAlign: 'center' }]}>{i < 0 ? '🎬' : i >= slides.length ? '🎉' : slides[i]}</Text>
      {i >= 0 && <Bar value={Math.min(i + 1, slides.length)} max={slides.length} color={C.accent} />}</Card>
    <Btn label={`▶️ ${t('x.play')}`} onPress={() => setI(0)} /><Note k="x.videoNote" /></Screen>;
}

// ---------- Modos de salud ----------
export const MODES = ['lesssugar', 'lesssalt', 'glutenfree', 'morefiber', 'cycle'] as const;
/** Migra modos antiguos (médicos) a preferencias neutras de comida. */
const LEGACY: Record<string, string | null> = { diabetes: 'lesssugar', hypertension: 'lesssalt', cholesterol: 'morefiber', pregnancy: null };
export const cleanModes = (a: string[]) => [...new Set(a.map((m) => (m in LEGACY ? LEGACY[m] : m)).filter((m): m is string => !!m && (MODES as readonly string[]).includes(m)))];
export function Health() {
  const { t } = useTranslation(); const [rawModes, setModes] = useExt<string[]>('modes', []); const modes = cleanModes(rawModes); const [cyc, setCyc] = useExt<{ last?: string; len: number }>('cycle', { len: 28 });
  const tog = (m: string) => setModes((a0) => { const a = cleanModes(a0); return a.includes(m) ? a.filter((x) => x !== m) : [...a, m]; });
  const nextP = cyc.last ? new Date(new Date(cyc.last + 'T12:00:00').getTime() + cyc.len * DAY) : null;
  return <Screen title={`🥗 ${t('x.t.health')}`}>
    <Card style={{ backgroundColor: C.warnBg }}><T style={{ fontWeight: '800' }}>⚠️ {t('x.healthWarn')}</T></Card>
    {MODES.map((m) => <Card key={m}><Row><Text style={[s.h2, { flex: 1 }]}>{t(`x.m.${m}`)}</Text><Btn small kind={modes.includes(m) ? 'secondary' : 'ghost'} label={modes.includes(m) ? '✓ ' + t('x.on') : t('x.off')} onPress={() => tog(m)} /></Row>
      {modes.includes(m) && <T testID={`mode-${m}`}>{t(`x.md.${m}`)}</T>}
      {m === 'cycle' && modes.includes(m) && <><Btn small kind="ghost" label={t('x.periodToday')} onPress={() => setCyc((c) => ({ ...c, last: today() }))} />
        {nextP && <T>{t('x.nextPeriod', { d: fmtDate(nextP) })}</T>}</>}</Card>)}
    <Disclaimer /></Screen>;
}
/** Límites seguros por modo, usados por el coach y el ayuno. */
export function modeLimits(modes: string[]) {
  const m = cleanModes(modes); return { minKcalBoost: 0, sodiumMg: m.includes('lesssalt') ? 1500 : 2300, noFasting: false };
}

// ---------- Familia ----------
export function Family() {
  const { t } = useTranslation(); const [fam, setFam] = useExt<{ id: string; name: string; kid: boolean }[]>('family', []); const [n, setN] = useState(''); const [kid, setKid] = useState(false);
  return <Screen title={`👨‍👩‍👧 ${t('x.t.family')}`}>
    <StatRow items={[{ icon: '👨‍👩‍👧', value: fam.length, label: t('x.t.family') }, { icon: '🧑', value: fam.filter((m) => !m.kid).length, label: t('x.adult'), color: C.secondary }, { icon: '🧒', value: fam.filter((m) => m.kid).length, label: t('x.child'), color: C.primary }]} />
    <IconCard icon="➕" title={t('add')} sub={t('x.famName')}><TextInput accessibilityLabel={t('x.famName')} placeholder={t('x.famName')} style={s.input} value={n} onChangeText={setN} maxLength={30} />
      <Row><Chip label={t('x.adult')} active={!kid} onPress={() => setKid(false)} /><Chip label={t('x.child')} active={kid} onPress={() => setKid(true)} /></Row>
      <Btn label={t('add')} onPress={() => { if (n.trim()) { setFam((f) => [...f, { id: uid(), name: n.trim(), kid }]); setN(''); } }} /></IconCard>
    {fam.length === 0 ? <Card><EmptyState icon="👨‍👩‍👧" title={t('x.t.family')} sub={t('x.famName')} /></Card> : null}
    {fam.map((m) => <IconCard key={m.id} icon={m.kid ? '🧒' : '🧑'} title={m.name} right={<Btn small kind="danger" label={t('diary.remove')} onPress={() => setFam((f) => f.filter((x) => x.id !== m.id))} />}>
      <Pill label={m.kid ? t('x.child') : t('x.adult')} color={m.kid ? C.primary : C.secondary} />
      {m.kid && <Text style={s.muted}>{t('x.kidRule')}</Text>}</IconCard>)}
    <Note k="x.famNote" /></Screen>;
}

// ---------- Resumen personal de bienestar (PDF con el diálogo de imprimir del navegador) ----------
export function Report() {
  const { t } = useTranslation(); const { s: st } = useStore(); const c = coachOf(st); const [rawModes] = useExt<string[]>('modes', []); const modes = cleanModes(rawModes);
  const days = [...Array(14)].map((_, k) => today(new Date(Date.now() - k * DAY)));
  const rows = days.map((d) => ({ d, k: st.entries.filter((e) => e.date === d).reduce((a, e) => a + e.kcal, 0), w: st.water[d] || 0, b: burnedOn(c, d) })).filter((r) => r.k || r.w || r.b);
  const pdf = () => { if (Platform.OS === 'web') window.print(); };
  return <Screen title={`📄 ${t('x.t.report')}`}>
    <Card testID="report"><CardTitle>Angie One · {t('x.repTitle')}</CardTitle><Text style={s.muted}>{fmtDate(new Date())}</Text>
      {st.profile && <T>{t('ob.age')}: {st.profile.age} · {t('ob.weight')}: {fmtNum(st.profile.weight, 1)} · {t('ob.height')}: {st.profile.height}</T>}
      {modes.length > 0 && <T>{t('x.repModes')}: {modes.map((m) => t(`x.m.${m}`)).join(', ')}</T>}
      <T>{t('coach.target', { kcal: fmtNum(coachTarget(st).kcal) })}</T>
      {c.checkins.length > 0 && <T>{t('ci.history')}: {c.checkins.slice(-6).map((x) => `${x.date} ${fmtNum(x.weight, 1)} kg`).join(' · ')}</T>}
      {rows.length === 0 ? <Text style={s.muted}>{t('diary.empty')}</Text> : rows.map((r) => <T key={r.d}>{r.d} · {fmtNum(r.k)} {t('u.kcal')} · 💧{r.w} · 🔥{fmtNum(r.b)}</T>)}
      <Text style={[s.muted, { fontSize: 15 }]}>{t('x.repFoot')}</Text></Card>
    <Btn label={`🖨️ ${t('x.savePdf')}`} onPress={pdf} /><Note k="x.repNote" /></Screen>;
}

// ---------- Lista de compras con comparación de precios (ejemplo) ----------
const STORES = ['A', 'B', 'C'];
export function Shopping() {
  const { t } = useTranslation(); const { s: st } = useStore(); const c = coachOf(st);
  const items: string[] = c.plan ? (c.plan.diet.shoppingKeys?.length ? c.plan.diet.shoppingKeys.map((x) => t(`cing.${x}`)) : c.plan.diet.shopping) : [t('x.si1'), t('x.si2'), t('x.si3')];
  const price = (it: string, k: number) => { let h = 0; for (const ch of it) h = (h * 31 + ch.charCodeAt(0)) % 997; return 1 + ((h * (k + 3)) % 700) / 100; };
  const tot = STORES.map((_, k) => items.reduce((a, it) => a + price(it, k), 0)); const best = tot.indexOf(Math.min(...tot));
  return <Screen title={`🛒 ${t('x.t.shop')}`}><Example /><Pending what={t('x.needStores')} />
    <Card>{items.slice(0, 20).map((it) => <T key={it}>• {it}</T>)}</Card>
    {STORES.map((n, k) => <Card key={n} style={k === best ? { borderWidth: 3, borderColor: C.success } : undefined}><Row><T style={{ flex: 1, fontWeight: '800' }}>{t('x.storeN', { n })}</T><Text testID={k === best ? 'best' : undefined} style={[s.h2, { color: k === best ? C.success : C.text }]}>${fmtNum(tot[k], 2)}{k === best ? ' ✓' : ''}</Text></Row></Card>)}
    <Btn label={`🚚 ${t('x.delivery')}`} onPress={() => alertPending(t)} /><Note k="x.priceNote" /></Screen>;
}

// ---------- Modo viaje ----------
export function Travel() {
  const { t } = useTranslation(); const [on, setOn] = useExt<boolean>('travel', false);
  return <Screen title={`✈️ ${t('x.t.travel')}`}><Btn kind={on ? 'secondary' : 'ghost'} label={on ? '✓ ' + t('x.travelOn') : t('x.travelOff')} onPress={() => setOn((v) => !v)} />
    {on && <Card testID="travel-tips">{['tr1', 'tr2', 'tr3', 'tr4'].map((k) => <T key={k}>✈️ {t(`x.${k}`)}</T>)}</Card>}
    <Btn kind="ghost" label={`🏋️ ${t('x.hotelWorkout')}`} onPress={() => router.push('/gym')} /></Screen>;
}

// ---------- B2B para coaches (vista de ejemplo) ----------
export function B2B() {
  const { t } = useTranslation();
  const cl = [['María', 5, 0.8], ['José', 3, 0.5], ['Lucía', 6, 0.95]] as const;
  return <Screen title={`🧑‍🏫 ${t('x.t.b2b')}`}><Example /><Pending what={t('x.needServer')} />
    <Card><CardTitle>{t('x.clients')}</CardTitle>{cl.map(([n, d, a]) => <View key={n} style={{ gap: 4 }}><T>{n} · {t('x.daysLogged', { n: d })}</T><Bar value={a} max={1} color={C.success} /></View>)}</Card>
    <Card><T>{t('x.b2bPrice')}</T></Card><Note k="x.b2bPrivacy" /></Screen>;
}
