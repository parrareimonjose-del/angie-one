/** Gancho único de Face ID / Touch ID / huella. Web: llave de acceso WebAuthn (ya funciona).
 *  iOS/Android nativo: preparado para `expo-local-authentication` (no instalado aún; sin cuenta de Apple Developer).
 *  Para activarlo en iOS: `npx expo install expo-local-authentication`, añadir NSFaceIDUsageDescription en app.json
 *  y cambiar NATIVE_READY a true. La interfaz no cambia, así que las pantallas no se tocan. */
import { Platform } from 'react-native';
import { bioAvailable, bioRegister, bioUnlock } from './auth';
export const NATIVE_READY = false;
export type BioKind = 'faceid' | 'touchid' | 'fingerprint' | 'passkey' | 'none';
// Al activar iOS: cambiar por import estático de expo-local-authentication.
async function native(): Promise<any | null> { if (!NATIVE_READY) return null; try { const m = 'expo-local-authentication'; return (globalThis as any).require ? (globalThis as any).require(m) : null; } catch { return null; } }
export async function biometricKind(): Promise<BioKind> {
  if (Platform.OS === 'web') return (await bioAvailable()) ? 'passkey' : 'none';
  const L = await native(); if (!L || !(await L.hasHardwareAsync()) || !(await L.isEnrolledAsync())) return 'none';
  const t: number[] = await L.supportedAuthenticationTypesAsync(); return t.includes(2) ? (Platform.OS === 'ios' ? 'faceid' : 'fingerprint') : t.includes(1) ? (Platform.OS === 'ios' ? 'touchid' : 'fingerprint') : 'none';
}
/** Web: crea la llave de acceso y devuelve su id. Nativo: no hace falta registrar (usa el Face ID del sistema): devuelve 'native'. */
export async function biometricEnroll(name: string): Promise<string> { if (Platform.OS === 'web') return bioRegister(name); if ((await biometricKind()) === 'none') throw new Error('bio_unavailable'); return 'native'; }
export async function biometricUnlock(id: string, reason = 'Angie One'): Promise<boolean> {
  if (Platform.OS === 'web') return bioUnlock(id);
  const L = await native(); if (!L) return false; try { const r = await L.authenticateAsync({ promptMessage: reason, disableDeviceFallback: false }); return !!r.success; } catch { return false; }
}
