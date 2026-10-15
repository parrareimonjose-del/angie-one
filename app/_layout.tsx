import '../src/i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '../src/store';
import { AutoSync } from './backup';
import { C } from '../src/theme';
import { AuthGate } from '../src/faltantes-ui';
import { Splash } from '../src/splash';
import * as SplashScreen from 'expo-splash-screen';
SplashScreen.preventAutoHideAsync().catch(() => {});
setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 50);

export default function Layout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <AutoSync /><Splash><AuthGate><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'fade' }} /></AuthGate></Splash>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
