# Acuerdos permanentes — Angie One
Última actualización: 2026-10-15 11:37 ET
Leer al empezar cada conversación. Actualizar tras cada respuesta de José.

## Reglas de trabajo (orden José vía Grok Bot, 2026-10-15)
1. Guardar ideas, decisiones y avances en este archivo tras cada respuesta de José.
2. Responder rápido y corto en español, con botones (widgets).
3. Seguir al siguiente paso sin esperar «continúa». Publicar, enviar o cobrar sí necesitan su aprobación.

## Preferencias de José
- Solo español, corto, una decisión por mensaje, widgets de un toque (usa un brazo).
- Nunca contraseñas ni claves en el chat.
- Nada se publica, envía ni cobra sin su aprobación explícita.
- Solo servicios gratis hasta que haya ingresos; upgrades propuestos por la IA admin con un toque.
- Redes bilingües EN+ES; mercado principal EE.UU. + latino.
- Web primero hasta que diga que está perfecta; después APK; iPhone cuando tenga cuenta Apple.
- Como CuidaJuntos: resumen → estudio → plan por etapas → construir; probar con capturas; al final de cada etapa 2 líneas (hecho / siguiente).
- Avisar cuando termine un paso y pase al siguiente.

## Producto
- Nombre: Angie One. Slogan: "Eat well. Live better. / Come rico. Vive mejor."
- Paleta Energía Coral: primary #E11D48, secondary #7C3AED, accent #F59E0B.
- Logo oficial: opción 2 (A con hoja en anillo) en /workspace/calorias/logo/logo-oficial-angie-one.jpg
- Precio: 1.99 $/mes o 14.99 $/año; LatAm 0.99 $. Prueba 7 días + oferta 48 h.
- Panel fundador: 60% fundador / 25% crecimiento / 15% impuestos (editable).
- Regla de oro: datos de salud nunca se venden ni se usan en ads; sin SDKs/píxeles de ads en pantallas de salud.
- 13 idiomas (sigue el del teléfono): es, en, pt, fr, de, it, zh, ja, ko, hi, ar (RTL), ru, tr.
- Correo soporte: angieoneapp.support@gmail.com (monitoreo IA solo tras lanzamiento oficial).
- Handle: @angieoneapp. Dominios a comprar: angieone.com, angie-one.com, angieone.app, getangieone.com.
- Etsy central Parra Apps; dentro de Angie One tienda «Compra con propósito» (mayoría a ayuda dietética/sobrepeso/ejercicio/fisio, transparencia, cada desembolso con 1 toque de José).

## Estado técnico (2026-10-15)
- Repo: /workspace/angie-one → github.com/parrareimonjose-del/angie-one (master).
- Web: https://parrareimonjose-del.github.io/angie-one/ (v0.5.0 Fase 2 + pulido local 37cf148 sin push).
- Worker IA: https://angie-one-ai.angieoneapp-support.workers.dev/estimate (gemini-flash-lite-latest).
- Fases 2, 3 y 4 hechas en web. APK en pausa.
- Commit master remoto: f039de8. Pulido local: 37cf148 (pendiente push).
- Claves en /workspace/angie-one/.env (gitignored), nunca en chat.
- 2026-10-15: 🎙️ movido al centro de la barra inferior (64px, etiqueta accesible 13 idiomas); QA 84/84 ES+EN; commit local sin push ni redeploy.

## Decisiones recientes de José
- 2026-10-15: «Más tarde» a revisión general + 8 ideas → mostrar cuando lo pida.
- 2026-10-15: Aprobó push de Fase 2 a GitHub (hecho, f039de8).
- 2026-10-15: «Estoy manejando, sigue trabajando y mándame lo que deba aprobar» → no molestar; dejar widgets para cuando pare.
- Widget pendiente: subir pulido 37cf148 + meter 🎙️ en la barra de abajo.

## Siguiente
1. Al aprobar: push pulido + mover micrófono a la barra inferior.
2. Cuando lo pida: revisión general + 8 ideas + lista de aprobaciones (cuentas, pagos, Etsy, etc.).
3. APK solo cuando diga que la web está perfecta.

## Orden maestra Parra Apps (vía Grok Bot, 2026-10-15 11:39 ET)
1. Panel de fundador compatible con el Panel Maestro de Parra Apps.
2. Varios activos por app: IA propia portátil a otras apps (con instrucciones de migración), datos de usuarios éticos y legales (nunca vender datos de salud), ingresos extra éticos (p. ej. «Compra con propósito» en Etsy).
3. Reparto 60% fundador / 25% app / 15% impuestos, visible en el panel con registro de cargos y recibos PDF exportables.
4. Cada movimiento de dinero requiere aprobación de José con un toque.
Pendiente de revisar: compatibilidad con Panel Maestro, guía de migración de la IA y recibos PDF.

## Orden maestra final – Sección de datos (vía Grok Bot, 2026-10-15 12:34 ET)
Texto completo: /workspace/activo-base-de-datos/orden-maestra-seccion-datos.md (10 puntos: sección de datos, Premium, reglas legales, recibos con puntos, informes mensual y anual, aviso de lista, estudio de mercado, nada sin José, copia maestra con punteros).
CONFLICTO: la regla de oro de Angie One dice que los datos de salud nunca se venden. Hasta que José decida, la sección de datos de Angie One NO incluye datos de salud (peso, comidas, sueño, memoria); solo recibos y encuestas con permiso aparte. Pendiente: decisión de José.
DECISIÓN JOSÉ 2026-10-15 12:38 ET: en la sección de datos solo entran recibos y encuestas; la salud NUNCA se vende.
2026-10-15 12:41 ET: José aprobó; push aa6d002 a master y web publicada (pulido + micrófono en barra).
- 2026-10-15 13:02 ET: Sección de Datos (10 puntos) hecha en web, local: solo recibos y encuestas, la salud nunca entra (prueba en código); Premium; permiso aparte + retirar; 3/5/2 puntos; informe mensual 15-20 y anual 100 con PDF; panel con 6 listas, aviso, estudio de mercado, Aprobar/Todavía no sin vender; mínimo 50; copia maestra con punteros y borrado en cascada. QA 54/54 + 84/84. Pendiente OK: desplegar Worker (mode receipt), push y servidor. Informe: /workspace/calorias/datos-informe.md
2026-10-15 13:05 ET: José aprobó; Worker con lector de recibos desplegado, push a818d42, web publicada con Sección de Datos.
2026-10-15 13:26 ET: José preguntó qué falta para que la app esté lista; auditoría en curso → /workspace/calorias/checklist-lista.md. Ideas nuevas: sin respuesta aún.
2026-10-15 13:28 ET: Auditoría lista (checklist-lista.md). Construyendo puntos 1-6 gratis (entrada mayores, huella/Face ID, recibos PDF 60/25/15, Panel Maestro, guía IA, IA admin/programadora reales). Soporte IA: al lanzamiento.

## Decisiones José 2026-10-15 13:32 ET
- Todo debe cumplir las políticas de Google Play y Apple App Store.
- Cuenta de desarrollador de Google es PERSONAL, no de organización (tenerlo en cuenta: pruebas cerradas, categorías de salud).
- Tienda Etsy «Compra con propósito»: NO ahora; irá en una actualización futura (ocultarla).
- Dominios: no por ahora. Solo gratis hasta probar todo.
- NADA de donaciones (quitar flujo de donaciones / fondo de impacto con dinero).
- Pagos: web con Stripe; Android/iOS con Google Play Billing / Apple In-App Purchase.
- Seguir con todo lo demás hasta tener la app lista.
- 2026-10-15 13:55 ET: Faltantes 1-6 hechos + órdenes nuevas (políticas Play/Apple con cuenta personal, Etsy oculta, sin donaciones, pagos Stripe/Play/Apple pendientes, borrar cuenta). Commit local 521c654 sin push. QA 66/66 + 84/84. Informe: /workspace/calorias/faltantes-informe.md. Pendiente OK: push + web; Worker (Panel Maestro en vivo).
2026-10-15 14:02 ET: José aprobó quitar el lenguaje médico (cumplir Google Play con cuenta personal, categoría Salud y fitness) y publicar en GitHub + web + ruta Worker del Panel Maestro.

- 15-oct-2026 14:xx ET: José aprobó quitar todo lenguaje médico (Play cuenta personal → Salud y fitness/Nutrición). Hecho en 13 idiomas: Preferencias de comida, Mi resumen de bienestar, sin fisioterapia/enfermedades, Memoria neutra, aviso "No es consejo médico". Publicado (GitHub + web + Worker).
2026-10-15 14:47 ET: José probó en iPhone: 3 errores (IA del plan ocupada, voz no disponible en Safari, código de barras sin escanear con cámara). Arreglando y publicando.
2026-10-15 14:48 ET: José pidió: pantalla de logo al abrir, sección de videos tutoriales por función, y Clon IA (fotos de cara y cuerpo el primer día, clon con mismo peso/altura que cambia al bajar de peso o ganar fuerza). En construcción (rama feat-clon-tutoriales).

- 2026-10-15 15:10 ET: Logo al abrir + 12 tutoriales + Clon IA hechos en rama feat-clon-tutoriales (bc3f979, worktree /workspace/angie-one-wt), QA 112/112. Sin push ni deploy. Pendiente OK José: fusionar/publicar + desplegar Worker /clone. Informe: /workspace/calorias/clon-tutoriales-informe.md
2026-10-15 15:10 ET: José aprobó publicar rama feat-clon-tutoriales (bc3f979) + desplegar Worker /clone, tras los arreglos de iPhone. Siguiente mejora: clon 3D más fiel.
2026-10-15 15:15 ET: Arreglados 3 errores del iPhone (plan IA: JSON roto de Gemini → esquema + 2 llamadas + modelos de respaldo; voz: grabación + transcripción en Worker /voice; código: escáner con cámara + foto de etiqueta) y fusionada la rama clon-tutoriales (logo, 12 tutoriales, Clon IA, Worker /clone). QA 393/393. Publicado (GitHub f74afdd + web + Worker).
2026-10-15 15:26 ET: José (manejando) pidió investigación de la mejor app del mercado: todas sus funciones gratis y premium, para qué sirven y qué problema resuelven → investigacion-app-lider.md/.pdf.
2026-10-15 15:28 ET: MyFitnessPal es la #1. José aprobó construir las 5 funciones que faltan: macros por comida en gramos, conexión Apple Health/Health Connect, copiar comidas y macros rápidos, preparación semanal con lista de compras, carbohidratos netos y hora de comida.
2026-10-15 15:32 ET: José pidió investigar las quejas constantes de usuarios de MyFitnessPal → quejas-myfitnesspal.md/.pdf.
2026-10-15 15:48 ET: José aprobó construir lista de alimentos verificada (sello) y cobros honestos (aviso 1 día antes, cancelar en 2 toques, sin ventanas repetidas).
- 2026-10-15 16:12 ET: Hechas las 5 funciones MFP (macros día/comida + anillos, salud import web + nativo preparado, copiar + añadir rápido, semana + lista de compras, netos + hora) + lista verificada + cobro honesto + rachas opcionales. QA 138/138 + 88/88 + regresión verde. Commit local SIN push/web: pendiente sí de José para publicar. Informe: /workspace/calorias/mfp5-informe.md
2026-10-15 16:12 ET: José aprobó; publicado c9c0cad (5 funciones MFP, lista verificada, cobro honesto, rachas opcionales).
2026-10-15 16:18 ET: José aprobó montar base de alimentos gratis (Open Food Facts + USDA FDC + lista verificada propia) en servidor gratis. Preferir Cloudflare D1 (cuenta ya existe) para no crear cuentas nuevas.
2026-10-15 16:23 ET: José aprobó copia en la nube gratis (Cloudflare, cifrada, recuperar al cambiar de teléfono, fotos del clon solo en el teléfono, borrar todo con un botón). Se hará tras la base de alimentos; publicar aprobado.
2026-10-15 16:35 ET: José: el clon 2D es horrible y los tutoriales sin vida. Quiere clon idéntico, realista en 3D (gancho principal) y videos tutoriales de calidad, interactivos, que muestren con ejemplo la función de cada botón. Rehacer ambos.
2026-10-15 16:38 ET: José: la app se ve básica y poco profesional, sin vida; quiere un rediseño que deslumbre. Primero propuesta visual para aprobar.
2026-10-15 16:39 ET: José: el rediseño debe aplicarse a TODAS las pantallas.
2026-10-15 16:42 ET: José eligió rediseño A Vibrante para modo claro y B Elegante para modo oscuro, en las 70 pantallas (propuesta en /workspace/calorias/rediseno/propuesta.md).
- 2026-10-15 16:44 ET: Base de alimentos gratis publicada (Cloudflare KV: 262.638 en búsqueda, 1.052.881 códigos; USDA + Open Food Facts ODbL + 72 platos latinos; proxy en vivo) + copia en la nube cifrada E2E (restaurar, borrar todo). Commit b884636, web + Worker. QA 48/48 + regresión verde. Pendiente José: permiso D1 en el token, clave USDA gratis. Informe: /workspace/calorias/base-alimentos-informe.md
2026-10-15 16:44 ET: José aprobó la calidad de los videos A.mp4/B.mp4 del rediseño: todos los tutoriales y el clon deben verse así.
2026-10-15 16:46 ET: José no encontró la sección de Taxes. Existía escondida (Más → Mis recibos y datos → Informe anual, solo Premium). Se hace visible como sección 'Taxes e impuestos' en Inicio y Más dentro del rediseño.
2026-10-15 16:48 ET: José: la IA crea sola el informe mensual y, en temporada de taxes, el informe anual con deducciones de los recibos del año; avisar al usuario.

## 15 oct 2026, 5:15 PM: pulir antes de publicar
- Jose: "Pule todas las pantallas antes de publicar". No se publica todavía.
- Hecho en rediseno-ui (sin push ni despliegue): cabecera con foto e icono en todas las pantallas secundarias, títulos con acento, vacíos e iconos con degradado. Fotos Unsplash en ATRIBUCION.md. Capturas y collages nuevos en /workspace/calorias/rediseno/final/.
- Siguiente: Jose revisa las muestras y decide si se publica.

- 2026-10-15 5:48 PM: Jose propone "Clon realista" a US$0.50/mes (cubre ~US$0.12 por foto + ganancia), SOLO si la opción de pago logra de verdad un clon idéntico. Primero se prueba gratis y se le muestra una muestra.
- 2026-10-15 5:49 PM: Jose dijo "Todavía no" a la prueba de pago (<1 USD). Decide: clon realista SOLO en Premium, sumando US$0.50 al precio Premium (1.99->2.49/mes; LatAm 0.99->1.49). Queda apagado hasta aprobar la prueba y confirmar parecido real. Tope recomendado 2 poses/mes.

## 15 oct 2026, 5:42 PM: segundo pulido, pantalla por pantalla
- Contenido más rico: tarjetas con icono, anillos y barras, cifras grandes, notas en tarjeta, títulos con icono y estados vacíos con imagen. Afecta a Familia, Ayuno, Macros, Memoria, Coach y su configuración, Plan de comidas, Clon, Recibos, Informes, Copiar, Relojes, Copia en la nube, Código de barras, Viaje, Sueño, Antojo, Voz, WhatsApp, Borrar cuenta, Legal, Ajustes, Preferencias y Avisos. Coach ya tiene cabecera.
- Todo en rediseno-ui (ecd4d9c), sin push ni despliegue. Todas las comprobaciones pasan, salvo las 4 de passkey que ya fallaban.
- Aún algo sencillas: Informe anónimo, Menú del restaurante, Resumen semanal, Mi resumen, Entrada y seguridad, Video semanal, Chef.

## 15 oct 2026, 6:30 PM: tercer pulido, el último
- Informe anónimo, Menú, Resumen semanal, Mi resumen, Entrada y seguridad, Video semanal, Nevera y chef, Mascota y Comunidad ya están al nivel de Inicio. Commit 8fcf063 en rediseno-ui, sin push ni despliegue. Todas las comprobaciones pasan, salvo las 4 de passkey que ya fallaban.
- Muestras para Jose: /workspace/calorias/rediseno/final/resumen-claro.png y resumen-oscuro.png. Falta su aprobación para publicar.

## 15 oct 2026, 7:19 PM: publicar el rediseño
- master local avanzado a 8fcf063 sin conflictos (incluye la base de alimentos y la copia en la nube de b884636). clon-3d-real no entra.
- Push y despliegue en espera: no vi el "sí" de Jose en el chat; falta confirmarlo.
- 2026-10-15 7:20 PM: Jose aprobó publicar rediseño; master 8fcf063 subido y web desplegada.

## 21 oct 2026, 11:00 AM ET: 5 funciones de Yazio + revisión + Premium gratis
- Rama feat-yazio5 (worktree /workspace/angie-one-y5), sin push ni despliegue. Hecho: calorías por día de la semana, ánimo/síntomas/notas (bienestar, no médico), vitaminas y minerales con %VD, recetario + modo cocina, diario personalizable + planificar comidas y "repetir ayer".
- Panel del Fundador: "Premium gratis para personas" (correo o ID, revocable, caducidad opcional; en iPhone usa Offer Codes de Apple y en Android códigos de Google Play). Panel solo visible en modo fundador.
- Extra gratis: "Ánimo y comida" (kcal medias en días buenos vs bajos).
- Fallos corregidos: botón ✕ cortado en Personalizar diario; regalo/revocar no se guardaba si la red tardaba (iPhone).
- Necesita OK de Jose: desplegar Worker con /grants y FOUNDER_KEY (gratis); subir Premium a 2,49/1,49 solo cuando se apruebe la prueba del clon (<1 USD); Stripe y cuentas de pago; publicar.
- Collages: /workspace/calorias/yazio5/light-collage.png y dark-collage.png.

## 21 oct 2026, 12:20 PM ET: publicado Yazio 5 + Premium gratis
- Jose (11:22 AM): "Arregla las 2 pruebas, activa el servidor gratis y publica".
- Worker angie-one-ai desplegado con /grants y FOUNDER_KEY (guardada solo en .env, nunca en el chat). Verificado: sin clave → rechazo; dar, canjear y revocar funcionan (la revocación tarda ≤1 min por KV).
- Copia en la nube: el borrado deja una "lápida" y el teléfono no usa caché; QA espera la propagación de KV.
- master b61890c subido a GitHub y web desplegada; el paquete en vivo coincide con dist y las pantallas nuevas cargan.
- Pendiente: qa-iphone con IA en vivo (foto de etiqueta 190 kcal y un atasco de WebKit) por revisar.
- 2026-10-21 12:00 PM: Jose reclamó publicar con una falla pendiente (foto etiqueta iPhone). Regla: NUNCA publicar si queda alguna prueba fallando; avisar y preguntar antes.
- 2026-10-21 12:00 PM: Jose decide dejar publicada la versión nueva (b61890c) mientras se arregla la foto de etiqueta; el arreglo se sube solo con su sí.
- 2026-10-21 12:21 PM: Jose: NO publicar arreglos iPhone (master f444aa2 local); publicar todo junto con el clon realista cuando esté listo. Facturación AI Studio: falló desde la compu (perfil Organización); Jose lo intenta desde su teléfono como Persona física.
- 2026-10-21 3:16 PM: Aviso Supabase (30-oct): Angie One no usa Supabase; regla documentada en supabase-grants-oct30/README.md.
- 2026-10-21 3:42 PM: Facturación Google AI Studio pide prepago mínimo de 30 USD; Jose lo pospone. La prueba del clon realista espera a que haya ingresos.
- 2026-10-21 3:52 PM: Jose aprobó construir 6 funciones gratis del estudio top10 (puntuación de hábitos, gasto semanal, fotos y medidas, lecciones con audio, amigos y retos, metas por nutriente). Widgets/reloj y recordatorio de suplementos, para después.
- 2026-10-21 3:55 PM: Tras las 6: revisión profunda vs acuerdos y reglas de Apple (que solo quede el clon), auditar y ampliar la base de alimentos, corregir fallas, y diagnóstico de cada función (cómo funciona, para qué sirve, qué problema resuelve).
- 2026-10-21 4:50 PM: Clon oculto hasta que haya dinero; se lanzará como actualización de Premium (valor agregado).

## 21 oct 2026, 4:30 PM ET: clon escondido y arreglos publicados
- Jose (3:42 PM): "Esconde el clon y publica los arreglos". Clon escondido con CLONE_ENABLED=false en src/flags.ts (Más, Inicio, Explorar/gemelo, avatar, tutorial del clon; /clon y /twin llevan a Inicio). El código se conserva. No había paso del clon en el registro inicial.
- Todas las pruebas pasaron (tsc, i18n, npm test 121, 10 suites QA en Chromium + WebKit iPhone, sin fallos; los 4 de passkey no aparecieron). master 1456da6 subido y web desplegada; paquete en vivo = dist; el clon ya no aparece en la web.
- Arreglo interno: el despliegue exporta con --clear (la caché de Metro mezclaba rutas de otro worktree).

## 21 oct 2026, 4:40 PM ET: 6 funciones gratis (rama feat-top6, sin push ni despliegue)
- Jose (3:52 PM) aprobó: puntuación de hábitos 0-100 + colores, energía estimada semanal, fotos de progreso (solo en el teléfono) y medidas, lecciones de 2 min con audio, amigos y retos (apodo + puntos, reportar y moderar), metas por nutriente. 13 idiomas. QA 68/68.
- Falta para publicar amigos: desplegar el Worker con /friends (gratis) y el OK de Jose.
- Collages: /workspace/calorias/top6/light-collage.png y dark-collage.png.

- 2026-10-21 5:02 PM: José aprobó que el coach sugiera 2-3 recetas según calorías restantes y objetivo del plan. Hacerlo DESPUÉS de la revisión profunda, en feat-top6, gratis.
- 2026-10-21 5:06 PM: José pidió coach "perfecto": conocimiento profesional integrado (nutrición, dietas, ejercicio, fisioterapia, psicología de hábitos, medicina deportiva, sueño, etc.) con guías y herramientas efectivas por meta. Hacer DESPUÉS de la revisión, junto a recetas por plan. Incluir avisos de seguridad y derivar a profesional ante lesión/enfermedad (reglas Apple).
- 2026-10-21 7:45 PM: Revisión profunda terminada en feat-top6 (08d158b). Todas las pruebas pasan. Diagnóstico: /workspace/calorias/diagnostico-completo.md y .pdf. Sin publicar ni desplegar.
- 2026-10-21 7:43 PM: Revisión profunda terminada (feat-top6 08d158b, todo pasa). José eligió: hacer el coach primero y publicar todo junto (feat-top6 + worker /friends + coach), pidiendo permiso al final.

## 21 oct 2026, 8:30 PM ET: coach profesional (rama feat-top6, sin push ni despliegue)
- Jose aprobó construirlo ahora y publicar todo junto después (feat-top6 + Worker /friends + /chat v5).
- Recetas según el plan: el coach propone 2-3 recetas que caben en las kcal que quedan hoy, según la meta (bajar: más proteína; subir: más energía) y lo que no come (vegetariano, pescado, lácteos, huevo, carne, pollo, legumbres, frutos secos). Fuentes: recetario (Cocinar → modo cocina) + 170 platos latinos y españoles (Añadir al diario).
- Guía profesional (/coachguide): 8 áreas (nutrición, estilos de dieta, entrenamiento, fisioterapia y movilidad, hábitos, sueño, hidratación, medicina deportiva), programa de 4 semanas por meta con progresión, lista diaria de 5 hábitos y aviso para ir a un profesional. 13 idiomas.
- Chat: envía a la IA el conocimiento profesional que corresponde a la pregunta; ante señales de alarma (dolor de pecho, desmayo, embarazo, medicamentos, trastornos alimentarios, lesiones) muestra "Habla con un profesional". Sin diagnóstico, sin dosis, sin planes de rehabilitación.
- Worker /chat v5 (prompt de equipo profesional, contexto 1.400) listo en el código; necesita desplegarse con el sí de Jose (gratis). Hasta entonces el coach funciona con el Worker actual (contexto recortado a 700).
- 2026-10-21 9:15 PM: coach profesional listo en feat-top6 (3c023c6). Todas las pruebas pasan (tsc, i18n, npm test, 13 suites QA en Chromium + WebKit iPhone). Listo para publicar junto con feat-top6 + Worker (/friends y /chat v5) cuando Jose diga sí.
- 2026-10-21 11:55 PM: Auditoría del coach con fuentes oficiales y casos especiales (diabetes, hipertensión, embarazo y posparto, mayores, adolescentes, trastornos alimentarios, articulaciones, colesterol). Eval de 106 preguntas + 39 personas: confianza de 97 a 98, casos especiales de 91 a 98, seguridad 100. La cuota gratis de la IA se agotó con el eval: qa-iphone y qa-web (partes con IA en vivo) y la 2.ª corrida del eval quedan por repetir cuando se renueve. No publicar hasta que pasen.
- 2026-10-22 8:00 AM: Cuota de IA renovada. Arreglos: sin dosis de suplementos (filtro en la app), sin números ante señales de TCA, derivación añadida por la app. Eval sensible: 99, seguridad 100. Todas las pruebas pasan en feat-top6. Listo para publicar con el sí de Jose (feat-top6 + Worker /friends y /chat v5).
- 2026-10-22 8:39 AM: José aprobó (llamada) publicar web tras verificar todo; App Store no (sin cuenta Apple). Pidió Stripe REAL en la web para suscripciones hasta que Apple apruebe. Precios elegidos: 2,49 $/mes, 1,49 $/mes Latam (anual pendiente de confirmar). Revisión de cumplimiento Apple encolada (sin publicar).
- 2026-10-22 8:41 AM: José CORRIGE: UN SOLO PRECIO MUNDIAL 2,49 $/mes, sin precio Latam (los costos por usuario son iguales). Quitar precio regional del código y del texto.
- 2026-10-22 8:42 AM: Precio anual 24,99 $/año, mundial.
- 2026-10-22 8:45 AM: Plan Stripe: 1) publicar web, 2) conectar Stripe MODO PRUEBA (sk_test_) y probar pagos, suscripciones, cancelaciones y reembolsos, 3) solo luego José conecta la real.
- 2026-10-22 9:40 AM: Publicación DETENIDA por la regla: master local cca100a (feat-top6 + precio único 2,49 $/mes y 24,99 $/año, sin LatAm, sin botón de compra hasta conectar pagos) pasa todo menos las pruebas con IA en vivo (qa-iphone 31/40, qa-web 3 fallos): la IA (Gemini gratis) tarda más de 40 s o responde ocupada. No se desplegó el Worker, no se hizo push ni se publicó la web. Stripe de prueba y la auditoría de Apple quedan en espera.
- 2026-10-22 9:44 AM (vía Grok Bot, orden de José para todas las apps): cuenta de fundador única (parrareimonjose@icloud.com, contraseña en env FOUNDER_PASSWORD, nunca en chat/repo), crear al estar lista para publicar y cobrar. La app debe tener: guardar contraseña en el dispositivo (autocomplete), "Olvidé mi contraseña", y Face ID preparado para Apple.
- 2026-10-22 9:53 AM: CORRECCIÓN correo fundador único: fundadordeparraapps@gmail.com (NO parrareimonjose@icloud.com). Contraseña en FOUNDER_PASSWORD.

## 2026-10-22, 10:40 AM ET: KV, Stripe PRUEBA, Apple, entrada
- **KV gratis al 50 %:** la causa NO es Angie One. Es **Carta al Futuro** (KV `LETTERS`). Su cron `* * * * *` hace un `list` por minuto (≈1.440 al día, más que el límite gratis de 1.000), y su rate-limit escribe en KV en cada petición. Hoy LETTERS lleva 779 escrituras, 338 borrados y 191 listados; Angie One (FOODS) 48 escrituras y 340 lecturas. Arreglo propuesto, sin hacer (es otro proyecto y necesita deploy): cron cada 15 min o cada hora y rate-limit en memoria. En Angie One: Cache API delante de GET /foods/*; QA y eval van al Worker local (`tests/kvguard.mjs`, `wrangler dev`).
- **Stripe MODO PRUEBA** (rama feat-stripe-test): Worker /pay/* (Checkout de suscripción, webhook con firma HMAC, Portal, estado, ledger y reembolso solo con la clave del fundador). La app solo cobra si se compila con `EXPO_PUBLIC_PAY_MODE=test|live`. El sitio público sigue sin botón de compra. E2E 32/32 y UI 21/21 con wrangler dev + stripe listen. Productos de prueba: angieone_premium_monthly 2,49 y angieone_premium_yearly 24,99 (lookup_key). No se pasa a modo en vivo.
- **Secretos para el deploy (cuando toque):** `wrangler secret put STRIPE_SK` (sk_test) y `STRIPE_WHSEC` (de un webhook de Stripe apuntando al Worker). Sin ellos, /pay responde «not_configured».
- **Entrada:** autocompletar de contraseñas, «Olvidé mi contraseña» con código de recuperación de un solo uso (gratis, sin servidor) y gancho Face ID (`src/biometric.ts`: WebAuthn en web, iOS listo para expo-local-authentication). No se creó la cuenta del fundador.
- **Apple:** /workspace/calorias/cumplimiento-apple.md + .pdf.
