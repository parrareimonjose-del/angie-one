/**
 * iPhone: sin esto, la voz (expo-speech) usa la sesión de audio por defecto y el interruptor
 * de silencio la apaga, así que "no se escucha nada". Ponemos la sesión en modo reproducción.
 */
import { Platform } from 'react-native';

export async function setupAudioSession(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { setAudioModeAsync } = require('expo-audio');
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers', allowsRecording: false, shouldPlayInBackground: false });
    return true;
  } catch { return false; }
}
setupAudioSession();
