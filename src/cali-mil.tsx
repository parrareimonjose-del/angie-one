/** Calistenia militar v2: estilo oscuro oliva/dorado, campaña de 28 días, categorías, ficha con mapa muscular, plan de 30 días y reproductor con fotos. Fotos: originales generadas con IA (ver assets/cali/ATRIBUCION.md). */
import { ReactNode, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, ImageBackground, Platform, TextStyle } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { EX, Item, Mode, Mus, buildSteps, workSecsOf, txt } from './cali-data';

/** Paleta Angie One (src/theme.ts) sobre fondo oscuro premium: gold=primario coral, olive=secundario violeta, gold2=acento ámbar. */
export const M = { bg: '#0D0A10', card: '#17121C', card2: '#211A28', line: '#33283D', olive: '#7C3AED', olive2: '#7C3AED', gold: '#E11D48', gold2: '#FBBF24', txt: '#F5F0F7', mut: '#A99BB3', red: '#FB7185' };
const FONT = Platform.OS === 'web' ? "Oswald, 'Arial Narrow', 'Roboto Condensed', Impact, sans-serif" : undefined;
export const H = (size = 22, color = M.txt): TextStyle => ({ fontFamily: FONT, fontSize: size, fontWeight: '900', color, textTransform: 'uppercase', letterSpacing: 0.5 });
export const P: TextStyle = { color: M.txt, fontSize: 15, lineHeight: 21 };
export const MU: TextStyle = { color: M.mut, fontSize: 13 };

// ---------- Fotos ----------
const IMG: Record<string, any> = {
  'cover-back': require('../assets/cali/cover-back.jpg'), 'cover-core': require('../assets/cali/cover-core.jpg'), 'cover-dips': require('../assets/cali/cover-dips.jpg'), 'cover-hiit': require('../assets/cali/cover-hiit.jpg'), 'cover-legs': require('../assets/cali/cover-legs.jpg'), 'cover-push': require('../assets/cali/cover-push.jpg'), 'cover-skill': require('../assets/cali/cover-skill.jpg'), 'cover-w-core': require('../assets/cali/cover-w-core.jpg'), 'cover-w-hiit': require('../assets/cali/cover-w-hiit.jpg'), 'cover-w-legs': require('../assets/cali/cover-w-legs.jpg'), 'hero-op': require('../assets/cali/hero-op.jpg'), 'hero-w': require('../assets/cali/hero-w.jpg'),
  'f-bridge': require('../assets/cali/f-bridge.jpg'), 'f-climber': require('../assets/cali/f-climber.jpg'), 'f-crunch': require('../assets/cali/f-crunch.jpg'), 'f-jump': require('../assets/cali/f-jump.jpg'), 'f-lunge': require('../assets/cali/f-lunge.jpg'), 'f-plank': require('../assets/cali/f-plank.jpg'), 'f-pullup': require('../assets/cali/f-pullup.jpg'), 'f-pushup-a': require('../assets/cali/f-pushup-a.jpg'), 'f-pushup-b': require('../assets/cali/f-pushup-b.jpg'), 'f-squat-a': require('../assets/cali/f-squat-a.jpg'), 'f-squat-b': require('../assets/cali/f-squat-b.jpg'),
  'm-climber': require('../assets/cali/m-climber.jpg'), 'm-crunch': require('../assets/cali/m-crunch.jpg'), 'm-dip': require('../assets/cali/m-dip.jpg'), 'm-jump': require('../assets/cali/m-jump.jpg'), 'm-legraise': require('../assets/cali/m-legraise.jpg'), 'm-lunge': require('../assets/cali/m-lunge.jpg'), 'm-pike': require('../assets/cali/m-pike.jpg'), 'm-plank': require('../assets/cali/m-plank.jpg'), 'm-pullup-a': require('../assets/cali/m-pullup-a.jpg'), 'm-pullup-b': require('../assets/cali/m-pullup-b.jpg'), 'm-pushup-a': require('../assets/cali/m-pushup-a.jpg'), 'm-pushup-b': require('../assets/cali/m-pushup-b.jpg'), 'm-row': require('../assets/cali/m-row.jpg'), 'm-squat-a': require('../assets/cali/m-squat-a.jpg'), 'm-squat-b': require('../assets/cali/m-squat-b.jpg'),
};
export const img = (k: string) => IMG[k];
const FAM: Record<string, string[]> = {
  pushup: ['wall_pushup', 'incline_pushup', 'knee_pushup', 'pushup', 'wide_pushup', 'diamond_pushup', 'decline_pushup', 'archer_pushup', 'pseudo_planche_pushup', 'one_arm_pushup'], pike: ['pike_pushup', 'hspu'],
  pullup: ['dead_hang', 'scap_pull', 'negative_pullup', 'chinup', 'pullup', 'wide_pullup', 'archer_pullup', 'muscle_up'], row: ['australian_row'], dip: ['bench_dip', 'dip'],
  squat: ['squat', 'assisted_pistol', 'pistol_squat', 'wall_sit', 'calf_raise'], lunge: ['lunge', 'bulgarian_split'], jump: ['jump_squat', 'burpee'], bridge: ['glute_bridge'],
  plank: ['plank', 'hollow_hold', 'superman'], climber: ['mountain_climber'], legraise: ['hanging_knee_raise', 'hanging_leg_raise', 'tuck_lsit', 'l_sit'],
};
const FAM_OF: Record<string, string> = Object.fromEntries(Object.entries(FAM).flatMap(([k, ids]) => ids.map((i) => [i, k])));
/** Fotogramas (inicio/final) del ejercicio para el sexo pedido; si no hay de ese sexo usa el otro; null → atleta SVG. */
export function photos(id: string, sex: 'm' | 'f'): any[] | null {
  const k = FAM_OF[id]; if (!k) return null;
  for (const sx of [sex, sex === 'm' ? 'f' : 'm']) { const a = IMG[`${sx}-${k}-a`], b = IMG[`${sx}-${k}-b`], one = IMG[`${sx}-${k}`]; if (a) return b ? [a, b] : [a]; if (one) return [one]; }
  return null;
}
export const hasPhoto = (id: string) => !!FAM_OF[id];

// ---------- Entrenos ----------
const it = (id: string, sets?: number, rr?: number, rest = 30): Item => { const e = EX[id]; const v = rr ?? (e.reps ?? -(e.secs || 20)); return { id, sets: sets ?? e.sets, ...(v > 0 ? { reps: v } : { secs: -v }), rest }; };
export type Cat2 = 'strength' | 'core' | 'hiit' | 'back' | 'legs';
export type Wk = { id: string; cat: Cat2; cover: string; lvl: 1 | 2 | 3; sex?: 'm' | 'f'; mode?: Mode; items: Item[]; need: string[] };
export const WKS: Wk[] = [
  { id: 'fuerza1', cat: 'strength', cover: 'cover-push', lvl: 1, items: [it('knee_pushup', 3, 8), it('australian_row', 3, 8), it('bench_dip', 3, 8), it('squat', 3, 12), it('plank', 3, -25)], need: ['mat', 'chair', 'table'] },
  { id: 'fuerza2', cat: 'strength', cover: 'cover-dips', lvl: 2, items: [it('pushup', 4, 10), it('diamond_pushup', 3, 8), it('pike_pushup', 3, 8), it('dip', 3, 8), it('decline_pushup', 3, 8)], need: ['mat', 'chair'] },
  { id: 'skill', cat: 'strength', cover: 'cover-skill', lvl: 3, items: [it('wall_handstand', 4, -25), it('frog_stand', 4, -20), it('tuck_lsit', 3, -12), it('pseudo_planche_pushup', 3, 6)], need: ['wall', 'mat'] },
  { id: 'core1', cat: 'core', cover: 'cover-core', lvl: 1, items: [it('plank', 3, -30), it('mountain_climber', 3, -30), it('hollow_hold', 3, -20), it('superman', 3, 12), it('glute_bridge', 3, 12)], need: ['mat'] },
  { id: 'core_w', cat: 'core', cover: 'cover-w-core', lvl: 1, sex: 'f', items: [it('plank', 3, -25), it('glute_bridge', 3, 15), it('mountain_climber', 3, -25), it('hollow_hold', 3, -15)], need: ['mat'] },
  { id: 'hiit1', cat: 'hiit', cover: 'cover-hiit', lvl: 2, mode: 'tabata', items: [it('burpee'), it('jump_squat'), it('mountain_climber'), it('pushup')], need: ['none'] },
  { id: 'hiit_w', cat: 'hiit', cover: 'cover-w-hiit', lvl: 1, sex: 'f', mode: 'tabata', items: [it('jump_squat'), it('mountain_climber'), it('squat'), it('knee_pushup')], need: ['none'] },
  { id: 'espalda', cat: 'back', cover: 'cover-back', lvl: 1, items: [it('superman', 3, 12), it('australian_row', 4, 8), it('plank', 3, -30), it('glute_bridge', 3, 12), it('hollow_hold', 3, -20)], need: ['table', 'mat'] },
  { id: 'piernas1', cat: 'legs', cover: 'cover-legs', lvl: 1, items: [it('squat', 4, 15), it('lunge', 3, 10), it('glute_bridge', 3, 15), it('calf_raise', 3, 20), it('wall_sit', 3, -30)], need: ['wall'] },
  { id: 'piernas_w', cat: 'legs', cover: 'cover-w-legs', lvl: 1, sex: 'f', items: [it('squat', 3, 15), it('glute_bridge', 4, 15), it('lunge', 3, 10), it('jump_squat', 3, 10)], need: ['mat'] },
  { id: 'piernas2', cat: 'legs', cover: 'cover-legs', lvl: 3, items: [it('bulgarian_split', 4, 10), it('jump_squat', 4, 12), it('assisted_pistol', 3, 6), it('wall_sit', 3, -45)], need: ['chair', 'wall'] },
];
export const WK: Record<string, Wk> = Object.fromEntries(WKS.map((w) => [w.id, w]));
export const CATS: { id: Cat2; cover: string; wcover: string }[] = [
  { id: 'strength', cover: 'cover-push', wcover: 'cover-push' }, { id: 'core', cover: 'cover-core', wcover: 'cover-w-core' }, { id: 'hiit', cover: 'cover-hiit', wcover: 'cover-w-hiit' }, { id: 'back', cover: 'cover-back', wcover: 'cover-back' }, { id: 'legs', cover: 'cover-legs', wcover: 'cover-w-legs' },
];

/** Campaña OP: CIMIENTOS — 28 días, 4 fases (semanas), descanso los días 7, 14, 21 y 28. */
export const OP_DAYS = 28;
export const opRest = (d: number) => d % 7 === 0;
export const opPhase = (d: number) => Math.min(3, Math.floor((d - 1) / 7));
const OP_ROT: string[][] = [
  ['knee_pushup', 'squat', 'australian_row', 'plank', 'glute_bridge'],
  ['pushup', 'lunge', 'superman', 'mountain_climber', 'hollow_hold'],
  ['incline_pushup', 'jump_squat', 'bench_dip', 'plank', 'burpee'],
];
export function opItems(d: number): Item[] {
  const ph = opPhase(d), ids = OP_ROT[(d - 1) % 3], sets = [2, 3, 3, 4][ph], add = [0, 2, 4, 5][ph];
  return ids.map((id) => { const e = EX[id]; return e.reps ? it(id, sets, Math.max(6, (e.reps || 8) - 2 + add), [45, 40, 35, 30][ph]) : it(id, sets, -((e.secs || 20) + add * 3), [45, 40, 35, 30][ph]); });
}
/** Plan de 30 días en casa (mujer/hombre): zona del día y ejercicios; descanso cada 4.º día. */
export const PLAN_DAYS = 30;
export const planRest = (d: number) => d % 4 === 0;
const ZONES: Record<'m' | 'f', { z: string; ids: string[] }[]> = {
  f: [{ z: 'glutes', ids: ['glute_bridge', 'squat', 'lunge', 'jump_squat'] }, { z: 'abs', ids: ['plank', 'mountain_climber', 'hollow_hold', 'superman'] }, { z: 'arms', ids: ['knee_pushup', 'bench_dip', 'incline_pushup', 'plank'] }],
  m: [{ z: 'chest', ids: ['pushup', 'wide_pushup', 'bench_dip', 'diamond_pushup'] }, { z: 'abs', ids: ['plank', 'mountain_climber', 'hollow_hold', 'burpee'] }, { z: 'legs', ids: ['squat', 'lunge', 'jump_squat', 'calf_raise'] }],
};
export const planZone = (sex: 'm' | 'f', d: number) => ZONES[sex][(d - 1 - Math.floor((d - 1) / 4)) % 3].z;
export function planItems(sex: 'm' | 'f', d: number): Item[] {
  const z = ZONES[sex].find((x) => x.z === planZone(sex, d))!; const k = Math.floor((d - 1) / 8);
  return z.ids.map((id) => { const e = EX[id]; return e.reps ? it(id, 3, (e.reps || 10) + k * 2, 30) : it(id, 3, -((e.secs || 20) + k * 5), 30); });
}
export const mins = (items: Item[], mode: Mode = 'sets') => Math.max(1, Math.round(buildSteps(items, mode).reduce((a, s) => a + (s.kind === 'work' ? workSecsOf(s) : s.secs), 0) / 60));
export const musclesOf = (items: Item[]) => [...new Set(items.flatMap((x) => EX[x.id].m))] as Mus[];

export const RANKS = [0, 3, 7, 14, 21, 28];
export const rankOf = (n: number) => RANKS.reduce((r, th, i) => (n >= th ? i : r), 0);

// ---------- Componentes ----------
export function MilShell({ children, onBack, testID }: { children: ReactNode; onBack?: () => void; testID?: string }) {
  const { t } = useTranslation();
  return <SafeAreaView style={{ flex: 1, backgroundColor: M.bg }} edges={['top', 'left', 'right']} testID={testID}>
    <View style={{ flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 14 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('mil.back')} onPress={onBack || (() => (router.canGoBack() ? router.back() : router.replace('/')))} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
          <Text style={H(14, M.gold)}>‹ {t('mil.back')}</Text></Pressable>
        {children}
      </ScrollView>
    </View>
  </SafeAreaView>;
}
export const Tag = ({ label, gold }: { label: string; gold?: boolean }) => <View style={{ backgroundColor: gold ? M.gold : 'rgba(124,58,237,0.85)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={H(11, gold ? '#FFFFFF' : M.txt)}>{label}</Text></View>;
export const MCard = ({ children, style }: { children: ReactNode; style?: any }) => <View style={[{ backgroundColor: M.card, borderRadius: 14, borderWidth: 1, borderColor: M.line, padding: 14, gap: 8 }, style]}>{children}</View>;
export function GoldBtn({ label, onPress, ghost, testID }: { label: string; onPress: () => void; ghost?: boolean; testID?: string }) {
  return <Pressable accessibilityRole="button" testID={testID} onPress={onPress} style={({ pressed }) => ({ backgroundColor: ghost ? 'transparent' : M.gold, borderWidth: 2, borderColor: M.gold, borderRadius: 10, paddingVertical: 14, alignItems: 'center', opacity: pressed ? 0.8 : 1 })}>
    <Text style={H(16, ghost ? M.gold : '#FFFFFF')}>{label}</Text></Pressable>;
}
export function PhotoCard({ src, h = 170, children, onPress, testID }: { src: any; h?: number; children: ReactNode; onPress?: () => void; testID?: string }) {
  return <Pressable accessibilityRole="button" onPress={onPress} testID={testID} style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: M.line }}>
    <ImageBackground source={src} style={{ height: h, justifyContent: 'flex-end' }} imageStyle={{ resizeMode: 'cover' }}>
      <View style={{ padding: 12, gap: 6, backgroundColor: 'rgba(13,8,16,0.55)' }}>{children}</View>
    </ImageBackground></Pressable>;
}
export function ProgressBar({ v, max }: { v: number; max: number }) {
  return <View style={{ height: 8, borderRadius: 4, backgroundColor: M.line, overflow: 'hidden' }}><View style={{ width: `${Math.min(100, (v / Math.max(1, max)) * 100)}%`, height: 8, backgroundColor: M.gold }} /></View>;
}
/** Foto de demostración: alterna inicio/final cada segundo (si hay dos). */
export function DemoPhoto({ id, sex, h = 260, paused, fallback }: { id: string; sex: 'm' | 'f'; h?: number; paused?: boolean; fallback: ReactNode }) {
  const ph = photos(id, sex); const [f, setF] = useState(0);
  useEffect(() => { if (!ph || ph.length < 2 || paused) return; const iv = setInterval(() => setF((x) => 1 - x), 1000); return () => clearInterval(iv); }, [id, sex, paused, ph?.length]);
  if (!ph) return <View style={{ height: h, alignItems: 'center', justifyContent: 'center', backgroundColor: M.card2, borderRadius: 14 }}>{fallback}</View>;
  return <Image testID="demo-photo" source={ph[Math.min(f, ph.length - 1)]} style={{ width: '100%', height: h, borderRadius: 14, backgroundColor: M.card2 }} resizeMode="cover" accessibilityIgnoresInvertColors />;
}

// Mapa muscular frontal/trasero (siluetas simples).
const FRONT: Partial<Record<Mus, string[]>> = { chest: ['M38 40 Q50 36 50 50 L38 52 Q32 48 38 40Z', 'M62 40 Q50 36 50 50 L62 52 Q68 48 62 40Z'], shoulders: ['M28 40 a6 6 0 1 0 10 -2Z', 'M72 40 a6 6 0 1 1 -10 -2Z'], biceps: ['M24 50 l6 0 l-1 16 l-6 0Z', 'M76 50 l-6 0 l1 16 l6 0Z'], forearms: ['M22 68 l6 0 l-2 16 l-5 0Z', 'M78 68 l-6 0 l2 16 l5 0Z'], core: ['M41 54 h18 v22 h-18Z'], quads: ['M38 82 h10 l-1 30 h-8Z', 'M52 82 h10 l-1 30 h-8Z'], calves: ['M39 118 h7 v22 h-6Z', 'M54 118 h7 v22 h-6Z'] };
const BACK: Partial<Record<Mus, string[]>> = { back: ['M36 40 h28 l-4 26 h-20Z'], shoulders: ['M28 40 a6 6 0 1 0 10 -2Z', 'M72 40 a6 6 0 1 1 -10 -2Z'], triceps: ['M24 50 l6 0 l-1 16 l-6 0Z', 'M76 50 l-6 0 l1 16 l6 0Z'], lowback: ['M42 66 h16 v10 h-16Z'], glutes: ['M38 77 h12 v10 h-12Z', 'M50 77 h12 v10 h-12Z'], hams: ['M38 90 h10 l-1 24 h-8Z', 'M52 90 h10 l-1 24 h-8Z'], calves: ['M39 118 h7 v22 h-6Z', 'M54 118 h7 v22 h-6Z'] };
function Body({ map, on }: { map: Partial<Record<Mus, string[]>>; on: Set<Mus> }) {
  return <Svg width={110} height={160} viewBox="0 0 100 150">
    <G fill={M.card2} stroke={M.line} strokeWidth={1}><Circle cx={50} cy={20} r={10} /><Path d="M34 34 h32 l8 8 l6 42 l-6 2 l-6 -36 l-2 30 l2 70 h-12 l-2 -60 l-2 60 h-12 l2 -70 l-2 -30 l-6 36 l-6 -2 l6 -42Z" /></G>
    {Object.entries(map).map(([k, ps]) => (ps || []).map((d, i) => <Path key={k + i} d={d} fill={on.has(k as Mus) || on.has('full') ? M.gold : '#3A2D44'} opacity={on.has(k as Mus) || on.has('full') ? 0.95 : 0.7} />))}
  </Svg>;
}
export function MuscleMap({ m }: { m: Mus[] }) {
  const { t } = useTranslation(); const on = new Set(m);
  return <View testID="muscle-map" style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
    <View style={{ alignItems: 'center' }}><Body map={FRONT} on={on} /><Text style={MU}>{t('mil.front')}</Text></View>
    <View style={{ alignItems: 'center' }}><Body map={BACK} on={on} /><Text style={MU}>{t('mil.backView')}</Text></View>
  </View>;
}
export const exName = (id: string, lang: string) => txt(EX[id], lang).n;
