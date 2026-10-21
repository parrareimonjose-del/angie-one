import { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Btn, T, s, IconCard, InfoNote } from './ui';
import { C } from './theme';
import { reportAI, validContribution, contribute, founderKey, loadQueue, delQueue, dismissFriend, removeFriend } from './review';
import { curLang } from './i18n';

/** Botón «Reportar respuesta de la IA» bajo cada resultado generado por IA. */
export function AIReport({ kind, text }: { kind: string; text: string }) {
  const { t } = useTranslation(); const [done, setDone] = useState(false);
  return <View style={{ gap: 2 }}><Text style={[s.muted, { fontSize: 13 }]}>🤖 {t('rv.aiLabel')}</Text>
    {done ? <Text testID="ai-reported" style={{ color: C.success, fontWeight: '800', fontSize: 14 }}>✓ {t('rv.aiReported')}</Text>
      : <Btn small kind="ghost" testID="ai-report" label={`🚩 ${t('rv.aiReport')}`} onPress={() => { setDone(true); reportAI(kind, text); }} />}</View>;
}

/** Aportar un producto que no está en la base (por 100 g). Queda disponible para todos al momento, sin sello, y el fundador lo revisa. */
export function ContributeCard({ code, onLogged }: { code: string; onLogged: (x: { name: string; kcal: number; p: number; c: number; f: number }) => void }) {
  const { t } = useTranslation(); const [v, setV] = useState({ name: '', brand: '', k: '', p: '', c: '', f: '' }); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const fld = (k: keyof typeof v, ph: string, num = true) => <TextInput key={k} testID={`ct-${k}`} accessibilityLabel={ph} placeholder={ph} value={v[k]} keyboardType={num ? 'decimal-pad' : 'default'}
    onChangeText={(x) => setV((o) => ({ ...o, [k]: num ? x.replace(/[^0-9.,]/g, '') : x }))} style={[s.input, num ? { flex: 1, minWidth: 70 } : null]} />;
  const send = async () => { const x = { code, ...v }; if (!validContribution(x)) { setMsg(t('rv.cBad')); return; }
    setBusy(true); try { await contribute({ ...x, lang: curLang() }); setMsg(t('rv.cThanks')); } catch { setMsg(t('rv.cSaved')); } finally { setBusy(false); }
    onLogged({ name: v.name.trim(), kcal: Math.round(+v.k.replace(',', '.')), p: +v.p.replace(',', '.'), c: +v.c.replace(',', '.'), f: +v.f.replace(',', '.') }); };
  return <IconCard testID="contribute" icon="🤝" title={t('rv.cTitle')} sub={t('rv.cSub')}>
    {fld('name', t('rv.cName'), false)}{fld('brand', t('rv.cBrand'), false)}
    <View style={[s.row, { flexWrap: 'wrap', gap: 6 }]}>{fld('k', t('rv.cK'))}{fld('p', t('rv.cP'))}{fld('c', t('rv.cC'))}{fld('f', t('rv.cF'))}</View>
    <Btn testID="ct-send" label={busy ? '⏳' : `✓ ${t('rv.cSend')}`} onPress={send} />
    {msg ? <Text testID="ct-msg" style={{ color: C.primary, fontWeight: '800' }}>{msg}</Text> : null}</IconCard>;
}

/** Panel del Fundador: cola de moderación (reportes de amigos, alimentos e IA; productos aportados). */
export function ModerationCard() {
  const { t } = useTranslation(); const [q, setQ] = useState<null | { reports: any[]; contributions: any[]; friends: any[] }>(null); const [err, setErr] = useState('');
  const load = async () => { setErr(''); const k = await founderKey(); if (!k) { setErr(t('rv.modNeedKey')); return; } try { setQ(await loadQueue(k)); } catch { setErr(t('rv.modErr')); } };
  const act = async (fn: (k: string) => Promise<any>) => { const k = await founderKey(); try { await fn(k); await load(); } catch { setErr(t('rv.modErr')); } };
  return <IconCard testID="moderation" icon="🛡️" title={t('rv.modTitle')} sub={t('rv.modSub')}>
    <Btn small testID="mod-load" label={`↻ ${t('rv.modLoad')}`} onPress={load} />
    {err ? <Text testID="mod-err" style={{ color: C.primary, fontWeight: '800' }}>{err}</Text> : null}
    {q ? <>
      <T style={{ fontWeight: '900' }}>🤝 {t('rv.modFriends')} ({q.friends.length})</T>
      {q.friends.map((r) => <Card key={r.key}><T>🚩 {r.nick} · {r.group} ({r.code}) · {r.why}</T>
        <View style={[s.row, { gap: 6 }]}><Btn small kind="danger" label={t('rv.modRemove')} onPress={() => act((k) => removeFriend(k, r.code, r.target, r.key))} style={{ flex: 1 }} />
          <Btn small kind="ghost" label={t('rv.modDismiss')} onPress={() => act((k) => dismissFriend(k, r.key))} style={{ flex: 1 }} /></View></Card>)}
      <T style={{ fontWeight: '900' }}>🍎 {t('rv.modFood')} ({q.reports.length})</T>
      {q.reports.map((r) => <Card key={r.key}><T>{r.reason === 'ai' ? '🤖' : '🍎'} {r.name} · {r.reason}</T><Btn small kind="ghost" label={t('rv.modDismiss')} onPress={() => act((k) => delQueue(k, r.key))} /></Card>)}
      <T style={{ fontWeight: '900' }}>📦 {t('rv.modContrib')} ({q.contributions.length})</T>
      {q.contributions.map((r) => <Card key={r.key}><T>{r.n} · {r.k} kcal/100 g · {r.key.slice(3)}</T><Btn small kind="danger" label={t('rv.modDelete')} onPress={() => act((k) => delQueue(k, r.key))} /></Card>)}
      {!q.friends.length && !q.reports.length && !q.contributions.length ? <T>✓ {t('rv.modEmpty')}</T> : null}
    </> : null}
    <InfoNote text={t('rv.modNote')} /></IconCard>;
}
