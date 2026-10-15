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
Para activar la IA real: copia `.env.example` a `.env` y pon tu clave gratis de Google AI Studio.

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

## Qué está simulado (mock) o pendiente
- **IA**: sin `EXPO_PUBLIC_GEMINI_API_KEY` la app muestra **"MODO DEMO"** y da una estimación de ejemplo. Con la clave llama a Gemini Flash-Lite. ⚠️ Para producción la llamada debe ir por un backend/proxy gratuito (p. ej. Cloudflare Worker) para no exponer la clave.
- **Pagos**: el botón "Suscribirme" no cobra (TODO RevenueCat + App Store/Google Play Billing).
- **Panel del Fundador**: datos de ejemplo; no mueve dinero.
- Pendiente de Fase 1: Apple Health / Health Connect, notificaciones, cuentas y sincronización en la nube, escáner de etiquetas por foto, dictado por voz nativo.

## Lo que necesita a Jose (un toque cada uno)
1. Crear la clave gratis de Gemini en Google AI Studio y ponerla en `.env` (nunca por chat).
2. Cuenta **Apple Developer** (99 $/año) — de pago, decides tú cuándo.
3. Cuenta **Google Play Console** (25 $ una vez) — de pago.
4. Cuenta gratis de **Expo/EAS** para compilar las apps.
5. Aprobar la publicación en App Store y Google Play.
6. RevenueCat (gratis hasta 2.500 $/mes de ingresos) cuando se activen pagos.
7. Política de privacidad, términos y aviso médico antes de publicar.
