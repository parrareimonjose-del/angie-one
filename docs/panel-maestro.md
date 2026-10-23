# Angie One → Panel Maestro de Parra Apps

Formato: el mismo que `/workspace/panel-maestro/app.js` lee para apps `kind: 'api'` (Venture Foundry, CHISME):
`GET <summaryUrl>` con `Authorization: Bearer pm_<64 hex>` (solo lectura) → JSON.

Código: `src/panelmaestro.ts` (`buildSummary`, `validSummary`). En el panel del fundador: tarjeta **🧩 Panel Maestro** → «Descargar JSON».

## Esquema `parra-apps/panel-maestro-summary@1`
| Campo | Tipo | Lo usa el Panel Maestro |
|---|---|---|
| `schema` | `"parra-apps/panel-maestro-summary@1"` | versión |
| `app` | `{id, name, emoji, color, version, founderPanelUrl}` | cabecera |
| `generatedAt` | ISO 8601 | «Actualizado» |
| `sampleData` | boolean | aviso DATOS DE EJEMPLO |
| `cards` | `[[etiqueta, valor], …]` | tarjetas de resumen (`s.cards`) |
| `metrics` | objeto plano | `s.metrics` (sin salud: solo uso) |
| `revenue.note` | texto | 💵 Dinero |
| `socialFund.rule` | texto | 🤝 regla (hoy: sin donaciones) |
| `revenueSplit` | `{rule, buckets:[{key:'jose'|'family'|'growth'|'reserve', name, pct, balanceUsd}], pendingApprovals}` | 💰 reparto 55/5/25/15 |
| `approvals` | `{pending, kinds[]}` | extra |
| `privacy` | `{healthDataIncluded:false, personalData:false}` | garantía; `validSummary` rechaza `true` |

Las claves de `buckets` coinciden con `window.PARRA_SPLIT_VIEW` (jose/family/growth/reserve = 55/5/25/15).

## Ejemplo
```json
{ "schema": "parra-apps/panel-maestro-summary@1",
  "app": { "id": "angie-one", "name": "Angie One", "emoji": "🥗", "color": "#E11D48", "version": "0.6.0", "founderPanelUrl": "https://parrareimonjose-del.github.io/angie-one/founder" },
  "generatedAt": "2026-10-15T17:00:00.000Z", "sampleData": true,
  "cards": [["Usuarios", 1], ["Días activos (7)", 2], ["Registros", 5], ["Cargos aprobados", 1]],
  "revenue": { "note": "DATOS DE EJEMPLO: aún no hay cobros reales.", "currency": "USD" },
  "socialFund": { "rule": "Sin donaciones ni fondos de impacto. Solo reparto 55/5/25/15." },
  "revenueSplit": { "rule": "55% fundador / 5% Angie y familia (juntos) / 25% app (crecimiento) / 15% impuestos",
    "buckets": [{ "key": "jose", "name": "Para José", "pct": 55, "balanceUsd": 0.9 }, { "key": "family", "name": "Angie y familia", "pct": 5, "balanceUsd": 0.08 }, { "key": "growth", "name": "Crecimiento", "pct": 25, "balanceUsd": 0.4 }, { "key": "reserve", "name": "Impuestos", "pct": 15, "balanceUsd": 0.25 }],
    "pendingApprovals": 3 },
  "privacy": { "healthDataIncluded": false, "personalData": false } }
```

## Conexión en vivo (⏳ necesita aprobación de José)
Hoy la web es 100 % local (sin servidor), así que el resumen se **descarga** como archivo. Para verlo en vivo:
1. Añadir `GET /api/v1/panel-maestro/summary` al Worker `angie-one-ai` con token `pm_<64 hex>` como secreto (gratis). **Requiere desplegar el Worker → aprobación.**
2. Cuando haya servidor de datos, el Worker construye el resumen con `buildSummary` sobre agregados (nunca salud).
3. Bloque para `apps.config.js` (no se ha tocado el Panel Maestro):
```js
{ id: 'angie-one', name: 'Angie One', emoji: '🥗', color: '#E11D48', kind: 'api',
  summaryUrl: 'https://angie-one-ai.angieoneapp-support.workers.dev/api/v1/panel-maestro/summary',
  founderPanelUrl: 'https://parrareimonjose-del.github.io/angie-one/founder' },
```
