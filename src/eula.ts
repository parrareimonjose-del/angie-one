/** Términos / EULA con tolerancia cero (UGC). Hay que aceptarlos antes de Amigos o aportes. */
import type { State } from './store';

export const EULA_VERSION = 1;

export function eulaAccepted(st: Pick<State, 'eula'> | undefined | null): boolean {
  return !!st?.eula && st.eula.v >= EULA_VERSION && !!st.eula.at;
}

export function acceptEula(): { v: number; at: number } {
  return { v: EULA_VERSION, at: Date.now() };
}
