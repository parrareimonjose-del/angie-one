# Angie One · App Store (com.parraapps.angieone)

## URLs
- Privacidad: https://parrareimonjose-del.github.io/angie-one/legal?doc=privacy
- Soporte: https://parrareimonjose-del.github.io/angie-one/manual  (correo: angieoneapp.support@gmail.com)
- Borrar cuenta (web): https://parrareimonjose-del.github.io/angie-one/delete-account
- Hoy esas rutas cargan pero GitHub Pages responde 404 (SPA). El próximo deploy web (scripts-deploy-web.sh) crea copias para que respondan 200.
- Marca «BORRADOR» retirada de los textos legales (28-oct-2026).

## Icono
assets/icon.png: 1024×1024, RGB sin transparencia → válido.

## Capturas (screenshots/)
- 6.9" 1320×2868 y 6.5" 1284×2778, es y en: 01 Inicio · 02 Diario · 03 Coach · 04 Recetario.
- El paywall NO se usa como captura (en la web dice «Stripe»).

## Compras dentro de la app (crear en App Store Connect)
Grupo de suscripción «Premium» (prueba gratis 7 días como oferta introductoria, opcional):
| Product ID | Tipo | Precio |
|---|---|---|
| angieone_premium_monthly | Suscripción auto-renovable 1 mes | 2,49 USD |
| angieone_premium_yearly | Suscripción auto-renovable 1 año | 24,99 USD |
Mismos IDs = lookup_key de Stripe en la web.

## Aviso médico (final de la descripción)
ES: Angie One no es un dispositivo médico ni sustituye a un médico o nutricionista. Consulta a un profesional antes de cambiar tu dieta o ejercicio.
EN: Angie One is not a medical device and does not replace a doctor or dietitian. Talk to a professional before changing your diet or exercise.

## App Privacy (respuestas para App Store Connect)
Tracking: NO (sin anuncios ni rastreadores). Nada se usa para publicidad.
| Tipo de dato (Apple) | ¿Se recoge? | Uso | ¿Vinculado a la persona? | Por qué |
|---|---|---|---|---|
| Salud y forma física (Health & Fitness) | Sí | Funcionalidad de la app | No | Edad, peso, meta y preferencias van al Worker y a Google Gemini solo para responder (no se guardan). |
| Fotos o vídeos | Sí | Funcionalidad | No | Foto del plato/etiqueta/menú → Gemini para estimar; no se guarda. Fotos de progreso nunca salen del teléfono. |
| Datos de audio | Sí | Funcionalidad | No | Dictado de comida → Gemini, transcribe y se descarta. |
| Otro contenido del usuario (Other User Content) | Sí | Funcionalidad | No | Copia en la nube cifrada de extremo a extremo (el servidor solo ve bytes cifrados); textos de chat con la IA; reportes. |
| Compras (Purchase History) | Sí | Funcionalidad | No | Estado de la suscripción Apple/Stripe por ID anónimo, para activar Premium. |
| Identificadores: ID de usuario | Sí | Funcionalidad | No | ID anónimo de pago y de la copia en la nube (sin correo ni nombre). |
| Contacto (nombre, correo), ubicación, contactos, historial de navegación, datos financieros (tarjeta) | No | — | — | La tarjeta la maneja Apple o Stripe. |
| Diagnóstico | No | — | — | — |
Procesadores a nombrar en la política: Cloudflare (servidor), Google Gemini (IA), RevenueCat (estado de compras Apple), Stripe (pago web).

## Borrado de cuenta (Guideline 5.1.1(v))
Ajustes → Borrar cuenta: borra datos del teléfono, la copia en la nube (/sync/backup DELETE), sale de grupos de amigos y borra en el Worker el estado de pago web (Stripe, cancela su suscripción) y Apple (/iap/delete). Aviso en iPhone: la suscripción de Apple se cancela en Ajustes › Suscripciones.

## Interruptores al salir en vivo
- Worker: REVENUECAT_WEBHOOK_AUTH puesto; REVENUECAT_ALLOW_SANDBOX sin definir en producción.
- Build iOS: EXPO_PUBLIC_RC_IOS_KEY (appl_…). Sin ella, el iPhone muestra «pendiente» y no cobra.
- Stripe live: solo con OK de José (docs/pasar-a-stripe-live.md).
