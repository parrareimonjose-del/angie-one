/** Calistenia: biblioteca, progresiones, programas, entreno del día y reproductor guiado con atleta ilustrado. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, AccessibilityInfo, AppState, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Speech from 'expo-speech';
import Svg, { Path, Circle, Ellipse, Line, Rect, G } from 'react-native-svg';
import { Screen, Card, Btn, Chip, T, Bar, s, CardTitle, InfoNote } from './ui';
import { C, R } from './theme';
import { fmtNum } from './i18n';
import { useStore, today } from './store';
import { coachOf } from './coach';
import { speak, Row, Disclaimer } from './coach-ui';
import { useExt } from './ext';
import { drawAthlete, look, lerpPose, VIEWBOX, GROUND, Sex, Shape } from './cali-geo';
import { POSES } from './cali-poses';
import { EX, EXS, TREES, PROGRAMS, wod, buildSteps, kcalStep, workSecsOf, txt, Item, Mode, Cat, CaliEx as ExT } from './cali-data';

export type CaliState = { sex: Sex; tone: number; fav: string[]; done: string[]; best: Record<string, number>; log: { date: string; kcal: number; min: number }[]; lvl: 1 | 2 | 3 };
const INIT: CaliState = { sex: 'f', tone: 0, fav: [], done: [], best: {}, log: [], lvl: 1 };
export const useCali = () => useExt<CaliState>('cali', INIT);

function useReduceMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setR).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setR);
    let mq: any; if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) { mq = window.matchMedia('(prefers-reduced-motion: reduce)'); setR(mq.matches); }
    return () => sub?.remove?.();
  }, []);
  return r;
}
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const Shapes = ({ sh }: { sh: Shape[] }) => <>{sh.map((x, i) => {
  const a: any = { ...x.a }; if (a['stroke-width'] != null) { a.strokeWidth = a['stroke-width']; delete a['stroke-width']; } if (a['stroke-opacity'] != null) { a.strokeOpacity = a['stroke-opacity']; delete a['stroke-opacity']; }
  return x.k === 'path' ? <Path key={i} {...a} /> : x.k === 'circle' ? <Circle key={i} {...a} /> : x.k === 'ellipse' ? <Ellipse key={i} {...a} /> : x.k === 'line' ? <Line key={i} {...a} /> : <Rect key={i} {...a} />;
})}</>;
/** Atleta animado (bucle entre fotogramas clave). Con «reducir movimiento» muestra inicio y final quietos. */
export function Athlete({ id, sex, tone = 0, size = 280, paused, still }: { id: string; sex: Sex; tone?: number; size?: number; paused?: boolean; still?: boolean }) {
  const an = POSES[id]; const reduce = useReduceMotion(); const [tm, setTm] = useState(0); const t0 = useRef(Date.now());
  const seg = an?.hold ? 1600 : 1100, n = an?.fr.length || 1, cyc = n === 2 ? 2 * seg : n * seg;
  useEffect(() => { if (reduce || paused || still || !an) return; const iv = setInterval(() => setTm(Date.now() - t0.current), 40); return () => clearInterval(iv); }, [reduce, paused, still, id]);
  if (!an) return null;
  const lk = look(sex, tone, C.primary);
  const frame = (k: number) => { const fr = an.fr; if (fr.length === 2) { const ph = (k % cyc) / seg; const x = ph < 1 ? ph : 2 - ph; return lerpPose(fr[0], fr[1], ease(Math.min(1, Math.max(0, (x - 0.12) / 0.76)))); }
    const ph = (k % cyc) / seg, i = Math.floor(ph), f = ph - i; return lerpPose(fr[i % n], fr[(i + 1) % n], ease(Math.min(1, Math.max(0, (f - 0.15) / 0.7)))); };
  const bg = <><Rect x={-10} y={-30} width={260} height={266} rx={18} fill={C.tint} /><Rect x={-10} y={GROUND} width={260} height={10} fill={C.border} /></>;
  if (reduce || still) {
    const a = an.fr[0], b = an.fr[an.fr.length === 2 ? 1 : Math.floor(n / 2)];
    return <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }} testID="athlete" accessibilityLabel="athlete-static">
      {[a, b].map((p, i) => <Svg key={i} width={size / 2} height={(size / 2) * 266 / 260} viewBox={VIEWBOX}>{bg}<Shapes sh={drawAthlete(p, lk, an.eq)} /></Svg>)}</View>;
  }
  return <Svg width={size} height={size * 266 / 260} viewBox={VIEWBOX} testID="athlete">{bg}<G><Shapes sh={drawAthlete(frame(tm), lk, an.eq)} /></G></Svg>;
}

function DemoPicker() {
  const { t } = useTranslation(); const [c, set] = useCali();
  return <View style={{ gap: 6 }}>
    <Row><Chip label={`🏋️‍♂️ ${t('cali.man')}`} active={c.sex === 'm'} onPress={() => set((x) => ({ ...x, sex: 'm' }))} /><Chip label={`🏋️‍♀️ ${t('cali.woman')}`} active={c.sex === 'f'} onPress={() => set((x) => ({ ...x, sex: 'f' }))} /></Row>
    <Row>{[0, 1, 2].map((i) => <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${t('cali.tone')} ${i + 1}`} onPress={() => set((x) => ({ ...x, tone: i }))} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: ['#F1C7A5', '#C68B5E', '#8A5A3B'][i], borderWidth: c.tone === i ? 3 : 1, borderColor: c.tone === i ? C.primary : C.border }} />)}</Row>
  </View>;
}
const LV = (t: any, l: number) => t(`cali.lv${l}`);
const muscles = (t: any, e: ExT) => e.m.map((m) => t(`cali.m.${m}`)).join(' · ');
function ExRow({ e, lang }: { e: ExT; lang: string }) {
  const { t } = useTranslation(); const [c] = useCali(); const done = c.done.includes(e.id), fav = c.fav.includes(e.id);
  return <Pressable onPress={() => router.push({ pathname: '/cali-ex', params: { id: e.id } })} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }} testID={`ex-${e.id}`}>
    <Athlete id={e.id} sex={c.sex} tone={c.tone} size={84} still={false} paused />
    <View style={{ flex: 1 }}><Text style={[s.t, { fontWeight: '800' }]}>{fav ? '★ ' : ''}{txt(e, lang).n}{done ? ' ✓' : ''}</Text>
      <Text style={s.muted}>{LV(t, e.lvl)} · {t(`cali.eq.${e.eq}`)}</Text><Text style={[s.muted, { fontSize: 13 }]}>{muscles(t, e)}</Text></View>
  </Pressable>;
}

/** Pantalla principal de Ejercicio (sustituye al muñeco antiguo). */
export function CaliHome() {
  const { t, i18n } = useTranslation(); const [c, set] = useCali(); const [tab, setTab] = useState<'lib' | 'tree' | 'prog' | 'wod'>('lib');
  const [cat, setCat] = useState<Cat | 'all' | 'fav'>('all'); const [lvl, setLvl] = useState<0 | 1 | 2 | 3>(0);
  const list = EXS.filter((e) => (cat === 'all' || (cat === 'fav' ? c.fav.includes(e.id) : e.cat === cat)) && (!lvl || e.lvl === lvl));
  const hero = useMemo(() => ['pushup', 'pullup', 'squat', 'dip', 'l_sit'][new Date().getDate() % 5], []);
  const lang = i18n.language; const w = wod(c.lvl, today()); const kcal7 = c.log.filter((x) => x.date >= new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10)).reduce((a, x) => a + x.kcal, 0);
  return <Screen title={`🤸 ${t('cali.title')}`}>
    <Card style={{ alignItems: 'center', gap: 8 }} testID="cali-hero">
      <Athlete id={hero} sex={c.sex} tone={c.tone} size={260} />
      <T style={{ textAlign: 'center', fontWeight: '800' }}>{t('cali.pick')}</T><DemoPicker />
      <Text style={s.muted}>✓ {c.done.length}/{EXS.length} {t('cali.mastered')} · 🔥 {fmtNum(Math.round(kcal7))} {t('u.kcal')} {t('cali.week')}</Text>
    </Card>
    <Row>{(['lib', 'tree', 'prog', 'wod'] as const).map((k) => <Chip key={k} label={t(`cali.tab.${k}`)} active={tab === k} onPress={() => setTab(k)} />)}</Row>
    {tab === 'lib' && <>
      <Row>{(['all', 'fav', 'push', 'pull', 'legs', 'core', 'skill'] as const).map((k) => <Chip key={k} label={t(`cali.cat.${k}`)} active={cat === k} onPress={() => setCat(k)} />)}</Row>
      <Row>{([0, 1, 2, 3] as const).map((k) => <Chip key={k} label={k ? LV(t, k) : t('cali.cat.all')} active={lvl === k} onPress={() => setLvl(k)} />)}</Row>
      <Card testID="cali-lib"><CardTitle>📚 {t('cali.library')} ({list.length})</CardTitle>{list.map((e) => <ExRow key={e.id} e={e} lang={lang} />)}{!list.length && <T>{t('cali.empty')}</T>}</Card>
    </>}
    {tab === 'tree' && <CaliTree />}
    {tab === 'prog' && <>{PROGRAMS.map((p) => <Card key={p.id}><CardTitle>{['🌱', '💪', '🔥'][p.lvl - 1]} {t(`cali.prog.${p.id}`)} · {LV(t, p.lvl)}</CardTitle><T>{t(`cali.progd.${p.id}`)}</T>
      {p.days.map((d, i) => <View key={i} style={{ gap: 4, marginTop: 6 }}><Text style={[s.t, { fontWeight: '800' }]}>{t('cali.day', { n: i + 1 })}: {d.map((x) => txt(EX[x.id], lang).n).join(', ')}</Text>
        <Btn small label={`▶️ ${t('cali.start')}`} onPress={() => router.push({ pathname: '/cali-play', params: { prog: p.id, day: String(i) } })} /></View>)}</Card>)}</>}
    {tab === 'wod' && <Card testID="cali-wod"><CardTitle>📅 {t('cali.wod')}</CardTitle>
      <Row>{([1, 2, 3] as const).map((l) => <Chip key={l} label={LV(t, l)} active={c.lvl === l} onPress={() => set((x) => ({ ...x, lvl: l }))} />)}</Row>
      {w.map((x) => <Text key={x.id} style={s.t}>• {txt(EX[x.id], lang).n} — {x.sets} × {x.reps ? t('coach.reps', { n: x.reps }) : t('coach.secs', { n: x.secs })}</Text>)}
      {(['sets', 'emom', 'tabata'] as Mode[]).map((m) => <Btn key={m} small kind={m === 'sets' ? 'primary' : 'ghost'} label={`▶️ ${t(`cali.mode.${m}`)}`} onPress={() => router.push({ pathname: '/cali-play', params: { wod: '1', mode: m } })} />)}
    </Card>}
    <InfoNote icon="🩺" text={t('cali.safety')} /><Disclaimer />
  </Screen>;
}

export function CaliTree() {
  const { t, i18n } = useTranslation(); const [c] = useCali();
  return <View style={{ gap: 12 }} testID="cali-tree">{Object.entries(TREES).map(([k, ids]) => {
    const firstOpen = ids.findIndex((i) => !c.done.includes(i));
    return <Card key={k}><CardTitle>🌳 {t(`cali.tree.${k}`)}</CardTitle>
      {ids.map((id, i) => { const done = c.done.includes(id), cur = i === firstOpen, locked = firstOpen >= 0 && i > firstOpen; const e = EX[id];
        return <View key={id}>
          {i > 0 && <View style={{ width: 4, height: 12, marginLeft: 40, backgroundColor: done || cur ? C.primary : C.border, borderRadius: 2 }} />}
          <Pressable onPress={() => router.push({ pathname: '/cali-ex', params: { id } })} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 6, borderRadius: R.chip, backgroundColor: cur ? C.tint : 'transparent', borderWidth: cur ? 2 : 0, borderColor: C.primary, opacity: locked ? 0.55 : 1 }}>
            <Athlete id={id} sex={c.sex} tone={c.tone} size={84} paused />
            <View style={{ flex: 1 }}><Text style={[s.t, { fontWeight: '800' }]}>{done ? '✅' : cur ? '🎯' : '🔒'} {txt(e, i18n.language).n}</Text><Text style={s.muted}>{LV(t, e.lvl)} · {cur ? t('cali.goal', { n: goalOf(e) }) : done ? t('cali.mastered') : t('cali.locked')}</Text></View>
          </Pressable></View>; })}
    </Card>; })}</View>;
}
const goalOf = (e: ExT) => (e.reps ? `3×${Math.max(8, e.reps)}` : `3×${Math.max(20, e.secs || 20)}s`);

export function CaliExScreen() {
  const { t, i18n } = useTranslation(); const { id } = useLocalSearchParams<{ id: string }>(); const [c, set] = useCali();
  const e = EX[id || 'pushup'] || EX.pushup; const x = txt(e, i18n.language);
  const tree = Object.entries(TREES).find(([, ids]) => ids.includes(e.id)); const pos = tree ? tree[1].indexOf(e.id) : -1;
  const easier = tree && pos > 0 ? tree[1][pos - 1] : null, harder = tree && pos >= 0 && pos < tree[1].length - 1 ? tree[1][pos + 1] : null;
  const fav = c.fav.includes(e.id), done = c.done.includes(e.id);
  return <Screen title={x.n}>
    <Card style={{ alignItems: 'center', gap: 8 }} testID="cali-detail"><Athlete id={e.id} sex={c.sex} tone={c.tone} size={300} /><DemoPicker /></Card>
    <Card><Text style={[s.t, { fontWeight: '800', color: C.secondary }]}>{LV(t, e.lvl)} · {t(`cali.eq.${e.eq}`)} · {e.sets} × {e.reps ? t('coach.reps', { n: e.reps }) : t('coach.secs', { n: e.secs })} · {t('coach.restS', { n: e.rest })}</Text>
      <Text style={s.muted}>💪 {muscles(t, e)}</Text></Card>
    <Card><CardTitle>✅ {t('cali.cues')}</CardTitle>{x.c.map((q, i) => <T key={i}>{i + 1}. {q}</T>)}</Card>
    <Card style={{ backgroundColor: C.warnBg }}><CardTitle>⚠️ {t('cali.mistakes')}</CardTitle>{x.x.map((q, i) => <T key={i}>• {q}</T>)}</Card>
    <Row>
      <Btn small kind="ghost" label={`${fav ? '★' : '☆'} ${t('cali.fav')}`} onPress={() => set((v) => ({ ...v, fav: fav ? v.fav.filter((k) => k !== e.id) : [...v.fav, e.id] }))} />
      <Btn small kind={done ? 'secondary' : 'ghost'} label={done ? `✅ ${t('cali.mastered')}` : `🎯 ${t('cali.iMaster')}`} onPress={() => set((v) => ({ ...v, done: done ? v.done.filter((k) => k !== e.id) : [...v.done, e.id] }))} />
      <Btn small kind="ghost" label={`🔊 ${t('home.readAloud')}`} onPress={() => speak(`${x.n}. ${x.c.join('. ')}`)} />
    </Row>
    {(easier || harder) && <Card><CardTitle>🌳 {t('cali.progression')}</CardTitle><Row>
      {easier && <Btn small kind="ghost" label={`⬇️ ${txt(EX[easier], i18n.language).n}`} onPress={() => router.replace({ pathname: '/cali-ex', params: { id: easier } })} />}
      {harder && <Btn small kind="ghost" label={`⬆️ ${txt(EX[harder], i18n.language).n}`} onPress={() => router.replace({ pathname: '/cali-ex', params: { id: harder } })} />}</Row></Card>}
    <Btn label={`▶️ ${t('cali.start')}`} onPress={() => router.push({ pathname: '/cali-play', params: { ex: e.id } })} />
    <InfoNote icon="🩺" text={t('cali.safety')} />
  </Screen>;
}

export function CaliPlay() {
  const { t, i18n } = useTranslation(); const p = useLocalSearchParams<{ prog?: string; day?: string; wod?: string; ex?: string; mode?: string }>();
  const [c, set] = useCali(); const { s: st, set: setSt } = useStore(); const kg = st.profile?.weight || 70; const lang = i18n.language;
  const mode = (['sets', 'emom', 'tabata'].includes(p.mode || '') ? p.mode : 'sets') as Mode;
  const items: Item[] = useMemo(() => {
    if (p.ex && EX[p.ex]) { const e = EX[p.ex]; return [{ id: e.id, sets: e.sets, reps: e.reps, secs: e.secs, rest: e.rest }]; }
    if (p.wod) return wod(c.lvl, today());
    const pr = PROGRAMS.find((x) => x.id === p.prog) || PROGRAMS[0]; return pr.days[Math.min(pr.days.length - 1, +(p.day || 0))];
  }, [p.ex, p.wod, p.prog, p.day]);
  const steps = useMemo(() => buildSteps(items, mode), [items, mode]);
  const [i, setI] = useState(0); const [left, setLeft] = useState(0); const [paused, setPaused] = useState(false); const [voice, setVoice] = useState(true);
  const [burn, setBurn] = useState(0); const [fin, setFin] = useState(false); const start = useRef(Date.now()); const saved = useRef(false); const endAt = useRef(0); const [tick, setTick] = useState(0);
  const [hidden, setHidden] = useState(false); const step = steps[i];
  useEffect(() => { const sub = AppState.addEventListener('change', (a) => setHidden(a !== 'active')); let off = () => {};
    if (Platform.OS === 'web' && typeof document !== 'undefined') { const f = () => setHidden(document.visibilityState === 'hidden'); document.addEventListener('visibilitychange', f); off = () => document.removeEventListener('visibilitychange', f); }
    return () => { sub.remove(); off(); Speech.stop(); }; }, []);
  useEffect(() => { endAt.current = 0; if (!step) return; setLeft(step.secs);
    if (voice) speak(step.kind === 'rest' ? t('coach.sayRest', { n: step.secs }) : `${txt(EX[step.id], lang).n}. ${step.reps ? t('coach.reps', { n: step.reps }) : t('coach.secs', { n: step.secs })}`); }, [i]);
  useEffect(() => { if (!step || paused || hidden || fin || !step.secs) { endAt.current = 0; return; } if (left <= 0) { next(); return; }
    if (!endAt.current) endAt.current = Date.now() + left * 1000;
    const tm = setTimeout(() => { setLeft(Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000 - 0.05))); setTick((x) => x + 1); }, 250); return () => clearTimeout(tm); }, [left, tick, paused, hidden, fin, i]);
  const next = () => { if (!step) return; const add = step.kind === 'work' ? kcalStep(EX[step.id].met, kg, workSecsOf(step)) : kcalStep(1.5, kg, step.secs);
    setBurn((b) => b + add); if (i + 1 >= steps.length) finish(burn + add); else setI(i + 1); };
  const finish = (total: number) => { setFin(true); Speech.stop(); if (saved.current || total < 1) return; saved.current = true;
    const min = Math.max(1, Math.round((Date.now() - start.current) / 60000)); const k = Math.round(total);
    set((x) => ({ ...x, log: [...x.log, { date: today(), kcal: k, min }].slice(-200) }));
    // Suma las kcal al día (mismo registro que el Coach) para el balance de Inicio.
    setSt((x: any) => { const co = coachOf(x); return { ...x, coach: { ...co, workouts: [...co.workouts, { date: today(), kcal: k, min, day: -1 }] } }; }); };
  if (fin || !step) return <Screen nav={false}><Card style={{ alignItems: 'center', backgroundColor: C.secondary, gap: 8 }}><Text style={{ fontSize: 56 }}>🎉</Text>
    <Text style={[s.h1, { color: C.white, textAlign: 'center' }]}>{t('coach.greatJob')}</Text><Text style={[s.h2, { color: C.white }]}>🔥 {fmtNum(Math.round(burn))} {t('u.kcal')}</Text></Card>
    <Btn label={`🤸 ${t('cali.title')}`} onPress={() => router.replace('/gym')} /></Screen>;
  const rest = step.kind === 'rest'; const nx = rest ? steps[i + 1] : null; const showId = rest && nx ? nx.id : step.id;
  return <Screen nav={false}>
    <Bar value={i} max={steps.length} color={C.primary} />
    <Text style={s.muted}>{t(`cali.mode.${mode}`)} · {t('coach.stepOf', { a: i + 1, b: steps.length })} · 🔥 {fmtNum(Math.round(burn))} {t('u.kcal')}</Text>
    <Card style={{ alignItems: 'center', gap: 8, backgroundColor: rest ? C.tint : C.card }} testID="cali-player">
      <Text style={[s.muted, { fontWeight: '800', fontSize: 18 }]}>{rest ? `😮‍💨 ${t('coach.rest')} · ${t('coach.upNext')}` : t('coach.setOf', { a: step.set, b: step.sets })}</Text>
      <Text style={[s.h1, { textAlign: 'center' }]} testID="step-name">{txt(EX[showId], lang).n}</Text>
      <Athlete id={showId} sex={c.sex} tone={c.tone} size={250} paused={paused || rest} />
      {step.secs ? <Text testID="timer" style={{ fontSize: 64, fontWeight: '900', color: rest ? C.secondary : C.primary }}>{left >= 60 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : `${left}s`}</Text> : null}
      {!rest && step.reps ? <Text style={{ fontSize: 44, fontWeight: '900', color: C.primary }}>{t('coach.reps', { n: step.reps })}</Text> : null}
      {!rest && <T style={{ textAlign: 'center' }}>✅ {txt(EX[step.id], lang).c[0]}</T>}
    </Card>
    <Btn label={rest ? `⏭️ ${t('coach.skipRest')}` : `✓ ${t('coach.doneSet')}`} onPress={next} />
    <View style={s.row}>{step.secs ? <Btn kind="secondary" style={{ flex: 1 }} label={paused ? `▶️ ${t('coach.resume')}` : `⏸️ ${t('coach.pause')}`} onPress={() => setPaused(!paused)} /> : null}
      <Btn kind="ghost" style={{ flex: 1 }} label={voice ? '🔊' : '🔇'} a11y={t('home.readAloud')} onPress={() => { if (voice) Speech.stop(); setVoice(!voice); }} /></View>
    <Btn kind="danger" small label={t('coach.endEarly')} onPress={() => finish(burn)} />
  </Screen>;
}
