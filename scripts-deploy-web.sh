#!/usr/bin/env bash
# Publica la versión web en GitHub Pages (rama gh-pages). Gratis.
set -e
npx expo export --platform web
cp dist/index.html dist/404.html && touch dist/.nojekyll
cd dist && rm -rf .git && git init -q -b gh-pages && git add -A && git commit -qm "deploy web" && \
  git push -f "https://github.com/parrareimonjose-del/angie-one.git" gh-pages
