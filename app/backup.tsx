// Copia en la nube cifrada (gratis): activar, copiar ahora, restaurar en un teléfono nuevo y "Borrar todo de la nube".
import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, T, s } from '../src/ui';
import { C } from '../src/theme';
import { useStore } from '../src/store';
import { fmtLocale } from '../src/i18n';
import { newCode, uploadBackup, downloadBackup, deleteBackup, validCode, AUTO_EVERY } from '../src/cloudsync';

export default function Backup() {
  const { t } = useTranslation(); const { s: st, set } = useStore(); const sy = st.sync;
  const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const [rc, setRc] = useState(''); const [restored, setRestored] = useState(false);
  const fail = (e: any) => setErr(t('bk.err.' + (['offline', 'auth', 'empty', 'badcode'].includes(e?.message) ? e.message : 'server')));
  const start = () => { setErr(''); setMsg(''); setCode(newCode()); };
  const confirmCode = async () => { setBusy(true); setErr('');
    try { const at = await uploadBackup(st, code); set((x) => ({ ...x, sync: { on: true, code, last: at } })); setCode(''); setMsg(t('bk.done')); } catch (e) { fail(e); } finally { setBusy(false); } };
  const now = async () => { if (!sy) return; setBusy(true); setErr(''); setMsg('');
    try { const at = await uploadBackup(st, sy.code); set((x) => ({ ...x, sync: { ...x.sync!, last: at, err: undefined } })); setMsg(t('bk.done')); } catch (e) { fail(e); } finally { setBusy(false); } };
  const wipe = async () => { if (!sy) return; if (Platform.OS === 'web' && !window.confirm(t('bk.delQ'))) return; setBusy(true); setErr('');
    try { await deleteBackup(sy.code); set((x) => { const { sync, ...r } = x; return r as any; }); setMsg(t('bk.deleted')); } catch (e) { fail(e); } finally { setBusy(false); } };
  const restore = async () => { setErr(''); setMsg(''); if (!validCode(rc)) { setErr(t('bk.err.badcode')); return; } setBusy(true);
    try { const b = await downloadBackup(rc); const code = rc.toUpperCase().trim(); set(() => ({ ...b.state, sync: { on: true, code, last: b.at } })); setRestored(true); setMsg(t('bk.restored')); } catch (e) { fail(e); } finally { setBusy(false); } };
  const when = (ms?: number) => (ms ? new Date(ms).toLocaleString(fmtLocale(), { dateStyle: 'medium', timeStyle: 'short' }) : '—');
  return <Screen title={`☁️ ${t('bk.title')}`}>
    <Card><T>{t('bk.what')}</T><Text style={s.muted}>🔒 {t('bk.e2e')}</Text><Text style={s.muted}>📸 {t('bk.noPhotos')}</Text><Text style={s.muted}>🚫 {t('bk.neverSold')}</Text></Card>
    {code ? <Card testID="bk-codecard">
      <Text style={s.h2}>{t('bk.codeTitle')}</Text><T>{t('bk.codeHow')}</T>
      <Text testID="bk-code" selectable style={{ fontSize: 24, fontWeight: '900', letterSpacing: 1, color: C.secondary }}>{code}</Text>
      <Btn testID="bk-saved" label={busy ? `⏳ ${t('bk.working')}` : `✓ ${t('bk.saved')}`} onPress={confirmCode} />
    </Card> : sy?.on ? <Card>
      <T testID="bk-last" style={{ fontWeight: '700' }}>✓ {t('bk.on')} · {t('bk.last')}: {when(sy.last)}</T>
      <Text style={s.muted}>{t('bk.auto', { h: Math.round(AUTO_EVERY / 3600e3) })}</Text>
      <Btn testID="bk-now" label={busy ? `⏳ ${t('bk.working')}` : `☁️ ${t('bk.now')}`} onPress={now} />
      <Btn testID="bk-del" kind="danger" label={`🗑️ ${t('bk.del')}`} onPress={wipe} />
    </Card> : <Btn testID="bk-on" label={`☁️ ${t('bk.turnOn')}`} onPress={start} />}
    {msg ? <T testID="bk-msg" style={{ color: C.success, fontWeight: '800' }}>{msg}</T> : null}
    {err ? <T testID="bk-err" style={{ color: C.primary, fontWeight: '800' }}>{err}</T> : null}
    {!code && <Card>
      <Text style={s.h2}>📲 {t('bk.restoreTitle')}</Text><T>{t('bk.restoreHow')}</T>
      <TextInput testID="bk-rc" accessibilityLabel={t('bk.restoreTitle')} autoCapitalize="characters" style={s.input} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" value={rc} onChangeText={setRc} />
      <Btn testID="bk-restore" kind="secondary" label={busy ? `⏳ ${t('bk.working')}` : t('bk.restore')} onPress={restore} />
      {restored ? <Btn testID="bk-home" label={t('bk.goHome')} onPress={() => router.replace('/')} /> : null}
    </Card>}
  </Screen>;
}

/** Copia automática: como mucho cada 6 h, unos segundos después de un cambio. */
export function AutoSync() {
  const { s: st, set, ready } = useStore() as any; const tm = useRef<any>(null);
  useEffect(() => {
    const sy = st.sync; if (!ready || !sy?.on || !sy.code) return;
    if (sy.last && Date.now() - sy.last < AUTO_EVERY) return;
    clearTimeout(tm.current);
    tm.current = setTimeout(() => { uploadBackup(st, sy.code).then((at) => set((x: any) => ({ ...x, sync: { ...x.sync, last: at, err: undefined } }))).catch((e) => set((x: any) => (x.sync ? { ...x, sync: { ...x.sync, err: String(e?.message || 'server'), last: x.sync.last } } : x))); }, 5000);
    return () => clearTimeout(tm.current);
  }, [st, ready]);
  return null;
}
