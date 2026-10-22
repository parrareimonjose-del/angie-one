import { Redirect } from 'expo-router';
import { Shopping } from '../src/p3';
import { DEMOS_ENABLED } from '../src/flags';
// Escondida para la App Store (DEMOS_ENABLED=false): lleva a Inicio. El código se conserva.
export default function Page() { return DEMOS_ENABLED ? <Shopping /> : <Redirect href="/" />; }
