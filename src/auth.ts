// Entrada fácil para mayores. TODO queda en este dispositivo: el PIN/contraseña se guarda como hash PBKDF2 con sal,
// nunca en texto. Huella/Face ID usa la llave de acceso (WebAuthn) del propio teléfono. Cuentas en la nube: pendiente de conexión.
import AsyncStorage from '@react-native-async-storage/async-storage';
export type Auth = { name: string; kind: 'pin' | 'password'; salt: string; hash: string; remember: boolean; passkeyId?: string; recSalt?: string; recHash?: string; fails: number; lockUntil: number; createdAt: number };
export const AUTH_KEY = 'angieone:auth'; export const SESSION_KEY = 'angieone:unlocked';
export const MAX_FAILS = 5, LOCK_MS = 30000;
const hex = (b: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(b as ArrayBuffer), (x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (h: string) => Uint8Array.from(h.match(/../g) || [], (x) => parseInt(x, 16));
export const randHex = (n = 16) => hex(crypto.getRandomValues(new Uint8Array(n)));
export async function hashSecret(secret: string, salt: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unhex(salt), iterations: 120000, hash: 'SHA-256' }, k, 256));
}
/** PIN: 4-8 cifras. Contraseña: 6+ caracteres. Devuelve la clave del error o ''. */
export function validSecret(kind: Auth['kind'], v: string) {
  if (kind === 'pin') return /^\d{4,8}$/.test(v) ? (/^(\d)\1+$/.test(v) || '0123456789'.includes(v) ? 'weakPin' : '') : 'pinLen';
  return v.length >= 6 ? '' : 'pwLen';
}
export async function createAuth(name: string, kind: Auth['kind'], secret: string, remember: boolean): Promise<Auth> {
  const salt = randHex(); return { name: name.trim().slice(0, 40), kind, salt, hash: await hashSecret(secret, salt), remember, fails: 0, lockUntil: 0, createdAt: Date.now() };
}
/** Comprueba el secreto con límite de intentos (5 fallos → espera 30 s). */
export async function checkSecret(a: Auth, secret: string, now = Date.now()): Promise<{ ok: boolean; auth: Auth; locked?: number }> {
  if (a.lockUntil > now) return { ok: false, auth: a, locked: a.lockUntil - now };
  const ok = (await hashSecret(secret, a.salt)) === a.hash;
  if (ok) return { ok, auth: { ...a, fails: 0, lockUntil: 0 } };
  const fails = a.fails + 1; const lockUntil = fails >= MAX_FAILS ? now + LOCK_MS : 0;
  return { ok, auth: { ...a, fails: lockUntil ? 0 : fails, lockUntil }, locked: lockUntil ? LOCK_MS : undefined };
}
export const loadAuth = async (): Promise<Auth | null> => { try { const r = await AsyncStorage.getItem(AUTH_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
export const saveAuth = (a: Auth | null) => (a ? AsyncStorage.setItem(AUTH_KEY, JSON.stringify(a)) : AsyncStorage.removeItem(AUTH_KEY));
const ss = () => (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
export const isUnlocked = () => ss()?.getItem(SESSION_KEY) === '1';
export const markUnlocked = (v = true) => { const s = ss(); if (!s) return; v ? s.setItem(SESSION_KEY, '1') : s.removeItem(SESSION_KEY); };
/** ¿Hay que pedir la entrada? Solo si hay bloqueo, no se recuerda el dispositivo y no se abrió en esta sesión. */
export const needsUnlock = (a: Auth | null, unlocked: boolean) => !!a && !a.remember && !unlocked;

// ---------- Huella / Face ID (WebAuthn, autenticador del propio dispositivo) ----------
const b64u = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
export async function bioAvailable(): Promise<boolean> {
  try { const P: any = typeof window !== 'undefined' ? (window as any).PublicKeyCredential : undefined;
    return !!P && typeof P.isUserVerifyingPlatformAuthenticatorAvailable === 'function' && window.isSecureContext && (await P.isUserVerifyingPlatformAuthenticatorAvailable()); } catch { return false; }
}
export async function bioRegister(name: string): Promise<string> {
  const cred: any = await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'Angie One' },
    user: { id: crypto.getRandomValues(new Uint8Array(16)), name: name || 'Angie One', displayName: name || 'Angie One' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' }, timeout: 60000, attestation: 'none' } });
  if (!cred?.rawId) throw new Error('bio_cancel');
  return b64u(cred.rawId);
}
export async function bioUnlock(id: string): Promise<boolean> {
  try { const a: any = await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: unb64u(id) }], userVerification: 'required', timeout: 60000 } });
    return !!a && b64u(a.rawId) === id; } catch { return false; }
}

// ---------- «Olvidé mi contraseña» sin servidor (gratis): código de recuperación de un solo uso ----------
// Se muestra UNA vez al crear la entrada; solo se guarda su hash PBKDF2. Con él se pone un PIN/contraseña nuevo sin perder datos.
const RC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const normRec = (c: string) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export async function newRecovery(): Promise<{ code: string; recSalt: string; recHash: string }> {
  const r = crypto.getRandomValues(new Uint8Array(12)); const raw = Array.from(r, (x) => RC[x % RC.length]).join('');
  const code = raw.match(/.{4}/g)!.join('-'); const recSalt = randHex(); return { code, recSalt, recHash: await hashSecret(normRec(code), recSalt) };
}
/** Comparte el límite de intentos con el PIN (5 fallos → 30 s). */
export async function recoverWith(a: Auth, code: string, kind: Auth['kind'], secret: string, now = Date.now()): Promise<{ ok: boolean; auth: Auth; err?: string; code?: string }> {
  if (!a.recHash || !a.recSalt) return { ok: false, auth: a, err: 'noRec' };
  if (a.lockUntil > now) return { ok: false, auth: a, err: 'locked' };
  if ((await hashSecret(normRec(code), a.recSalt)) !== a.recHash) { const fails = a.fails + 1; const lockUntil = fails >= MAX_FAILS ? now + LOCK_MS : 0; return { ok: false, auth: { ...a, fails: lockUntil ? 0 : fails, lockUntil }, err: 'badRec' }; }
  const e = validSecret(kind, secret); if (e) return { ok: false, auth: a, err: e };
  const n = await createAuth(a.name, kind, secret, a.remember); const rec = await newRecovery(); // el código usado deja de valer: se da uno nuevo
  return { ok: true, auth: { ...n, passkeyId: a.passkeyId, recSalt: rec.recSalt, recHash: rec.recHash }, code: rec.code };
}
/** Campos para que el navegador / iCloud Keychain / Google ofrezcan guardar y rellenar la contraseña. */
export const pwAutofill = (mode: 'current' | 'new', kind: Auth['kind']) => kind === 'pin'
  ? ({ autoComplete: mode === 'new' ? 'new-password' : 'current-password', textContentType: mode === 'new' ? 'newPassword' : 'password', importantForAutofill: 'yes' } as const)
  : ({ autoComplete: mode === 'new' ? 'new-password' : 'current-password', textContentType: mode === 'new' ? 'newPassword' : 'password', importantForAutofill: 'yes' } as const);
