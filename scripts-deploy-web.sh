#!/usr/bin/env bash
# Publica la versión web en GitHub Pages (rama gh-pages). Gratis.
# Soft-launch de prueba: EXPO_PUBLIC_PAY_MODE=test bash scripts-deploy-web.sh
# Producción real (sin botón de compra hasta Stripe live): EXPO_PUBLIC_PAY_MODE=off (default)
set -e
MODE="${EXPO_PUBLIC_PAY_MODE:-off}"
echo "Deploy web con EXPO_PUBLIC_PAY_MODE=$MODE"
node scripts/check-i18n.js
EXPO_PUBLIC_PAY_MODE="$MODE" npx expo export --platform web --clear
cp dist/index.html dist/404.html && touch dist/.nojekyll
# Marca visible en el dist (sin secretos) para verificar el modo
printf '%s\n' "$MODE" > dist/pay-mode.txt
cd dist && rm -rf .git && git init -q -b gh-pages && git add -A && git -c user.name="Jose Parra" -c user.email="parrareimonjose-del@users.noreply.github.com" commit -qm "deploy web PAY_MODE=$MODE" && \
  git push -f "https://github.com/parrareimonjose-del/angie-one.git" gh-pages
echo "OK → https://parrareimonjose-del.github.io/angie-one/ (PAY_MODE=$MODE)"
