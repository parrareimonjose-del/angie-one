// Interruptores de funciones. Decisión de José 2026-10-15: tienda Etsy «Compra con propósito» oculta (actualización futura);
// donaciones y fondos de impacto con dinero ELIMINADOS (sin desembolsos). No cambiar sin su aprobación.
export const FEATURES = { purposeStore: false, donations: false } as const;

/** Clon apagado por decisión de Jose (21 oct 2026); poner true para volver a activarlo. El código se conserva. */
export const CLONE_ENABLED = false;

/** Revisión App Store (21 oct 2026): pantallas de ejemplo o «pendiente de conexión» (red social local con publicaciones de ejemplo,
 *  conexiones Garmin/Fitbit/Spotify sin conectar, tienda con precios simulados, coaches B2B, mercado de profesionales de ejemplo,
 *  bienestar corporativo y WhatsApp Business) se esconden: Apple rechaza contenido de relleno o funciones que no funcionan (2.1, 2.3.1).
 *  El código se conserva; se activan cuando cada una funcione de verdad. Amigos y retos reemplaza a la red social local. */
export const DEMOS_ENABLED = false;
export const DEMO_KEYS = ['social', 'connect', 'shop', 'b2b', 'market', 'corp', 'whatsapp'] as const;
