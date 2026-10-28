/** iPhone/Android (Hermes) no traen Web Crypto. Sin esto, crear PIN/contraseña, la copia cifrada, el ID de pagos
 *  (Premium/Apple) y los amigos fallaban solo en la app nativa. Se instala únicamente si falta (la web usa la nativa del navegador).
 *  Aleatorio: UUID v4 nativo de Expo (SecRandomCopyBytes / SecureRandom). Hash/cifrado: @noble (JS puro, auditado). */
import { sha256 } from '@noble/hashes/sha2';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { gcm } from '@noble/ciphers/aes';

const u8 = (d: any): Uint8Array => d instanceof Uint8Array ? d : ArrayBuffer.isView(d) ? new Uint8Array(d.buffer, d.byteOffset, d.byteLength) : new Uint8Array(d);
const ab = (b: Uint8Array): ArrayBuffer => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const algo = (a: any) => String(typeof a === 'string' ? a : a?.name || '').toUpperCase();

export function nativeRandom(n: number, uuid: () => string): Uint8Array {
  const out = new Uint8Array(n); let i = 0;
  while (i < n) {
    const h = uuid().replace(/-/g, ''); // 32 hex; posiciones 12 (versión) y 16 (variante) no son aleatorias
    const nib = (h.slice(0, 12) + h.slice(13, 16) + h.slice(17)).split('').map((c) => parseInt(c, 16)); // 30 nibbles aleatorios
    for (let j = 0; j + 1 < nib.length && i < n; j += 2) out[i++] = (nib[j] << 4) | nib[j + 1];
  }
  return out;
}

export function makeCrypto(uuid: () => string) {
  const subtle = {
    async digest(a: any, data: any) { if (algo(a) !== 'SHA-256') throw new Error('unsupported'); return ab(sha256(u8(data))); },
    async importKey(_f: string, raw: any, a: any) { return { kind: algo(a), raw: u8(raw).slice() }; },
    async deriveBits(p: any, key: any, bits: number) {
      if (algo(p) !== 'PBKDF2' || algo(p.hash) !== 'SHA-256') throw new Error('unsupported');
      return ab(await pbkdf2Async(sha256, key.raw, u8(p.salt), { c: p.iterations, dkLen: bits / 8, asyncTick: 50 }));
    },
    async deriveKey(p: any, key: any, out: any) {
      const bits = await subtle.deriveBits(p, key, out?.length || 256); return { kind: algo(out), raw: new Uint8Array(bits) };
    },
    async encrypt(p: any, key: any, data: any) { return ab(gcm(key.raw, u8(p.iv), p.additionalData ? u8(p.additionalData) : undefined).encrypt(u8(data))); },
    async decrypt(p: any, key: any, data: any) { return ab(gcm(key.raw, u8(p.iv), p.additionalData ? u8(p.additionalData) : undefined).decrypt(u8(data))); },
  };
  return {
    getRandomValues<T extends ArrayBufferView | null>(arr: T): T {
      if (!arr) return arr; const v = u8(arr); v.set(nativeRandom(v.length, uuid)); return arr;
    },
    subtle,
  };
}

function utf8Decode(b: Uint8Array): string {
  let s = ''; for (let i = 0; i < b.length;) { const c = b[i++];
    if (c < 0x80) s += String.fromCharCode(c);
    else if (c < 0xe0) s += String.fromCharCode(((c & 31) << 6) | (b[i++] & 63));
    else if (c < 0xf0) s += String.fromCharCode(((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63));
    else { const cp = (((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63)) - 0x10000; s += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 1023)); } }
  return s;
}

export function installCryptoShim(g: any = globalThis): boolean {
  if (typeof g.TextDecoder === 'undefined') g.TextDecoder = class { decode(d?: any) { return d ? utf8Decode(u8(d)) : ''; } };
  if (g.crypto?.subtle && g.crypto?.getRandomValues) return false;
  const uuid = g.expo?.uuidv4 ? () => g.expo.uuidv4() : g.crypto?.randomUUID ? () => g.crypto.randomUUID() : null;
  if (!uuid) return false; // sin fuente aleatoria segura: no se inventa una
  const c = makeCrypto(uuid);
  const tgt = g.crypto || {};
  if (!tgt.getRandomValues) tgt.getRandomValues = c.getRandomValues;
  if (!tgt.subtle) tgt.subtle = c.subtle;
  if (!g.crypto) g.crypto = tgt;
  return true;
}
installCryptoShim();
