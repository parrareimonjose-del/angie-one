# Cumplimiento Google Play y App Store — Angie One (15-oct-2026)
Cuenta de Google Play de José: **PERSONAL** (no organización). Fuentes: Play Console Help 14151465, 13634885, 10788890, 12261419, 14738291; App Store Review Guidelines 3.1.1, 3.1.2, 5.1.1(v), 5.1.2, 1.4.1.

## Hecho en la app (web)
| Regla | Estado |
|---|---|
| Borrar cuenta dentro de la app (Play «Account deletion», Apple 5.1.1(v)) | ✅ Ajustes → Entrada y seguridad → 🗑️ Borrar mi cuenta y mis datos (`/delete-account`). También es la **URL web pública** de borrado que pide Play: `https://parrareimonjose-del.github.io/angie-one/delete-account` (activa cuando se publique) |
| Aviso de salud («no es un dispositivo médico») | ✅ onboarding, coach y paywall (`fx.healthDisc`). La ficha de la tienda debe decir: *"not a medical device and does not diagnose, treat, cure, or prevent any medical condition."* |
| Condiciones de suscripción (Apple 3.1.2, Play Subscriptions) | ✅ precio, periodo, prueba 7 días, renovación automática, cancelar 24 h antes, dónde cancelar, «Restaurar compras» en Android/iOS, enlaces legales |
| Pagos digitales con el sistema de la tienda (Apple 3.1.1, Play Payments) | ✅ capa `src/payments.ts`: web → Stripe, Android → Google Play Billing, iOS → Apple IAP. Nunca Stripe dentro de la app nativa |
| Sin donaciones / propinas / fondos con dinero | ✅ eliminados (rutas redirigen; `FEATURES.donations=false`) |
| Tienda Etsy | ✅ oculta (`FEATURES.purposeStore=false`), código guardado |
| Datos de salud nunca se venden ni van a anuncios (Apple 5.1.2, Play User Data) | ✅ regla de oro + prueba en código |
| Sin lenguaje médico (Play cuenta personal → Salud y fitness / Nutrición y control de peso, no «Medical») | ✅ 15-oct-2026: `/health` → «Preferencias de comida» (menos azúcar, menos sal, sin gluten, más fibra, ciclo; modos antiguos se migran solos), `/report` → «Mi resumen personal de bienestar», fisioterapia → coach de bienestar/actividad física, lesiones → «zona a cuidar» + aviso «si sientes dolor, consulta a un profesional» (el filtro de seguridad sigue), Memoria convierte enfermedades en preferencias neutras («sin gluten», «menos azúcar»), aviso «No es consejo médico» en 13 idiomas. QA `tests/qa-sin-medico.mjs` |
| PIN/huella locales, sin enviar nada | ✅ PBKDF2 + WebAuthn de plataforma |

## 🚧 Bloqueos y riesgos (necesitan a José)
1. **Cuenta personal + app de salud (MEDIO, mitigado 15-oct-2026)**: se quitó el lenguaje médico (ver tabla). En Play Console declarar **Salud y fitness → Nutrición y control de peso / Actividad**, nunca «Medical». Ficha: «not a medical device, not medical advice». Si aun así Google la clasifica como médica → cuenta de organización (D-U-N-S).
2. **Prueba cerrada obligatoria (cuenta personal creada después del 13-nov-2023)**: **12 testers** activos **14 días seguidos** antes de pedir producción.
3. **Sección de Datos (venta de datos anónimos de recibos/encuestas)**: Play y Apple permiten solo con consentimiento claro y declaración exacta en Data Safety / Privacy Nutrition Label; Apple 5.1.2 es muy estricto con vender datos. Recomendado: mantener la venta **apagada** en las versiones de tienda hasta revisión de abogado.
4. **Formularios de Play Console**: Health apps declaration, Data safety (salud = dato sensible, guardado en el dispositivo), clasificación de contenido, público objetivo (no niños), política de privacidad pública con sección de salud.
5. **Cuentas de pago**: Stripe (web), perfil de pagos de Play, Apple Developer (99 $/año — **no es gratis**, choca con «solo gratis»). Todo «Pendiente de conexión».
6. **Anuncios/patrocinios (Fase 4)**: sin SDK de anuncios en pantallas de salud; revisar antes de tiendas.
7. **Revisión de médico y abogado** del aviso médico, términos y privacidad.
8. **Cuentas en la nube**: si se crean, el borrado debe borrar también el servidor (hoy no hay).
