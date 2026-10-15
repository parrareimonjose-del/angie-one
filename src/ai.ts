/**
 * Capa de IA para estimar platos.
 * Llama al proxy gratis de Cloudflare Worker (la clave de Gemini vive solo en el Worker como secreto).
 * Si algo falla lanza AIError con un código claro para mostrar un mensaje entendible (nunca inventa datos).
 */
export type Estimate = { name: string; kcalMin: number; kcalMax: number; p: number; c: number; f: number; confidence: 'high' | 'medium' | 'low'; mode: 'live' | 'demo' };
export type AIErrorCode = 'offline' | 'busy' | 'tooLarge' | 'notFood' | 'server';
export class AIError extends Error { constructor(public code: AIErrorCode) { super(code); } }

import { aiUrl } from './ai-config';
export const AI_URL = aiUrl('estimate');
const TIMEOUT_MS = 30000;

async function once(body: string): Promise<Estimate> {
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { clearTimeout(timer); throw new AIError('offline'); }
  let res: Response;
  try { res = await fetch(AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: ctl.signal }); }
  catch { throw new AIError('offline'); }
  finally { clearTimeout(timer); }
  let o: any = {}; try { o = await res.json(); } catch { /* vacío */ }
  if (!res.ok) {
    if (res.status === 413) throw new AIError('tooLarge');
    if (res.status === 429 || o.error === 'busy') throw new AIError('busy');
    if (o.error === 'not_food') throw new AIError('notFood');
    throw new AIError('server');
  }
  const n = (v: any) => Math.max(0, Math.round(+v || 0));
  let lo = n(o.kcalMin), hi = n(o.kcalMax); if (lo > hi) [lo, hi] = [hi, lo];
  if (!hi || !o.name) throw new AIError('notFood');
  return { name: String(o.name), kcalMin: lo, kcalMax: hi, p: n(o.p), c: n(o.c), f: n(o.f), confidence: ['high', 'medium', 'low'].includes(o.confidence) ? o.confidence : 'medium', mode: 'live' };
}

/** 1 reintento automático si la red o el servidor fallan (el Worker ya reintenta contra Google). */
async function callAI(payload: object): Promise<Estimate> {
  const body = JSON.stringify(payload);
  try { return await once(body); }
  catch (e: any) {
    if (e instanceof AIError && (e.code === 'offline' || e.code === 'server')) { await new Promise((r) => setTimeout(r, 1200)); return once(body); }
    throw e;
  }
}

export function estimateMeal(base64: string, mime: string, lang: string): Promise<Estimate> {
  return callAI({ image: base64, mime, lang });
}
export function estimateText(text: string, lang: string): Promise<Estimate> {
  return callAI({ text: text.trim().slice(0, 500), lang });
}

/** Ajustes de 1 toque y porción sobre la estimación. */
export function refine(e: Estimate, a: { oil?: boolean; sauce?: boolean; fried?: boolean; portion: number }) {
  let add = 0, fat = 0;
  if (a.oil) { add += 90; fat += 10; }
  if (a.sauce) { add += 60; fat += 4; }
  if (a.fried) { add += 120; fat += 12; }
  const k = a.portion;
  return { min: Math.round((e.kcalMin + add) * k), max: Math.round((e.kcalMax + add) * k), p: Math.round(e.p * k), c: Math.round(e.c * k), f: Math.round((e.f + fat) * k) };
}
