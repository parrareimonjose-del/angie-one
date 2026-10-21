/** Panel del Fundador → «Premium gratis» y canje del usuario (ver src/grants.ts y docs/premium-gratis.md). */
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { Card, Btn, Chip, T, s, IconCard, Pill, InfoNote } from './ui';
import { C } from './theme';
import { useStore } from './store';
import { fmtDate } from './i18n';
import { Row } from './coach-ui';
import { addGrant, revokeGrant, grantState, pushGrant, redeem, redeemStore, STORE_REDEEM, grantValid, validWho } from './grants';
const FKEY = 'angieone:fkey';
export function GrantsCard() {
  const { t } = useTranslation(); const { s: st, set } = useStore(); const list = st.grants || [];
  const [who, setWho] = useState(''); const [note, setNote] = useState(''); const [days, setDays] = useState<number | null>(null); const [msg, setMsg] = useState(''); const [key, setKey] = useState('');
  useEffect(() => { AsyncStorage.getItem(FKEY).then((k) => k && setKey(k)).catch(() => {}); }, []);
  const sync = async (g: any) => { if (!key) return false; try { await pushGrant(g, key); return true; } catch { return false; } };
  const add = async () => { const n = addGrant(list, who, days, note); if (!n) { setMsg(t('gr.bad')); return; } const g0 = n[0];
    set((x) => ({ ...x, grants: n })); setWho(''); setNote(''); setMsg(t('gr.okLocal', { code: g0.code }));
    const ok = await sync(g0); if (ok) { set((x) => ({ ...x, grants: (x.grants || []).map((y) => (y.id === g0.id ? { ...y, synced: true } : y)) })); setMsg(t('gr.okSynced', { code: g0.code })); } };
  const revoke = async (id: string) => { let g: any; set((x) => { const n = revokeGrant(x.grants || [], id); g = { ...n.find((y) => y.id === id)!, synced: false }; return { ...x, grants: n.map((y) => (y.id === id ? g : y)) }; });
    if (g && (await sync(g))) set((x) => ({ ...x, grants: (x.grants || []).map((y) => (y.id === id ? { ...y, synced: true } : y)) })); };
  return <IconCard testID="grants" icon="🎁" title={t('gr.title')} sub={t('gr.sub')}>
    <TextInput testID="gr-who" accessibilityLabel={t('gr.who')} placeholder={t('gr.who')} autoCapitalize="none" value={who} onChangeText={(v) => { setWho(v); setMsg(''); }} style={s.input} />
    <TextInput testID="gr-note" accessibilityLabel={t('gr.note')} placeholder={t('gr.note')} value={note} onChangeText={setNote} style={s.input} />
    <Row>{[null, 30, 90, 365].map((d) => <Chip key={String(d)} label={d ? t('gr.days', { n: d }) : t('gr.forever')} active={days === d} onPress={() => setDays(d)} />)}</Row>
    <Btn testID="gr-add" label={`🎁 ${t('gr.give')}`} onPress={add} />
    {msg ? <Text testID="gr-msg" style={{ fontWeight: '800', color: validWho(who) || !who ? C.success : C.primary }}>{msg}</Text> : null}
    {list.map((g) => { const stt = grantState(g); return <View key={g.id} testID="gr-item" style={[s.row, { gap: 8, alignItems: 'center' }]}>
      <View style={{ flex: 1 }}><T style={{ fontWeight: '800' }}>{g.who}</T><Text style={s.muted}>{g.code} · {g.expiresAt ? t('gr.until', { d: fmtDate(new Date(g.expiresAt)) }) : t('gr.forever')}{g.note ? ` · ${g.note}` : ''}{g.synced ? '' : ` · ${t('gr.notSynced')}`}</Text></View>
      <Pill label={t(`gr.st.${stt}`)} color={stt === 'active' ? C.success : C.muted} />
      {stt === 'active' ? <Btn small kind="danger" testID="gr-revoke" label={t('gr.revoke')} onPress={() => revoke(g.id)} /> : null}</View>; })}
    <TextInput testID="gr-key" secureTextEntry accessibilityLabel={t('gr.key')} placeholder={t('gr.key')} value={key} onChangeText={(k) => { setKey(k); AsyncStorage.setItem(FKEY, k).catch(() => {}); }} style={s.input} />
    <InfoNote text={t('gr.policy')} />
  </IconCard>;
}
export function RedeemCard() {
  const { t } = useTranslation(); const { s: st, set } = useStore(); const [code, setCode] = useState(''); const [who, setWho] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const store = redeemStore(Platform.OS);
  if (grantValid(st.myGrant)) return <Card testID="redeem-ok"><Text style={{ color: C.success, fontWeight: '800', fontSize: 17 }}>🎁 {st.myGrant!.until ? t('gr.youUntil', { d: fmtDate(new Date(st.myGrant!.until)) }) : t('gr.youForever')}</Text></Card>;
  if (store !== 'server') return <Card testID="redeem-store"><T>🎁 {t('gr.storeCode')}</T><Btn small kind="secondary" label={t('gr.redeem')} onPress={() => Linking.openURL(STORE_REDEEM[store])} /></Card>;
  const go = async () => { setBusy(true); const r = await redeem(code, who); setBusy(false);
    if (r.ok) { set((x) => ({ ...x, myGrant: { code: code.trim().toUpperCase(), who, until: r.until, checkedAt: Date.now() } })); setMsg(''); } else setMsg(t(`gr.e.${r.err || 'invalid'}`)); };
  return <IconCard testID="redeem" icon="🎁" title={t('gr.have')}>
    <TextInput testID="rd-code" accessibilityLabel={t('gr.code')} placeholder="ABCDE-FGHJK" autoCapitalize="characters" value={code} onChangeText={setCode} style={s.input} />
    <TextInput testID="rd-who" accessibilityLabel={t('gr.who')} placeholder={t('gr.who')} autoCapitalize="none" value={who} onChangeText={setWho} style={s.input} />
    <Btn small testID="rd-go" label={busy ? '⏳' : t('gr.redeem')} onPress={go} />
    {msg ? <Text testID="rd-msg" style={{ color: C.primary, fontWeight: '800' }}>{msg}</Text> : null}</IconCard>;
}
/** Revalida el canje cada 24 h (si se revocó en el servidor, se quita). */
export function AutoGrant() {
  const { s: st, set } = useStore();
  useEffect(() => { const m = st.myGrant; if (!m || Date.now() - m.checkedAt < 864e5) return;
    redeem(m.code, m.who).then((r) => { if (r.err === 'offline' || r.err === 'server') return; set((x) => ({ ...x, myGrant: r.ok ? { ...m, until: r.until, checkedAt: Date.now() } : undefined })); }); }, [st.myGrant?.checkedAt]);
  return null;
}

/** Modo fundador: el Panel del Fundador solo aparece en el teléfono de José (se activa escribiendo la clave de fundador).
 *  La seguridad real está en el servidor: sin FOUNDER_KEY el Worker rechaza cualquier cambio. Antes estaba visible para todos (error). */
export const FOUNDER_FLAG = 'angieone:founder';
export function useFounderMode(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => { AsyncStorage.getItem(FOUNDER_FLAG).then((v) => setOn(v === '1')).catch(() => {}); }, []);
  return [on, (v: boolean) => { setOn(v); if (v) AsyncStorage.setItem(FOUNDER_FLAG, '1'); else AsyncStorage.removeItem(FOUNDER_FLAG); }];
}
export function FounderUnlock({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation(); const [k, setK] = useState('');
  return <Card testID="founder-unlock"><T>🔒 {t('gr.founderOnly')}</T>
    <TextInput testID="fu-key" secureTextEntry accessibilityLabel={t('gr.key')} placeholder={t('gr.key')} value={k} onChangeText={setK} style={s.input} />
    <Btn small testID="fu-go" label={t('gr.unlock')} onPress={async () => { if (k.trim().length < 8) return; await AsyncStorage.setItem(FKEY, k.trim()); await AsyncStorage.setItem(FOUNDER_FLAG, '1'); onDone(); }} /></Card>;
}
