#!/usr/bin/env bash
# Comprueba preparación para Stripe live SIN activar nada y SIN leer secretos.
set -e
ORIGIN='https://parrareimonjose-del.github.io'
WORKER='https://angie-one-ai.angieoneapp-support.workers.dev'
PAGES='https://parrareimonjose-del.github.io/angie-one/pay-mode.txt'
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "== Angie One Stripe live readiness (solo lectura) =="
PM=$(curl -fsS "$PAGES" | tr -d '\r\n' || echo 'UNREACHABLE')
echo "Pages pay-mode.txt: $PM"
MODE=$(curl -fsS -X POST "$WORKER/pay/mode" -H 'content-type: application/json' -H "origin: $ORIGIN" -d '{}' || echo '{"error":"unreachable"}')
echo "Worker /pay/mode: $MODE"

test -f "$ROOT/src/ailearn.ts" && echo "AiLearn src: OK" || echo "AiLearn src: FALTA"
rg -q 'AiLearnCard' "$ROOT/app/founder.tsx" && echo "AiLearn en founder: OK" || echo "AiLearn en founder: FALTA"
rg -q "PAY_LIVE === '1'" "$ROOT/worker/pay.js" && echo "Gate PAY_LIVE en pay.js: OK" || echo "Gate PAY_LIVE: FALTA"
rg -q 'angieone_premium_monthly' "$ROOT/worker/pay.js" && echo "lookup_key monthly: OK" || echo "lookup_key monthly: FALTA"
rg -q 'angieone_premium_yearly' "$ROOT/worker/pay.js" && echo "lookup_key yearly: OK" || echo "lookup_key yearly: FALTA"

echo
echo "Esperado HOY: Pages=test · Worker mode=test · PAY_LIVE NO activo."
echo "Para el flip (solo con OK José): ver docs/pasar-a-stripe-live.md"
