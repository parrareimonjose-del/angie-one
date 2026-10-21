import { Redirect } from 'expo-router';
import { Twin } from '../src/p3';
import { CLONE_ENABLED } from '../src/flags';
// Clon escondido (CLONE_ENABLED=false): la ruta lleva a Inicio. El código se conserva.
export default function Page() { return CLONE_ENABLED ? <Twin /> : <Redirect href="/" />; }
