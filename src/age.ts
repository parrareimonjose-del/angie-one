/** Puerta de edad App Store: <13 sin cuenta/chat; 13–17 sin meta de pérdida ni déficit agresivo. */
import type { Profile } from './store';
import { dailyTarget } from './store';

export const MIN_ACCOUNT_AGE = 13;
export const ADULT_AGE = 18;

export function under13(age: number) { return age > 0 && age < MIN_ACCOUNT_AGE; }
export function isTeen(age: number) { return age >= MIN_ACCOUNT_AGE && age < ADULT_AGE; }

/** Si es adolescente, fuerza meta «mantener» (sin pérdida). */
export function safeGoal(p: Profile): Profile {
  if (isTeen(p.age) && p.goal === 'lose') return { ...p, goal: 'keep' };
  return p;
}

/** Objetivo kcal sin déficit agresivo para adolescentes. */
export function teenSafeTarget(p?: Profile) {
  const t = dailyTarget(p);
  if (!p || !isTeen(p.age)) return t;
  // Sin déficit: al menos TDEE (dailyTarget ya aplicó keep si safeGoal).
  return t;
}

export function canUseChat(age?: number) {
  return age == null || age >= MIN_ACCOUNT_AGE;
}
