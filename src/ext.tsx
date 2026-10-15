/** Fases 3 y 4: utilidades comunes. Estado local en `ext` (sin backend todavía). */
import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useStore } from './store';
import { isPremium } from './coach';
import { C } from './theme';
import { s, T, Card } from './ui';

export function useExt<V>(key: string, init: V): [V, (fn: (v: V) => V) => void] {
  const { s: st, set } = useStore();
  const v = ((st as any).ext?.[key] ?? init) as V;
  const up = (fn: (v: V) => V) => set((x: any) => ({ ...x, ext: { ...(x.ext || {}), [key]: fn((x.ext?.[key] ?? init) as V) } }));
  return [v, up];
}
/** Insignia visible para todo lo que necesita una cuenta, clave o socio que aún no existe. */
export const Pending = ({ what }: { what?: string }) => { const { t } = useTranslation(); return (
  <View testID="pending" style={{ alignSelf: 'flex-start', backgroundColor: C.warnBg, borderColor: C.warning, borderWidth: 2, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
    <Text style={{ color: C.warning, fontWeight: '800' }}>⏳ {t('x.pending')}{what ? ` · ${what}` : ''}</Text></View>); };
export const Example = () => { const { t } = useTranslation(); return (
  <View style={{ alignSelf: 'flex-start', backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}><Text style={{ color: C.onAccent, fontWeight: '800' }}>{t('x.example')}</Text></View>); };
export const Note = ({ k }: { k: string }) => { const { t } = useTranslation(); return <Text style={[s.muted, { fontSize: 14 }]}>ℹ️ {t(k)}</Text>; };

/** Anuncio de marca saludable aprobada. Nunca se elige por datos de salud: solo por idioma. */
export const ADS = [{ id: 'a1', brand: 'Verde Vivo', key: 'ad1' }, { id: 'a2', brand: 'Agua Clara', key: 'ad2' }];
export function Sponsored({ i = 0 }: { i?: number }) {
  const { t } = useTranslation(); const { s: st } = useStore(); const a = ADS[i % ADS.length];
  if (isPremium(st)) return null; // Premium nunca ve anuncios
  return <Card style={{ borderWidth: 2, borderColor: C.border }}>
    <Text testID="sponsored" style={[s.muted, { fontWeight: '800' }]}>{t('x.sponsored')} · {a.brand}</Text>
    <T>{t(`x.${a.key}`)}</T><Text style={[s.muted, { fontSize: 15 }]}>{t('x.adWhy')}</Text></Card>;
}
export const ETSY_SHOP = 'https://www.etsy.com/shop/ParraApps?section_id=angie-one'; // pendiente: la tienda aún no existe
export const openUrl = (u: string) => Linking.openURL(u);
export const Tile = ({ icon, label, onPress, pending }: { icon: string; label: string; onPress: () => void; pending?: boolean }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => ({ width: '47%', minHeight: 96, borderRadius: 20, backgroundColor: C.card, padding: 12, gap: 4, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.border, opacity: pressed ? 0.8 : 1 })}>
    <Text style={{ fontSize: 30 }}>{icon}</Text><Text style={{ fontWeight: '800', fontSize: 15, color: C.text, textAlign: 'center' }}>{label}</Text>
    {pending ? <Text style={{ fontSize: 15, color: C.warning, fontWeight: '800' }}>⏳</Text> : null}
  </Pressable>);
