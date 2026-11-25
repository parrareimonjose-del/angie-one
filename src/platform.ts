/** Plataforma de la app. EXPO_PUBLIC_SHOT_OS solo se usa al exportar capturas locales, nunca en EAS ni en la web publicada. */
import { Platform } from 'react-native';
export const appOs = (): string => process.env.EXPO_PUBLIC_SHOT_OS || Platform.OS;
export const isIos = (): boolean => appOs() === 'ios';
