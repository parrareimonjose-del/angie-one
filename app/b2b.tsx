import { Redirect } from 'expo-router';
import { B2B } from '../src/p3';
import { DEMOS_ENABLED } from '../src/flags';
// Escondida para la App Store (DEMOS_ENABLED=false): lleva a Inicio. El código se conserva.
export default function Page() { return DEMOS_ENABLED ? <B2B /> : <Redirect href="/" />; }
