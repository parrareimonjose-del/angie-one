/** Conexión de salud abstracta. Web: solo importar archivo (Apple Health export.xml / CSV de Google Fit o Health Connect).
 *  Teléfono (cuando se compile la app): adaptadores nativos gratuitos y sin servidor, solo lectura de pasos, peso y entrenamientos:
 *   - iPhone: @kingstinct/react-native-healthkit (plugin Expo, HealthKit gratis con la cuenta Apple Developer).
 *   - Android: react-native-health-connect + expo-health-connect (plugin Expo; Health Connect es gratis).
 *  Políticas: permisos mínimos (solo lectura de 3 tipos), pantalla de uso de datos, nunca se usan para anuncios ni se venden,
 *  sin lenguaje médico. Estos paquetes NO están instalados aún: se añaden con `npx expo install` al empezar la fase Android/iPhone,
 *  y entonces `nativeAdapter()` deja de devolver null. */
import { Platform } from 'react-native';
import type { HealthData } from './mfp5';

export type HealthAdapter = { id: 'healthkit' | 'healthconnect'; name: string; requestRead(): Promise<boolean>; read(sinceIso: string): Promise<HealthData> };
export const NATIVE_PLAN = {
  ios: { pkg: '@kingstinct/react-native-healthkit', types: ['HKQuantityTypeIdentifierStepCount', 'HKQuantityTypeIdentifierBodyMass', 'HKWorkoutTypeIdentifier'] },
  android: { pkg: 'react-native-health-connect', plugin: 'expo-health-connect', types: ['Steps', 'Weight', 'ExerciseSession'] },
} as const;
let registered: HealthAdapter | null = null;
/** El código nativo se registra aquí al compilar la app del teléfono. */
export const registerHealthAdapter = (a: HealthAdapter) => { registered = a; };
export function nativeAdapter(os: string = Platform.OS): HealthAdapter | null { return os === 'web' ? null : registered; }
export const sourceName = (os: string = Platform.OS) => (os === 'ios' ? 'Apple Health' : os === 'android' ? 'Health Connect' : 'Apple Health / Health Connect');
