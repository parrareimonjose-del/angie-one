// Sistema de diseño Angie One (rediseño 2026-10-15)
// Claro = A «Vibrante» · Oscuro = B «Elegante premium». Sigue el teléfono, con cambio manual en Ajustes.
// C es MUTABLE: applyTheme() reescribe sus valores y la raíz se vuelve a montar, así todas las pantallas cambian sin tocar cada una.
import { Platform } from 'react-native';

export type Mode = 'light' | 'dark';
export type Pref = 'system' | Mode;

const LIGHT = {
  mode: 'light' as Mode,
  primary: '#E11D48', secondary: '#7C3AED', accent: '#F59E0B',
  onAccent: '#1B1030', text: '#1B1030', muted: '#6B5A80',
  bg: '#FFF6F4', bg2: '#F6EEFF', card: '#FFFFFF', glass: 'rgba(255,255,255,0.78)', glassBorder: 'rgba(255,255,255,0.95)',
  border: '#EEDCEB', success: '#15803D', warning: '#B45309', white: '#FFFFFF',
  protein: '#7C3AED', carbs: '#D97706', fat: '#E11D48', water: '#0369A1',
  warnBg: '#FFF1DC', tint: '#EDE9FE', primarySoft: '#FFE4E8', tabActive: '#FFE4EC',
  shadow: '#7C3AED', shadowOpacity: 0.16, overlay: 'rgba(27,16,48,0.55)', input: '#FFFFFF',
};
const DARK: typeof LIGHT = {
  mode: 'dark',
  primary: '#FB7185', secondary: '#A78BFA', accent: '#FBBF24',
  onAccent: '#1B1030', text: '#F7F2FF', muted: '#A99BC2',
  bg: '#0E0A1A', bg2: '#1A1030', card: '#1B1430', glass: 'rgba(255,255,255,0.06)', glassBorder: 'rgba(255,255,255,0.12)',
  border: '#2E2548', success: '#4ADE80', warning: '#FBBF24', white: '#FFFFFF',
  protein: '#A78BFA', carbs: '#FBBF24', fat: '#FB7185', water: '#38BDF8',
  warnBg: '#3A2A12', tint: '#2A1F4A', primarySoft: '#3B1526', tabActive: '#2D1F4D',
  shadow: '#000000', shadowOpacity: 0.6, overlay: 'rgba(0,0,0,0.65)', input: '#150F26',
};
export const PALETTES = { light: LIGHT, dark: DARK };
export const C = { ...LIGHT };
export function applyTheme(m: Mode) { Object.assign(C, PALETTES[m]); }

// Botones con texto blanco: en oscuro el coral claro necesita un fondo más fuerte para AA.
export const btnBg = () => (C.mode === 'dark' ? { primary: '#E11D48', secondary: '#7C3AED' } : { primary: C.primary, secondary: C.secondary });

// Tipografía (mínimo 15; RN escala con el tamaño de letra del sistema: allowFontScaling por defecto)
export const serif = Platform.OS === 'ios' ? 'Georgia' : Platform.OS === 'android' ? 'serif' : 'Georgia, "Times New Roman", serif';
export const TYPE = {
  display: { fontSize: 40, fontWeight: '800' as const, letterSpacing: -1.5 },
  h1: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.8 },
  h2: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 17, lineHeight: 24 },
  label: { fontSize: 15, fontWeight: '600' as const },
};
export const SP = { xs: 4, s: 8, m: 12, l: 16, screen: 20, xl: 24, xxl: 32, top: 56 };
export const R = { chip: 14, btn: 18, card: 28, hero: 32, fab: 26 };
export const MIN_TAP = 60; // CTA 60, mínimo absoluto 56
export const EASE = 'cubic-bezier(.2,.8,.2,1)';
export const shadow = (k: 'card' | 'cta' = 'card') => k === 'cta'
  ? { shadowColor: '#E11D48', shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 8 }
  : { shadowColor: C.shadow, shadowOpacity: C.mode === 'dark' ? 0.6 : 0.14, shadowRadius: C.mode === 'dark' ? 22 : 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 };
