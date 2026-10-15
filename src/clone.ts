/** Clon IA: lógica pura (sin UI). Cuerpo paramétrico por altura, peso e IMC + fuerza por entrenamientos. Sin afirmaciones médicas. */
export type Shot = 'faceFront' | 'faceLeft' | 'faceRight' | 'bodyFront' | 'bodySide' | 'bodyBack';
export const SHOTS: Shot[] = ['faceFront', 'faceLeft', 'faceRight', 'bodyFront', 'bodySide', 'bodyBack'];
export type Traits = { skin: string; hair: string; hairLen: 'short' | 'medium' | 'long'; shoulders: number; hips: number; source: 'ai' | 'local' };
export type CloneData = { consent: number; adult: boolean; photos: Partial<Record<Shot, string>>; traits?: Traits; start?: { kg: number; date: string }; createdAt?: number };
export const CLONE_KEY = 'angieone:clone';
export const DEFAULT_TRAITS: Traits = { skin: '#E0AC8A', hair: '#3B2A20', hairLen: 'medium', shoulders: 1, hips: 1, source: 'local' };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const HEX = /^#[0-9a-fA-F]{6}$/;
/** Valida lo que devuelve la IA (nunca confiar en el servidor). */
export function cleanTraits(o: any, src: 'ai' | 'local' = 'ai'): Traits {
  return { skin: HEX.test(o?.skin) ? o.skin : DEFAULT_TRAITS.skin, hair: HEX.test(o?.hair) ? o.hair : DEFAULT_TRAITS.hair,
    hairLen: ['short', 'medium', 'long'].includes(o?.hairLen) ? o.hairLen : 'medium',
    shoulders: clamp(+o?.shoulders || 1, 0.85, 1.15), hips: clamp(+o?.hips || 1, 0.85, 1.15), source: src };
}
export const bmi = (kg: number, cm: number) => kg / Math.pow(cm / 100, 2);
/** Peso meta orientativo según el objetivo (nunca por debajo de IMC 20). */
export function goalKg(kg: number, cm: number, goal: 'lose' | 'keep' | 'gain') {
  const floor = 20 * Math.pow(cm / 100, 2);
  if (goal === 'lose') return Math.round(Math.max(floor, Math.min(kg * 0.92, 24.9 * Math.pow(cm / 100, 2))) * 10) / 10;
  if (goal === 'gain') return Math.round(kg * 1.04 * 10) / 10;
  return kg;
}
/** Fuerza 0..1 por número de entrenamientos registrados (30 = máximo visual). */
export const strengthOf = (workouts: number) => clamp(workouts / 30, 0, 1);
export type Body = { h: number; waist: number; chest: number; hip: number; arm: number; leg: number; muscle: number };
/** Medidas del dibujo (unidades relativas). Más IMC = más ancho; más fuerza = hombros y brazos marcados. */
export function bodyOf(kg: number, cm: number, sex: 'female' | 'male', strength: number, t: Traits = DEFAULT_TRAITS): Body {
  const b = clamp(bmi(kg, cm), 16, 45); const f = (b - 22) / 23; // -0.26..1
  const st = clamp(strength, 0, 1);
  const h = clamp(cm / 175, 0.82, 1.15);
  const base = sex === 'male' ? { chest: 34, waist: 28, hip: 30 } : { chest: 31, waist: 25, hip: 33 };
  return { h, chest: (base.chest * (1 + f * 1.0) + st * 4) * t.shoulders, waist: base.waist * (1 + f * 1.6) - st * 1.5,
    hip: base.hip * (1 + f * 1.1) * t.hips, arm: 8 * (1 + f * 0.7) + st * 3, leg: 11 * (1 + f * 0.7) + st * 2, muscle: st };
}
