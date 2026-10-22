/**
 * Módulo de configuración reutilizable de la IA de Angie One (portátil a otras apps de Parra Apps).
 * Para migrar: copia este archivo + src/safety.ts + worker/ y cambia APP_AI (ver docs/migracion-ia.md).
 * Nunca pongas claves aquí: la clave de Gemini vive solo como secreto del Worker.
 */
export type AiAppConfig = {
  appId: string; appName: string; workerBase: string;
  endpoints: Record<'estimate' | 'plan' | 'chat' | 'vision' | 'dev' | 'receipt' | 'clone', string>;
  model: string; timeoutMs: number; retries: number; locales: string[];
  persona: string; forbiddenTopics: string[]; neverActions: string[];
};
export const APP_AI: AiAppConfig = {
  appId: 'angie-one', appName: 'Angie One',
  // QA/dev: EXPO_PUBLIC_WORKER_BASE=http://localhost:8812 (wrangler dev, KV local) para no gastar el KV gratis de producción.
  workerBase: process.env.EXPO_PUBLIC_WORKER_BASE || 'https://angie-one-ai.angieoneapp-support.workers.dev',
  endpoints: { estimate: '/estimate', plan: '/plan', chat: '/chat', vision: '/vision', dev: '/dev', receipt: '/estimate', clone: '/clone' },
  model: 'gemini-flash-lite-latest', timeoutMs: 30000, retries: 1,
  locales: ['es', 'en', 'pt', 'fr', 'de', 'it', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'],
  persona: 'Angie: coach cálida de nutrición y ejercicio; respuestas cortas, en el idioma del usuario; nunca diagnostica.',
  forbiddenTopics: ['diagnóstico médico', 'dosis de medicamentos', 'dietas por debajo del mínimo seguro', 'ejercicio con lesión sin profesional'],
  neverActions: ['publish', 'deploy', 'move_money', 'bank', 'send_message', 'sell_data'],
};
export const aiUrl = (k: keyof AiAppConfig['endpoints'], c: AiAppConfig = APP_AI) => c.workerBase + c.endpoints[k];
/** Crea la config de otra app a partir de la de Angie One (solo cambia lo que pases). */
export const makeAiConfig = (over: Partial<AiAppConfig> & { appId: string; appName: string; workerBase: string }): AiAppConfig => ({ ...APP_AI, ...over, endpoints: { ...APP_AI.endpoints, ...(over.endpoints || {}) } });
/** Ninguna IA de la app puede hacer estas acciones: siempre devuelve false. */
export const aiMayDo = (action: string) => !APP_AI.neverActions.includes(action) && !/publish|deploy|money|bank|pay|transfer|sell|send/i.test(action);
