# APK de Android local (gratis, sin cuenta de Expo)

Requisitos en el box: JDK 17 (`~/jdk17`) y Android SDK (`~/android`: platform-tools, build-tools 35/36, NDK 27.1, cmake 3.22.1).

```bash
./scripts/build-android-local.sh            # → /workspace/calorias/apk/angie-one-<version>.apk
```

El script: revisa traducciones → `expo prebuild --clean` → inyecta la firma `upload` leyendo
`/workspace/angie-one-keys/keystore.properties` (fuera del repo; cambiar con `ANGIE_KEYSTORE_PROPS`)
→ `gradlew assembleRelease` (arm64-v8a, armeabi-v7a, x86_64) → copia y verifica la firma con `apksigner`.

Clave de subida: `/workspace/angie-one-keys/` (ver su README). Nunca se sube al repo (`.gitignore`
excluye `*.keystore`, `*.jks`, `keystore.properties`, `/android`, `*.apk`).
Para Google Play hace falta un AAB (`gradlew bundleRelease`) y la cuenta de Play Console; no se ha subido nada.
