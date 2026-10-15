import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { I18nManager, Platform } from 'react-native';
import es from './locales/es.json'; import en from './locales/en.json'; import pt from './locales/pt.json';
import fr from './locales/fr.json'; import de from './locales/de.json'; import it from './locales/it.json';
import zh from './locales/zh.json'; import ja from './locales/ja.json'; import ko from './locales/ko.json';
import hi from './locales/hi.json'; import ar from './locales/ar.json'; import ru from './locales/ru.json'; import tr from './locales/tr.json';

const RES = { es, en, pt, fr, de, it, zh, ja, ko, hi, ar, ru, tr };
export const SUPPORTED = Object.keys(RES) as Lang[];
export type Lang = keyof typeof RES;
/** Nombre de cada idioma en su propio idioma (selector de Ajustes). */
export const NATIVE: Record<Lang, string> = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français', de: 'Deutsch', it: 'Italiano', zh: '简体中文', ja: '日本語', ko: '한국어', hi: 'हिन्दी', ar: 'العربية', ru: 'Русский', tr: 'Türkçe' };
export const RTL: Lang[] = ['ar'];
/** Locale BCP-47 para formatos de número/fecha y voz. */
export const BCP: Record<Lang, string> = { es: 'es', en: 'en', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', hi: 'hi-IN', ar: 'ar', ru: 'ru-RU', tr: 'tr-TR' };

function region(): string | undefined { return getLocales()[0]?.regionCode || undefined; }
/** Idioma del teléfono o navegador (primer idioma soportado de la lista); si ninguno, inglés. */
export function deviceLang(): Lang {
  for (const l of getLocales()) {
    const code = (l.languageCode || '').toLowerCase();
    if ((SUPPORTED as string[]).includes(code)) return code as Lang;
  }
  return 'en';
}
export const curLang = (): Lang => ((SUPPORTED as string[]).includes(i18n.language) ? i18n.language : 'en') as Lang;
/** Locale completa (idioma + región del teléfono si coincide) para Intl. */
export function fmtLocale(): string {
  const l = curLang(); const dev = getLocales()[0];
  const tag = dev?.languageCode === l && dev.languageTag ? dev.languageTag : BCP[l];
  return l === 'ar' ? tag + '-u-nu-latn' : tag; // cifras occidentales, coherentes con el resto de la UI
}
export const fmtNum = (n: number, d = 0) => new Intl.NumberFormat(fmtLocale(), { maximumFractionDigits: d }).format(n);
export const fmtDate = (d: Date) => d.toLocaleDateString(fmtLocale(), { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtTime = (d: Date) => d.toLocaleTimeString(fmtLocale(), { hour: '2-digit', minute: '2-digit' });
export { region };

/** Dirección del texto: en web cambia <html dir/lang>; en nativo usa I18nManager (aplica al reiniciar). */
export function applyDir(l: Lang) {
  const rtl = RTL.includes(l);
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.dir = rtl ? 'rtl' : 'ltr'; document.documentElement.lang = BCP[l];
  } else if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl); I18nManager.forceRTL(rtl);
  }
}

i18n.use(initReactI18next).init({
  resources: Object.fromEntries(Object.entries(RES).map(([k, v]) => [k, { translation: v }])),
  lng: deviceLang(), fallbackLng: 'en', interpolation: { escapeValue: false }, returnObjects: true,
});
applyDir(i18n.language as Lang);
i18n.on('languageChanged', (l) => applyDir(((SUPPORTED as string[]).includes(l) ? l : 'en') as Lang));
export default i18n;
