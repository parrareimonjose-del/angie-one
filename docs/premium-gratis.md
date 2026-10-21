# Premium gratis del fundador (Panel del Fundador → «Premium gratis para personas»)

- José escribe el correo o ID de usuario, una nota opcional y la caducidad (sin caducidad, 30, 90 o 365 días). La app genera un código `ABCDE-FGHJK`.
- Revocable con un toque. Al revocar o caducar, el usuario pierde Premium en ≤ 24 h (la app revalida cada día; sin red lo respeta 7 días como máximo).
- No mueve dinero: es acceso gratis, por eso no pasa por la aprobación 60/25/15.

## Cómo cumple las tiendas
| Plataforma | Mecanismo | Por qué |
|---|---|---|
| Web (Stripe) | Derecho en el servidor: Worker `/grants/add`, `/grants/revoke`, `/grants/redeem` (KV `FOODS`, prefijo `grant:`) | La web no está sujeta a las reglas de pago de las tiendas. |
| Android (Google Play) | Códigos promocionales de Google Play para la suscripción (Play Console → Monetizar → Promociones). El derecho del servidor también es aceptable porque no hay pago fuera de Play. | Política de pagos de Play: el contenido gratis no requiere Play Billing; lo de pago sí. |
| iPhone (App Store) | **Offer Codes de Apple** (App Store Connect → Suscripciones → Códigos de oferta). En iOS la app no muestra el canje propio: abre `apps.apple.com/redeem`. | Guía 3.1.1: no se pueden desbloquear funciones con códigos o licencias propios. |

## Para activarlo en el servidor (necesita el OK de José; es gratis)
1. `cd worker && npx wrangler@3 secret put FOUNDER_KEY` (una clave larga que solo tiene José; nunca en el chat).
2. Desplegar el Worker (`/grants/*` ya está en `worker/grants.js`).
3. En el Panel del Fundador, escribir esa clave en «Clave de fundador» (se guarda solo en su teléfono).

## Modo fundador
Antes el Panel del Fundador se veía en «Más» para cualquier usuario (error). Ahora solo aparece en el teléfono donde se escribió la clave de fundador (o tocando 5 veces «Angie One» en Más). La seguridad real está en el servidor: sin `FOUNDER_KEY` ningún cambio se acepta.
