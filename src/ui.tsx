import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { C, R, MIN_TAP } from './theme';

export function Screen({ children, nav = true, title }: { children: React.ReactNode; nav?: boolean; title?: string }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center' }}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 140, gap: 14 }}>
          <BackBtn />
          {title ? <Text style={s.h1} accessibilityRole="header">{title}</Text> : null}
          {children}
        </ScrollView>
        {nav ? <VoiceFab /> : null}
        {nav ? <BottomBar /> : null}
      </View>
    </SafeAreaView>
  );
}

export function Btn({ label, onPress, kind = 'primary', style, small, a11y }: { label: string; onPress?: () => void; kind?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger'; style?: ViewStyle; small?: boolean; a11y?: string }) {
  const bg = { primary: C.primary, secondary: C.secondary, accent: C.accent, ghost: C.card, danger: C.card }[kind];
  const fg = kind === 'accent' ? C.onAccent : kind === 'ghost' ? C.secondary : kind === 'danger' ? C.primary : C.white;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y || label} onPress={onPress}
      style={({ pressed }) => [{ minHeight: small ? 48 : MIN_TAP, borderRadius: R.btn, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, opacity: pressed ? 0.85 : 1,
        borderWidth: kind === 'ghost' || kind === 'danger' ? 2 : 0, borderColor: kind === 'danger' ? C.primary : C.border }, style]}>
      <Text style={{ color: fg, fontSize: small ? 16 : 18, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}

export const Card = ({ children, style, testID }: { children: React.ReactNode; style?: ViewStyle; testID?: string }) => <View testID={testID} style={[s.card, style]}>{children}</View>;
export const T = ({ children, style, testID }: { children: React.ReactNode; style?: TextStyle | TextStyle[]; testID?: string }) => <Text testID={testID} style={[s.t, style as any]}>{children}</Text>;

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={onPress}
      style={{ minHeight: 52, paddingHorizontal: 16, borderRadius: 26, justifyContent: 'center', backgroundColor: active ? C.secondary : C.card, borderWidth: 2, borderColor: active ? C.secondary : C.border }}>
      <Text style={{ color: active ? C.white : C.text, fontWeight: '700', fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}

export function Ring({ value, max, size = 200, stroke = 18, children }: { value: number; max: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r, pct = Math.min(1, max ? value / max : 0);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs><LinearGradient id="g" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={C.primary} /><Stop offset="1" stopColor={C.secondary} /></LinearGradient></Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.border} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="url(#g)" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      {children}
    </View>
  );
}

export function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return <View style={{ height: 12, borderRadius: 6, backgroundColor: C.border, overflow: 'hidden' }}><View style={{ width: `${Math.min(100, max ? (value / max) * 100 : 0)}%`, height: '100%', backgroundColor: color }} /></View>;
}

const TABS = ['/', '/scan', '/coach', '/diary', '/more', '/onboarding'];
function BackBtn() {
  const { t, i18n } = useTranslation(); const path = usePathname();
  if (TABS.includes(path)) return null;
  const rtl = i18n.dir?.(i18n.language) === 'rtl';
  return <Btn small kind="ghost" label={`${rtl ? '→' : '←'}  ${t('back')}`} a11y={t('back')} style={{ alignSelf: 'flex-start' }}
    onPress={() => (router.canGoBack() ? router.back() : router.replace('/more' as any))} />;
}

function BottomBar() {
  const { t } = useTranslation(); const path = usePathname();
  const items = [{ k: 'home', href: '/', icon: '🏠' }, { k: 'scan', href: '/scan', icon: '📸' }, { k: 'coach', href: '/coach', icon: '💪' }, { k: 'diary', href: '/diary', icon: '📖' }, { k: 'more', href: '/more', icon: '☰' }];
  return (
    <View style={s.bar}>
      {items.map((i) => {
        const active = path === i.href;
        return (
          <Pressable key={i.k} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={t(`nav.${i.k}`)} onPress={() => router.replace(i.href as any)}
            style={{ flex: 1, minHeight: 68, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: active ? '#FFE4E8' : 'transparent' }}>
            <Text style={{ fontSize: i.k === 'scan' ? 28 : 22 }}>{i.icon}</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: active ? C.primary : C.muted }}>{t(`nav.${i.k}`)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const s = StyleSheet.create({
  h1: { fontSize: 30, fontWeight: '900', color: C.text },
  h2: { fontSize: 20, fontWeight: '800', color: C.text },
  t: { fontSize: 17, color: C.text, lineHeight: 24 },
  muted: { color: C.muted, fontSize: 15 },
  card: { backgroundColor: C.card, borderRadius: R.card, padding: 18, gap: 10, shadowColor: '#E11D48', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { minHeight: 58, borderRadius: 16, borderWidth: 2, borderColor: C.border, backgroundColor: C.card, paddingHorizontal: 16, fontSize: 18, color: C.text },
  bar: { position: 'absolute', left: 10, right: 10, bottom: 12, flexDirection: 'row', gap: 6, padding: 6, backgroundColor: C.card, borderRadius: 28, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20, elevation: 8 },
});

/** Fase 2: botón de voz flotante en todas las pantallas con barra (registrar comida hablando). */
function VoiceFab() {
  const { t } = useTranslation();
  return <Pressable testID="voice-fab" accessibilityRole="button" accessibilityLabel={t('p2.t.voice')} onPress={() => router.push('/voice' as any)}
    style={{ position: 'absolute', right: 18, bottom: 100, width: 64, height: 64, borderRadius: 32, backgroundColor: C.secondary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 }}>
    <Text style={{ fontSize: 28 }}>🎙️</Text></Pressable>;
}
