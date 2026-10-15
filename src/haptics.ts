// Háptica solo en nativo (expo-haptics); en web no hace nada.
import { Platform } from 'react-native';
let H: any = null;
if (Platform.OS !== 'web') { try { H = require('expo-haptics'); } catch { H = null; } }
export const hTap = () => { try { H?.impactAsync(H.ImpactFeedbackStyle.Light); } catch { /* sin háptica */ } };
export const hSelect = () => { try { H?.selectionAsync(); } catch { /* sin háptica */ } };
export const hSuccess = () => { try { H?.notificationAsync(H.NotificationFeedbackType.Success); } catch { /* sin háptica */ } };
