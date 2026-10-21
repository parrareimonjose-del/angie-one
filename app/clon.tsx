import { Redirect } from 'expo-router';
import { Clone } from '../src/clone-ui';
import { CLONE_ENABLED } from '../src/flags';
// Clon escondido (CLONE_ENABLED=false): la ruta lleva a Inicio. El código se conserva.
export default function Page() { return CLONE_ENABLED ? <Clone /> : <Redirect href="/" />; }
