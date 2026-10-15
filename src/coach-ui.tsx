import React from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Speech from 'expo-speech';
import { Screen, Card, Btn, T, s } from './ui';
import { C } from './theme';
import { fmtLocale } from './i18n';
import { useStore } from './store';
import { Coach, coachOf, Meal, Exercise, WorkoutDay, isPremium } from './coach';

export function useCoach() {
  const { s: st, set, ready } = useStore(); const c = coachOf(st);
  const upd = (fn: (c: Coach) => Coach) => set((x) => ({ ...x, coach: fn(coachOf(x)) }));
  return { st, c, upd, set, ready, premium: isPremium(st) };
}
export const speak = (text: string) => { Speech.stop(); Speech.speak(text, { language: fmtLocale() }); };
export const dayName = (i: number, long = false) => new Date(2024, 0, 1 + i).toLocaleDateString(fmtLocale(), { weekday: long ? 'long' : 'short' });

export function useNames() {
  const { t } = useTranslation();
  return {
    meal: (m: Meal) => (m.key ? t(`cfood.${m.key}.n`) : m.name || '?'),
    items: (m: Meal) => (m.key ? t(`cfood.${m.key}.i`) : m.items || ''),
    ex: (e: Exercise) => (e.key ? t(`cex.${e.key}.n`) : e.name || '?'),
    desc: (e: Exercise) => (e.key ? t(`cex.${e.key}.d`) : e.desc || ''),
    dayTitle: (d: WorkoutDay) => (d.titleKey ? t(`coach.${d.titleKey}`) : d.title || ''),
  };
}

/** Pantalla bloqueada después de la prueba: muestra un adelanto y lleva a Premium. */
export function CoachLocked() {
  const { t } = useTranslation();
  return (
    <Screen title={`💪 ${t('coach.title')}`}>
      <Card style={{ backgroundColor: C.secondary }}>
        <Text style={[s.h2, { color: C.white }]}>🔒 {t('coach.lockedTitle')}</Text>
        <Text style={[s.t, { color: C.white }]}>{t('coach.lockedBody')}</Text>
      </Card>
      <Card style={{ opacity: 0.55 }}>
        {(['teaser1', 'teaser2', 'teaser3', 'teaser4'] as const).map((k) => <T key={k}>✨ {t(`coach.${k}`)}</T>)}
      </Card>
      <Btn kind="accent" label={`⭐ ${t('coach.unlock')}`} onPress={() => router.push('/paywall')} />
      <Text style={[s.muted, { textAlign: 'center' }]}>{t('coach.keepData')}</Text>
    </Screen>
  );
}

export const Disclaimer = () => { const { t } = useTranslation(); return <Text style={[s.muted, { fontSize: 14 }]}>ℹ️ {t('coach.notMedical')}</Text>; };
export const Row = ({ children }: { children: React.ReactNode }) => <View style={[s.row, { flexWrap: 'wrap' }]}>{children}</View>;
