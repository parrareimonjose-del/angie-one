/**
 * Capa de IA para estimar platos.
 * - Si existe EXPO_PUBLIC_GEMINI_API_KEY → llama a Gemini Flash-Lite (capa gratuita de Google AI Studio).
 * - Si no → MODO DEMO claramente etiquetado (estimación simulada).
 * TODO producción: mover la llamada a un backend/proxy (p. ej. Cloudflare Worker gratis) para no exponer la clave en el cliente.
 */
export type Estimate = { name: string; kcalMin: number; kcalMax: number; p: number; c: number; f: number; confidence: 'high' | 'medium' | 'low'; mode: 'live' | 'demo' };

const KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash-lite';
export const aiMode: 'live' | 'demo' = KEY ? 'live' : 'demo';

const PROMPT = `You are a nutrition estimator for Latin American and international food. Look at the meal photo and answer ONLY JSON:
{"name": short dish name in LANG, "kcalMin": int, "kcalMax": int, "p": grams protein, "c": grams carbs, "f": grams fat, "confidence": "high"|"medium"|"low"}
Give a realistic RANGE, not a single value. Never comment on body weight or give medical advice.`;

export async function estimateMeal(base64: string, mime: string, lang: string): Promise<Estimate> {
  if (!KEY) return demoEstimate();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT.replace('LANG', lang) }, { inline_data: { mime_type: mime, data: base64 } }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
  });
  if (!res.ok) throw new Error('AI ' + res.status);
  const j = await res.json();
  const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const o = JSON.parse(txt);
  return { name: String(o.name || '?'), kcalMin: +o.kcalMin || 0, kcalMax: +o.kcalMax || 0, p: +o.p || 0, c: +o.c || 0, f: +o.f || 0, confidence: o.confidence || 'medium', mode: 'live' };
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
