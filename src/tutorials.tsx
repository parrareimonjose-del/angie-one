import { CLONE_ENABLED } from './flags';
/** Tutoriales en video generados en la app: capturas reales de cada pantalla + subtítulos + voz del teléfono (gratis, sin servidor). */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Easing, AccessibilityInfo, Image, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Speech from 'expo-speech';
import { Screen, Card, Btn, T, Bar, s } from './ui';
import { C } from './theme';
import { curLang, fmtLocale } from './i18n';

export type Tut = { id: string; icon: string; route: string; focus: [number, number, number] };
/** focus = posición vertical (0 arriba … 1 abajo) que se acerca en cada uno de los 3 pasos. */
const ALL_TUTS: Tut[] = [
  { id: 'photo', icon: '📸', route: '/scan', focus: [0.2, 0.45, 0.75] }, { id: 'voice', icon: '🎙️', route: '/voice', focus: [0.2, 0.5, 0.8] },
  { id: 'barcode', icon: '🏷️', route: '/barcode', focus: [0.25, 0.5, 0.75] }, { id: 'coach', icon: '💪', route: '/coach', focus: [0.2, 0.5, 0.8] },
  { id: 'plan', icon: '🥗', route: '/diet', focus: [0.2, 0.5, 0.8] }, { id: 'gym', icon: '🏋️', route: '/gym', focus: [0.2, 0.5, 0.8] },
  { id: 'weight', icon: '⚖️', route: '/weight', focus: [0.2, 0.45, 0.75] }, { id: 'chef', icon: '🧑‍🍳', route: '/chef', focus: [0.2, 0.5, 0.8] },
  { id: 'menu', icon: '🍽️', route: '/menu', focus: [0.2, 0.5, 0.8] }, { id: 'datos', icon: '🧾', route: '/datos', focus: [0.2, 0.5, 0.8] },
  { id: 'security', icon: '🔐', route: '/security', focus: [0.2, 0.5, 0.8] }, { id: 'clone', icon: '🧬', route: '/clon', focus: [0.2, 0.5, 0.8] },
];
export const TUTS: Tut[] = ALL_TUTS.filter((x) => CLONE_ENABLED || x.id !== 'clone');
// Capturas reales de la app (Playwright). Español para es; inglés para el resto (los subtítulos y la voz sí van en cada idioma).
const IMG: Record<string, Record<'es' | 'en', any>> = {
  photo: { es: require('../assets/tutoriales/es-photo.jpg'), en: require('../assets/tutoriales/en-photo.jpg') },
  voice: { es: require('../assets/tutoriales/es-voice.jpg'), en: require('../assets/tutoriales/en-voice.jpg') },
  barcode: { es: require('../assets/tutoriales/es-barcode.jpg'), en: require('../assets/tutoriales/en-barcode.jpg') },
  coach: { es: require('../assets/tutoriales/es-coach.jpg'), en: require('../assets/tutoriales/en-coach.jpg') },
  plan: { es: require('../assets/tutoriales/es-plan.jpg'), en: require('../assets/tutoriales/en-plan.jpg') },
  gym: { es: require('../assets/tutoriales/es-gym.jpg'), en: require('../assets/tutoriales/en-gym.jpg') },
  weight: { es: require('../assets/tutoriales/es-weight.jpg'), en: require('../assets/tutoriales/en-weight.jpg') },
  chef: { es: require('../assets/tutoriales/es-chef.jpg'), en: require('../assets/tutoriales/en-chef.jpg') },
  menu: { es: require('../assets/tutoriales/es-menu.jpg'), en: require('../assets/tutoriales/en-menu.jpg') },
  datos: { es: require('../assets/tutoriales/es-datos.jpg'), en: require('../assets/tutoriales/en-datos.jpg') },
  security: { es: require('../assets/tutoriales/es-security.jpg'), en: require('../assets/tutoriales/en-security.jpg') },
  clone: { es: require('../assets/tutoriales/es-clone.jpg'), en: require('../assets/tutoriales/en-clone.jpg') },
};
const STEP_MS = 5000;

export function Tutorials() {
  const { t } = useTranslation();
  return <Screen title={`🎬 ${t('tu.title')}`}>
    <T>{t('tu.sub')}</T>
    <Btn testID="tut-go-home" label={`🏠  ${t('nav.home')}`} onPress={() => router.replace('/')} />
    {TUTS.map((x) => <Pressable key={x.id} testID={`tut-${x.id}`} accessibilityRole="button" accessibilityLabel={`${t('tu.play')}: ${t(`tu.f.${x.id}.t`)}`}
      onPress={() => router.push({ pathname: '/tutorial', params: { id: x.id } } as any)}
      style={({ pressed }) => [s.card, s.row, { minHeight: 80, gap: 14, opacity: pressed ? 0.7 : 1 }]}>
      <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: C.white, fontSize: 26 }}>▶</Text></View>
      <View style={{ flex: 1 }}><T style={{ fontWeight: '800' }}>{x.icon} {t(`tu.f.${x.id}.t`)}</T><Text style={s.muted}>{t('tu.len')}</Text></View></Pressable>)}
  </Screen>;
}

export function TutorialPlayer() {
  const { t } = useTranslation(); const { id } = useLocalSearchParams<{ id: string }>(); const tut = TUTS.find((x) => x.id === id) || TUTS[0];
  const [step, setStep] = useState(-1); const [paused, setPaused] = useState(false); const [voice, setVoice] = useState(true); const [reduce, setReduce] = useState(false);
  const z = useRef(new Animated.Value(0)).current; const prog = useRef(0); const [pct, setPct] = useState(0);
  const caps = [1, 2, 3].map((n) => t(`tu.f.${tut.id}.s${n}`));
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {}); return () => { Speech.stop(); }; }, []);
  const say = (txt: string) => { Speech.stop(); if (voice) Speech.speak(txt, { language: fmtLocale(), rate: 0.95 }); };
  useEffect(() => {
    if (step < 0 || step > 2) return; say(caps[step]); z.setValue(0); prog.current = 0;
    if (!reduce) Animated.timing(z, { toValue: 1, duration: STEP_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [step]);
  useEffect(() => {
    if (step < 0 || step > 2 || paused) return;
    const iv = setInterval(() => { prog.current += 100; setPct((step * STEP_MS + prog.current) / (3 * STEP_MS)); if (prog.current >= STEP_MS) setStep((x) => x + 1); }, 100);
    return () => clearInterval(iv);
  }, [step, paused]);
  useEffect(() => { if (step === 3) { Speech.stop(); if (voice) Speech.speak(t('tu.done'), { language: fmtLocale() }); } }, [step]);
  const img = IMG[tut.id][curLang() === 'es' ? 'es' : 'en']; const f = tut.focus[Math.max(0, Math.min(2, step))];
  const scale = z.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ty = z.interpolate({ inputRange: [0, 1], outputRange: [0, (0.5 - f) * 220] });
  return <Screen nav={false} title={`${tut.icon} ${t(`tu.f.${tut.id}.t`)}`}>
    <View testID="tut-video" style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: '#1A1423', height: 440, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ width: 210, height: 440, transform: [{ scale: step >= 0 ? scale : 1 }, { translateY: step >= 0 ? ty : 0 }] }}>
        <Image source={img} style={{ width: 210, height: 440, opacity: step < 0 || step > 2 ? 0.45 : 1 }} resizeMode="cover" accessibilityIgnoresInvertColors /></Animated.View>
      {step < 0 || step > 2 ? <Pressable testID="tut-play" accessibilityRole="button" accessibilityLabel={t(step > 2 ? 'tu.again' : 'tu.play')} onPress={() => { setPct(0); setPaused(false); setStep(0); }}
        style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: C.white }}>
        <Text style={{ color: C.white, fontSize: 52, marginLeft: step > 2 ? 0 : 8 }}>{step > 2 ? '↻' : '▶'}</Text></Pressable>
        : <View testID="tut-caption" style={{ position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: '#000C', borderRadius: 14, padding: 12 }}>
          <Text style={{ color: C.accent, fontWeight: '900', fontSize: 15 }}>{t('tu.step', { n: step + 1 })}/3</Text>
          <Text style={{ color: C.white, fontSize: 20, fontWeight: '700', lineHeight: 27 }}>{caps[step]}</Text></View>}
    </View>
    <Bar value={step > 2 ? 1 : pct} max={1} color={C.secondary} />
    {step >= 0 && step <= 2 && <View style={[s.row, { gap: 8 }]}>
      <Btn small kind="ghost" style={{ flex: 1 }} label="⏮" a11y={t('tu.prev')} onPress={() => setStep(Math.max(0, step - 1))} />
      <Btn small kind="secondary" style={{ flex: 1.4 }} testID="tut-pause" label={paused ? `▶ ${t('tu.resume')}` : `⏸ ${t('tu.pause')}`} onPress={() => { if (!paused) Speech.stop(); setPaused(!paused); }} />
      <Btn small kind="ghost" style={{ flex: 1 }} label="⏭" a11y={t('tu.next')} onPress={() => setStep(step + 1)} /></View>}
    <Btn small kind="ghost" label={voice ? `🔊 ${t('tu.voiceOn')}` : `🔇 ${t('tu.voiceOff')}`} onPress={() => { if (voice) Speech.stop(); setVoice(!voice); }} />
    {step > 2 && <Card style={{ backgroundColor: C.tint }}><T style={{ fontWeight: '800' }}>✅ {t('tu.done')}</T></Card>}
    <Btn testID="tut-try" label={`👉  ${t('tu.try')}`} onPress={() => { Speech.stop(); router.push(tut.route as any); }} />
    <Btn kind="ghost" label={`🎬  ${t('tu.all')}`} onPress={() => { Speech.stop(); router.push('/tutoriales' as any); }} />
  </Screen>;
}
