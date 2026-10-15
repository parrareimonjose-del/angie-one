// BORRADORES legales (ES/EN/PT) — deben ser revisados por un abogado antes de publicar en tiendas.
export const CONTACT = 'angieoneapp.support@gmail.com';
type Doc = { title: string; updated: string; sections: [string, string][] };
type Docs = { privacy: Doc; terms: Doc; medical: Doc };

const es: Docs = {
  privacy: { title: 'Política de privacidad', updated: 'Última actualización: 15 de octubre de 2026', sections: [
    ['Quiénes somos', `Angie One es una app de Parra Apps. Contacto: ${CONTACT}.`],
    ['Qué datos usamos', 'Los datos de tu perfil (objetivo, peso, altura, edad, sexo, actividad), tu diario de comidas, agua y retos. Hoy se guardan solo en tu dispositivo; no tenemos cuentas ni servidores con tu diario.'],
    ['Fotos y textos para la IA', 'Si la IA está encendida, la foto o la descripción de tu plato se envía a nuestro servidor intermedio (Cloudflare) y a Google Gemini solo para calcular la estimación. No la guardamos. Puedes apagar la IA en Ajustes y entonces no se envía nada.'],
    ['Códigos de barras', 'El número del código se consulta en Open Food Facts, una base de datos pública. No se envían tus datos personales.'],
    ['Nunca vendemos tus datos de salud', 'No vendemos, alquilamos ni compartimos tus datos de salud o de comidas con anunciantes ni con terceros. No usamos tus datos de salud para publicidad.'],
    ['Tus derechos', 'Puedes ver y borrar todos tus datos en Ajustes → Borrar mis datos. Si vives en California (CCPA), la UE (RGPD) u otro lugar con leyes de privacidad, puedes ejercer tus derechos escribiendo a nuestro correo.'],
    ['Menores', 'Angie One no está dirigida a menores de 13 años (16 en la UE).'],
    ['Seguridad y brechas', 'Usamos conexiones cifradas (HTTPS). Si ocurre una brecha que afecte tus datos te avisaremos según la ley aplicable (incluida la regla de la FTC sobre notificación de brechas de salud).'],
    ['Cambios', 'Si cambiamos esta política te lo mostraremos en la app antes de que aplique.'],
  ] },
  terms: { title: 'Términos de uso', updated: 'Última actualización: 15 de octubre de 2026', sections: [
    ['Aceptación', 'Al usar Angie One aceptas estos términos. Si no estás de acuerdo, no uses la app.'],
    ['El servicio', 'Angie One te ayuda a registrar comidas y estimar calorías con IA. Las estimaciones son aproximadas y pueden equivocarse.'],
    ['Prueba y suscripción', 'Recibes 7 días de Premium gratis sin tarjeta. Al terminar vuelves a la versión gratis; nada se cobra solo. Después tienes una oferta de 48 horas para congelar el precio mientras sigas suscrito. Las suscripciones se renuevan automáticamente y se cancelan en 1 toque desde tu tienda (App Store o Google Play). El precio se muestra antes de pagar.'],
    ['Uso correcto', 'No uses la app para fines ilegales ni intentes dañarla o abusar del servicio de IA.'],
    ['No es consejo médico', 'Lee el Aviso médico. La app no sustituye a un profesional de la salud.'],
    ['Responsabilidad', 'La app se ofrece “tal cual”. En la medida que permita la ley, Parra Apps no responde por daños derivados del uso de estimaciones.'],
    ['Contacto', `Escríbenos a ${CONTACT}.`],
  ] },
  medical: { title: 'Aviso médico', updated: 'Última actualización: 15 de octubre de 2026', sections: [
    ['No es un dispositivo médico', 'Angie One es una herramienta de bienestar general. No diagnostica, trata, cura ni previene ninguna enfermedad.'],
    ['Estimaciones', 'Las calorías y nutrientes calculados por la IA son estimaciones y pueden tener errores importantes. Revísalos y corrígelos cuando haga falta.'],
    ['Consulta a un profesional', 'Habla con tu médico o nutricionista antes de cambiar tu dieta, sobre todo si estás embarazada o lactando, tienes diabetes, un trastorno de la conducta alimentaria u otra condición de salud, o eres menor de edad.'],
    ['Emergencias', 'Si tienes una emergencia médica, llama al 911 o a tu número local de emergencias.'],
  ] },
};
const en: Docs = {
  privacy: { title: 'Privacy Policy', updated: 'Last updated: October 15, 2026', sections: [
    ['Who we are', `Angie One is an app by Parra Apps. Contact: ${CONTACT}.`],
    ['Data we use', 'Your profile (goal, weight, height, age, sex, activity), your food diary, water and challenges. Today they are stored only on your device; we have no accounts or servers holding your diary.'],
    ['Photos and text for the AI', 'If AI is on, the photo or description of your meal is sent to our proxy (Cloudflare) and to Google Gemini only to calculate the estimate. We do not store it. You can turn AI off in Settings and then nothing is sent.'],
    ['Barcodes', 'The barcode number is looked up in Open Food Facts, a public database. No personal data is sent.'],
    ['We never sell your health data', 'We do not sell, rent or share your health or food data with advertisers or third parties. We do not use your health data for advertising.'],
    ['Your rights', 'You can view and delete all your data in Settings → Delete my data. If you live in California (CCPA), the EU (GDPR) or anywhere with privacy laws, you can exercise your rights by emailing us.'],
    ['Children', 'Angie One is not directed to children under 13 (16 in the EU).'],
    ['Security and breaches', 'We use encrypted connections (HTTPS). If a breach affects your data we will notify you as required by law (including the FTC Health Breach Notification Rule).'],
    ['Changes', 'If we change this policy we will show it in the app before it applies.'],
  ] },
  terms: { title: 'Terms of Use', updated: 'Last updated: October 15, 2026', sections: [
    ['Acceptance', 'By using Angie One you accept these terms. If you do not agree, do not use the app.'],
    ['The service', 'Angie One helps you log meals and estimate calories with AI. Estimates are approximate and can be wrong.'],
    ['Trial and subscription', 'You get 7 days of Premium free with no card. Afterwards you return to the free version; nothing is charged automatically. Then you get a 48-hour offer to lock the price for as long as you stay subscribed. Subscriptions auto-renew and can be cancelled in one tap from your store (App Store or Google Play). The price is shown before you pay.'],
    ['Acceptable use', 'Do not use the app for illegal purposes or try to harm it or abuse the AI service.'],
    ['Not medical advice', 'Read the Medical disclaimer. The app does not replace a health professional.'],
    ['Liability', 'The app is provided "as is". To the extent permitted by law, Parra Apps is not liable for damages arising from the use of estimates.'],
    ['Contact', `Email us at ${CONTACT}.`],
  ] },
  medical: { title: 'Medical disclaimer', updated: 'Last updated: October 15, 2026', sections: [
    ['Not a medical device', 'Angie One is a general wellness tool. It does not diagnose, treat, cure or prevent any disease.'],
    ['Estimates', 'Calories and nutrients calculated by the AI are estimates and may contain significant errors. Review and correct them when needed.'],
    ['Talk to a professional', 'Talk to your doctor or dietitian before changing your diet, especially if you are pregnant or breastfeeding, have diabetes, an eating disorder or another health condition, or are under 18.'],
    ['Emergencies', 'If you have a medical emergency, call 911 or your local emergency number.'],
  ] },
};
const pt: Docs = {
  privacy: { title: 'Política de privacidade', updated: 'Última atualização: 15 de outubro de 2026', sections: [
    ['Quem somos', `Angie One é um app da Parra Apps. Contato: ${CONTACT}.`],
    ['Dados que usamos', 'Seu perfil (objetivo, peso, altura, idade, sexo, atividade), seu diário de refeições, água e desafios. Hoje ficam só no seu dispositivo; não temos contas nem servidores com seu diário.'],
    ['Fotos e textos para a IA', 'Se a IA estiver ligada, a foto ou descrição do prato é enviada ao nosso servidor intermediário (Cloudflare) e ao Google Gemini só para calcular a estimativa. Não a guardamos. Você pode desligar a IA em Ajustes e nada é enviado.'],
    ['Códigos de barras', 'O número do código é consultado no Open Food Facts, uma base pública. Nenhum dado pessoal é enviado.'],
    ['Nunca vendemos seus dados de saúde', 'Não vendemos, alugamos nem compartilhamos seus dados de saúde ou alimentação com anunciantes ou terceiros. Não usamos seus dados de saúde para publicidade.'],
    ['Seus direitos', 'Você pode ver e apagar todos os seus dados em Ajustes → Apagar meus dados. Pela LGPD, RGPD, CCPA ou outras leis, você pode exercer seus direitos escrevendo para nosso e-mail.'],
    ['Menores', 'Angie One não é direcionado a menores de 13 anos (16 na UE).'],
    ['Segurança e incidentes', 'Usamos conexões criptografadas (HTTPS). Se um incidente afetar seus dados, avisaremos conforme a lei aplicável.'],
    ['Mudanças', 'Se mudarmos esta política, mostraremos no app antes de valer.'],
  ] },
  terms: { title: 'Termos de uso', updated: 'Última atualização: 15 de outubro de 2026', sections: [
    ['Aceitação', 'Ao usar o Angie One você aceita estes termos. Se não concordar, não use o app.'],
    ['O serviço', 'Angie One ajuda a registrar refeições e estimar calorias com IA. As estimativas são aproximadas e podem errar.'],
    ['Teste e assinatura', 'Você recebe 7 dias de Premium grátis sem cartão. Depois volta à versão grátis; nada é cobrado sozinho. Em seguida há uma oferta de 48 horas para congelar o preço enquanto continuar assinante. As assinaturas renovam automaticamente e são canceladas em 1 toque na sua loja (App Store ou Google Play). O preço aparece antes de pagar.'],
    ['Uso correto', 'Não use o app para fins ilegais nem tente danificá-lo ou abusar do serviço de IA.'],
    ['Não é conselho médico', 'Leia o Aviso médico. O app não substitui um profissional de saúde.'],
    ['Responsabilidade', 'O app é oferecido “como está”. Na medida permitida por lei, a Parra Apps não responde por danos do uso das estimativas.'],
    ['Contato', `Escreva para ${CONTACT}.`],
  ] },
  medical: { title: 'Aviso médico', updated: 'Última atualização: 15 de outubro de 2026', sections: [
    ['Não é um dispositivo médico', 'Angie One é uma ferramenta de bem-estar geral. Não diagnostica, trata, cura nem previne nenhuma doença.'],
    ['Estimativas', 'As calorias e nutrientes calculados pela IA são estimativas e podem ter erros importantes. Revise e corrija quando necessário.'],
    ['Consulte um profissional', 'Fale com seu médico ou nutricionista antes de mudar sua dieta, principalmente se estiver grávida ou amamentando, tiver diabetes, transtorno alimentar ou outra condição, ou for menor de idade.'],
    ['Emergências', 'Em uma emergência médica, ligue para o número local de emergência (192 no Brasil, 911 nos EUA).'],
  ] },
};
export const LEGAL = { es, en, pt };
export type DocKey = keyof Docs;
