#!/usr/bin/env bash
# APK de Android local y gratis, sin cuenta de Expo: prebuild + Gradle assembleRelease.
# Firma con la clave de subida guardada FUERA del repo (por defecto /workspace/angie-one-keys/keystore.properties).
set -euo pipefail
cd "$(dirname "$0")/.."
export JAVA_HOME="${JAVA_HOME:-$HOME/jdk17}" ANDROID_HOME="${ANDROID_HOME:-$HOME/android}"
export ANDROID_SDK_ROOT="$ANDROID_HOME" NODE_ENV=production PATH="$JAVA_HOME/bin:$PATH"
KEYS="${ANGIE_KEYSTORE_PROPS:-/workspace/angie-one-keys/keystore.properties}"
OUT="${1:-/workspace/calorias/apk/angie-one-$(node -p 'require("./app.json").expo.version').apk}"
[ -f "$KEYS" ] || { echo "Falta $KEYS (ver docs/ANDROID-LOCAL.md)"; exit 1; }
node scripts/check-i18n.js
CI=1 npx expo prebuild --platform android --clean --no-install
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
python3 - "$KEYS" <<'PY'
import sys,re
p='android/app/build.gradle'; s=open(p).read()
s=s.replace("    signingConfigs {", """    def upProps = new Properties()
    def upFile = file('%s')
    if (upFile.exists()) { upFile.withInputStream { upProps.load(it) } }
    signingConfigs {
        upload {
            storeFile file(upProps['storeFile'] ?: 'missing.keystore')
            storePassword upProps['storePassword']
            keyAlias upProps['keyAlias']
            keyPassword upProps['keyPassword']
        }""" % sys.argv[1], 1)
i=s.index("        release {", s.index("buildTypes"))
j=s.index("signingConfig signingConfigs.debug", i)
s=s[:j]+"signingConfig signingConfigs.upload"+s[j+len("signingConfig signingConfigs.debug"):]
open(p,'w').write(s)
PY
cd android && ./gradlew --no-daemon -q assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a,x86_64
mkdir -p "$(dirname "$OUT")" && cp app/build/outputs/apk/release/app-release.apk "$OUT"
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --print-certs "$OUT" | grep -E "Signer #1 certificate (DN|SHA-256)"
ls -lh "$OUT"
