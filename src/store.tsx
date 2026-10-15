import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { deviceLang, Lang } from './i18n';
import type { Coach } from './coach';

export type Profile = { goal: 'lose' | 'keep' | 'gain'; weight: number; height: number; age: number; sex: 'female' | 'male'; activity: 1 | 2 | 3 | 4 };
export type Entry = { id: string; date: string; time: number; name: string; kcal: number; p: number; c: number; f: number; source: 'photo' | 'barcode' | 'manual' | 'quick'; fiber?: number; meal?: number };
export type State = {
  profile?: Profile; trialStart?: number; langOverride?: Lang | null; aiEnabled: boolean;
  entries: Entry[]; water: Record<string, number>; challengeDays: string[]; aiPhotos: Record<string, number>;
  founder: Record<string, 'approved' | 'rejected'>;
  coach?: Coach;
  macros?: import('./mfp5').MacroGoals; prep?: import('./mfp5').Prep; health?: import('./mfp5').HealthData;
  sub?: import('./billing').Sub; streakOff?: boolean; reports?: import('./verified').Report[]; myFoods?: import('./verified').VFood[];
};
const INITIAL: State = { aiEnabled: true, entries: [], water: {}, challengeDays: [], aiPhotos: {}, founder: {}, langOverride: null };
const KEY = 'angieone:v1';

export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Mifflin-St Jeor × actividad, con ajuste por objetivo y mínimo seguro. */
export function dailyTarget(p?: Profile) {
  if (!p) return { kcal: 2000, p: 100, c: 250, f: 67 };
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  const tdee = bmr * [1.2, 1.375, 1.55, 1.725][p.activity - 1];
  let kcal = tdee + (p.goal === 'lose' ? -450 : p.goal === 'gain' ? 300 : 0);
  kcal = Math.round(Math.max(kcal, p.sex === 'male' ? 1500 : 1200) / 10) * 10; // nunca por debajo del mínimo seguro
  const prot = Math.round(p.weight * (p.goal === 'gain' ? 2 : 1.6));
  const fat = Math.round((kcal * 0.28) / 9);
  const carbs = Math.max(0, Math.round((kcal - prot * 4 - fat * 9) / 4));
  return { kcal, p: prot, c: carbs, f: fat };
}

export const DAY = 86400000;
export const TRIAL_DAYS = 7, OFFER_HOURS = 48;
export function trialDaysLeft(start?: number, now = Date.now()) {
  if (!start) return 0;
  return Math.max(0, TRIAL_DAYS - Math.floor((now - start) / DAY));
}
/** Fase comercial local: prueba de 7 días → oferta de 48 h con precio congelado → versión gratis. */
export function trialPhase(start?: number, now = Date.now()) {
  if (!start) return { phase: 'none' as const, daysLeft: 0, offerMsLeft: 0 };
  const trialEnd = start + TRIAL_DAYS * DAY, offerEnd = trialEnd + OFFER_HOURS * 3600000;
  if (now < trialEnd) return { phase: 'trial' as const, daysLeft: trialDaysLeft(start, now), offerMsLeft: 0 };
  if (now < offerEnd) return { phase: 'offer' as const, daysLeft: 0, offerMsLeft: offerEnd - now };
  return { phase: 'free' as const, daysLeft: 0, offerMsLeft: 0 };
}
export const fmtCountdown = (ms: number) => { const m = Math.max(0, Math.floor(ms / 60000)); return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`; };

export function streak(days: string[]) {
  const set = new Set(days); let n = 0; const d = new Date();
  if (!set.has(today(d))) d.setDate(d.getDate() - 1);
  while (set.has(today(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

type Ctx = { s: State; ready: boolean; set: (fn: (s: State) => State) => void; reset: () => void };
const C = createContext<Ctx>(null as any);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<State>(INITIAL);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      const v = raw ? { ...INITIAL, ...JSON.parse(raw) } : INITIAL;
      setS(v); i18n.changeLanguage(v.langOverride || deviceLang()); setReady(true);
    }).catch(() => setReady(true));
  }, []);
  const set = useCallback((fn: (s: State) => State) => {
    setS((prev) => { const next = fn(prev); AsyncStorage.setItem(KEY, JSON.stringify(next)); return next; });
  }, []);
  const reset = useCallback(() => { AsyncStorage.removeItem(KEY); AsyncStorage.removeItem('angieone:clone'); setS(INITIAL); i18n.changeLanguage(deviceLang()); }, []);
  return <C.Provider value={{ s, ready, set, reset }}>{children}</C.Provider>;
}
export const useStore = () => useContext(C);
export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
