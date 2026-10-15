// Componentes base del rediseño (A Vibrante claro · B Elegante oscuro). Todas las pantallas usan esto.
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, ViewStyle, TextStyle, Animated, Easing, AccessibilityInfo, Platform, useColorScheme, Image, ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop, Rect, Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { C, R, MIN_TAP, applyTheme, Mode, Pref, serif, TYPE, SP, shadow, btnBg } from './theme';
import { hTap, hSelect, hSuccess } from './haptics';

const WEB = Platform.OS === 'web';
const ND = !WEB; // useNativeDriver

export const FOOD = {
  bowl: require('../assets/food/bowl.jpg'), salad: require('../assets/food/salad.jpg'), pancakes: require('../assets/food/pancakes.jpg'),
  plate: require('../assets/food/plate.jpg'), fruit: require('../assets/food/fruit.jpg'), breakfast: require('../assets/food/breakfast.jpg'),
};

// ---------------- Tema ----------------
const KEY = 'angie:theme';
const readWebPref = (): Pref => { try { const v = WEB && typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null; return v === 'light' || v === 'dark' ? v : 'system'; } catch { return 'system'; } };
type ThemeCtx = { mode: Mode; pref: Pref; setPref: (p: Pref) => void; reduce: boolean };
const Ctx = createContext<ThemeCtx>({ mode: 'light', pref: 'system', setPref: () => {}, reduce: false });
export const useTheme = () => useContext(Ctx);
export const useReduceMotion = () => useContext(Ctx).reduce;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const [pref, setP] = useState<Pref>(readWebPref);
  const [reduce, setReduce] = useState(false);
  useEffect(() => { if (!WEB) AsyncStorage.getItem(KEY).then((v) => { if (v === 'light' || v === 'dark') setP(v); }).catch(() => {}); }, []);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduce);
    return () => sub?.remove?.();
  }, []);
  const mode: Mode = pref === 'system' ? (scheme === 'dark' ? 'dark' : 'light') : pref;
  applyTheme(mode); buildStyles();
  useEffect(() => {
    if (!WEB || typeof document === 'undefined') return;
    document.documentElement.style.colorScheme = mode; document.body.style.backgroundColor = C.bg; document.body.style.color = C.text;
    let m = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); } m.content = C.bg;
    document.documentElement.dataset.theme = mode;
  }, [mode]);
  const setPref = (p: Pref) => { setP(p); hSelect(); AsyncStorage.setItem(KEY, p).catch(() => {}); try { if (WEB) localStorage.setItem(KEY, p); } catch { /* */ } };
  const v = useMemo(() => ({ mode, pref, setPref, reduce }), [mode, pref, reduce]);
  return <Ctx.Provider value={v}><StatusBar style={mode === 'dark' ? 'light' : 'dark'} /><React.Fragment key={mode}>{children}</React.Fragment><ToastHost /><ConfettiHost /></Ctx.Provider>;
}

// ---------------- Estilos compartidos (se reconstruyen al cambiar de tema) ----------------
export const s: any = {};
export function buildStyles() {
  const dark = C.mode === 'dark';
  Object.assign(s, {
    h1: { ...TYPE.h1, color: C.text, ...(dark ? { fontFamily: serif, fontWeight: '600', letterSpacing: -0.4 } : {}) },
    h2: { ...TYPE.h2, color: C.text },
    t: { ...TYPE.body, color: C.text },
    muted: { color: C.muted, fontSize: 15, lineHeight: 21 },
    label: { ...TYPE.label, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
    card: cardStyle(),
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    input: { minHeight: 58, borderRadius: 18, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.input, paddingHorizontal: 16, fontSize: 18, color: C.text },
    bar: barStyle(),
  });
}
const cardStyle = (): ViewStyle => ({
  backgroundColor: WEB ? C.glass : C.card, borderRadius: R.card, padding: 18, gap: 10, borderWidth: 1, borderColor: C.glassBorder, ...shadow('card'),
  ...(WEB ? ({ backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)' } as any) : {}),
});
const barStyle = (): ViewStyle => ({
  position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', gap: 2, paddingHorizontal: 6, paddingVertical: 6, alignItems: 'center',
  backgroundColor: WEB ? (C.mode === 'dark' ? 'rgba(27,20,48,0.78)' : 'rgba(255,255,255,0.82)') : C.card, borderRadius: 30, borderWidth: 1, borderColor: C.glassBorder, ...shadow('card'),
  ...(WEB ? ({ backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)' } as any) : {}),
});
buildStyles();

// ---------------- Fondo de marca ----------------
function Aura() {
  const dark = C.mode === 'dark';
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 520 }}>
      <Svg width="100%" height="100%" viewBox="0 0 400 520" preserveAspectRatio="xMidYMin slice">
        <Defs>
          <RadialGradient id="aA" cx="0.15" cy="0.05" r="0.7"><Stop offset="0" stopColor={dark ? '#7C3AED' : '#FB7185'} stopOpacity={dark ? 0.45 : 0.35} /><Stop offset="1" stopColor={C.bg} stopOpacity={0} /></RadialGradient>
          <RadialGradient id="aB" cx="0.95" cy="0.1" r="0.65"><Stop offset="0" stopColor={dark ? '#E11D48' : '#A78BFA'} stopOpacity={dark ? 0.22 : 0.32} /><Stop offset="1" stopColor={C.bg} stopOpacity={0} /></RadialGradient>
          <RadialGradient id="aC" cx="0.6" cy="0.55" r="0.5"><Stop offset="0" stopColor={dark ? '#A78BFA' : '#FBBF24'} stopOpacity={dark ? 0.12 : 0.18} /><Stop offset="1" stopColor={C.bg} stopOpacity={0} /></RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="400" height="520" fill="url(#aA)" /><Rect x="0" y="0" width="400" height="520" fill="url(#aB)" /><Rect x="0" y="0" width="400" height="520" fill="url(#aC)" />
      </Svg>
    </View>
  );
}

// Entrada de pantalla: fundido + subida 18 px en 600 ms (150 ms de fundido con «reducir movimiento»)
export function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: ViewStyle }) {
  const reduce = useReduceMotion(); const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: reduce ? 150 : 600, delay: reduce ? 0 : delay, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: ND }).start(); }, []);
  return <Animated.View style={[{ opacity: a, transform: reduce ? [] : [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }, style]}>{children}</Animated.View>;
}

const TABS = ['/', '/scan', '/coach', '/diary', '/more', '/onboarding'];
export function Screen({ children, nav = true, title }: { children: React.ReactNode; nav?: boolean; title?: string }) {
  const { t } = useTranslation(); const path = usePathname();
  const isTab = TABS.includes(path);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      <Aura />
      <View style={{ flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: SP.screen, paddingTop: 12, paddingBottom: nav ? 140 : 48, gap: 14 }} keyboardShouldPersistTaps="handled">
          {!isTab || (nav && path !== '/' && path !== '/more') ? (
            <View style={[s.row, { justifyContent: 'space-between' }]}>
              {!isTab ? <BackBtn /> : <View />}
              {nav && path !== '/more' && path !== '/onboarding' ? <IconBtn testID="more-btn" icon="☰" a11y={t('nav.more')} onPress={() => router.push('/more' as any)} /> : null}
            </View>
          ) : null}
          <FadeIn style={{ gap: 14 }}>
            {title ? <Text style={s.h1} accessibilityRole="header">{title}</Text> : null}
            {children}
          </FadeIn>
        </ScrollView>
        {nav ? <BottomBar /> : null}
      </View>
    </SafeAreaView>
  );
}

// ---------------- Botones ----------------
function GradientFill({ colors, radius }: { colors: string[]; radius: number }) {
  const id = useMemo(() => 'g' + Math.random().toString(36).slice(2, 8), []);
  return (
    <Svg pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
      <Defs><LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">{colors.map((c, i) => <Stop key={i} offset={String(i / (colors.length - 1))} stopColor={c} />)}</LinearGradient></Defs>
      <Rect x="0" y="0" width="100%" height="100%" rx={radius} ry={radius} fill={`url(#${id})`} />
    </Svg>
  );
}

export function Btn({ label, onPress, kind = 'primary', style, small, a11y, testID }: { testID?: string; label: string; onPress?: () => void; kind?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger'; style?: ViewStyle; small?: boolean; a11y?: string }) {
  const b = btnBg();
  const bg = { primary: 'transparent', secondary: b.secondary, accent: C.accent, ghost: C.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', danger: 'transparent' }[kind];
  const fg = kind === 'accent' ? C.onAccent : kind === 'ghost' ? C.secondary : kind === 'danger' ? C.primary : C.white;
  const radius = R.btn; const h = small ? 56 : MIN_TAP;
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={a11y || label} onPress={onPress ? () => { hTap(); onPress(); } : undefined}
      style={({ pressed }) => [{ minHeight: h, borderRadius: radius, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 10,
        opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }],
        borderWidth: kind === 'ghost' || kind === 'danger' ? 1.5 : 0, borderColor: kind === 'danger' ? C.primary : C.border,
        ...(kind === 'primary' ? shadow('cta') : {}) }, style]}>
      {kind === 'primary' ? <GradientFill colors={[b.primary, b.secondary]} radius={radius} /> : null}
      <Text style={{ color: fg, fontSize: small ? 16 : 18, fontWeight: '800', textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

export function IconBtn({ icon, onPress, a11y, testID, size = 56 }: { icon: string; onPress: () => void; a11y: string; testID?: string; size?: number }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={a11y} onPress={() => { hTap(); onPress(); }}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: C.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: C.glassBorder, transform: [{ scale: pressed ? 0.94 : 1 }], ...shadow('card') })}>
      <Text style={{ fontSize: 22, color: C.text }}>{icon}</Text>
    </Pressable>
  );
}

// ---------------- Tarjetas, texto, chips ----------------
export const Card = ({ children, style, testID }: { children: React.ReactNode; style?: ViewStyle; testID?: string }) => <View testID={testID} style={[s.card, style]}>{children}</View>;
export const T = ({ children, style, testID }: { children: React.ReactNode; style?: TextStyle | TextStyle[]; testID?: string }) => <Text testID={testID} style={[s.t, style as any]}>{children}</Text>;
export const H2 = ({ children }: { children: React.ReactNode }) => <Text style={s.h2} accessibilityRole="header">{children}</Text>;

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={() => { hSelect(); onPress(); }}
      style={({ pressed }) => ({ minHeight: 56, paddingHorizontal: 18, borderRadius: R.chip + 6, justifyContent: 'center', overflow: 'hidden', transform: [{ scale: pressed ? 0.96 : 1 }],
        backgroundColor: active ? 'transparent' : C.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', borderWidth: 1.5, borderColor: active ? 'transparent' : C.border })}>
      {active ? <GradientFill colors={[btnBg().secondary, btnBg().primary]} radius={R.chip + 6} /> : null}
      <Text style={{ color: active ? C.white : C.text, fontWeight: '700', fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}

// ---------------- Anillo y barras (se llenan con animación) ----------------
function useProgress(target: number, ms = 1500) {
  const reduce = useReduceMotion(); const [v, setV] = useState(reduce ? target : 0); const a = useRef(new Animated.Value(reduce ? target : 0)).current;
  useEffect(() => {
    const id = a.addListener(({ value }) => setV(value));
    Animated.timing(a, { toValue: target, duration: reduce ? 0 : ms, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: false }).start();
    return () => a.removeListener(id);
  }, [target, reduce]);
  return v;
}

export function Ring({ value, max, size = 200, stroke = 18, children, colors }: { value: number; max: number; size?: number; stroke?: number; children?: React.ReactNode; colors?: string[] }) {
  const id = useMemo(() => 'r' + Math.random().toString(36).slice(2, 8), []);
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r, pct = useProgress(Math.min(1, max ? value / max : 0));
  const cs = colors || [C.primary, C.secondary, C.accent];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs><LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">{cs.map((c, i) => <Stop key={i} offset={String(i / Math.max(1, cs.length - 1))} stopColor={c} />)}</LinearGradient></Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(124,58,237,0.10)'} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={`url(#${id})`} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      {children}
    </View>
  );
}

export function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = useProgress(Math.min(1, max ? value / max : 0), 1400);
  return <View style={{ height: 12, borderRadius: 6, backgroundColor: C.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(124,58,237,0.10)', overflow: 'hidden' }}><View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 6, backgroundColor: color }} /></View>;
}

// Gráfica de línea con degradado (RTL: de derecha a izquierda)
export function LineChart({ data, height = 140, testID }: { data: number[]; height?: number; testID?: string }) {
  const { i18n } = useTranslation(); const rtl = i18n.dir?.(i18n.language) === 'rtl';
  const id = useMemo(() => 'l' + Math.random().toString(36).slice(2, 8), []);
  if (data.length < 2) return null;
  const W = 320, lo = Math.min(...data), hi = Math.max(...data), sp = hi - lo || 1;
  const pts = data.map((v, i) => { const x = (i / (data.length - 1)) * W; return [rtl ? W - x : x, 10 + (1 - (v - lo) / sp) * (height - 20)]; });
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <Svg testID={testID} width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
      <Defs><LinearGradient id={id} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={C.secondary} stopOpacity={0.35} /><Stop offset="1" stopColor={C.secondary} stopOpacity={0} /></LinearGradient></Defs>
      <Path d={`${d} L${pts[pts.length - 1][0]},${height} L${pts[0][0]},${height} Z`} fill={`url(#${id})`} />
      <Path d={d} stroke={C.primary} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ---------------- Listas, vacíos, fotos ----------------
export function ListRow({ icon, label, sub, onPress, testID, right }: { icon?: string; label: string; sub?: string; onPress?: () => void; testID?: string; right?: React.ReactNode }) {
  const { i18n } = useTranslation(); const rtl = i18n.dir?.(i18n.language) === 'rtl';
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress ? () => { hTap(); onPress(); } : undefined}
      style={({ pressed }) => ({ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}>
      {icon ? <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22 }}>{icon}</Text></View> : null}
      <View style={{ flex: 1 }}><Text style={{ fontSize: 17, fontWeight: '700', color: C.text }}>{label}</Text>{sub ? <Text style={s.muted}>{sub}</Text> : null}</View>
      {right ?? (onPress ? <Text style={{ fontSize: 22, color: C.muted }}>{rtl ? '‹' : '›'}</Text> : null)}
    </Pressable>
  );
}

export function EmptyState({ icon = '🍽️', title, sub, image }: { icon?: string; title: string; sub?: string; image?: ImageSourcePropType }) {
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 18 }} testID="empty-state">
      {image ? <Image source={image} style={{ width: 120, height: 120, borderRadius: 60 }} accessibilityIgnoresInvertColors /> :
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 44 }}>{icon}</Text></View>}
      <Text style={[s.h2, { textAlign: 'center' }]}>{title}</Text>
      {sub ? <Text style={[s.muted, { textAlign: 'center' }]}>{sub}</Text> : null}
    </View>
  );
}

// Foto hero con Ken Burns lento (8 s) y velo de marca
export function HeroPhoto({ source, height = 180, children, testID }: { source: ImageSourcePropType; height?: number; children?: React.ReactNode; testID?: string }) {
  const reduce = useReduceMotion(); const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (reduce) return; const l = Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 1, duration: 8000, useNativeDriver: ND }), Animated.timing(a, { toValue: 0, duration: 8000, useNativeDriver: ND })])); l.start(); return () => l.stop(); }, [reduce]);
  return (
    <View testID={testID} style={{ height, borderRadius: R.hero, overflow: 'hidden', ...shadow('card') }}>
      <Animated.Image source={source} accessibilityIgnoresInvertColors resizeMode="cover" style={{ position: 'absolute', width: '100%', height: '100%', transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(27,16,48,0.28)' }} />
      <View style={{ flex: 1, padding: 18, justifyContent: 'flex-end' }}>{children}</View>
    </View>
  );
}

// ---------------- Movimiento: escritura, pulso, escaneo ----------------
export function Typing() {
  const reduce = useReduceMotion(); const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (reduce) return; const l = Animated.loop(Animated.timing(a, { toValue: 3, duration: 1200, easing: Easing.linear, useNativeDriver: ND })); l.start(); return () => l.stop(); }, [reduce]);
  return (
    <View testID="typing" style={{ flexDirection: 'row', gap: 6, alignSelf: 'flex-start', backgroundColor: C.tint, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 }} accessibilityLabel="…">
      {[0, 1, 2].map((i) => <Animated.View key={i} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: C.secondary, opacity: reduce ? 0.8 : a.interpolate({ inputRange: [0, i, i + 0.5, i + 1, 3], outputRange: [0.3, 0.3, 1, 0.3, 0.3], extrapolate: 'clamp' }) }} />)}
    </View>
  );
}

export function Pulse({ children, size }: { children: React.ReactNode; size: number }) {
  const reduce = useReduceMotion(); const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (reduce) return; const l = Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: ND }), Animated.delay(800)])); a.setValue(0); l.start(); return () => l.stop(); }, [reduce]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {reduce ? null : <Animated.View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: C.primary, opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }), transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }] }} />}
      {children}
    </View>
  );
}

export function ScanLine({ height = 240 }: { height?: number }) {
  const reduce = useReduceMotion(); const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (reduce) return; const l = Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }), Animated.timing(a, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: ND })])); l.start(); return () => l.stop(); }, [reduce]);
  if (reduce) return null;
  return <Animated.View pointerEvents="none" testID="scan-line" style={{ position: 'absolute', left: 12, right: 12, height: 3, borderRadius: 2, backgroundColor: C.primary, shadowColor: C.primary, shadowOpacity: 0.9, shadowRadius: 12, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [12, height - 12] }) }] }} />;
}

// ---------------- Avisos (toast) y confeti ----------------
let pushToast: (m: string) => void = () => {};
export const toast = (m: string) => pushToast(m);
function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null); const a = useRef(new Animated.Value(0)).current; const tm = useRef<any>(null);
  pushToast = (m) => { setMsg(m); clearTimeout(tm.current); Animated.timing(a, { toValue: 1, duration: 250, useNativeDriver: ND }).start(); tm.current = setTimeout(() => Animated.timing(a, { toValue: 0, duration: 250, useNativeDriver: ND }).start(() => setMsg(null)), 2600); };
  if (!msg) return null;
  return (
    <Animated.View pointerEvents="none" accessibilityLiveRegion="polite" testID="toast" style={{ position: 'absolute', left: 20, right: 20, bottom: 110, alignItems: 'center', opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
      <View style={{ backgroundColor: C.mode === 'dark' ? '#F7F2FF' : '#1B1030', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 14, maxWidth: 480 }}><Text style={{ color: C.mode === 'dark' ? '#1B1030' : '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{msg}</Text></View>
    </Animated.View>
  );
}

let fireConfetti: () => void = () => {};
/** Celebración al cumplir una meta: confeti + háptica de éxito (solo fundido con «reducir movimiento»). */
export const celebrate = (m?: string) => { hSuccess(); fireConfetti(); if (m) toast(m); };
const CONF = ['#E11D48', '#7C3AED', '#F59E0B', '#FB7185', '#A78BFA', '#FBBF24'];
function ConfettiHost() {
  const reduce = useReduceMotion(); const [n, setN] = useState(0); const a = useRef(new Animated.Value(0)).current;
  fireConfetti = () => { if (reduce) return; setN((x) => x + 1); a.setValue(0); Animated.timing(a, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start(() => setN(0)); };
  const bits = useMemo(() => Array.from({ length: 36 }, (_, i) => ({ x: Math.random() * 100, dx: (Math.random() - 0.5) * 140, rot: Math.random() * 720, c: CONF[i % CONF.length], w: 6 + Math.random() * 6 })), [n]);
  if (!n) return null;
  return (
    <View pointerEvents="none" testID="confetti" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
      {bits.map((b, i) => <Animated.View key={i} style={{ position: 'absolute', left: `${b.x}%`, top: -20, width: b.w, height: b.w * 1.6, borderRadius: 2, backgroundColor: b.c, opacity: a.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, 760] }) }, { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, b.dx] }) }, { rotate: a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${b.rot}deg`] }) }] }} />)}
    </View>
  );
}

// ---------------- Navegación ----------------
function BackBtn() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir?.(i18n.language) === 'rtl';
  return <Btn small kind="ghost" label={`${rtl ? '→' : '←'}  ${t('back')}`} a11y={t('back')} style={{ alignSelf: 'flex-start' }}
    onPress={() => (router.canGoBack() ? router.back() : router.replace('/more' as any))} />;
}

/** Barra flotante de vidrio: Inicio · Escanear · [🎙️ central] · Diario · Coach. «Más» va arriba a la derecha (☰). */
function BottomBar() {
  const { t } = useTranslation(); const path = usePathname();
  const items = [{ k: 'home', href: '/', icon: '🏠' }, { k: 'scan', href: '/scan', icon: '📸' }, { k: 'voice', href: '/voice', icon: '🎙️' }, { k: 'diary', href: '/diary', icon: '📖' }, { k: 'coach', href: '/coach', icon: '💪' }];
  return (
    <View style={s.bar} testID="bottom-bar">
      {items.map((i) => {
        if (i.k === 'voice') return (
          <Pressable key="voice" testID="voice-fab" accessibilityRole="button" accessibilityLabel={t('nav.voiceA11y')} onPress={() => { hTap(); router.push('/voice' as any); }}
            style={({ pressed }) => ({ width: 76, minHeight: 68, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}>
            <Pulse size={68}>
              <View style={{ width: 68, height: 68, borderRadius: R.fab, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...shadow('cta') }}>
                <GradientFill colors={[btnBg().primary, btnBg().secondary]} radius={R.fab} />
                <Text style={{ fontSize: 30 }}>🎙️</Text>
              </View>
            </Pulse>
          </Pressable>
        );
        const active = path === i.href;
        return (
          <Pressable key={i.k} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={t(`nav.${i.k}`)} onPress={() => { hSelect(); router.replace(i.href as any); }}
            style={{ flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: active ? C.tabActive : 'transparent' }}>
            <Text style={{ fontSize: 24 }}>{i.icon}</Text>
            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: active ? C.primary : C.muted }}>{t(`nav.${i.k}`)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Selector de tema para Ajustes: Automático / Claro / Oscuro. */
export function ThemePicker() {
  const { t } = useTranslation(); const { pref, setPref } = useTheme();
  return (
    <Card testID="theme-picker">
      <Text style={s.h2}>🎨 {t('ui.theme')}</Text>
      <View style={[s.row, { flexWrap: 'wrap' }]}>
        {(['system', 'light', 'dark'] as Pref[]).map((p) => <Chip key={p} label={t(`ui.${p}`)} active={pref === p} onPress={() => setPref(p)} />)}
      </View>
    </Card>
  );
}
