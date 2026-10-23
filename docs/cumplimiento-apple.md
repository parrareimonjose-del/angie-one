# Angie One: auditoría de cumplimiento App Store (solo lectura)

Fecha: 22 oct 2026 · Código revisado: rama `feat-stripe-test` (base master `cca100a`) · Sin cambios en el código por esta auditoría.
Leyenda: ✅ cumple · ❌ no cumple · ⚠️ sin verificar o parcial.

| Norma | Estado | Qué hay hoy | Qué cambiar antes de enviar |
|---|---|---|---|
| **1.4.1 Salud física** (datos y consejos médicos) | ✅ | Coach seguro + fuentes OMS/DGA/ACSM/ISSN en Ajustes (`set-sources`) + nota Gemini procesador en privacidad. | Confirmar TCA hide en iOS real. |
| **5.1.1 Datos y privacidad** | ⚠️ | Los textos de permisos (cámara, fotos, micrófono, Salud) están en `app.json`. El manifiesto de privacidad dice `NSPrivacyTracking: false`. Las fotos se quedan en el teléfono y la nube va cifrada. | Completar la «Etiqueta de privacidad» en App Store Connect: IA (texto enviado a Gemini mediante el Worker), copia cifrada y código de amigos. Enlazar la política de privacidad dentro de la app y en la ficha. |
| **5.1.1(v) Borrar la cuenta** | ✅ | `app/delete-account.tsx` borra los datos y sale de los grupos de amigos (lo comprueba qa-review). | ⚠️ Confirmar que también se borran la copia en la nube (KV `sync`) y los registros `pay:` si hay suscripción web. Explicar que la suscripción de Apple se cancela en Ajustes. |
| **5.1.2 Uso y compartición de datos** | ✅ | No hay anuncios ni SDK de rastreo, y no se venden datos (se dice en los textos de permisos). | Declarar a Gemini (Google) como procesador en la política y en la etiqueta. |
| **5.1.3 Salud / HealthKit** | ⚠️ | `src/healthsync.ts` y `NSHealthShareUsageDescription` (solo lectura). | Los datos de HealthKit no pueden ir a la IA ni a la nube sin consentimiento explícito. Revisar que `healthsync` no los mande al Worker. Activar la capacidad HealthKit solo si se usa. Sin verificar en un build iOS. |
| **3.1.1 Compras dentro de la app (IAP)** | ✅ preparado / ⏳ nativo | `src/iap.ts` + `payments.ts`: productos `angieone_premium_monthly` (2,49) / `angieone_premium_yearly` (24,99). `IAP_NATIVE_READY=false` hasta cuenta Developer + módulo StoreKit. Restore UI activa Premium si hay compra; si no, mensaje amable pendiente (nunca simula cobro). Stripe solo web. Tips → Redirect `/`. | ⏳ Conectar módulo nativo cuando exista Apple Developer. No enlazar web para pagar en iOS (3.1.3). |
| **Transparencia de la IA y reportar** | ✅ | Las respuestas de la IA llevan un botón «Reportar» (`reportAI` → cola de moderación del fundador). Se avisa que es una coach de IA. | Decir en la ficha y en el primer uso que es IA generativa (Gemini). Añadir un límite de edad para el chat si la clasificación es 12+. |
| **1.2 Contenido de usuarios** (amigos y retos, aportes a la base de alimentos) | ✅ | Reportar/bloquear + cola. `EulaGate` (`src/eula-ui.tsx`) exige aceptar Términos (tolerancia cero) antes de Amigos y aportes. Sección UGC añadida a `docs.terms` (13 idiomas). | ⚠️ Moderación <24 h sigue siendo manual del fundador; documentar SLA. |
| **2.1 Completitud** (nada de demos ni «pendiente») | ✅ iOS | `hidePending` en iOS: componente `Pending` = null; tarjetas nube/pmNote/datos server/toAcc/pendingLegend ocultas. Tips Redirect. Demos y clon off. | Revisar build iOS real antes de App Review. |
| **4.2 Funcionalidad mínima** | ✅ | Diario, coach, recetas por plan, escáner, voz, agua, ayuno, amigos y 13 idiomas. Es más que una web empaquetada. | Probar sin conexión que nada queda en blanco. Hoy es react-native-web; en iOS hay que probar con un build nativo (EAS). |
| **2.3 Metadatos exactos** | ⚠️ | No hay ficha todavía. | Las capturas deben ser de la app real (sin demos ni clon), con el precio igual al de StoreKit. No prometer resultados médicos. Clasificación de edad coherente con la sección siguiente. |
| **Clasificación de edad y adolescentes** | ✅ código | `src/age.ts`: <13 bloquea onboarding/chat; 13–17 `safeGoal` + `dailyTarget` sin déficit (lose→keep). Mensajes `ob.under13` / `ob.teenSafe`. | Elegir rating App Store 12+ coherente. |

## Resumen de cambios para el build iOS (por prioridad)
1. ✅ StoreKit/IAP preparado (`iap.ts`, Restore UI). ⏳ Módulo nativo cuando haya Apple Developer. Stripe solo web.
2. ✅ EULA tolerancia cero antes de Amigos/aportes. ⚠️ Moderación <24 h documentar SLA.
3. ✅ Pending oculto en iOS + tips Redirect.
4. ✅ Puerta de edad <13 / 13–17 sin pérdida.
5. Etiqueta de privacidad y política: Gemini como procesador, HealthKit sin IA ni nube.
6. ✅ Fuentes científicas en Ajustes.

*No se revisó un binario iOS real: no hay cuenta de Apple Developer, así que todo lo nativo queda como ⚠️.*
