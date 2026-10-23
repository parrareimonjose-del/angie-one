import { newRecovery, recoverWith, pwAutofill } from './auth';
import { biometricEnroll, biometricUnlock } from './biometric';
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Platform, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import i18n, { curLang } from './i18n';
import { Card, Btn, Chip, T, s, CardTitle, Pill, IconTile } from './ui';
import { C } from './theme';
import { useStore, uid } from './store';
import { useExt, Pending, Note, hidePending } from './ext';
import { makePdf } from './datos-ui';
import { Auth, loadAuth, saveAuth, isUnlocked, markUnlocked, needsUnlock, checkSecret, createAuth, validSecret, bioAvailable, bioRegister, bioUnlock } from './auth';
import { Charge, SAMPLE_CHARGES, decideCharge, totals, toCsv, receiptLines, accountantLines, split3, net, money } from './ledger';
import { buildSummary } from './panelmaestro';
import { adminMetrics, adminProposals, toSpec, specMarkdown, Proposal, TaskSpec } from './adminai';
import { Fb } from './p2';

// ---------- descarga de archivos (web) ----------
export function download(name: string, mime: string, data: string | Uint8Array) {
  if (Platform.OS !== 'web') return;
  const url = URL.createObjectURL(new Blob([data as unknown as BlobPart], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const LATIN = ['es', 'en', 'pt', 'fr', 'de', 'it', 'tr'];
const pdfT = () => { const t = i18n.getFixedT(LATIN.includes(curLang()) ? curLang() : 'en'); return (k: string) => t('fx.pdf.' + k); };
const wrap = (L: string[]) => L.flatMap((l) => l.match(/.{1,90}(\s|$)|.{1,90}/g) || ['']);

// ---------- campo secreto con ojo 👁 ----------
export function SecretField({ value, onChange, kind, testID, label, mode = 'current' }: { value: string; onChange: (v: string) => void; kind: 'pin' | 'password'; testID?: string; label: string; mode?: 'current' | 'new' }) {
  const { t } = useTranslation(); const [show, setShow] = useState(false);
  return <View style={[s.row, { alignItems: 'center', width: '100%' }]}>
    <TextInput testID={testID} accessibilityLabel={label} style={[s.input, { flex: 1, minWidth: 0, width: '100%', fontSize: 22, letterSpacing: kind === 'pin' && !show ? 6 : 0 }]} value={value} onChangeText={(v) => onChange(kind === 'pin' ? v.replace(/\D/g, '').slice(0, 8) : v)}
      secureTextEntry={!show} keyboardType={kind === 'pin' ? 'number-pad' : 'default'} autoCapitalize="none" autoCorrect={false} placeholder={label} {...(pwAutofill(mode, kind) as any)} />
    <Pressable testID={testID ? testID + '-eye' : undefined} accessibilityRole="button" accessibilityLabel={show ? t('fx.hide') : t('fx.show')} onPress={() => setShow(!show)}
      style={{ width: 64, height: 58, borderRadius: 16, borderWidth: 2, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 26 }}>{show ? '🙈' : '👁️'}</Text></Pressable></View>;
}
const Check = ({ on, label, onPress, testID }: { on: boolean; label: string; onPress: () => void; testID?: string }) => (
  <Pressable testID={testID} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={onPress} style={[s.row, { minHeight: 56, alignItems: 'center' }]}>
    <View style={{ width: 34, height: 34, borderRadius: 8, borderWidth: 3, borderColor: C.secondary, backgroundColor: on ? C.secondary : C.card, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '900', fontSize: 20 }}>{on ? '✓' : ''}</Text></View>
    <Text style={[s.t, { flex: 1 }]}>{label}</Text></Pressable>);

// ---------- Puerta de entrada (envuelve toda la app) ----------
const AuthCtx = React.createContext<{ auth: Auth | null; setAuth: (a: Auth | null) => void }>({ auth: null, setAuth: () => {} });
export const useAuth = () => React.useContext(AuthCtx);
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [auth, setA] = useState<Auth | null>(null); const [ready, setReady] = useState(false); const [open, setOpen] = useState(false);
  useEffect(() => { loadAuth().then((a) => { setA(a); setOpen(isUnlocked()); setReady(true); }); }, []);
  const setAuth = (a: Auth | null) => { setA(a); saveAuth(a); if (a) { markUnlocked(); setOpen(true); } };
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  if (needsUnlock(auth, open)) return <Unlock auth={auth!} onAuth={(a) => { setA(a); saveAuth(a); }} onOpen={() => { markUnlocked(); setOpen(true); }} onReset={() => { setA(null); saveAuth(null); setOpen(true); }} />;
  return <AuthCtx.Provider value={{ auth, setAuth }}>{children}</AuthCtx.Provider>;
}
function Unlock({ auth, onAuth, onOpen, onReset }: { auth: Auth; onAuth: (a: Auth) => void; onOpen: () => void; onReset: () => void }) {
  const { t } = useTranslation(); const { reset } = useStore(); const [v, setV] = useState(''); const [msg, setMsg] = useState(''); const [forgot, setForgot] = useState(false);
  const [remember, setRemember] = useState(false);
  const go = async () => { const r = await checkSecret(auth, v); setV('');
    if (r.ok) { onAuth({ ...r.auth, remember }); onOpen(); return; } onAuth(r.auth);
    setMsg(r.locked ? t('fx.locked', { s: Math.ceil(r.locked / 1000) }) : t('fx.wrong', { n: 5 - r.auth.fails })); };
  const bio = async () => { if (auth.passkeyId && (await biometricUnlock(auth.passkeyId, t('fx.bioUse')))) { onAuth({ ...auth, remember }); onOpen(); } else setMsg(t('fx.bioFail')); };
  useEffect(() => { if (auth.passkeyId) bio(); }, []); // abre la huella sola al entrar
  return <ScrollView testID="unlock" contentContainerStyle={{ padding: 22, gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center', backgroundColor: C.bg, flexGrow: 1 }}>
    <Text style={[s.h1, { textAlign: 'center', marginTop: 30 }]}>👋 {t('fx.hello', { name: auth.name || 'Angie One' })}</Text>
    <Text style={[s.t, { textAlign: 'center' }]}>{t(auth.kind === 'pin' ? 'fx.enterPin' : 'fx.enterPw')}</Text>
    {auth.passkeyId ? <Btn label={`👆 ${t('fx.bioUse')}`} onPress={bio} style={{ minHeight: 72 }} /> : null}
    <TextInput testID="unlock-user" value={auth.name || 'Angie One'} editable={false} {...({ autoComplete: 'username', textContentType: 'username' } as any)} accessibilityLabel={t('fx.name')} style={[s.input, { opacity: 0.7 }]} />
    <SecretField testID="unlock-secret" kind={auth.kind} value={v} onChange={setV} label={t(auth.kind === 'pin' ? 'fx.pin' : 'fx.password')} />
    <Check testID="unlock-remember" on={remember} label={t('fx.remember')} onPress={() => setRemember(!remember)} />
    <Btn testID="unlock-go" label={`✓ ${t('fx.enter')}`} onPress={go} style={{ minHeight: 72 }} />
    {msg ? <Text testID="unlock-msg" style={{ color: C.primary, fontWeight: '800', fontSize: 18, textAlign: 'center' }}>{msg}</Text> : null}
    <Btn kind="ghost" label={t('fx.forgot')} onPress={() => setForgot(!forgot)} />
    {forgot ? <RecoverCard auth={auth} onDone={(a) => { onAuth(a); onOpen(); }} /> : null}
    {forgot ? <Card><T>{t('fx.forgotInfo')}</T><Btn kind="danger" label={t('fx.resetAll')} onPress={() => { if (Platform.OS !== 'web' || window.confirm(t('fx.resetQ'))) { reset(); onReset(); router.replace('/onboarding'); } }} /></Card> : null}
    <Note k="fx.localNote" /></ScrollView>;
}

function RecoverCard({ auth, onDone }: { auth: Auth; onDone: (a: Auth) => void }) {
  const { t } = useTranslation(); const [code, setCode] = useState(''); const [kind, setKind] = useState<Auth['kind']>(auth.kind); const [a, setA] = useState(''); const [msg, setMsg] = useState(''); const [newCode, setNewCode] = useState(''); const [done, setDone] = useState<Auth | null>(null);
  if (!auth.recHash) return <Card testID="rec-none"><T>{t('fx.recNone')}</T></Card>;
  if (done) return <Card testID="rec-ok"><T style={{ fontWeight: '900', color: C.success }}>✓ {t('fx.recOk')}</T><T>{t('fx.recNew')}</T><Text testID="rec-code" selectable style={[s.h2, { textAlign: 'center', letterSpacing: 2 }]}>{newCode}</Text><Btn testID="rec-continue" label={`✓ ${t('fx.enter')}`} onPress={() => onDone(done)} /></Card>;
  const go = async () => { const r = await recoverWith(auth, code, kind, a); if (r.ok) { setNewCode(r.code!); setDone(r.auth); } else setMsg(t('fx.err.' + (r.err === 'badRec' || r.err === 'locked' || r.err === 'noRec' ? r.err : r.err!))); };
  return <Card testID="rec-card"><CardTitle icon="🔑">{t('fx.recTitle')}</CardTitle><T>{t('fx.recHow')}</T>
    <TextInput testID="rec-input" accessibilityLabel={t('fx.recTitle')} style={s.input} value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} placeholder="ABCD-EFGH-JKLM" {...({ autoComplete: 'one-time-code', textContentType: 'oneTimeCode' } as any)} />
    <View style={s.row}><Chip label={`🔢 ${t('fx.pin')}`} active={kind === 'pin'} onPress={() => setKind('pin')} /><Chip label={`🔤 ${t('fx.password')}`} active={kind === 'password'} onPress={() => setKind('password')} /></View>
    <SecretField testID="rec-new" mode="new" kind={kind} value={a} onChange={setA} label={t(kind === 'pin' ? 'fx.pin' : 'fx.password')} />
    <Btn testID="rec-go" label={`✓ ${t('fx.recGo')}`} onPress={go} />{msg ? <Text testID="rec-msg" style={{ color: C.primary, fontWeight: '800' }}>{msg}</Text> : null}</Card>;
}

// ---------- Pantalla "Entrada y seguridad" (crear, cambiar o quitar; siempre se puede saltar) ----------
export function SecurityScreenBody() {
  const { t } = useTranslation(); const { auth, setAuth } = useAuth(); const [, setAsked] = useExt<boolean>('authAsked', false);
  const [name, setName] = useState(auth?.name || ''); const [kind, setKind] = useState<'pin' | 'password'>(auth?.kind || 'pin');
  const [a, setA] = useState(''); const [b, setB] = useState(''); const [remember, setRemember] = useState(auth?.remember ?? true); const [msg, setMsg] = useState('');
  const [bioOk, setBioOk] = useState<boolean | null>(null); const [recCode, setRecCode] = useState('');
  useEffect(() => { bioAvailable().then(setBioOk); }, []);
  const save = async () => { const e = validSecret(kind, a); if (e) return setMsg(t('fx.err.' + e)); if (a !== b) return setMsg(t('fx.err.match'));
    const n = await createAuth(name, kind, a, remember); const rec = await newRecovery(); setAuth({ ...n, passkeyId: auth?.passkeyId, recSalt: rec.recSalt, recHash: rec.recHash }); setRecCode(rec.code); setAsked(() => true); setA(''); setB(''); setMsg('✓ ' + t('fx.saved')); };
  const addBio = async () => { if (!auth) return; try { const id = await biometricEnroll(auth.name); setAuth({ ...auth, passkeyId: id }); setMsg('✓ ' + t('fx.bioOn')); } catch { setMsg(t('fx.bioFail')); } };
  const skip = () => { setAsked(() => true); router.replace('/'); };
  return <>
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <View style={{ width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: auth ? C.success + '22' : C.tint, borderWidth: 3, borderColor: auth ? C.success : C.secondary }}><Text style={{ fontSize: 40 }}>{auth ? '🛡️' : '🔓'}</Text></View>
      <View style={{ flex: 1, gap: 6 }}><Pill label={auth ? '✓ ON' : 'OFF'} color={auth ? C.success : C.muted} /><Text style={s.muted}>{t('fx.secSub')}</Text></View></Card>
    <View style={{ flexDirection: 'row', gap: 10 }}>{[['🔢', t('fx.pin')], ['🔤', t('fx.password')], ['👆', '🔐']].map(([i, l]) => <View key={i} style={[s.card, { flex: 1, alignItems: 'center', padding: 12, gap: 6 }]}><IconTile icon={i} size={42} /><Text style={{ fontWeight: '700', color: C.text, fontSize: 13 }}>{l}</Text></View>)}</View>
    {recCode ? <Card testID="sec-rec" style={{ borderColor: C.warning, borderWidth: 3 }}><CardTitle icon="🔑">{t('fx.recTitle')}</CardTitle><T>{t('fx.recSave')}</T>
      <Text testID="sec-rec-code" selectable style={[s.h2, { textAlign: 'center', letterSpacing: 2 }]}>{recCode}</Text><Btn small kind="secondary" label={`✓ ${t('fx.recSaved')}`} onPress={() => setRecCode('')} /></Card> : null}
    {auth ? <Card testID="sec-on"><T style={{ fontWeight: '900', color: C.success }}>🔐 {t('fx.isOn', { name: auth.name || '—' })}</T>
      <Check testID="sec-remember" on={auth.remember} label={t('fx.remember')} onPress={() => setAuth({ ...auth, remember: !auth.remember })} />
      <Btn kind="danger" label={t('fx.remove')} onPress={() => { setAuth(null); setMsg('✓ ' + t('fx.removed')); }} /></Card> : null}
    <Card><CardTitle icon="✏️">{auth ? t('fx.change') : t('fx.create')}</CardTitle>
      <TextInput testID="sec-name" accessibilityLabel={t('fx.name')} style={s.input} value={name} onChangeText={setName} placeholder={t('fx.name')} />
      <View style={s.row}><Chip label={`🔢 ${t('fx.pin')}`} active={kind === 'pin'} onPress={() => setKind('pin')} /><Chip label={`🔤 ${t('fx.password')}`} active={kind === 'password'} onPress={() => setKind('password')} /></View>
      <Text style={s.muted}>{t(kind === 'pin' ? 'fx.pinHint' : 'fx.pwHint')}</Text>
      <TextInput testID="sec-user" style={{ height: 0, width: 0, opacity: 0, position: 'absolute' }} value={name || 'Angie One'} editable={false} {...({ autoComplete: 'username', textContentType: 'username' } as any)} />
      <SecretField testID="sec-a" mode="new" kind={kind} value={a} onChange={setA} label={t(kind === 'pin' ? 'fx.pin' : 'fx.password')} />
      <SecretField testID="sec-b" mode="new" kind={kind} value={b} onChange={setB} label={t('fx.repeat')} />
      <Check testID="sec-remember-new" on={remember} label={t('fx.remember')} onPress={() => setRemember(!remember)} />
      <Text style={s.muted}>{t('fx.rememberHint')}</Text>
      <Btn testID="sec-save" label={`✓ ${t('fx.save')}`} onPress={save} />
      {msg ? <Text testID="sec-msg" style={{ fontWeight: '800', fontSize: 18, color: msg.startsWith('✓') ? C.success : C.primary }}>{msg}</Text> : null}</Card>
    <Card testID="bio-card"><CardTitle>👆 {t('fx.bioTitle')}</CardTitle>
      {bioOk === null ? <T>…</T> : !bioOk ? <T testID="bio-none">{t('fx.bioNone')}</T> : !auth ? <T>{t('fx.bioFirst')}</T>
        : auth.passkeyId ? <><T style={{ color: C.success, fontWeight: '800' }}>✓ {t('fx.bioOn')}</T><Btn kind="ghost" label={t('fx.bioOff')} onPress={() => setAuth({ ...auth, passkeyId: undefined })} /></>
        : <Btn kind="secondary" label={`👆 ${t('fx.bioAdd')}`} onPress={addBio} />}
      <Note k="fx.bioNote" /></Card>
    {!hidePending ? <Card><CardTitle>☁️ {t('fx.cloud')}</CardTitle><Pending /><T>{t('fx.cloudNote')}</T></Card> : null}
    <Btn testID="go-delete" kind="danger" label={`🗑️ ${t('fx.delTitle')}`} onPress={() => router.push('/delete-account')} />
    {!auth ? <Btn testID="sec-skip" kind="ghost" label={t('fx.skip')} onPress={skip} /> : null}
    <Note k="fx.localNote" /></>;
}
/** Tarjeta de inicio (una vez): "Protege tu Angie" con Configurar / Ahora no. */
export function SecurityNudge() {
  const { t } = useTranslation(); const { auth } = useAuth(); const [asked, setAsked] = useExt<boolean>('authAsked', false);
  if (auth || asked) return null;
  return <Card testID="sec-nudge" style={{ borderWidth: 2, borderColor: C.secondary }}><T style={{ fontWeight: '800' }}>🔐 {t('fx.nudge')}</T>
    <View style={s.row}><Btn small label={t('fx.setup')} onPress={() => router.push('/security')} style={{ flex: 1 }} /><Btn small kind="ghost" label={t('fx.notNow')} onPress={() => setAsked(() => true)} style={{ flex: 1 }} /></View></Card>;
}

// ---------- Panel del fundador: registro de cargos 60/25/15 + recibos PDF + exportación contador ----------
export function useLedger() { return useExt<Charge[]>('ledger', SAMPLE_CHARGES); }
export function LedgerCard() {
  const { t } = useTranslation(); const [list, setList] = useLedger(); const tot = totals(list); const L = pdfT();
  return <Card testID="ledger"><CardTitle>🧾 {t('fx.ledTitle')}</CardTitle>
    {list.some((c) => c.sample) ? <View style={{ backgroundColor: C.accent, borderRadius: 10, padding: 8 }}><Text style={{ color: C.onAccent, fontWeight: '800' }}>{t('fx.sample')}</Text></View> : null}
    <T testID="led-tot">{t('fx.ledTot', { n: tot.count, net: money(tot.net), f: money(tot.founder), a: money(tot.app), x: money(tot.taxes) })}</T>
    {list.map((c) => { const sp = split3(net(c)); return <View key={c.id} testID="charge" style={{ gap: 6, borderTopWidth: 1, borderColor: C.border, paddingTop: 8 }}>
      <Text style={[s.t, { fontWeight: '800' }]}>{c.date} · {c.desc} · {money(c.gross)}</Text>
      <Text style={s.muted}>{t('fx.ledLine', { net: money(net(c)), f: money(sp.founder), a: money(sp.app), x: money(sp.taxes) })}</Text>
      {c.status === 'pending' ? <View style={s.row}><Btn small label={t('fx.approveSplit')} onPress={() => setList((v) => decideCharge(v, c.id, 'approved'))} style={{ flex: 1, backgroundColor: C.success }} /><Btn small kind="danger" label={t('fo.reject')} onPress={() => setList((v) => decideCharge(v, c.id, 'rejected'))} style={{ flex: 1 }} /></View>
        : c.status === 'approved' ? <View style={s.row}><Text testID="charge-ok" style={{ flex: 1, fontWeight: '900', color: C.success }}>✓ 🧾 {c.receipt}</Text><Btn small kind="ghost" label={`📄 ${t('fx.pdfR')}`} onPress={() => download(`recibo-${c.receipt}.pdf`, 'application/pdf', makePdf(wrap(receiptLines(c, L))))} /></View>
        : <Text style={{ fontWeight: '900', color: C.primary }}>✕ {t('fo.rejected')}</Text>}</View>; })}
    <CardTitle>📚 {t('fx.accTitle')}</CardTitle>
    <View style={s.row}><Btn small kind="secondary" label="CSV" onPress={() => download('angie-one-contador.csv', 'text/csv;charset=utf-8', '\uFEFF' + toCsv(list))} style={{ flex: 1 }} />
      <Btn small kind="secondary" label="PDF" onPress={() => download('angie-one-contador.pdf', 'application/pdf', makePdf(wrap(accountantLines(list, L))))} style={{ flex: 1 }} /></View>
    <Note k="fx.ledNever" /></Card>;
}

// ---------- Exportación para el Panel Maestro de Parra Apps ----------
export function PanelMaestroCard() {
  const { t } = useTranslation(); const { s: st } = useStore(); const [list] = useLedger(); const [shown, setShown] = useState(false);
  const sum = buildSummary(adminMetrics(st, list), list, '0.6.0'); const json = JSON.stringify(sum, null, 2);
  return <Card testID="pm"><CardTitle>🧩 {t('fx.pmTitle')}</CardTitle><T>{t('fx.pmSub')}</T>
    <Btn kind="secondary" label={`⬇️ ${t('fx.pmDl')}`} onPress={() => download('angie-one-panel-maestro.json', 'application/json', json)} />
    <Btn kind="ghost" label={shown ? t('fx.hide') : t('fx.pmSee')} onPress={() => setShown(!shown)} />
    {shown ? <Text testID="pm-json" selectable style={{ fontFamily: Platform.OS === 'web' ? 'monospace' : undefined, fontSize: 13, color: C.text }}>{json}</Text> : null}
    {!hidePending ? <Pending /> : null}{!hidePending ? <Note k="fx.pmNote" /> : null}</Card>;
}

// ---------- IA Administrativa + IA Programadora (funcionales, sin poderes peligrosos) ----------
export function AdminAICard() {
  const { t } = useTranslation(); const { s: st } = useStore(); const [list] = useLedger(); const [fb] = useExt<Fb[]>('feedback', []);
  const [props, setProps] = useExt<Proposal[]>('adminq', []); const [specs, setSpecs] = useExt<TaskSpec[]>('devspecs', []);
  const m = adminMetrics(st, list);
  const run = () => { const at = new Date().toISOString(); const fresh = adminProposals(m, fb.map((f) => f.text));
    setProps((v) => [...v.filter((x) => x.status !== 'proposed'), ...fresh.filter((f) => !v.some((x) => x.rule === f.rule && x.status === 'approved')).map((f) => ({ ...f, id: uid(), status: 'proposed' as const, at }))].slice(-30)); };
  const decide = (p: Proposal, status: 'approved' | 'rejected') => { const np = { ...p, status }; setProps((v) => v.map((x) => (x.id === p.id ? np : x)));
    const sp = toSpec(np); if (sp) setSpecs((v) => [...v.filter((x) => x.proposalId !== p.id), sp].slice(-30)); };
  const K: [string, string | number][] = [[t('fx.m.active7'), m.activeDays7], [t('fx.m.active30'), m.activeDays30], [t('fx.m.entries'), m.entries], [t('fx.m.avgKcal'), `${m.avgKcal7}/${m.targetKcal}`], [t('fx.m.water'), m.avgWater7], [t('fx.m.streak'), m.streak]];
  return <><Card testID="adminai"><CardTitle>🧠 {t('fx.adTitle')}</CardTitle><Text style={s.muted}>{t('fx.adSub')}</Text>
    <View style={[s.row, { flexWrap: 'wrap' }]}>{K.map(([k, v]) => <View key={k} testID="ad-metric" style={{ width: '30%', minWidth: 96, alignItems: 'center', padding: 4 }}><Text style={[s.h2, { color: C.secondary }]}>{v}</Text><Text style={[s.muted, { fontSize: 14, textAlign: 'center' }]}>{k}</Text></View>)}</View>
    <Btn kind="secondary" label={`🔍 ${t('fx.adRun')}`} onPress={run} />
    {props.map((p) => <View key={p.id} testID="ad-prop" style={{ gap: 6, borderTopWidth: 1, borderColor: C.border, paddingTop: 8 }}>
      <Text style={[s.t, { fontWeight: '900' }]}>{t(`fx.ap.${p.rule}.t`)} · {t('fx.impact.' + p.impact)}</Text>
      <Text style={s.muted}>{t(p.rule === 'weigh' && p.n < 0 ? 'fx.weighNever' : `fx.ap.${p.rule}.w`, { n: p.n })}</Text><T>➜ {t(`fx.ap.${p.rule}.a`)}</T>
      {p.status === 'proposed' ? <View style={s.row}><Btn small label={t('fo.approve')} onPress={() => decide(p, 'approved')} style={{ flex: 1, backgroundColor: C.success }} /><Btn small kind="danger" label={t('fx.notYet')} onPress={() => decide(p, 'rejected')} style={{ flex: 1 }} /></View>
        : <Text testID="ad-status" style={{ fontWeight: '900', color: p.status === 'approved' ? C.success : C.primary }}>{p.status === 'approved' ? `✓ ${t('fx.toDev')}` : '✕ ' + t('fx.notYet')}</Text>}</View>)}
    <Note k="fx.adNever" /></Card>
    <Card testID="devspecs"><CardTitle>🛠️ {t('fx.spTitle')}</CardTitle><Text style={s.muted}>{t('fx.spSub')}</Text>
      {!specs.length ? <T>{t('fx.spNone')}</T> : specs.map((sp) => <View key={sp.id} testID="spec" style={{ gap: 6, borderTopWidth: 1, borderColor: C.border, paddingTop: 8 }}>
        <Text style={[s.t, { fontWeight: '900' }]}>📝 {t(`fx.ap.${sp.rule}.t`)}</Text><Text style={s.muted}>{t('fx.spInfo', { f: sp.files.length, s: sp.steps.length })}</Text>
        <Btn small kind="ghost" label={`⬇️ ${t('fx.spDl')}`} onPress={() => download(`${sp.id}.md`, 'text/markdown', specMarkdown(sp))} /></View>)}
      <Note k="fx.spNever" /></Card></>;
}
