/** Pantallas de las 6 funciones gratis (ver src/top6.ts). Estilo A claro / B oscuro, una mano, 13 idiomas, bienestar (no médico). */
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Image, Platform, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Screen, Card, Btn, T, s, Bar, Ring, IconCard, StatRow, EmptyState, CardTitle, Pill, InfoNote, LineChart } from './ui';
import { C } from './theme';
import { useStore, today } from './store';
import { fmtNum, fmtDate } from './i18n';
import { coachTarget } from './coach';
import { Row, speak } from './coach-ui';
import { useExt } from './ext';
import { useWeights, type Sleep } from './p2';
import { DV, VITS, MINS, dayMicro } from './yazio5';
import { AI_URL } from './ai';
import { habitScore, foodColor, COLOR_HEX, estExpenditure, tdeeOf, MEASURES, addMeasure, measureDelta, type Measure, PHOTO_KEY, MAX_PHOTOS, LESSONS, nextLesson,
  cleanNick, validGroup, inviteLink, whatsappLink, challengePoints, setNutGoal, goalOf, nutGaps, type NutGoals } from './top6';

const BASE = AI_URL.replace(/\/estimate$/, '');
const dayIso = (back: number) => { const x = new Date(); x.setDate(x.getDate() - back); return today(x); };

export function useHabit(d = today()) {
  const { s: st } = useStore(); const [sleep] = useExt<Sleep[]>('sleep', []);
  const es = st.entries.filter((e) => e.date === d && !e.planned);
  const meals = new Set(es.map((e) => e.meal ?? Math.floor(new Date(e.time).getHours() / 5))).size;
  const sl = sleep.find((x) => x.date === d)?.h; const steps = st.health?.steps?.[d];
  return habitScore({ kcal: es.reduce((a, e) => a + e.kcal, 0), target: coachTarget(st, new Date(d + 'T12:00')).kcal, meals, water: st.water[d] || 0, sleepH: sl, steps });
}

// ---------- 1) Puntuación de hábitos + colores ----------
export function HabitCard() {
  const { t } = useTranslation(); const h = useHabit();
  return <Pressable testID="habit-card" accessibilityRole="button" accessibilityLabel={t('t6.hTitle')} onPress={() => router.push('/habits')}>
    <IconCard icon="🌟" title={t('t6.hTitle')} sub={t('t6.hSub')} right={<Text style={{ fontSize: 28, fontWeight: '900', color: C.primary }}>{h.total}</Text>}>
      <Bar value={h.total} max={100} color={C.primary} /></IconCard></Pressable>;
}
export function HabitsScreen() {
  const { t } = useTranslation(); const { s: st } = useStore(); const h = useHabit(); const d = today();
  const week = Array.from({ length: 7 }, (_, i) => dayIso(6 - i)); const es = st.entries.filter((e) => e.date === d && !e.planned);
  const parts: [string, string, number, number][] = [['🍽️', 'food', h.food, 40], ['💧', 'water', h.water, 20], ['😴', 'sleep', h.sleep, 20], ['👟', 'steps', h.steps, 20]];
  return <Screen title={`🌟 ${t('t6.hTitle')}`}>
    <Card style={{ alignItems: 'center' }}><Ring value={h.total} max={100} size={170}><Text testID="habit-total" style={{ fontSize: 44, fontWeight: '900', color: C.text }}>{h.total}</Text><Text style={s.muted}>/ 100</Text></Ring>
      <T style={{ textAlign: 'center' }}>{t(h.total >= 80 ? 't6.hGreat' : h.total >= 50 ? 't6.hGood' : 't6.hStart')}</T></Card>
    <Card>{parts.map(([i, k, v, m]) => <View key={k} testID={`hp-${k}`} style={{ gap: 4 }}><View style={[s.row, { justifyContent: 'space-between' }]}><Text style={{ fontWeight: '800', color: C.text }}>{i} {t(`t6.p.${k}`)}</Text><Text style={s.muted}>{v} / {m}</Text></View><Bar value={v} max={m} color={C.secondary} /></View>)}</Card>
    <WeekScores days={week} />
    <CardTitle>🎨 {t('t6.colors')}</CardTitle>
    {!es.length ? <Card><EmptyState icon="🎨" title={t('t6.noFood')} /></Card> : <Card>{es.map((e) => { const c = foodColor(e); return <View key={e.id} testID={`fc-${c}`} style={[s.row, { gap: 10, alignItems: 'center' }]}>
      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: COLOR_HEX[c] }} /><Text style={{ flex: 1, color: C.text, fontWeight: '700' }}>{e.name}</Text><Text style={s.muted}>{t(`t6.c.${c}`)}</Text></View>; })}</Card>}
    <InfoNote text={t('t6.colorsNote')} /></Screen>;
}
function WeekScores({ days }: { days: string[] }) {
  const { t } = useTranslation(); const sc = days.map((d) => useHabit(d).total); // número fijo de días → orden de hooks estable
  return <Card><CardTitle>📈 {t('t6.week')}</CardTitle><LineChart data={sc} height={110} /><Text style={s.muted}>{t('t6.avg')}: {Math.round(sc.reduce((a, b) => a + b, 0) / sc.length)}</Text></Card>;
}

// ---------- 2) Gasto estimado ----------
export function EnergyScreen() {
  const { t } = useTranslation(); const { s: st } = useStore(); const [ws] = useWeights();
  const days = Array.from({ length: 21 }, (_, i) => dayIso(i)).map((d) => ({ date: d, kcal: st.entries.filter((e) => e.date === d && !e.planned).reduce((a, e) => a + e.kcal, 0) }));
  const w21 = ws.filter((w) => w.date >= dayIso(21)); const e = estExpenditure(days, w21, tdeeOf(st.profile)); const tg = coachTarget(st).kcal;
  return <Screen title={`🔥 ${t('t6.eTitle')}`}>
    <StatRow items={[{ icon: '🔥', value: fmtNum(e.kcal), label: t('t6.eEst') }, { icon: '🍽️', value: e.intake ? fmtNum(e.intake) : '—', label: t('t6.eIntake') }, { icon: '🎯', value: fmtNum(tg), label: t('t6.eGoal') }]} />
    <Card testID="energy"><CardTitle>{e.ready ? `✅ ${t('t6.eReady')}` : `⏳ ${t('t6.eWait', { n: e.days })}`}</CardTitle><T>{t('t6.eHow')}</T>
      <Text style={s.muted}>{t('t6.eFormula')}: {fmtNum(e.formula)} kcal</Text></Card>
    <InfoNote text={t('t6.eNote')} /></Screen>;
}

// ---------- 3) Fotos de progreso y medidas (solo en el teléfono) ----------
type Ph = { date: string; uri: string };
export function ProgressScreen() {
  const { t } = useTranslation(); const [ms, setMs] = useExt<Measure[]>('measures', []); const [ph, setPh] = useState<Ph[]>([]); const [f, setF] = useState<Record<string, string>>({}); const [msg, setMsg] = useState('');
  useEffect(() => { AsyncStorage.getItem(PHOTO_KEY).then((v) => v && setPh(JSON.parse(v))).catch(() => {}); }, []);
  const savePh = (v: Ph[]) => { setPh(v); AsyncStorage.setItem(PHOTO_KEY, JSON.stringify(v)).catch(() => {}); };
  const add = async () => { const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.4, base64: true }); const a = r.assets?.[0];
    if (!r.canceled && a) savePh([...ph, { date: today(), uri: a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri }].slice(-MAX_PHOTOS)); };
  const saveM = () => { const m: Measure = { date: today() }; MEASURES.forEach((k) => { if (f[k]) (m as any)[k] = +f[k].replace(',', '.'); }); setMs((v) => addMeasure(v, m)); setF({}); setMsg(t('t6.mSaved')); };
  return <Screen title={`📷 ${t('t6.pTitle')}`}>
    <IconCard icon="📏" title={t('t6.mTitle')} sub={t('t6.mSub')}>
      {MEASURES.map((k) => { const dl = measureDelta(ms, k); return <View key={k} style={[s.row, { gap: 8, alignItems: 'center' }]}><Text style={{ flex: 1, fontWeight: '800', color: C.text }}>{t(`t6.m.${k}`)}{dl != null ? `  (${dl > 0 ? '+' : ''}${fmtNum(dl, 1)} cm)` : ''}</Text>
        <TextInput testID={`m-${k}`} accessibilityLabel={t(`t6.m.${k}`)} keyboardType="decimal-pad" placeholder="cm" value={f[k] || ''} onChangeText={(v) => setF({ ...f, [k]: v })} style={[s.input, { width: 110 }]} /></View>; })}
      <Btn testID="m-save" label={`💾 ${t('t6.mSave')}`} onPress={saveM} />{msg ? <Text testID="m-msg" style={{ color: C.success, fontWeight: '800' }}>{msg}</Text> : null}</IconCard>
    {ms.length ? <Card><CardTitle>🗓️ {t('t6.mHist')}</CardTitle>{ms.slice(-6).reverse().map((m) => <Text key={m.date} style={s.muted}>{fmtDate(new Date(m.date + 'T12:00'))}: {MEASURES.filter((k) => m[k] != null).map((k) => `${t(`t6.m.${k}`)} ${m[k]}`).join(' · ')}</Text>)}</Card> : null}
    <IconCard icon="🖼️" title={t('t6.phTitle')} sub={t('t6.phSub')}>
      {ph.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{ph.slice(-6).map((p, i) => <View key={i} style={{ alignItems: 'center' }}><Image source={{ uri: p.uri }} style={{ width: 92, height: 120, borderRadius: 12 }} /><Text style={[s.muted, { fontSize: 12 }]}>{fmtDate(new Date(p.date + 'T12:00'))}</Text></View>)}</View> : <EmptyState icon="🖼️" title={t('t6.phNone')} />}
      <Btn testID="ph-add" kind="secondary" label={`➕ ${t('t6.phAdd')}`} onPress={add} />
      {ph.length ? <Btn kind="ghost" label={`🗑️ ${t('t6.phDel')}`} onPress={() => savePh([])} /> : null}</IconCard>
    <InfoNote icon="🔒" text={t('t6.phPrivacy')} /></Screen>;
}

// ---------- 4) Lecciones de 2 minutos con audio ----------
export function LessonsScreen() {
  const { t } = useTranslation(); const [done, setDone] = useExt<string[]>('lessons', []); const [open, setOpen] = useState<string>(nextLesson(done));
  const text = (k: string) => [1, 2, 3].map((i) => t(`t6.l.${k}.${i}`)).join(' ');
  return <Screen title={`🎧 ${t('t6.lTitle')}`}>
    <StatRow items={[{ icon: '✅', value: `${done.length}/${LESSONS.length}`, label: t('t6.lDone') }, { icon: '⏱️', value: '2 min', label: t('t6.lEach') }]} />
    <Card testID="lesson"><CardTitle>{t(`t6.l.${open}.t`)}</CardTitle>{[1, 2, 3].map((i) => <T key={i}>{t(`t6.l.${open}.${i}`)}</T>)}
      <Row><Btn testID="l-play" label={`🔊 ${t('t6.lListen')}`} onPress={() => speak(`${t(`t6.l.${open}.t`)}. ${text(open)}`)} style={{ flex: 1 }} />
        <Btn testID="l-done" kind="secondary" label={`✅ ${t('t6.lMark')}`} onPress={() => { setDone((v) => [...new Set([...v, open])]); setOpen(nextLesson([...done, open])); }} style={{ flex: 1 }} /></Row></Card>
    {LESSONS.map((k) => <Pressable key={k} testID={`l-${k}`} accessibilityRole="button" onPress={() => setOpen(k)}><Card><Text style={{ fontWeight: '800', color: C.text }}>{done.includes(k) ? '✅' : '🎧'} {t(`t6.l.${k}.t`)}</Text></Card></Pressable>)}
    <InfoNote text={t('t6.lNote')} /></Screen>;
}

// ---------- 5) Amigos y retos ----------
type Grp = { code: string; name: string; me?: string; members: { pid: string; nick: string; pts: number }[] };
type Fr = { id: string; nick: string; groups: string[]; sent?: string; blocked?: string[] };
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(10))).map((x) => (x % 36).toString(36)).join('');
async function fx(path: string, body: object): Promise<any> {
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 15000);
  try { const r = await fetch(BASE + '/friends/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal }); const o = await r.json().catch(() => ({})); if (!r.ok) throw new Error(o.error || 'server'); return o; } finally { clearTimeout(tm); }
}
export function FriendsScreen() {
  const { t } = useTranslation(); const prm = useLocalSearchParams<{ join?: string }>(); const [fr, setFr] = useExt<Fr>('friends', { id: '', nick: '', groups: [] });
  const [nick, setNick] = useState(fr.nick); const [code, setCode] = useState((prm.join || '').toUpperCase()); const [gs, setGs] = useState<Grp[]>([]); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const week = Array.from({ length: 7 }, (_, i) => dayIso(i)); const pts = challengePoints(week.map((d) => useHabit(d).total));
  const me = fr.id || rid();
  const ensure = () => { const n = cleanNick(nick); if (!n) { setErr(t('t6.fNick')); return null; } if (!fr.id || fr.nick !== n) setFr((v) => ({ ...v, id: me, nick: n })); return n; };
  const refresh = async (list = fr.groups) => { const out: Grp[] = []; for (const c of list) { try { out.push(await fx('get', { code: c, id: fr.id })); } catch { /* grupo borrado */ } } setGs(out); };
  useEffect(() => { refresh(); }, [fr.groups.join()]);
  useEffect(() => { // 1 envío de puntos al día como máximo (ahorra escrituras gratis)
    if (!fr.id || !fr.groups.length || fr.sent === today()) return; Promise.all(fr.groups.map((c) => fx('score', { code: c, id: fr.id, pts }).catch(() => {}))).then(() => { setFr((v) => ({ ...v, sent: today() })); refresh(); }); }, [fr.id, fr.groups.join()]);
  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(''); try { await fn(); } catch (e: any) { setErr(t(e?.message === 'not found' ? 't6.fNotFound' : e?.message === 'full' ? 't6.fFull' : 't6.fErr')); } finally { setBusy(false); } };
  const create = () => run(async () => { const n = ensure(); if (!n) return; const g = await fx('create', { id: me, nick: n }); setFr((v) => ({ ...v, id: me, nick: n, groups: [...v.groups, g.code] })); });
  const join = () => run(async () => { const n = ensure(); const c = code.trim().toUpperCase(); if (!n) return; if (!validGroup(c)) { setErr(t('t6.fCode')); return; } await fx('join', { code: c, id: me, nick: n }); setFr((v) => ({ ...v, id: me, nick: n, groups: [...new Set([...v.groups, c])] })); setCode(''); });
  const leave = (c: string) => run(async () => { await fx('leave', { code: c, id: fr.id }).catch(() => {}); setFr((v) => ({ ...v, groups: v.groups.filter((x) => x !== c) })); });
  // Reportar = bloquear para mí + enviar a la cola del fundador. Nadie queda oculto para los demás sin revisión humana.
  const report = (c: string, target: string) => run(async () => { setFr((v) => ({ ...v, blocked: [...new Set([...(v.blocked || []), target])] })); await fx('report', { code: c, id: fr.id, target, why: 'abuse' }).catch(() => {}); setErr(t('rv.fBlocked')); });
  const unblock = () => setFr((v) => ({ ...v, blocked: [] }));
  const invite = (c: string) => { const url = whatsappLink(c, t('t6.fInviteText')); Platform.OS === 'web' ? window.open(url, '_blank') : Linking.openURL(url); };
  return <Screen title={`🤝 ${t('t6.fTitle')}`}>
    <StatRow items={[{ icon: '🏆', value: pts, label: t('t6.fMyPts') }, { icon: '👥', value: gs.length, label: t('t6.fGroups') }]} />
    <IconCard icon="🙂" title={t('t6.fYou')} sub={t('t6.fPrivacy')}>
      <TextInput testID="f-nick" accessibilityLabel={t('t6.fNickL')} placeholder={t('t6.fNickL')} maxLength={20} value={nick} onChangeText={setNick} style={s.input} />
      <Btn testID="f-create" label={`➕ ${t('t6.fCreate')}`} onPress={create} />
      <TextInput testID="f-code" accessibilityLabel={t('t6.fCodeL')} placeholder={t('t6.fCodeL')} autoCapitalize="characters" maxLength={6} value={code} onChangeText={setCode} style={s.input} />
      <Btn testID="f-join" kind="secondary" label={`🔗 ${t('t6.fJoin')}`} onPress={join} />
      {busy ? <Text style={s.muted}>…</Text> : null}{err ? <Text testID="f-err" style={{ color: C.primary, fontWeight: '800' }}>{err}</Text> : null}</IconCard>
    {gs.map((g) => <Card key={g.code} testID="f-group"><CardTitle>👥 {g.name} · {g.code}</CardTitle>
      {[...g.members].filter((m) => !(fr.blocked || []).includes(m.pid)).sort((a, b) => b.pts - a.pts).map((m, i) => <View key={m.pid} style={[s.row, { gap: 8, alignItems: 'center' }]}><Text style={{ flex: 1, fontWeight: '800', color: C.text }}>{['🥇', '🥈', '🥉'][i] || '•'} {m.nick}{m.pid === g.me ? ` (${t('t6.fMe')})` : ''}</Text><Pill label={`${m.pts} ${t('t6.fPts')}`} />
        {m.pid !== g.me ? <Btn small kind="ghost" testID="f-report" label="🚩" a11y={t('rv.fReportBlock')} onPress={() => report(g.code, m.pid)} style={{ width: 52, paddingHorizontal: 0 }} /> : null}</View>)}
      <Row><Btn small label={`💬 ${t('t6.fInvite')}`} onPress={() => invite(g.code)} style={{ flex: 1 }} /><Btn small kind="ghost" label={t('t6.fLeave')} onPress={() => leave(g.code)} style={{ flex: 1 }} /></Row>
      <Text style={[s.muted, { fontSize: 12 }]} selectable>{inviteLink(g.code)}</Text></Card>)}
    {(fr.blocked || []).length ? <Btn small kind="ghost" testID="f-unblock" label={t('rv.fUnblock', { n: fr.blocked!.length })} onPress={unblock} /> : null}
    <InfoNote text={t('rv.fRules')} /></Screen>;
}

// ---------- 7) Metas por nutriente ----------
export function NutGoalsScreen() {
  const { t } = useTranslation(); const { s: st } = useStore(); const [g, setG] = useExt<NutGoals>('nutGoals', {});
  const es = st.entries.filter((e) => e.date === today() && !e.planned); const { sum } = dayMicro(es as any); const all: Record<string, number> = { ...sum, fiber: es.reduce((a, e) => a + (e.fiber || 0), 0) };
  const gaps = nutGaps(g, all); const keys = ['fiber', ...MINS, ...VITS].filter((k) => k === 'fiber' || DV[k]);
  const unit = (k: string) => (k === 'fiber' ? 'g' : DV[k][1]); const name = (k: string) => (k === 'fiber' ? t('t6.fiber') : t(`y5.n.${k}`));
  return <Screen title={`🎯 ${t('t6.nTitle')}`}>
    {gaps.length ? <Card testID="n-gaps" style={{ backgroundColor: C.tint }}><T style={{ fontWeight: '800' }}>💡 {t('t6.nGaps', { list: gaps.map(name).join(', ') })}</T></Card> : null}
    {Object.keys(g).length ? <Card>{Object.keys(g).map((k) => <View key={k} testID={`ng-${k}`} style={{ gap: 4 }}><View style={[s.row, { justifyContent: 'space-between' }]}><Text style={{ fontWeight: '800', color: C.text }}>{name(k)}</Text><Text style={s.muted}>{fmtNum(all[k] || 0, 1)} / {fmtNum(goalOf(g, k), 1)} {unit(k)}</Text></View><Bar value={all[k] || 0} max={goalOf(g, k)} color={C.secondary} /></View>)}</Card>
      : <Card><EmptyState icon="🎯" title={t('t6.nNone')} /></Card>}
    <CardTitle>➕ {t('t6.nPick')}</CardTitle>
    <Card>{keys.map((k) => { const on = g[k] != null; const v = goalOf(g, k); const step = v >= 100 ? Math.round(v / 10) : v >= 10 ? 1 : 0.1;
      return <View key={k} style={[s.row, { gap: 6, alignItems: 'center' }]}><Text style={{ flex: 1, color: C.text, fontWeight: on ? '800' : '600' }}>{name(k)} · {fmtNum(v, 1)} {unit(k)}</Text>
        {on ? <><Btn small kind="ghost" testID={`n-${k}-minus`} label="−" a11y="−" onPress={() => setG((x) => setNutGoal(x, k, Math.max(step, v - step)))} style={{ width: 48, paddingHorizontal: 0 }} /><Btn small kind="ghost" testID={`n-${k}-plus`} label="+" a11y="+" onPress={() => setG((x) => setNutGoal(x, k, v + step))} style={{ width: 48, paddingHorizontal: 0 }} /></> : null}
        <Btn small kind={on ? 'danger' : 'secondary'} testID={`n-${k}`} label={on ? '✕' : '＋'} a11y={name(k)} onPress={() => setG((x) => setNutGoal(x, k, on ? null : v))} style={{ width: 52, paddingHorizontal: 0 }} /></View>; })}</Card>
    <InfoNote text={t('t6.nNote')} /></Screen>;
}
