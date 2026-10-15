/**
 * Capa de IA para estimar platos.
 * - Llama al proxy gratis de Cloudflare Worker (la clave de Gemini vive solo en el Worker como secreto).
 * - Si el Worker falla → MODO DEMO claramente etiquetado (estimación simulada).
 */
export type Estimate = { name: string; kcalMin: number; kcalMax: number; p: number; c: number; f: number; confidence: 'high' | 'medium' | 'low'; mode: 'live' | 'demo' };

export const AI_URL = 'https://angie-one-ai.angieoneapp-support.workers.dev/estimate';
export const aiMode: 'live' | 'demo' = 'live';

async function callAI(body: object): Promise<Estimate> {
  try {
    const res = await fetch(AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('AI ' + res.status);
    const o = await res.json();
    return { name: String(o.name || '?'), kcalMin: +o.kcalMin || 0, kcalMax: +o.kcalMax || 0, p: +o.p || 0, c: +o.c || 0, f: +o.f || 0, confidence: o.confidence || 'medium', mode: 'live' };
  } catch {
    return demoEstimate();
  }
}

export function estimateMeal(base64: string, mime: string, lang: string): Promise<Estimate> {
  return callAI({ image: base64, mime, lang });
}

export function estimateText(text: string, lang: string): Promise<Estimate> {
  return callAI({ text, lang });
}

const DEMO = [
  { name: 'Arroz, frijoles y pollo', kcalMin: 520, kcalMax: 680, p: 38, c: 75, f: 14 },
  { name: 'Arepa con queso y aguacate', kcalMin: 410, kcalMax: 560, p: 14, c: 48, f: 22 },
  { name: 'Ensalada con huevo', kcalMin: 250, kcalMax: 360, p: 16, c: 14, f: 18 },
];
function demoEstimate(): Promise<Estimate> {
  const d = DEMO[Math.floor(Math.random() * DEMO.length)];
  return new Promise((r) => setTimeout(() => r({ ...d, confidence: 'medium', mode: 'demo' }), 900));
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
