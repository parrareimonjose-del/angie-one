import { Redirect } from 'expo-router';
import { WhatsApp } from '../src/p4';
import { DEMOS_ENABLED } from '../src/flags';
// Escondida para la App Store (DEMOS_ENABLED=false): lleva a Inicio. El código se conserva.
export default function Page() { return DEMOS_ENABLED ? <WhatsApp /> : <Redirect href="/" />; }
