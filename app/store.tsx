import { Redirect } from 'expo-router';
import { FEATURES } from '../src/flags';
import { Store } from '../src/p4';
// Oculta por decisión de José (actualización futura): el código sigue en src/p4.tsx detrás de FEATURES.purposeStore.
export default function S() { return FEATURES.purposeStore ? <Store /> : <Redirect href="/" />; }
