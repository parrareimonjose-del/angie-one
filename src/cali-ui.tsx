/** Calistenia: biblioteca, progresiones, programas, entreno del día y reproductor guiado con atleta ilustrado. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Image, ScrollView, AccessibilityInfo, AppState, Platform } from 'react-native';
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
import { M, H, P, MU, img, photos, WK, WKS, CATS, OP_DAYS, opRest, opPhase, opItems, PLAN_DAYS, planRest, planZone, planItems, mins, musclesOf, RANKS, rankOf, MilShell, Tag, MCard, GoldBtn, PhotoCard, ProgressBar, DemoPhoto, MuscleMap, exName } from './cali-mil';
import { EX, EXS, TREES, PROGRAMS, wod, buildSteps, kcalStep, workSecsOf, txt, Item, Mode, Cat, CaliEx as ExT } from './cali-data';

export type CaliState = { sex: Sex; tone: number; fav: string[]; done: string[]; best: Record<string, number>; log: { date: string; kcal: number; min: number }[]; lvl: 1 | 2 | 3; op?: { done: number[] }; plan?: { m?: number[]; f?: number[] } };
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
    {(() => { const ph = photos(e.id, c.sex); return ph ? <Image source={ph[0]} style={{ width: 84, height: 64, borderRadius: 8 }} accessibilityIgnoresInvertColors /> : <View style={{ width: 84, height: 64, borderRadius: 8, backgroundColor: C.tint }} />; })()}
    <View style={{ flex: 1 }}><Text style={[s.t, { fontWeight: '800' }]}>{fav ? '★ ' : ''}{txt(e, lang).n}{done ? ' ✓' : ''}</Text>
      <Text style={s.muted}>{LV(t, e.lvl)} · {t(`cali.eq.${e.eq}`)}</Text><Text style={[s.muted, { fontSize: 13 }]}>{muscles(t, e)}</Text></View>
  </Pressable>;
}


/** Resuelve qué entreno se pide por parámetros (catálogo, campaña, plan 30 días, ejercicio, programa o entreno del día). */
type WP = { w?: string; op?: string; plan?: string; day?: string; ex?: string; prog?: string; wod?: string; mode?: string };
export function resolveWork(p: WP, c: CaliState, t: any, lang: string) {
  const sex = c.sex; let mode: Mode = (['sets', 'emom', 'tabata'].includes(p.mode || '') ? p.mode : 'sets') as Mode;
  if (p.w && WK[p.w]) { const w = WK[p.w]; if (!p.mode && w.mode) mode = w.mode; return { title: t(`mil.wk.${w.id}`), cover: img(w.cover), items: w.items, lvl: w.lvl, mode, need: w.need, kind: 'w' as const }; }
  if (p.op) { const d = Math.min(OP_DAYS, Math.max(1, +p.op)); return { title: `${t('mil.opName')} · ${t('mil.dayN', { n: String(d).padStart(2, '0') })}`, cover: img(sex === 'f' ? 'hero-w' : 'hero-op'), items: opItems(d), lvl: (opPhase(d) >= 2 ? 2 : 1) as 1 | 2 | 3, mode, need: ['mat', 'chair', 'table'], kind: 'op' as const, d }; }
  if (p.plan) { const sx: 'm' | 'f' = p.plan === 'm' ? 'm' : 'f'; const d = Math.min(PLAN_DAYS, Math.max(1, +(p.day || 1))); const z = planZone(sx, d);
    return { title: `${t('mil.dayN', { n: d })} · ${t(`mil.zone.${z}`)}`, cover: img(sx === 'f' ? (z === 'abs' ? 'cover-w-core' : z === 'glutes' ? 'cover-w-legs' : 'cover-w-hiit') : z === 'legs' ? 'cover-legs' : z === 'abs' ? 'cover-core' : 'cover-push'), items: planItems(sx, d), lvl: 1 as const, mode, need: ['mat'], kind: 'plan' as const, d, sx: sx as 'm' | 'f' }; }
  if (p.ex && EX[p.ex]) { const e = EX[p.ex]; return { title: txt(e, lang).n, cover: null, items: [{ id: e.id, sets: e.sets, reps: e.reps, secs: e.secs, rest: e.rest }], lvl: e.lvl, mode, need: [] as string[], kind: 'ex' as const }; }
  if (p.wod) return { title: t('cali.wod'), cover: img('cover-hiit'), items: wod(c.lvl, today()), lvl: c.lvl, mode, need: ['none'], kind: 'wod' as const };
  const pr = PROGRAMS.find((x) => x.id === p.prog) || PROGRAMS[0]; const di = Math.min(pr.days.length - 1, +(p.day || 0));
  return { title: `${t(`cali.prog.${pr.id}`)} · ${t('cali.day', { n: di + 1 })}`, cover: img('cover-push'), items: pr.days[di], lvl: pr.lvl, mode, need: ['mat'], kind: 'prog' as const };
}
const goalOf = (e: ExT) => (e.reps ? `3×${Math.max(8, e.reps)}` : `3×${Math.max(20, e.secs || 20)}s`);
const lvTag = (t: any, l: number) => t(`mil.lv${l}`);
const opDone = (c: CaliState) => c.op?.done || [];
const planDone = (c: CaliState, sx: 'm' | 'f') => c.plan?.[sx] || [];

type Tab = 'hoy' | 'train' | 'plan' | 'prog' | 'perfil' | 'all';
/** Pantalla principal de Ejercicio: calistenia militar. */
export function CaliHome() {
  const { t, i18n } = useTranslation(); const [c] = useCali(); const lang = i18n.language;
  const qp = useLocalSearchParams<{ tab?: string }>(); const [tab, setTab] = useState<Tab>((['hoy', 'train', 'plan', 'prog', 'perfil', 'all'].includes(qp.tab || '') ? qp.tab : 'hoy') as Tab);
  return <MilShell testID="cali-home">
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
      {(['hoy', 'train', 'plan', 'prog', 'perfil'] as const).map((k) => <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} testID={`mtab-${k}`} onPress={() => setTab(k)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: tab === k ? M.gold : M.card, borderWidth: 1, borderColor: tab === k ? M.gold : M.line }}>
        <Text style={H(13, tab === k ? '#FFFFFF' : M.txt)}>{t(`mil.tab.${k}`)}</Text></Pressable>)}
    </View>
    {tab === 'hoy' && <Today />}
    {tab === 'train' && <Train onAll={() => setTab('all')} />}
    {tab === 'plan' && <Plan30 />}
    {tab === 'prog' && <Progress />}
    {tab === 'perfil' && <Profile />}
    {tab === 'all' && <Library lang={lang} />}
    <Text style={[MU, { textAlign: 'center' }]}>🩺 {t('cali.safety')}</Text>
    <Text style={[MU, { textAlign: 'center', fontSize: 11 }]}>{t('mil.aiPhotos')}</Text>
  </MilShell>;
}

function Today() {
  const { t } = useTranslation(); const [c] = useCali(); const done = opDone(c);
  const next = Array.from({ length: OP_DAYS }, (_, i) => i + 1).find((d) => !done.includes(d)) || OP_DAYS;
  const missions = done.length + c.log.length - done.length; const minsTot = c.log.reduce((a, x) => a + x.min, 0); const rk = rankOf(done.length);
  const ph = opPhase(next);
  return <View style={{ gap: 14 }} testID="cali-today">
    <PhotoCard src={img(c.sex === 'f' ? 'hero-w' : 'hero-op')} h={300} onPress={() => router.push({ pathname: '/cali-work', params: { op: String(next) } })} testID="op-hero">
      <Text style={H(12, M.gold)}>{t('mil.campaign')} · {t('mil.days28')}</Text>
      <Text style={H(32)}>{t('mil.opName')}</Text>
      <Text style={H(18, M.gold2)}>{t('mil.slogan')}</Text>
    </PhotoCard>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[[t('mil.rank'), t(`mil.rk${rk}`)], [t('mil.missions'), String(missions)], [t('mil.minutes'), String(minsTot)], [t('mil.progress'), `${Math.round((done.length / OP_DAYS) * 100)}%`]].map(([a, b]) => <MCard key={a} style={{ flex: 1, paddingHorizontal: 4, paddingVertical: 10, gap: 2, alignItems: 'center' }}><Text style={H(b.length > 6 ? 13 : 17, M.gold)} numberOfLines={1} adjustsFontSizeToFit>{b}</Text><Text style={[MU, { fontSize: 11 }]}>{a}</Text></MCard>)}
    </View>
    <ProgressBar v={done.length} max={OP_DAYS} />
    <MCard><Text style={H(13, M.gold)}>{t('mil.briefing')} · {t(`mil.ph${ph}`)}</Text><Text style={P}>{t(`mil.brief${ph}`)}</Text></MCard>
    {opRest(next) ? <MCard><Text style={H(22)}>{t('mil.dayN', { n: String(next).padStart(2, '0') })} · {t('mil.rest')}</Text><Text style={P}>{t('mil.restBody')}</Text></MCard> :
      <PhotoCard src={img(['cover-push', 'cover-legs', 'cover-core'][(next - 1) % 3])} h={190} onPress={() => router.push({ pathname: '/cali-work', params: { op: String(next) } })} testID="op-next">
        <View style={{ flexDirection: 'row', gap: 6 }}><Tag label={lvTag(t, opPhase(next) >= 2 ? 2 : 1)} gold /><Tag label={`${mins(opItems(next))} MIN`} /><Tag label={t('mil.noEquip')} /></View>
        <Text style={H(26)}>{t('mil.dayN', { n: String(next).padStart(2, '0') })}</Text><Text style={H(14, M.gold2)}>{t(`mil.ph${ph}`)}</Text>
      </PhotoCard>}
    <Text style={H(18)}>{t('mil.allDays')}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} testID="op-grid">
      {Array.from({ length: OP_DAYS }, (_, i) => i + 1).map((d) => { const ok = done.includes(d), rest = opRest(d), cur = d === next;
        return <Pressable key={d} accessibilityRole="button" accessibilityLabel={t('mil.dayN', { n: d })} onPress={() => !rest && router.push({ pathname: '/cali-work', params: { op: String(d) } })} style={{ width: 54, height: 54, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: ok ? M.olive2 : cur ? M.gold : M.card, borderWidth: 1, borderColor: cur ? M.gold : M.line }}>
          <Text style={H(15, cur ? '#FFFFFF' : M.txt)}>{ok ? '✓' : String(d).padStart(2, '0')}</Text>{rest && <Text style={{ fontSize: 10, color: cur ? '#FFFFFF' : M.mut }}>{t('mil.restShort')}</Text>}</Pressable>; })}
    </View>
  </View>;
}

function Train({ onAll }: { onAll: () => void }) {
  const { t } = useTranslation(); const [c] = useCali();
  return <View style={{ gap: 14 }} testID="cali-train">
    <Text style={H(30)}>{t('mil.trainTitle')}</Text><Text style={P}>{t('mil.trainSub')}</Text>
    {CATS.map((k) => { const ws = WKS.filter((w) => w.cat === k.id).sort((a, b) => (a.sex === c.sex ? -1 : 0) - (b.sex === c.sex ? -1 : 0));
      return <View key={k.id} style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={H(18)}>{t(`mil.cat.${k.id}`)}</Text>
          <Pressable accessibilityRole="button" onPress={onAll}><Text style={H(13, M.gold)}>{t('mil.seeAll')} ›</Text></Pressable></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {ws.map((w) => <View key={w.id} style={{ width: 250 }}><PhotoCard src={img(w.cover)} h={160} onPress={() => router.push({ pathname: '/cali-work', params: { w: w.id } })} testID={`wk-${w.id}`}>
            <View style={{ flexDirection: 'row', gap: 6 }}><Tag label={lvTag(t, w.lvl)} gold /><Tag label={`${mins(w.items, w.mode)} MIN`} /></View>
            <Text style={H(17)} numberOfLines={2}>{t(`mil.wk.${w.id}`)}</Text></PhotoCard></View>)}
        </ScrollView></View>; })}
    <GoldBtn ghost label={`${t('mil.seeAll')} · ${EXS.length} ${t('mil.exercises')}`} onPress={onAll} />
  </View>;
}

function Library({ lang }: { lang: string }) {
  const { t } = useTranslation(); const [c] = useCali(); const [cat, setCat] = useState<Cat | 'all' | 'fav'>('all'); const [view, setView] = useState<'list' | 'tree'>('list');
  const list = EXS.filter((e) => cat === 'all' || (cat === 'fav' ? c.fav.includes(e.id) : e.cat === cat));
  return <View style={{ gap: 10 }} testID="cali-lib">
    <Text style={H(26)}>{t('mil.library')}</Text>
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
      {(['list', 'tree'] as const).map((k) => <Pressable key={k} onPress={() => setView(k)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: view === k ? M.olive2 : M.card }}><Text style={H(12)}>{k === 'list' ? t('cali.tab.lib') : t('cali.tab.tree')}</Text></Pressable>)}
    </View>
    {view === 'list' ? <>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>{(['all', 'fav', 'push', 'pull', 'legs', 'core', 'skill'] as const).map((k) => <Pressable key={k} onPress={() => setCat(k)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: cat === k ? M.gold : M.card }}><Text style={H(12, cat === k ? '#FFFFFF' : M.txt)}>{t(`cali.cat.${k}`)}</Text></Pressable>)}</View>
      {list.map((e) => { const ph = photos(e.id, c.sex);
        return <Pressable key={e.id} testID={`ex-${e.id}`} onPress={() => router.push({ pathname: '/cali-ex', params: { id: e.id } })} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: M.card, borderRadius: 12, padding: 8, borderWidth: 1, borderColor: M.line }}>
          {ph ? <Image source={ph[0]} style={{ width: 84, height: 64, borderRadius: 8 }} /> : <View style={{ width: 84, height: 64, borderRadius: 8, backgroundColor: M.card2, overflow: 'hidden', alignItems: 'center' }}><Athlete id={e.id} sex={c.sex} tone={c.tone} size={64} paused /></View>}
          <View style={{ flex: 1 }}><Text style={H(15)}>{c.fav.includes(e.id) ? '★ ' : ''}{txt(e, lang).n}{c.done.includes(e.id) ? ' ✓' : ''}</Text><Text style={MU}>{lvTag(t, e.lvl)} · {t(`cali.eq.${e.eq}`)}</Text></View></Pressable>; })}
      {!list.length && <Text style={P}>{t('cali.empty')}</Text>}
    </> : <View style={{ gap: 12 }} testID="cali-tree">{Object.entries(TREES).map(([k, ids]) => { const first = ids.findIndex((i) => !c.done.includes(i));
      return <MCard key={k}><Text style={H(16, M.gold)}>{t(`cali.tree.${k}`)}</Text>{ids.map((id, i) => { const ok = c.done.includes(id), cur = i === first;
        return <Pressable key={id} onPress={() => router.push({ pathname: '/cali-ex', params: { id } })} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', opacity: first >= 0 && i > first ? 0.5 : 1 }}><Text style={H(14, cur ? M.gold : M.txt)}>{ok ? '✓' : cur ? '▶' : '🔒'} {txt(EX[id], lang).n}</Text>{cur && <Text style={MU}>· {t('cali.goal', { n: goalOf(EX[id]) })}</Text>}</Pressable>; })}</MCard>; })}</View>}
  </View>;
}

function Plan30() {
  const { t } = useTranslation(); const [c] = useCali(); const [sx, setSx] = useState<'m' | 'f'>(c.sex); const done = planDone(c, sx);
  const next = Array.from({ length: PLAN_DAYS }, (_, i) => i + 1).find((d) => !done.includes(d) && !planRest(d)) || PLAN_DAYS;
  return <View style={{ gap: 14 }} testID="cali-plan">
    <View style={{ flexDirection: 'row', gap: 8 }}>{(['f', 'm'] as const).map((k) => <Pressable key={k} testID={`plan-${k}`} onPress={() => setSx(k)} style={{ flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', backgroundColor: sx === k ? M.gold : M.card, borderWidth: 1, borderColor: M.line }}><Text style={H(14, sx === k ? '#FFFFFF' : M.txt)}>{t(k === 'f' ? 'mil.women' : 'mil.men')}</Text></Pressable>)}</View>
    <PhotoCard src={img(sx === 'f' ? 'hero-w' : 'cover-push')} h={300} onPress={() => router.push({ pathname: '/cali-work', params: { plan: sx, day: String(next) } })}>
      <Text style={H(12, M.gold)}>{t('mil.homePlan')}</Text><Text style={H(28)}>{t(sx === 'f' ? 'mil.planW' : 'mil.planM')}</Text>
      <Text style={P}>{t('mil.dayOf', { a: Math.min(done.length + 1, PLAN_DAYS), b: PLAN_DAYS })} · {Math.round((done.length / PLAN_DAYS) * 100)}%</Text></PhotoCard>
    {[0, 1, 2, 3, 4].map((wk) => <MCard key={wk}><Text style={H(15, M.gold)}>{t('mil.week', { n: wk + 1 })}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{Array.from({ length: wk === 4 ? 2 : 7 }, (_, i) => wk * 7 + i + 1).map((d) => { const ok = done.includes(d), rest = planRest(d), cur = d === next;
        return <Pressable key={d} accessibilityRole="button" accessibilityLabel={t('mil.dayN', { n: d })} onPress={() => !rest && router.push({ pathname: '/cali-work', params: { plan: sx, day: String(d) } })} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: ok ? M.olive2 : cur ? M.gold : M.card2, borderWidth: 1, borderColor: cur ? M.gold : M.line }}>
          <Text style={H(13, cur ? '#FFFFFF' : M.txt)}>{ok ? '✓' : rest ? '☾' : d}</Text></Pressable>; })}</View></MCard>)}
    <Text style={H(18)}>{t('mil.zones')}</Text>
    <View style={{ flexDirection: 'row', gap: 8 }}>{(sx === 'f' ? ['glutes', 'abs', 'arms'] : ['chest', 'abs', 'legs']).map((z) => { const d = Array.from({ length: PLAN_DAYS }, (_, i) => i + 1).find((x) => !planRest(x) && planZone(sx, x) === z && !done.includes(x)) || 1;
      return <View key={z} style={{ flex: 1 }}><PhotoCard h={130} src={img(sx === 'f' ? (z === 'abs' ? 'cover-w-core' : z === 'glutes' ? 'cover-w-legs' : 'cover-w-hiit') : z === 'legs' ? 'cover-legs' : z === 'abs' ? 'cover-core' : 'cover-push')} onPress={() => router.push({ pathname: '/cali-work', params: { plan: sx, day: String(d) } })}><Text style={H(14)}>{t(`mil.zone.${z}`)}</Text></PhotoCard></View>; })}</View>
  </View>;
}

function Progress() {
  const { t } = useTranslation(); const [c] = useCali(); const kcal = c.log.reduce((a, x) => a + x.kcal, 0), mn = c.log.reduce((a, x) => a + x.min, 0);
  const days = new Set(c.log.map((x) => x.date)); let streak = 0; for (let i = 0; i < 365; i++) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); if (days.has(d)) streak++; else if (i > 0) break; }
  const week = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 864e5).toISOString().slice(0, 10)); const max = Math.max(1, ...week.map((d) => c.log.filter((x) => x.date === d).reduce((a, x) => a + x.min, 0)));
  return <View style={{ gap: 14 }} testID="cali-progress">
    <Text style={H(28)}>{t('mil.tab.prog')}</Text>
    <View style={{ flexDirection: 'row', gap: 8 }}>{[[t('mil.missions'), c.log.length], [t('mil.minutes'), mn], ['kcal', Math.round(kcal)], [t('mil.streak'), streak]].map(([a, b]) => <MCard key={String(a)} style={{ flex: 1, alignItems: 'center', padding: 10 }}><Text style={H(20, M.gold)}>{fmtNum(Number(b))}</Text><Text style={[MU, { fontSize: 11 }]}>{a}</Text></MCard>)}</View>
    <MCard><Text style={H(14, M.gold)}>{t('mil.last7')}</Text><View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 90 }}>{week.map((d) => { const v = c.log.filter((x) => x.date === d).reduce((a, x) => a + x.min, 0); return <View key={d} style={{ flex: 1, alignItems: 'center', gap: 4 }}><View style={{ width: '100%', height: Math.max(4, (v / max) * 70), backgroundColor: v ? M.gold : M.line, borderRadius: 4 }} /><Text style={[MU, { fontSize: 10 }]}>{d.slice(8)}</Text></View>; })}</View></MCard>
    <MCard><Text style={H(14, M.gold)}>{t('mil.campaign')} · {t('mil.opName')}</Text><ProgressBar v={opDone(c).length} max={OP_DAYS} /><Text style={MU}>{opDone(c).length}/{OP_DAYS} · {t('mil.rank')}: {t(`mil.rk${rankOf(opDone(c).length)}`)}</Text></MCard>
    <MCard><Text style={H(14, M.gold)}>{t('mil.skills')}</Text><ProgressBar v={c.done.length} max={EXS.length} /><Text style={MU}>{c.done.length}/{EXS.length} {t('cali.mastered')}</Text></MCard>
  </View>;
}

function Profile() {
  const { t } = useTranslation(); const [c, set] = useCali(); const rk = rankOf(opDone(c).length);
  return <View style={{ gap: 14 }} testID="cali-profile">
    <MCard style={{ alignItems: 'center' }}><Text style={{ fontSize: 44 }}>{['🎖️', '🪖', '⭐', '⭐⭐', '🏅', '🦅'][rk]}</Text><Text style={H(24, M.gold)}>{t(`mil.rk${rk}`)}</Text>
      <Text style={MU}>{rk < RANKS.length - 1 ? t('mil.nextRank', { n: RANKS[rk + 1] - opDone(c).length, r: t(`mil.rk${rk + 1}`) }) : t('mil.maxRank')}</Text></MCard>
    <MCard><Text style={H(14, M.gold)}>{t('mil.demoModel')}</Text><View style={{ flexDirection: 'row', gap: 8 }}>{(['m', 'f'] as const).map((k) => <Pressable key={k} onPress={() => set((x) => ({ ...x, sex: k }))} style={{ flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', backgroundColor: c.sex === k ? M.gold : M.card2 }}><Text style={H(13, c.sex === k ? '#FFFFFF' : M.txt)}>{t(k === 'm' ? 'cali.man' : 'cali.woman')}</Text></Pressable>)}</View></MCard>
    <MCard><Text style={H(14, M.gold)}>{t('mil.level')}</Text><View style={{ flexDirection: 'row', gap: 8 }}>{([1, 2, 3] as const).map((l) => <Pressable key={l} onPress={() => set((x) => ({ ...x, lvl: l }))} style={{ flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', backgroundColor: c.lvl === l ? M.gold : M.card2 }}><Text style={H(12, c.lvl === l ? '#FFFFFF' : M.txt)}>{lvTag(t, l)}</Text></Pressable>)}</View></MCard>
    <MCard><Text style={H(14, M.gold)}>{t('cali.wod')}</Text>{(['sets', 'emom', 'tabata'] as Mode[]).map((m) => <GoldBtn key={m} ghost={m !== 'sets'} label={t(`cali.mode.${m}`)} onPress={() => router.push({ pathname: '/cali-play', params: { wod: '1', mode: m } })} />)}</MCard>
    <MCard><Text style={H(14, M.gold)}>{t('cali.tab.prog')}</Text>{PROGRAMS.map((p) => p.days.map((_, i) => <Pressable key={p.id + i} onPress={() => router.push({ pathname: '/cali-work', params: { prog: p.id, day: String(i) } })}><Text style={P}>▶ {t(`cali.prog.${p.id}`)} · {t('cali.day', { n: i + 1 })}</Text></Pressable>))}</MCard>
  </View>;
}

/** Ficha del entreno: portada, cómo entrenar, mapa muscular, material y botón de empezar. */
export function CaliWork() {
  const { t, i18n } = useTranslation(); const p = useLocalSearchParams<WP>(); const [c] = useCali(); const lang = i18n.language;
  const r = resolveWork(p, c, t, lang); const mn = mins(r.items, r.mode); const done = r.kind === 'op' ? opDone(c).includes(r.d!) : r.kind === 'plan' ? planDone(c, r.sx!).includes(r.d!) : false;
  return <MilShell testID="cali-work">
    <PhotoCard src={r.cover || img('cover-push')} h={280}>
      <View style={{ flexDirection: 'row', gap: 6 }}><Tag label={lvTag(t, r.lvl)} gold /><Tag label={`${mn} MIN`} />{r.need.includes('none') || r.need.length <= 1 ? <Tag label={t('mil.noEquip')} /> : null}{done ? <Tag label="✓" gold /> : null}</View>
      <Text style={H(28)} testID="work-title">{r.title}</Text>
      {r.kind === 'op' && <Text style={H(14, M.gold2)}>{t(`mil.ph${opPhase(r.d!)}`)}</Text>}
    </PhotoCard>
    <MCard><Text style={H(15, M.gold)}>{t('mil.howTo')}</Text>{[t('mil.how1', { n: r.items.length }), t(r.mode === 'tabata' ? 'mil.howTabata' : r.mode === 'emom' ? 'mil.howEmom' : 'mil.how2'), t('mil.how3')].map((x, i) => <Text key={i} style={P}>▸ {x}</Text>)}</MCard>
    <MCard><Text style={H(15, M.gold)}>{t('mil.muscles')}</Text><MuscleMap m={musclesOf(r.items)} /><Text style={MU}>{musclesOf(r.items).map((m) => t(`cali.m.${m}`)).join(' · ')}</Text></MCard>
    <MCard><Text style={H(15, M.gold)}>{t('mil.need')}</Text><View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>{(r.need.length ? r.need : ['none']).map((n) => <Tag key={n} label={t(`mil.eq.${n}`)} />)}</View></MCard>
    <MCard><Text style={H(15, M.gold)}>{t('mil.exercises')} ({r.items.length})</Text>
      {r.items.map((x, i) => { const ph = photos(x.id, c.sex); return <Pressable key={i} onPress={() => router.push({ pathname: '/cali-ex', params: { id: x.id } })} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        {ph ? <Image source={ph[0]} style={{ width: 72, height: 54, borderRadius: 8 }} /> : <View style={{ width: 72, height: 54, borderRadius: 8, backgroundColor: M.card2, alignItems: 'center', overflow: 'hidden' }}><Athlete id={x.id} sex={c.sex} size={54} paused /></View>}
        <View style={{ flex: 1 }}><Text style={H(14)}>{exName(x.id, lang)}</Text><Text style={MU}>{x.sets} × {x.reps ? t('coach.reps', { n: x.reps }) : t('coach.secs', { n: x.secs })}</Text></View></Pressable>; })}</MCard>
    <GoldBtn testID="work-start" label={t('mil.startN', { n: mn })} onPress={() => router.push({ pathname: '/cali-play', params: { ...(p as any), mode: r.mode } })} />
  </MilShell>;
}

/** Ficha de un ejercicio (estilo militar). */
export function CaliExScreen() {
  const { t, i18n } = useTranslation(); const { id } = useLocalSearchParams<{ id: string }>(); const [c, set] = useCali();
  const e = EX[id || 'pushup'] || EX.pushup; const x = txt(e, i18n.language);
  const tree = Object.entries(TREES).find(([, ids]) => ids.includes(e.id)); const pos = tree ? tree[1].indexOf(e.id) : -1;
  const easier = tree && pos > 0 ? tree[1][pos - 1] : null, harder = tree && pos >= 0 && pos < tree[1].length - 1 ? tree[1][pos + 1] : null;
  const fav = c.fav.includes(e.id), done = c.done.includes(e.id);
  return <MilShell testID="cali-detail">
    <DemoPhoto id={e.id} sex={c.sex} h={280} fallback={<Athlete id={e.id} sex={c.sex} tone={c.tone} size={260} />} />
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}><Tag label={lvTag(t, e.lvl)} gold /><Tag label={t(`cali.eq.${e.eq}`)} /><Tag label={`${e.sets} × ${e.reps ? t('coach.reps', { n: e.reps }) : t('coach.secs', { n: e.secs })}`} /></View>
    <Text style={H(28)}>{x.n}</Text>
    <MCard><Text style={H(15, M.gold)}>{t('cali.cues')}</Text>{x.c.map((q, i) => <Text key={i} style={P}>{i + 1}. {q}</Text>)}</MCard>
    <MCard style={{ borderColor: M.red }}><Text style={H(15, M.red)}>{t('cali.mistakes')}</Text>{x.x.map((q, i) => <Text key={i} style={P}>• {q}</Text>)}</MCard>
    <MCard><Text style={H(15, M.gold)}>{t('mil.muscles')}</Text><MuscleMap m={e.m} /></MCard>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}><GoldBtn ghost label={`${fav ? '★' : '☆'} ${t('cali.fav')}`} onPress={() => set((v) => ({ ...v, fav: fav ? v.fav.filter((k) => k !== e.id) : [...v.fav, e.id] }))} /></View>
      <View style={{ flex: 1 }}><GoldBtn ghost label={done ? `✓ ${t('cali.mastered')}` : t('cali.iMaster')} onPress={() => set((v) => ({ ...v, done: done ? v.done.filter((k) => k !== e.id) : [...v.done, e.id] }))} /></View>
    </View>
    <GoldBtn ghost label={`🔊 ${t('home.readAloud')}`} onPress={() => speak(`${x.n}. ${x.c.join('. ')}`)} />
    {(easier || harder) && <MCard><Text style={H(15, M.gold)}>{t('cali.progression')}</Text>
      {easier && <Pressable onPress={() => router.replace({ pathname: '/cali-ex', params: { id: easier } })}><Text style={P}>⬇ {txt(EX[easier], i18n.language).n}</Text></Pressable>}
      {harder && <Pressable onPress={() => router.replace({ pathname: '/cali-ex', params: { id: harder } })}><Text style={P}>⬆ {txt(EX[harder], i18n.language).n}</Text></Pressable>}</MCard>}
    <GoldBtn label={t('mil.startN', { n: mins([{ id: e.id, sets: e.sets, reps: e.reps, secs: e.secs, rest: e.rest }]) })} onPress={() => router.push({ pathname: '/cali-play', params: { ex: e.id } })} />
    <Text style={[MU, { textAlign: 'center' }]}>🩺 {t('cali.safety')}</Text>
  </MilShell>;
}

/** Reproductor guiado con foto a pantalla completa. */
export function CaliPlay() {
  const { t, i18n } = useTranslation(); const p = useLocalSearchParams<WP>();
  const [c, set] = useCali(); const { s: st, set: setSt } = useStore(); const kg = st.profile?.weight || 70; const lang = i18n.language;
  const r = useMemo(() => resolveWork(p, c, t, lang), [p.w, p.op, p.plan, p.day, p.ex, p.prog, p.wod, p.mode]); const mode = r.mode;
  const steps = useMemo(() => buildSteps(r.items, mode), [r, mode]);
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
    setBurn((b) => b + add); if (i + 1 >= steps.length) finish(burn + add, true); else setI(i + 1); };
  const finish = (total: number, complete = false) => { setFin(true); Speech.stop(); if (saved.current || total < 1) return; saved.current = true;
    const min = Math.max(1, Math.round((Date.now() - start.current) / 60000)); const k = Math.round(total);
    set((x) => ({ ...x, log: [...x.log, { date: today(), kcal: k, min }].slice(-200),
      ...(complete && r.kind === 'op' ? { op: { ...(x.op || {}), done: [...new Set([...(x.op?.done || []), r.d!])] } } : {}),
      ...(complete && r.kind === 'plan' ? { plan: { ...(x.plan || {}), [r.sx!]: [...new Set([...(x.plan?.[r.sx as 'm' | 'f'] || []), r.d!])] } } : {}) }));
    // Suma las kcal al día (mismo registro que el Coach) para el balance de Inicio.
    setSt((x: any) => { const co = coachOf(x); return { ...x, coach: { ...co, workouts: [...co.workouts, { date: today(), kcal: k, min, day: -1 }] } }; }); };
  if (fin || !step) return <MilShell><MCard style={{ alignItems: 'center', gap: 10, borderColor: M.gold }}><Text style={{ fontSize: 56 }}>🎖️</Text>
    <Text style={H(30, M.gold)}>{t('mil.missionDone')}</Text><Text style={H(20)}>🔥 {fmtNum(Math.round(burn))} {t('u.kcal')}</Text></MCard>
    <GoldBtn label={t('mil.backBase')} onPress={() => router.replace('/gym')} /></MilShell>;
  const rest = step.kind === 'rest'; const nx = steps.slice(i + 1).find((s) => s.kind === 'work'); const showId = rest && nx ? nx.id : step.id;
  return <MilShell onBack={() => finish(burn)} testID="cali-player">
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={H(13, M.gold)}>{t(`cali.mode.${mode}`)}</Text><Text style={H(13, M.mut)}>{t('coach.stepOf', { a: i + 1, b: steps.length })} · 🔥 {fmtNum(Math.round(burn))}</Text></View>
    <ProgressBar v={i} max={steps.length} />
    <View style={{ borderRadius: 16, overflow: 'hidden' }}>
      <DemoPhoto id={showId} sex={c.sex} h={360} paused={paused || rest} fallback={<Athlete id={showId} sex={c.sex} tone={c.tone} size={300} paused={paused || rest} />} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, backgroundColor: 'rgba(13,8,16,0.6)' }}>
        <Text style={H(13, M.gold)}>{rest ? `${t('coach.rest')} · ${t('coach.upNext')}` : t('mil.seriesOf', { a: step.set, b: step.sets })}</Text>
        <Text style={H(26)} testID="step-name">{txt(EX[showId], lang).n}</Text></View>
    </View>
    <View style={{ alignItems: 'center' }}>
      {step.secs ? <Text testID="timer" style={H(64, rest ? M.olive2 : M.gold)}>{left >= 60 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : `${left}s`}</Text> : null}
      {!rest && step.reps ? <Text testID="reps" style={H(56, M.gold)}>{step.reps} / {step.reps} {t('mil.reps')}</Text> : null}
      {!rest && <Text style={[P, { textAlign: 'center' }]}>▸ {txt(EX[step.id], lang).c[0]}</Text>}
    </View>
    <GoldBtn testID="step-done" label={rest ? t('coach.skipRest') : t('mil.complete')} onPress={next} />
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {step.secs ? <View style={{ flex: 1 }}><GoldBtn ghost label={paused ? t('coach.resume') : t('coach.pause')} onPress={() => setPaused(!paused)} /></View> : null}
      <View style={{ flex: 1 }}><GoldBtn ghost label={voice ? '🔊' : '🔇'} onPress={() => { if (voice) Speech.stop(); setVoice(!voice); }} /></View>
    </View>
    {nx && !rest ? <MCard style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>{photos(nx.id, c.sex) ? <Image source={photos(nx.id, c.sex)![0]} style={{ width: 64, height: 48, borderRadius: 6 }} /> : null}<View><Text style={MU}>{t('coach.upNext')}</Text><Text style={H(15)}>{txt(EX[nx.id], lang).n}</Text></View></MCard> : null}
    <Pressable onPress={() => finish(burn)}><Text style={[H(13, M.red), { textAlign: 'center' }]}>{t('coach.endEarly')}</Text></Pressable>
  </MilShell>;
}
