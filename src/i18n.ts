import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

export const SUPPORTED = ['es', 'en', 'pt'] as const;
export type Lang = (typeof SUPPORTED)[number];

/** Idioma del teléfono; si no es ES/PT/EN, usa inglés. */
export function deviceLang(): Lang {
  const code = (getLocales()[0]?.languageCode || 'en').toLowerCase();
  return (SUPPORTED as readonly string[]).includes(code) ? (code as Lang) : 'en';
}

const es = {
  tagline: 'Tu coach de nutrición con IA, sin culpa.',
  start: 'Empezar', next: 'Siguiente', back: 'Atrás', save: 'Guardar', cancel: 'Cancelar', add: 'Añadir', done: 'Listo',
  ob: { goal: '¿Cuál es tu objetivo?', lose: 'Bajar de peso', keep: 'Mantenerme', gain: 'Ganar músculo',
    body: 'Cuéntame de ti', weight: 'Peso (kg)', height: 'Altura (cm)', age: 'Edad', sex: 'Sexo', female: 'Mujer', male: 'Hombre',
    activity: '¿Cuánto te mueves?', a1: 'Poco (oficina)', a2: 'Ligero (1–3 días)', a3: 'Moderado (3–5 días)', a4: 'Mucho (6–7 días)',
    trialTitle: '7 días de Premium gratis', trialBody: 'Desde hoy tienes todo Premium gratis durante 7 días, sin tarjeta. Te avisaremos 2 días antes y el último día. Al terminar vuelves a la versión gratis y tus datos se quedan contigo. Nada se cobra solo.',
    target: 'Tu meta diaria: {{kcal}} kcal', go: '¡Vamos!' },
  home: { hello: '¡Hola! Hoy vas muy bien', left: 'restantes', eaten: 'comidas', goal: 'meta', protein: 'Proteína', carbs: 'Carbos', fat: 'Grasa',
    water: 'Agua', addWater: '+1 vaso', challenge: 'Reto del día', streak: 'Racha: {{n}} días', challengeDone: '¡Reto cumplido!', markDone: 'Lo hice',
    readAloud: 'Leer en voz alta', summary: 'Llevas {{eaten}} de {{goal}} calorías y {{water}} vasos de agua.', trialDays: 'Te quedan {{n}} días de Premium gratis', trialOver: 'Tu prueba terminó. Tus datos siguen aquí.',
    challenges: ['Toma 8 vasos de agua', 'Camina 20 minutos', 'Come una fruta de colores', 'Añade proteína a tu desayuno', 'Cena antes de las 9'] },
  nav: { home: 'Inicio', scan: 'Foto', diary: 'Diario', more: 'Más' },
  scan: { title: 'Foto del plato', take: 'Tomar foto', pick: 'Elegir de la galería', analyzing: 'Analizando…', demo: 'MODO DEMO: estimación simulada (sin clave de IA)',
    live: 'IA: Gemini Flash-Lite', range: 'Rango estimado', confidence: 'Confianza', high: 'alta', medium: 'media', low: 'baja',
    questions: 'Afina en 1 toque', oil: '¿Con aceite?', sauce: '¿Con salsa?', fried: '¿Frito?', portion: 'Porción', yes: 'Sí', no: 'No',
    log: 'Añadir al diario', disclaimer: 'Es una estimación, no un valor exacto. Puedes corregirla.', aiOff: 'La IA está apagada. Actívala en Ajustes o registra a mano.', error: 'No pude analizar la foto. Prueba otra vez o regístralo a mano.',
    limit: 'En la versión gratis tienes 1 foto con IA al día.' },
  bar: { title: 'Código de barras', hint: 'Escribe o escanea el código (datos de Open Food Facts)', search: 'Buscar', scanCam: 'Escanear con cámara', notFound: 'No encontré ese producto. Regístralo a mano.', per100: 'por 100 g', grams: 'Gramos', semaphore: 'Semáforo', sugar: 'Azúcar', salt: 'Sal', satfat: 'Grasa sat.' },
  manual: { title: 'Registro manual', name: 'Nombre', kcal: 'Calorías', latin: 'Comida latina', search: 'Buscar comida…', dictate: 'Dictar por voz' },
  diary: { title: 'Diario de hoy', empty: 'Aún no hay nada. ¡Toma una foto de tu plato!', total: 'Total', remove: 'Quitar', prev: 'Día anterior', nextDay: 'Día siguiente', today: 'Hoy' },
  more: { title: 'Más', barcode: 'Código de barras', manual: 'Registro manual', settings: 'Ajustes', premium: 'Premium', founder: 'Panel del Fundador' },
  set: { title: 'Ajustes', language: 'Idioma', auto: 'Automático (idioma del teléfono)', ai: 'Análisis con IA', aiDesc: 'Si lo apagas, no se envían fotos a ningún servicio.', profile: 'Rehacer mi perfil', reset: 'Borrar mis datos', resetQ: '¿Seguro? Esto borra todo en este dispositivo.', privacy: 'Tu diario se guarda solo en este dispositivo. Nunca vendemos tus datos de salud.', version: 'Versión MVP' },
  pay: { title: 'Angie One Premium', sub: 'Todo lo que necesitas, a precio honesto', monthly: '1,99 $ / mes', yearly: '14,99 $ / año', yearlySave: 'Ahorras 37 %', latam: 'Latinoamérica: 0,99 $ / mes',
    f1: 'Fotos con IA ilimitadas (uso justo)', f2: 'Planes de dieta y ejercicio personalizados', f3: 'Coach semanal y chat', f4: 'Escáner de nevera y menú', f5: 'Sin anuncios',
    offer: 'Oferta de bienvenida 48 h: tu precio queda congelado para siempre mientras sigas suscrito.', renew: 'Renovación automática. Cancela en 1 toque cuando quieras. El precio se muestra antes de pagar.',
    cta: 'Suscribirme', soon: 'Los pagos aún no están activos (versión de prueba).', free: 'Seguir con la versión gratis' },
  fo: { title: 'Panel del Fundador v1', sub: 'La IA propone, tú decides con un toque', approve: 'Aprobar', reject: 'Rechazar', approved: 'Aprobado', rejected: 'Rechazado', demo: 'Datos de ejemplo. Nada mueve dinero real.',
    kpi: 'Resumen', users: 'Usuarios', paying: 'Pagando', mrr: 'Ingreso mensual' },
};
type Dict = typeof es;
const en: Dict = {
  tagline: 'Your AI nutrition coach, guilt-free.',
  start: 'Get started', next: 'Next', back: 'Back', save: 'Save', cancel: 'Cancel', add: 'Add', done: 'Done',
  ob: { goal: "What's your goal?", lose: 'Lose weight', keep: 'Maintain', gain: 'Build muscle',
    body: 'Tell me about you', weight: 'Weight (kg)', height: 'Height (cm)', age: 'Age', sex: 'Sex', female: 'Female', male: 'Male',
    activity: 'How active are you?', a1: 'Low (desk job)', a2: 'Light (1–3 days)', a3: 'Moderate (3–5 days)', a4: 'High (6–7 days)',
    trialTitle: '7 days of Premium free', trialBody: "Starting today you get all of Premium free for 7 days, no card needed. We'll remind you 2 days before and on the last day. Afterwards you go back to the free version and keep all your data. Nothing is charged automatically.",
    target: 'Your daily goal: {{kcal}} kcal', go: "Let's go!" },
  home: { hello: "Hi! You're doing great today", left: 'left', eaten: 'eaten', goal: 'goal', protein: 'Protein', carbs: 'Carbs', fat: 'Fat',
    water: 'Water', addWater: '+1 glass', challenge: 'Daily challenge', streak: 'Streak: {{n}} days', challengeDone: 'Challenge done!', markDone: 'I did it',
    readAloud: 'Read aloud', summary: "You've had {{eaten}} of {{goal}} calories and {{water}} glasses of water.", trialDays: '{{n}} days of free Premium left', trialOver: 'Your trial ended. Your data is still here.',
    challenges: ['Drink 8 glasses of water', 'Walk 20 minutes', 'Eat a colorful fruit', 'Add protein to breakfast', 'Have dinner before 9pm'] },
  nav: { home: 'Home', scan: 'Photo', diary: 'Diary', more: 'More' },
  scan: { title: 'Meal photo', take: 'Take photo', pick: 'Choose from gallery', analyzing: 'Analyzing…', demo: 'DEMO MODE: simulated estimate (no AI key)',
    live: 'AI: Gemini Flash-Lite', range: 'Estimated range', confidence: 'Confidence', high: 'high', medium: 'medium', low: 'low',
    questions: 'Refine in 1 tap', oil: 'With oil?', sauce: 'With sauce?', fried: 'Fried?', portion: 'Portion', yes: 'Yes', no: 'No',
    log: 'Add to diary', disclaimer: "It's an estimate, not an exact value. You can correct it.", aiOff: 'AI is off. Turn it on in Settings or log manually.', error: "I couldn't analyze the photo. Try again or log it manually.",
    limit: 'The free version includes 1 AI photo per day.' },
  bar: { title: 'Barcode', hint: 'Type or scan the code (Open Food Facts data)', search: 'Search', scanCam: 'Scan with camera', notFound: "Product not found. Log it manually.", per100: 'per 100 g', grams: 'Grams', semaphore: 'Traffic light', sugar: 'Sugar', salt: 'Salt', satfat: 'Sat. fat' },
  manual: { title: 'Manual log', name: 'Name', kcal: 'Calories', latin: 'Latin food', search: 'Search food…', dictate: 'Dictate by voice' },
  diary: { title: "Today's diary", empty: 'Nothing yet. Snap a photo of your meal!', total: 'Total', remove: 'Remove', prev: 'Previous day', nextDay: 'Next day', today: 'Today' },
  more: { title: 'More', barcode: 'Barcode', manual: 'Manual log', settings: 'Settings', premium: 'Premium', founder: 'Founder Panel' },
  set: { title: 'Settings', language: 'Language', auto: 'Automatic (phone language)', ai: 'AI analysis', aiDesc: 'If off, no photos are sent to any service.', profile: 'Redo my profile', reset: 'Delete my data', resetQ: 'Sure? This deletes everything on this device.', privacy: 'Your diary is stored only on this device. We never sell your health data.', version: 'MVP version' },
  pay: { title: 'Angie One Premium', sub: 'Everything you need, honest price', monthly: '$1.99 / month', yearly: '$14.99 / year', yearlySave: 'Save 37%', latam: 'Latin America: $0.99 / month',
    f1: 'Unlimited AI photos (fair use)', f2: 'Personalized diet & workout plans', f3: 'Weekly coach & chat', f4: 'Fridge & menu scanner', f5: 'No ads',
    offer: '48h welcome offer: your price is locked forever while you stay subscribed.', renew: 'Auto-renews. Cancel in 1 tap anytime. Price shown before you pay.',
    cta: 'Subscribe', soon: 'Payments are not active yet (preview build).', free: 'Continue with free version' },
  fo: { title: 'Founder Panel v1', sub: 'AI proposes, you decide in one tap', approve: 'Approve', reject: 'Reject', approved: 'Approved', rejected: 'Rejected', demo: 'Sample data. Nothing moves real money.',
    kpi: 'Summary', users: 'Users', paying: 'Paying', mrr: 'Monthly revenue' },
};
const pt: Dict = {
  tagline: 'Seu coach de nutrição com IA, sem culpa.',
  start: 'Começar', next: 'Próximo', back: 'Voltar', save: 'Salvar', cancel: 'Cancelar', add: 'Adicionar', done: 'Pronto',
  ob: { goal: 'Qual é o seu objetivo?', lose: 'Perder peso', keep: 'Manter', gain: 'Ganhar músculo',
    body: 'Conte sobre você', weight: 'Peso (kg)', height: 'Altura (cm)', age: 'Idade', sex: 'Sexo', female: 'Mulher', male: 'Homem',
    activity: 'Quanto você se movimenta?', a1: 'Pouco (escritório)', a2: 'Leve (1–3 dias)', a3: 'Moderado (3–5 dias)', a4: 'Muito (6–7 dias)',
    trialTitle: '7 dias de Premium grátis', trialBody: 'A partir de hoje você tem todo o Premium grátis por 7 dias, sem cartão. Avisaremos 2 dias antes e no último dia. Depois você volta para a versão grátis e seus dados ficam com você. Nada é cobrado sozinho.',
    target: 'Sua meta diária: {{kcal}} kcal', go: 'Vamos!' },
  home: { hello: 'Oi! Você está indo muito bem hoje', left: 'restantes', eaten: 'consumidas', goal: 'meta', protein: 'Proteína', carbs: 'Carboidratos', fat: 'Gordura',
    water: 'Água', addWater: '+1 copo', challenge: 'Desafio do dia', streak: 'Sequência: {{n}} dias', challengeDone: 'Desafio cumprido!', markDone: 'Consegui',
    readAloud: 'Ler em voz alta', summary: 'Você consumiu {{eaten}} de {{goal}} calorias e {{water}} copos de água.', trialDays: 'Restam {{n}} dias de Premium grátis', trialOver: 'Seu teste terminou. Seus dados continuam aqui.',
    challenges: ['Beba 8 copos de água', 'Caminhe 20 minutos', 'Coma uma fruta colorida', 'Adicione proteína ao café da manhã', 'Jante antes das 21h'] },
  nav: { home: 'Início', scan: 'Foto', diary: 'Diário', more: 'Mais' },
  scan: { title: 'Foto do prato', take: 'Tirar foto', pick: 'Escolher da galeria', analyzing: 'Analisando…', demo: 'MODO DEMO: estimativa simulada (sem chave de IA)',
    live: 'IA: Gemini Flash-Lite', range: 'Faixa estimada', confidence: 'Confiança', high: 'alta', medium: 'média', low: 'baixa',
    questions: 'Ajuste em 1 toque', oil: 'Com óleo?', sauce: 'Com molho?', fried: 'Frito?', portion: 'Porção', yes: 'Sim', no: 'Não',
    log: 'Adicionar ao diário', disclaimer: 'É uma estimativa, não um valor exato. Você pode corrigir.', aiOff: 'A IA está desligada. Ative em Ajustes ou registre manualmente.', error: 'Não consegui analisar a foto. Tente de novo ou registre manualmente.',
    limit: 'Na versão grátis você tem 1 foto com IA por dia.' },
  bar: { title: 'Código de barras', hint: 'Digite ou escaneie o código (dados do Open Food Facts)', search: 'Buscar', scanCam: 'Escanear com a câmera', notFound: 'Produto não encontrado. Registre manualmente.', per100: 'por 100 g', grams: 'Gramas', semaphore: 'Semáforo', sugar: 'Açúcar', salt: 'Sal', satfat: 'Gord. sat.' },
  manual: { title: 'Registro manual', name: 'Nome', kcal: 'Calorias', latin: 'Comida latina', search: 'Buscar comida…', dictate: 'Ditar por voz' },
  diary: { title: 'Diário de hoje', empty: 'Nada ainda. Tire uma foto do seu prato!', total: 'Total', remove: 'Remover', prev: 'Dia anterior', nextDay: 'Próximo dia', today: 'Hoje' },
  more: { title: 'Mais', barcode: 'Código de barras', manual: 'Registro manual', settings: 'Ajustes', premium: 'Premium', founder: 'Painel do Fundador' },
  set: { title: 'Ajustes', language: 'Idioma', auto: 'Automático (idioma do telefone)', ai: 'Análise com IA', aiDesc: 'Se desligar, nenhuma foto é enviada a nenhum serviço.', profile: 'Refazer meu perfil', reset: 'Apagar meus dados', resetQ: 'Tem certeza? Isso apaga tudo neste dispositivo.', privacy: 'Seu diário fica só neste dispositivo. Nunca vendemos seus dados de saúde.', version: 'Versão MVP' },
  pay: { title: 'Angie One Premium', sub: 'Tudo o que você precisa, preço honesto', monthly: 'US$ 1,99 / mês', yearly: 'US$ 14,99 / ano', yearlySave: 'Economize 37%', latam: 'América Latina: US$ 0,99 / mês',
    f1: 'Fotos com IA ilimitadas (uso justo)', f2: 'Planos de dieta e treino personalizados', f3: 'Coach semanal e chat', f4: 'Scanner de geladeira e cardápio', f5: 'Sem anúncios',
    offer: 'Oferta de boas-vindas 48 h: seu preço fica congelado para sempre enquanto continuar assinante.', renew: 'Renovação automática. Cancele em 1 toque quando quiser. O preço aparece antes de pagar.',
    cta: 'Assinar', soon: 'Os pagamentos ainda não estão ativos (versão de teste).', free: 'Continuar na versão grátis' },
  fo: { title: 'Painel do Fundador v1', sub: 'A IA propõe, você decide em um toque', approve: 'Aprovar', reject: 'Rejeitar', approved: 'Aprovado', rejected: 'Rejeitado', demo: 'Dados de exemplo. Nada movimenta dinheiro real.',
    kpi: 'Resumo', users: 'Usuários', paying: 'Pagantes', mrr: 'Receita mensal' },
};

i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en }, pt: { translation: pt } },
  lng: deviceLang(), fallbackLng: 'en', interpolation: { escapeValue: false }, returnObjects: true,
});
import { EXTRA } from './i18n-extra';
(['es', 'en', 'pt'] as const).forEach((l) => i18n.addResourceBundle(l, 'translation', EXTRA[l], true, true));
export default i18n;
