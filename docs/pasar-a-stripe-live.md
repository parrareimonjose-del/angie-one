# Checklist interno — Stripe LIVE (Angie One)

Guía humana (José): `/workspace/calorias/pasar-a-stripe-live-angie-one.md`

## Estado actual (no tocar sin OK)

| Pieza | Valor esperado HOY |
|-------|--------------------|
| GitHub Pages `pay-mode.txt` | `test` |
| Worker `payMode(env)` | `test` (`sk_test_` + sin `PAY_LIVE`) |
| `EXPO_PUBLIC_PAY_MODE` publicado | `test` |
| `PAY_LIVE` en Worker | **ausente o ≠ 1** |
| AiLearn / Panel Fundador | presente (`AiLearnCard` en `app/founder.tsx`) |

## Secretos del Worker (nombres exactos)

| Secreto | Contenido | Notas |
|---------|-----------|--------|
| `STRIPE_SK` | `sk_test_…` hoy → `sk_live_…` al flip | Nunca en git / chat |
| `STRIPE_WHSEC` | `whsec_…` del endpoint **live** | Endpoint: `…/pay/webhook` |
| `PAY_LIVE` | `1` solo tras OK de José | Sin esto, `sk_live_` → mode `off` |
| `FOUNDER_KEY` | ya existe (ledger/refunds/grants) | No cambia para live |

No hay vars de Price ID: `worker/pay.js` usa lookup_key:

- `angieone_premium_monthly` → 249 cents / month
- `angieone_premium_yearly` → 2499 cents / year

No se usa `pk_live` / publishable en la app.

## Lógica de seguridad (`worker/pay.js`)

```text
sin STRIPE_SK          → off
sk_test_…              → test
sk_live_… + PAY_LIVE≠1 → off   (seguro: no cobra)
sk_live_… + PAY_LIVE=1 → live
```

## Flip (solo con OK explícito de José)

```bash
cd worker
npx wrangler secret put STRIPE_SK      # pegar sk_live_…
npx wrangler secret put STRIPE_WHSEC   # pegar whsec_ live
printf '1' | npx wrangler secret put PAY_LIVE

cd ..
EXPO_PUBLIC_PAY_MODE=live bash scripts-deploy-web.sh
```

Verificar:

```bash
curl -sS https://parrareimonjose-del.github.io/angie-one/pay-mode.txt
curl -sS -X POST 'https://angie-one-ai.angieoneapp-support.workers.dev/pay/mode' \
  -H 'content-type: application/json' \
  -H 'origin: https://parrareimonjose-del.github.io' -d '{}'
```

## Prohibido sin OK

- `PAY_LIVE=1`
- `wrangler secret put STRIPE_SK` con valor live inventado
- `EXPO_PUBLIC_PAY_MODE=live` + deploy a `gh-pages`
- Pegar secretos en chat / ACUERDOS / commits
