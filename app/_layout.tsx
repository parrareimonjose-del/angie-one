import '../src/i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '../src/store';
import { C } from '../src/theme';
import { AuthGate } from '../src/faltantes-ui';

export default function Layout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <AuthGate><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'fade' }} /></AuthGate>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
