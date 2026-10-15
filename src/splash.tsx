/** Pantalla de apertura: logo oficial con animación corta (~1,5 s). Se puede saltar tocando y respeta "reducir movimiento". */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, AccessibilityInfo, Pressable, Text, Platform, Easing } from 'react-native';
import { useTranslation } from 'react-i18next';
import { C } from './theme';

const seen = () => { try { return Platform.OS === 'web' && typeof sessionStorage !== 'undefined' && sessionStorage.getItem('angie:splash') === '1'; } catch { return false; } };
const mark = () => { try { if (Platform.OS === 'web') sessionStorage.setItem('angie:splash', '1'); } catch { /* sin almacenamiento */ } };

export function Splash({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(() => !seen() && !(Platform.OS === 'web' && typeof location !== 'undefined' && /[?&]nosplash=1/.test(location.search)));
  const { t } = useTranslation();
  const sc = useRef(new Animated.Value(0.6)).current, op = useRef(new Animated.Value(0)).current, tx = useRef(new Animated.Value(0)).current, out = useRef(new Animated.Value(1)).current;
  const done = useRef(false);
  const close = () => { if (done.current) return; done.current = true; mark(); Animated.timing(out, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start(() => setShow(false)); };
  useEffect(() => {
    if (!show) return; let tm: any;
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then((reduce) => {
      const nd = Platform.OS !== 'web';
      if (reduce) { sc.setValue(1); op.setValue(1); tx.setValue(1); tm = setTimeout(close, 900); return; }
      Animated.sequence([
        Animated.parallel([Animated.timing(op, { toValue: 1, duration: 450, useNativeDriver: nd }), Animated.spring(sc, { toValue: 1, friction: 5, tension: 60, useNativeDriver: nd })]),
        Animated.timing(tx, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: nd }),
      ]).start(); tm = setTimeout(close, 1500);
    });
    return () => clearTimeout(tm);
  }, [show]);
  return <>{children}{show && (
    <Animated.View testID="splash" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', opacity: out, zIndex: 999 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('sp.skip')} onPress={close} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <Animated.Image source={require('../assets/logo-mark.png')} accessibilityIgnoresInvertColors style={{ width: 168, height: 168, opacity: op, transform: [{ scale: sc }] }} />
        <Animated.View style={{ opacity: tx, transform: [{ translateY: tx.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }], alignItems: 'center' }}>
          <Text style={{ fontSize: 40, fontWeight: '900', color: C.text }}>Angie One</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.secondary, marginTop: 4 }}>{t('sp.tag')}</Text>
        </Animated.View>
        <Text style={{ position: 'absolute', bottom: 48, color: C.muted, fontSize: 16 }}>{t('sp.skip')}</Text>
      </Pressable>
    </Animated.View>)}</>;
}
