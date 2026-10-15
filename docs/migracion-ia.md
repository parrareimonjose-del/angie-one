# Guía: llevar la IA de Angie One a otra app de Parra Apps

La IA es un **activo portátil**: Worker de Cloudflare (gratis) + Gemini (clave gratis, solo como secreto) + filtro de seguridad + config.

## Piezas
| Pieza | Archivo | Qué hace |
|---|---|---|
| Config reutilizable | `src/ai-config.ts` | `APP_AI`, `makeAiConfig()`, `aiUrl()`, `aiMayDo()` (lista de acciones prohibidas) |
| Cliente | `src/ai.ts` | llamadas con timeout, 1 reintento, errores claros (`offline`, `busy`, `notFood`…) |
| Seguridad | `src/safety.ts` | filtro de lesiones/temas médicos; mínimos seguros de kcal |
| Worker | `worker/index.js`, `worker/wrangler.toml` | proxy: rutas `/estimate /plan /chat /vision /dev` (+ modo receipt), reintentos, idioma del usuario, filtro de nombres de mascotas |
| IA admin / programadora | `src/adminai.ts` | métricas → propuestas → especificación + borrador (nunca publica ni mueve dinero) |

## Pasos (≈30 min, coste 0)
1. **Copiar** `src/ai-config.ts`, `src/ai.ts`, `src/safety.ts`, `src/adminai.ts` y la carpeta `worker/` a la nueva app.
2. **Config**: en la nueva app
   ```ts
   import { makeAiConfig } from './ai-config';
   export const APP_AI = makeAiConfig({ appId: 'cuidajuntos', appName: 'CuidaJuntos', workerBase: 'https://cuidajuntos-ai.<cuenta>.workers.dev',
     persona: 'Asistente cálido para cuidadores…', forbiddenTopics: ['diagnóstico', 'dosis'] });
   ```
3. **Prompts**: en `worker/index.js` cambia el texto de sistema de cada ruta (busca `system`/`prompt`). Mantén: respuesta en JSON, idioma `lang`, nunca diagnosticar.
4. **Worker**: `name = "<app>-ai"` en `wrangler.toml`; `npx wrangler@3 secret put GEMINI_API_KEY` (la clave **nunca** en el código ni en el chat); `npx wrangler@3 deploy`. **Desplegar necesita la aprobación de José.**
5. **Seguridad**: adapta las listas de `safety.ts` al tema de la app; corre sus pruebas (`tests/safety.test.ts`).
6. **Acciones prohibidas**: no quites nada de `neverActions` (`publish, deploy, move_money, bank, send_message, sell_data`). Cualquier acción con dinero o publicación va a una tarjeta de aprobación de un toque.
7. **Idiomas**: `locales` trae los 13 (es, en, pt, fr, de, it, zh, ja, ko, hi, ar RTL, ru, tr).
8. **Pruebas**: `npm run test:faltantes` incluye la prueba de config reutilizable.

## Reglas que viajan con la IA
- Datos de salud nunca se venden ni se usan para anuncios.
- Gratis hasta que haya ingresos (gemini-flash-lite-latest en clave gratuita, límites del plan gratis de Cloudflare).
- La IA propone; José decide con un toque.
