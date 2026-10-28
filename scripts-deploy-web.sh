#!/usr/bin/env bash
# Publica la versión web en GitHub Pages (rama gh-pages). Gratis.
# Soft-launch de prueba: EXPO_PUBLIC_PAY_MODE=test bash scripts-deploy-web.sh
# Producción sin cobro visible: EXPO_PUBLIC_PAY_MODE=off (default)
# Cobro real (SOLO tras OK José + Worker con sk_live_ + PAY_LIVE=1):
#   EXPO_PUBLIC_PAY_MODE=live bash scripts-deploy-web.sh
# Ver: docs/pasar-a-stripe-live.md y /workspace/calorias/pasar-a-stripe-live-angie-one.md
set -e
MODE="${EXPO_PUBLIC_PAY_MODE:-off}"
if [ "$MODE" = "live" ]; then
  echo "AVISO: publicando PAY_MODE=live (cobro real en la UI). Confirma que el Worker ya tiene PAY_LIVE=1 y sk_live_."
fi
echo "Deploy web con EXPO_PUBLIC_PAY_MODE=$MODE"
node scripts/check-i18n.js
EXPO_PUBLIC_PAY_MODE="$MODE" npx expo export --platform web --clear
cp dist/index.html dist/404.html && touch dist/.nojekyll
# Rutas que Apple revisa (privacidad, soporte, borrar cuenta) responden 200, no 404 de la SPA
for r in legal manual delete-account paywall subscription; do mkdir -p dist/$r && cp dist/index.html dist/$r/index.html; done
# Marca visible en el dist (sin secretos) para verificar el modo
printf '%s\n' "$MODE" > dist/pay-mode.txt
mkdir -p dist/compartir && cp /workspace/calorias/cuestionario-prueba-angie.html dist/compartir/cuestionario.html && cp /workspace/calorias/carta-consentimiento-5pct-angie-one.html dist/compartir/carta-5pct.html || { echo "faltan archivos compartir"; exit 1; }
cd dist && rm -rf .git && git init -q -b gh-pages && git add -A && git -c user.name="Jose Parra" -c user.email="parrareimonjose-del@users.noreply.github.com" commit -qm "deploy web PAY_MODE=$MODE" && \
  git push -f "https://github.com/parrareimonjose-del/angie-one.git" gh-pages
echo "OK → https://parrareimonjose-del.github.io/angie-one/ (PAY_MODE=$MODE)"
