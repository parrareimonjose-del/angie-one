# Angie One · MVP (Parra Apps)

Coach de nutrición con IA, sin culpa. Una sola base de código para **iOS, Android y web** (Expo + React Native + expo-router + react-native-web).
Paleta oficial **Energía Coral**: #E11D48 · #7C3AED · #F59E0B.

**Versión web de prueba:** https://parrareimonjose-del.github.io/angie-one/

## Cómo ejecutarla
```bash
npm install
npx expo start          # escanea el QR con Expo Go (iOS/Android) o pulsa "w" para web
npx expo export --platform web   # compila la web en dist/
./scripts-deploy-web.sh # publica la web en GitHub Pages (gratis)
```
La IA real pasa por el Worker de `worker/` (desplegar con `npx wrangler@3 deploy`; la clave es un secreto del Worker, nunca en el repo).

## Qué ya funciona
- **Bienvenida**: objetivo, peso, altura, edad, sexo, actividad → meta diaria (Mifflin-St Jeor, con mínimo seguro de 1.200/1.500 kcal) y aviso claro de **7 días de Premium gratis sin tarjeta**.
- **Inicio**: anillo de calorías, proteína/carbos/grasa, agua (+1 vaso), reto diario con racha, contador de prueba, botón **leer en voz alta**.
- **Foto del plato**: cámara o galería → estimación como **rango** (ej. 450–600 kcal) con nivel de confianza, preguntas de 1 toque (¿aceite? ¿salsa? ¿frito?) y porción (0,5×–2×). Límite gratis: 1 foto con IA al día tras la prueba.
- **Código de barras**: búsqueda en **Open Food Facts** (gratis), semáforo de azúcar/sal/grasa saturada, gramos. En el móvil escanea con la cámara; en la web se escribe el código.
- **Registro manual** + **base de 22 comidas latinas** + dictado por voz (navegadores con Web Speech).
- **Diario** por día (anterior/siguiente, quitar).
- **Ajustes**: idioma automático según el teléfono (ES/EN/PT, inglés si es otro) o manual; IA encendida/apagada; borrar datos.
- **Premium**: 1,99 $/mes · 14,99 $/año · LatAm 0,99 $/mes, oferta 48 h de precio congelado, renovación y cancelación explicadas.
- **Panel del Fundador v1**: tarjetas de aprobar/rechazar (datos de ejemplo).
- Uso con una mano: botones de 64 px, barra inferior grande, etiquetas de accesibilidad.
- Datos guardados **solo en el dispositivo** (AsyncStorage).

## Novedades v0.2 (15 oct 2026)
- **IA real** vía Cloudflare Worker (la clave vive solo como secreto del Worker). Sin modo demo: si falla, mensajes claros (sin internet, IA ocupada, foto grande, no es comida).
- **Registro por texto con IA**: describe el plato (o díctalo) → rango de calorías, afinado y porción → diario.
- **Prueba 7 días → oferta 48 h con precio congelado → versión gratis**, con recordatorios en la app 2 días antes y el último día, y cuenta regresiva.
- **Política de privacidad, Términos y Aviso médico** (ES/EN/PT, BORRADOR para revisión de abogado) en Ajustes, Premium y la bienvenida.
- Worker: 3 intentos con espera creciente, tiempo límite, respuesta "no es comida".
- Validación de datos en la bienvenida; fotos grandes se reducen en la web antes de enviarse.
- Iconos iOS/Android (adaptativo + monocromo), splash y `eas.json` listos para EAS Build. `expo-doctor`: 21/21.

## Qué está simulado (mock) o pendiente
- **Pagos**: el botón "Suscribirme" no cobra (TODO RevenueCat + App Store/Google Play Billing). La oferta de 48 h se calcula localmente.
- **Panel del Fundador**: datos de ejemplo; no mueve dinero.
- Recordatorios de fin de prueba: dentro de la app (las notificaciones push requieren expo-notifications + build nativa).
- Pendiente de Fase 1: Apple Health / Health Connect, cuentas y sincronización en la nube, dictado por voz nativo.
## Lo que necesita a Jose (un toque cada uno)
2. Cuenta **Apple Developer** (99 $/año) — de pago, decides tú cuándo.
3. Cuenta **Google Play Console** (25 $ una vez) — de pago.
4. Cuenta gratis de **Expo/EAS** para compilar las apps.
5. Aprobar la publicación en App Store y Google Play.
6. RevenueCat (gratis hasta 2.500 $/mes de ingresos) cuando se activen pagos.
7. Revisión legal de los borradores de privacidad, términos y aviso médico antes de publicar.
