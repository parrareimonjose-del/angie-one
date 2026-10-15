/** Fase 2 (web): coach adaptativo, memoria, importar MyFitnessPal, voz, peso, recetas y planes, nevera/chef,
 *  antojos, sueño y estrés, avisos, menú, puntos, resumen semanal en voz, avatar 2D e IA Programadora. Todo local. */
import { useRef, useState } from 'react';
import { View, Text, TextInput, Image, Platform, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Rect, Ellipse, Path, Polyline, Line, Text as SvgText } from 'react-native-svg';
import { Screen, Card, Btn, Chip, T, Bar, s, IconCard, EmptyState, Pill, InfoNote, CardTitle, Ring, FOOD } from './ui';
import { C } from './theme';
import { useStore, today, uid, DAY, State, Entry, dailyTarget } from './store';
import { fmtNum, fmtDate, fmtLocale, curLang } from './i18n';
import { coachTarget, coachOf, burnedOn, isPremium, weekday, safeMin, rulesPlan, DEFAULT_PREFS, Prefs, nextCheckInDays } from './coach';
import { speak, Row, Disclaimer } from './coach-ui';
import { useExt, Example, Note, Tile } from './ext';
import { estimateText, AI_URL, AIError } from './ai';
import { startVoice, voiceSupported } from './voice';
import { aiErrorText } from './estimate';
import { shrinkForUpload } from './img';

const BASE = AI_URL.replace(/\/estimate$/, '');
async function post(path: string, body: object, ms = 45000) {
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
    const o = await r.json().catch(() => ({})); if (!r.ok) throw new Error(o.error || 'server'); return o; } finally { clearTimeout(tm); }
}
const dayStr = (n: number) => today(new Date(Date.now() - n * DAY));

/** Candado Premium con adelanto y botón a la oferta. */
function Locked({ k }: { k: string }) {
  const { t } = useTranslation();
  return <Card style={{ backgroundColor: C.secondary }} testID="locked"><Text style={[s.h2, { color: C.white }]}>🔒 {t('p2.lockT')}</Text>
    <Text style={[s.t, { color: C.white }]}>{t(k)}</Text><Btn kind="accent" label={`⭐ ${t('coach.unlock')}`} onPress={() => router.push('/paywall')} /></Card>;
}
const usePrem = () => { const { s: st } = useStore(); return isPremium(st); };

// ---------- Centro Fase 2 ----------
export function Hub() {
  const { t } = useTranslation(); const prem = usePrem();
  const tiles: [string, string, string, boolean?][] = [['⚖️', 'weight', '/weight'], ['🎙️', 'voice', '/voice'], ['🧊', 'fridge', '/chef', true], ['👩‍🍳', 'plans', '/plans', true], ['📋', 'menu', '/menu', true],
    ['🍫', 'craving', '/craving'], ['😴', 'sleep', '/sleep'], ['🔔', 'rem', '/reminders'], ['🏆', 'points', '/points'], ['🗣️', 'weekly', '/weekly', true], ['🙂', 'avatar', '/avatar', true],
    ['🧠', 'memory', '/memory'], ['📥', 'import', '/import'], ['🎯', 'macros', '/macros'], ['⚡', 'quick', '/quickadd'], ['🗓️', 'prep', '/mealprep', true], ['❤️', 'sync', '/sync']];
  return <Screen title={`🌱 ${t('p2.hub')}`}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
      {tiles.map(([i, k, h, p]) => <Tile key={k} icon={i} label={t(`p2.t.${k}`) + (p && !prem ? ' 🔒' : '')} onPress={() => router.push(h as any)} />)}</View>
    <Note k="p2.hubNote" /></Screen>;
}

// ---------- Peso, gráfica, tendencia y coach adaptativo ----------
export type W = { date: string; kg: number };
export function useWeights(): [W[], (fn: (v: W[]) => W[]) => void] {
  const { s: st } = useStore(); const [w, setW] = useExt<W[]>('weights', []);
  const m = new Map<string, number>(); coachOf(st).checkins.forEach((c) => m.set(c.date, c.weight)); w.forEach((x) => m.set(x.date, x.kg));
  return [[...m].map(([date, kg]) => ({ date, kg })).sort((a, b) => a.date.localeCompare(b.date)), setW];
}
/** Pendiente (kg/semana) por mínimos cuadrados de los últimos 21 días. */
export function trend(ws: W[], now = Date.now()) {
  const pts = ws.map((w) => ({ x: (new Date(w.date + 'T12:00:00').getTime() - now) / DAY, y: w.kg })).filter((p) => p.x >= -21);
  if (pts.length < 2) return null; const span = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x)); if (span < 5) return null;
  const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length, my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  const k = pts.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0) / pts.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  return Math.round(k * 7 * 100) / 100;
}
/** Sugerencia adaptativa: tendencia real del peso vs. objetivo. Nunca baja del mínimo seguro ni más de 0,8 %/semana. */
export function adaptive(st: State, ws: W[]) {
  const p = st.profile; const k = trend(ws); if (!p || k === null) return { delta: 0, msg: 'aNeed', k };
  const pct = (k / p.weight) * 100; let delta = 0, msg = 'aOk';
  if (p.goal === 'lose') { if (pct > -0.15) { delta = -100; msg = 'aSlow'; } else if (pct < -1) { delta = 150; msg = 'aFast'; } }
  else if (p.goal === 'gain') { if (pct < 0.05) { delta = 100; msg = 'aGain'; } else if (pct > 0.5) { delta = -100; msg = 'aGainFast'; } }
  else if (Math.abs(pct) > 0.4) { delta = pct > 0 ? -100 : 100; msg = 'aKeep'; }
  const cur = coachTarget(st).kcal; if (cur + delta < safeMin(p)) delta = Math.max(0, safeMin(p) - cur);
  return { delta, msg, k };
}
function Chart({ ws }: { ws: W[] }) {
  const pts = ws.slice(-30); if (pts.length < 2) return null;
  const W_ = 320, H = 150, lo = Math.min(...pts.map((p) => p.kg)) - 1, hi = Math.max(...pts.map((p) => p.kg)) + 1;
  const xy = pts.map((p, i) => [16 + (i * (W_ - 32)) / (pts.length - 1), 12 + ((hi - p.kg) / (hi - lo)) * (H - 30)]);
  return <Svg width="100%" height={H} viewBox={`0 0 ${W_} ${H}`} testID="weight-chart">
    <Line x1={16} y1={H - 18} x2={W_ - 16} y2={H - 18} stroke={C.border} strokeWidth={2} />
    <Polyline points={xy.map((p) => p.join(',')).join(' ')} fill="none" stroke={C.primary} strokeWidth={4} strokeLinejoin="round" />
    {xy.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={5} fill={C.secondary} />)}
    <SvgText x={16} y={H - 2} fontSize={12} fill={C.muted}>{pts[0].date.slice(5)}</SvgText>
    <SvgText x={W_ - 16} y={H - 2} fontSize={12} fill={C.muted} textAnchor="end">{pts[pts.length - 1].date.slice(5)}</SvgText>
  </Svg>;
}
export function Weight() { const { ready } = useStore(); return ready ? <WeightInner /> : <View style={{ flex: 1, backgroundColor: C.bg }} />; }
function WeightInner() {
  const { t } = useTranslation(); const { s: st, set } = useStore(); const prem = isPremium(st);
  const [ws, setW] = useWeights(); const last = ws[ws.length - 1]; const [kg, setKg] = useState(last?.kg || st.profile?.weight || 70); const [msg, setMsg] = useState('');
  const save = () => { if (!(kg >= 30 && kg <= 300)) return; setW((v) => [...v.filter((x) => x.date !== today()), { date: today(), kg }]); set((x) => (x.profile ? { ...x, profile: { ...x.profile, weight: kg } } : x)); setMsg(t('p2.wSaved')); };
  const k = trend(ws); const a = adaptive(st, ws);
  const apply = () => { set((x) => { const c = coachOf(x); return { ...x, coach: { ...c, adjust: Math.min(500, Math.max(-400, c.adjust + a.delta)) } }; }); setMsg(t('p2.aApplied', { kcal: fmtNum(coachTarget(st).kcal + a.delta) })); };
  return <Screen title={`⚖️ ${t('p2.t.weight')}`}>
    <Card style={{ alignItems: 'center' }}><Text style={{ fontSize: 48, fontWeight: '900', color: C.text }} testID="kg">{fmtNum(kg, 1)} kg</Text>
      <Row>{[-1, -0.1, 0.1, 1].map((d) => <Btn key={d} small kind="ghost" label={(d > 0 ? '+' : '−') + fmtNum(Math.abs(d), 1)} onPress={() => setKg(Math.round((kg + d) * 10) / 10)} style={{ minWidth: 70 }} />)}</Row>
      <Btn label={`✓ ${t('p2.wSave')}`} onPress={save} style={{ alignSelf: 'stretch' }} />
      {msg ? <Text style={{ color: C.success, fontWeight: '800', fontSize: 17 }} testID="w-msg">{msg}</Text> : null}</Card>
    <Card><CardTitle>📈 {t('p2.wChart')}</CardTitle>{ws.length >= 2 ? <Chart ws={ws} /> : <T>{t('p2.wNeed2')}</T>}
      {k !== null ? <T testID="trend">{t('p2.wTrend', { k: (k > 0 ? '+' : '') + fmtNum(k, 2) })}</T> : null}
      {ws.slice(-5).reverse().map((w) => <Text key={w.date} style={s.muted}>{fmtDate(new Date(w.date + 'T12:00:00'))} · {fmtNum(w.kg, 1)} kg</Text>)}</Card>
    {prem ? <Card testID="adaptive"><CardTitle>🧭 {t('p2.aTitle')}</CardTitle><T>{t('p2.' + a.msg)}</T>
      {a.delta ? <Btn kind="secondary" label={t('p2.aApply', { d: (a.delta > 0 ? '+' : '') + a.delta })} onPress={apply} /> : null}
      <Text style={s.muted}>{t('p2.aSafe', { min: safeMin(st.profile) })}</Text></Card> : <Locked k="p2.aLocked" />}
    <Note k="p2.wNote" /></Screen>;
}

// ---------- Memoria por usuario (solo en el dispositivo) ----------
export type Mem = { on: boolean; facts: { id: string; text: string }[] };
export const MEM0: Mem = { on: true, facts: [] };
const LEARN = /(no me gusta|no como|soy al[eé]rgic|soy vegetarian|soy vegan|no tomo|odio|i don'?t (like|eat)|i'?m (allergic|vegetarian|vegan)|i am (allergic|vegetarian|vegan)|i hate|sin gluten|menos az[uú]car|sin az[uú]car|menos sal|gluten[- ]free|less sugar|no sugar|less salt|intoleran|i'?m lactose|não gosto|sou vegetarian|je n'aime pas|ich mag kein)/i;
/** Nunca guardamos enfermedades: se convierten en preferencias neutras de comida. */
const NEUTRAL: [RegExp, string][] = [[/cel[ií]ac|celiac|coeliac/i, 'sin gluten / gluten-free'], [/diab[eé]t|glucos|insulin/i, 'menos azúcar / less sugar'], [/hipertens|hypertens|presi[oó]n alta|blood pressure/i, 'menos sal / less salt']];
export const neutralFact = (text: string) => { for (const [r, v] of NEUTRAL) if (r.test(text)) return v; return null; };
export const learnFact = (text: string) => neutralFact(text) ?? (LEARN.test(text) ? text.trim().slice(0, 120) : null);
export const memContext = (m?: Mem) => (m && m.on && m.facts.length ? ' Remember about user: ' + m.facts.map((f) => f.text).join('; ').slice(0, 350) : '');
export function Memory() {
  const { t } = useTranslation(); const [m, setM] = useExt<Mem>('mem', MEM0); const [q, setQ] = useState('');
  const add = () => { const v = neutralFact(q) ?? q.trim(); if (!v) return; setM((x) => ({ ...x, facts: [...x.facts, { id: uid(), text: v.slice(0, 120) }].slice(-20) })); setQ(''); };
  return <Screen title={`🧠 ${t('p2.t.memory')}`}>
    <IconCard icon="🧠" title={t('p2.t.memory')} sub={t('p2.memWhat')} right={<Pill label={m.on ? '✓' : '—'} color={m.on ? C.success : C.muted} />}>
      <Row><Chip label={`✓ ${t('p2.memOn')}`} active={m.on} onPress={() => setM((x) => ({ ...x, on: true }))} /><Chip label={t('p2.memOff')} active={!m.on} onPress={() => setM((x) => ({ ...x, on: false }))} /></Row></IconCard>
    <InfoNote icon="🔒" text={t('p2.memPrivacy')} />
    <IconCard icon="💭" title={t('p2.memList')} right={<Pill label={`${m.facts.length}/20`} />}>
      {m.facts.length ? m.facts.map((f) => <View key={f.id} style={[s.row, { justifyContent: 'space-between', padding: 10, borderRadius: 14, backgroundColor: C.tint }]}><Text style={{ fontSize: 18 }}>💡</Text><T style={{ flex: 1 }}>{f.text}</T>
        <Btn small kind="danger" label="🗑️" a11y={t('p2.memDel')} onPress={() => setM((x) => ({ ...x, facts: x.facts.filter((y) => y.id !== f.id) }))} style={{ width: 56 }} /></View>) : <EmptyState icon="💭" title={t('p2.memEmpty')} />}
      <TextInput style={s.input} value={q} onChangeText={setQ} placeholder={t('p2.memPh')} onSubmitEditing={add} accessibilityLabel={t('p2.memPh')} />
      <Btn small label={`＋ ${t('add')}`} onPress={add} /></IconCard>
    <Btn kind="danger" label={`🗑️ ${t('p2.memDelAll')}`} onPress={() => { if (Platform.OS !== 'web' || window.confirm(t('p2.memDelQ'))) setM(() => ({ ...MEM0, on: m.on })); }} />
  </Screen>;
}

// ---------- Importar MyFitnessPal (CSV) ----------
export function parseCSV(txt: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cur = '', q = false;
  for (let i = 0; i < txt.length; i++) { const ch = txt[i];
    if (q) { if (ch === '"' && txt[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ',' || ch === ';') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((c) => c.trim())) rows.push(row); row = []; } else cur += ch; }
  row.push(cur); if (row.some((c) => c.trim())) rows.push(row); return rows;
}
/** Exportación "Nutrition" de MyFitnessPal: Date, Meal, Calories, Fat (g), Carbohydrates (g), Protein (g)… Agrupa por día y comida. */
export function mfpEntries(txt: string): Entry[] {
  const rows = parseCSV(txt.replace(/^\uFEFF/, '')); if (rows.length < 2) return [];
  const h = rows[0].map((x) => x.trim().toLowerCase()); const col = (re: RegExp) => h.findIndex((x) => re.test(x));
  const iD = col(/^date|fecha/), iM = col(/^meal|comida/), iK = col(/^calor/), iF = col(/^fat|grasa/), iC = col(/^carbo/), iP = col(/^prote/);
  if (iD < 0 || iK < 0) return [];
  const g = new Map<string, Entry>(); const n = (v?: string) => Math.max(0, Math.round(parseFloat(String(v || '0').replace(',', '.')) || 0));
  for (const r of rows.slice(1)) { const d = (r[iD] || '').trim(); const date = /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : (() => { const x = new Date(d); return isNaN(+x) ? '' : today(x); })(); if (!date) continue;
    const meal = (iM >= 0 ? r[iM] : '').trim() || 'Food'; const id = `mfp-${date}-${meal}`; const e = g.get(id) || { id, date, time: new Date(date + 'T12:00:00').getTime(), name: `MyFitnessPal · ${meal}`, kcal: 0, p: 0, c: 0, f: 0, source: 'manual' as const };
    e.kcal += n(r[iK]); e.p += iP >= 0 ? n(r[iP]) : 0; e.c += iC >= 0 ? n(r[iC]) : 0; e.f += iF >= 0 ? n(r[iF]) : 0; g.set(id, e); }
  return [...g.values()].filter((e) => e.kcal > 0);
}
export const SAMPLE_MFP = 'Date,Meal,Calories,Fat (g),Carbohydrates (g),Protein (g)\n2026-10-01,Breakfast,420,14,50,22\n2026-10-01,Lunch,650,20,70,40\n2026-10-02,Breakfast,380,12,45,20';
export function Import() {
  const { t } = useTranslation(); const { set } = useStore(); const [txt, setTxt] = useState(''); const [msg, setMsg] = useState('');
  const run = (raw: string) => { const es = mfpEntries(raw); if (!es.length) { setMsg(t('p2.impBad')); return; }
    set((x) => { const ids = new Set(es.map((e) => e.id)); return { ...x, entries: [...x.entries.filter((e) => !ids.has(e.id)), ...es] }; });
    setMsg(t('p2.impOk', { n: es.length, d: new Set(es.map((e) => e.date)).size })); };
  const pick = () => { if (Platform.OS !== 'web') return; const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,text/csv';
    inp.onchange = () => { const f = inp.files?.[0]; if (f) f.text().then(run); }; inp.click(); };
  return <Screen title={`📥 ${t('p2.t.import')}`}>
    <Card><T>{t('p2.impHow')}</T><Btn label={`📂 ${t('p2.impPick')}`} onPress={pick} /></Card>
    <Card><Text style={s.muted}>{t('p2.impPaste')}</Text>
      <TextInput testID="csv" style={[s.input, { minHeight: 110, textAlignVertical: 'top' }]} multiline value={txt} onChangeText={setTxt} placeholder="Date,Meal,Calories,…" />
      <Row><Btn small label={t('p2.impGo')} onPress={() => run(txt)} /><Btn small kind="ghost" label={t('p2.impSample')} onPress={() => setTxt(SAMPLE_MFP)} /></Row></Card>
    {msg ? <Card><Text testID="imp-msg" style={{ fontWeight: '800', fontSize: 17, color: msg === t('p2.impBad') ? C.primary : C.success }}>{msg}</Text></Card> : null}
    <Note k="p2.impNote" /></Screen>;
}

// ---------- Registro por voz desde cualquier pantalla ----------
export function Voice() {
  const { t } = useTranslation(); const { set } = useStore(); const [q, setQ] = useState(''); const [busy, setBusy] = useState(false); const [listening, setL] = useState(false);
  const [est, setEst] = useState<{ name: string; kcal: number; p: number; c: number; f: number } | null>(null); const [err, setErr] = useState(''); const [done, setDone] = useState(false);
  const stopRef = useRef<null | (() => void)>(null); const [working, setW] = useState(false);
  const listen = () => { if (listening) { stopRef.current?.(); return; } if (!voiceSupported()) { setErr(t('p2.vNoMic')); return; } setErr('');
    stopRef.current = startVoice({ onText: (x) => { setQ(x); go(x); }, onErr: (e) => setErr(t('voice.' + e)), onState: (st) => { setL(st === 'listening'); setW(st === 'working'); } }); };
  const go = async (text = q) => { if (!text.trim()) return; setBusy(true); setErr(''); setEst(null); setDone(false);
    try { const e = await estimateText(text, curLang()); setEst({ name: e.name, kcal: Math.round((e.kcalMin + e.kcalMax) / 2), p: e.p, c: e.c, f: e.f }); }
    catch (e) { setErr(e instanceof AIError && e.code === 'notFood' ? t('voice.notFood') : aiErrorText(t, e)); } finally { setBusy(false); } };
  const add = () => { if (!est) return; set((x) => ({ ...x, entries: [...x.entries, { id: uid(), date: today(), time: Date.now(), name: est.name, kcal: est.kcal, p: est.p, c: est.c, f: est.f, source: 'manual' }] })); setDone(true); speak(t('p2.vAdded', { name: est.name, kcal: est.kcal })); };
  return <Screen title={`🎙️ ${t('p2.t.voice')}`} nav={false}>
    <Btn label={working ? `⏳ ${t('voice.working')}` : listening ? `⏹️ ${t('voice.stop')}` : `🎙️ ${t('p2.vTap')}`} onPress={listen} style={{ minHeight: 96 }} />
    <Card style={{ alignItems: 'center', gap: 6 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 60 }}>{[12, 28, 44, 20, 52, 34, 16, 40, 24, 48, 18, 30, 10].map((h, i) => <View key={i} style={{ width: 6, height: listening ? h : h / 3, borderRadius: 3, backgroundColor: i % 2 ? C.secondary : C.primary }} />)}</View></Card>
    <Text style={s.muted}>{t('p2.vOr')}</Text>
    <TextInput testID="voice-text" style={s.input} value={q} onChangeText={setQ} placeholder={t('p2.vPh')} onSubmitEditing={() => go()} />
    <Btn kind="secondary" label={busy ? '…' : `✨ ${t('p2.vGo')}`} onPress={() => go()} />
    {err ? <Text style={{ color: C.primary, fontWeight: '800' }}>{err}</Text> : null}
    {est ? <Card testID="voice-est"><CardTitle>{est.name}</CardTitle><T>~{fmtNum(est.kcal)} {t('u.kcal')} · P {est.p} · C {est.c} · G {est.f}</T>
      {done ? <Text style={{ color: C.success, fontWeight: '900', fontSize: 18 }}>✓ {t('p2.vSaved')}</Text> : <Btn label={`＋ ${t('p2.vAdd')}`} onPress={add} />}</Card> : null}
    <Btn kind="ghost" label={t('back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
  </Screen>;
}

// ---------- Recetas y planes de dieta ----------
const TEMPLATES: { k: string; p: Partial<Prefs> }[] = [{ k: 'tBal', p: { cuisine: 'latin', dislikes: [], meals: 4 } }, { k: 'tProt', p: { cuisine: 'latin', meals: 5 } },
  { k: 'tVeg', p: { dislikes: ['veg'], meals: 4 } }, { k: 'tCheap', p: { budget: 'low', meals: 3 } }];
export function Plans() {
  const { t } = useTranslation(); const { s: st, set } = useStore(); const prem = isPremium(st); const [msg, setMsg] = useState('');
  const apply = (tp: (typeof TEMPLATES)[number]) => { if (!st.profile) return; set((x) => { const c = coachOf(x); const prefs = { ...DEFAULT_PREFS, ...(c.prefs || {}), ...tp.p } as Prefs;
    const plan = rulesPlan(x.profile!, prefs, coachTarget(x).kcal); return { ...x, coach: { ...c, prefs, plan } }; }); setMsg(t('p2.plApplied', { n: t('p2.' + tp.k) })); };
  return <Screen title={`👩‍🍳 ${t('p2.t.plans')}`}>
    {!prem ? <Locked k="p2.plLocked" /> : <>
      {TEMPLATES.map((tp) => <Card key={tp.k}><CardTitle>{t('p2.' + tp.k)}</CardTitle><T>{t('p2.' + tp.k + 'D')}</T><Btn small label={t('p2.plUse')} onPress={() => apply(tp)} /></Card>)}
      {msg ? <Card><Text testID="pl-msg" style={{ color: C.success, fontWeight: '800', fontSize: 17 }}>✓ {msg}</Text><Btn small kind="secondary" label={`🍽️ ${t('coach.diet')}`} onPress={() => router.push('/diet')} /></Card> : null}</>}
    <Btn kind="ghost" label={`🍲 ${t('x.t.recipes')}`} onPress={() => router.push('/recipes')} />
    <Btn kind="ghost" label={`🧊 ${t('p2.t.fridge')}`} onPress={() => router.push('/chef')} />
    <Disclaimer /></Screen>;
}

// ---------- Escáner de nevera/despensa/sazones + chef IA ----------
type Rec = { name: string; kcal: number; min: number; uses: string[]; steps: string[] };
async function pickPhoto(cam: boolean) {
  const opt = { base64: true, quality: 0.7, mediaTypes: ['images'] as any };
  const r = cam && Platform.OS !== 'web' ? await ImagePicker.launchCameraAsync(opt) : await ImagePicker.launchImageLibraryAsync(opt);
  if (r.canceled || !r.assets?.[0]?.base64) return null; const a = r.assets[0];
  const x = await shrinkForUpload(a.uri, a.base64!, a.mimeType || 'image/jpeg'); return { ...x, uri: a.uri };
}
export function Chef() {
  const { t } = useTranslation(); const { s: st, set } = useStore(); const prem = isPremium(st); const [mem] = useExt<Mem>('mem', MEM0);
  const [q, setQ] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [items, setItems] = useState<string[]>([]); const [recs, setRecs] = useState<Rec[]>([]); const [open, setOpen] = useState(-1); const [uri, setUri] = useState(''); const [added, setAdded] = useState(-1);
  const dislike = (coachOf(st).prefs?.dislikes || []).join(', ') + (mem.on ? ' ' + mem.facts.map((f) => f.text).join('; ') : '');
  const run = async (body: object) => { setBusy(true); setErr(''); setRecs([]); try { const o = await post('/vision', { mode: 'chef', lang: curLang(), kcal: Math.round(coachTarget(st).kcal / 3.5), dislike: dislike.slice(0, 150), ...body });
    setItems(o.items || []); setRecs(o.recipes || []); if (!(o.recipes || []).length) setErr(t('p2.chNone')); } catch { setErr(t('p2.err')); } finally { setBusy(false); } };
  const photo = async () => { const p = await pickPhoto(true); if (!p) return; setUri(p.uri); run({ image: p.b64, mime: p.mime }); };
  const log = (r: Rec, i: number) => { set((x) => ({ ...x, entries: [...x.entries, { id: uid(), date: today(), time: Date.now(), name: r.name, kcal: r.kcal, p: 0, c: 0, f: 0, source: 'manual' }] })); setAdded(i); };
  if (!prem) return <Screen title={`🧊 ${t('p2.t.fridge')}`}><Locked k="p2.chLocked" /></Screen>;
  return <Screen title={`🧊 ${t('p2.t.fridge')}`}>
    <Card><T>{t('p2.chHow')}</T><Btn label={`📸 ${t('p2.chPhoto')}`} onPress={photo} />{uri ? <Image source={{ uri }} style={{ width: '100%', height: 180, borderRadius: 16 }} /> : null}</Card>
    <Card><CardTitle>👩‍🍳 {t('p2.chChef')}</CardTitle><TextInput testID="chef-text" style={s.input} value={q} onChangeText={setQ} placeholder={t('p2.chPh')} />
      <Btn kind="secondary" label={busy ? '…' : `✨ ${t('p2.chGo')}`} onPress={() => q.trim() && run({ text: q })} /></Card>
    {busy ? <T>⏳ {t('p2.thinking')}</T> : null}{err ? <Text style={{ color: C.primary, fontWeight: '800' }}>{err}</Text> : null}
    {items.length ? <Card><CardTitle>{t('p2.chFound')}</CardTitle><T>{items.join(' · ')}</T></Card> : null}
    {recs.map((r, i) => <Card key={i} testID="recipe"><CardTitle>{r.name}</CardTitle><Text style={s.muted}>{fmtNum(r.kcal)} {t('u.kcal')} · {r.min} min</Text>
      {open === i ? r.steps.map((x, j) => <T key={j}>{j + 1}. {x}</T>) : null}
      <Row><Btn small kind="ghost" label={open === i ? t('x.close') : t('x.see')} onPress={() => setOpen(open === i ? -1 : i)} /><Btn small kind="ghost" label="🔊" a11y={t('home.readAloud')} onPress={() => speak(r.name + '. ' + r.steps.join('. '))} />
        {added === i ? <Text style={{ color: C.success, fontWeight: '800' }}>✓ {t('p2.vSaved')}</Text> : <Btn small label={`＋ ${t('p2.toDiary')}`} onPress={() => log(r, i)} />}</Row></Card>)}
    <Disclaimer /></Screen>;
}

// ---------- Escáner de menú de restaurante ----------
type Dish = { name: string; kcalMin: number; kcalMax: number; pick: 'best' | 'ok' | 'treat'; tip: string };
export function Menu() {
  const { t } = useTranslation(); const { s: st, set } = useStore(); const prem = isPremium(st); const [q, setQ] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ds, setDs] = useState<Dish[]>([]); const [added, setAdded] = useState('');
  const eaten = st.entries.filter((e) => e.date === today()).reduce((a, e) => a + e.kcal, 0); const left = Math.max(0, coachTarget(st).kcal + burnedOn(coachOf(st), today()) - eaten);
  const run = async (body: object) => { setBusy(true); setErr(''); setDs([]); try { const o = await post('/vision', { mode: 'menu', lang: curLang(), left, ...body }); setDs(o.dishes || []); if (!(o.dishes || []).length) setErr(t('p2.mnNone')); } catch { setErr(t('p2.err')); } finally { setBusy(false); } };
  const photo = async () => { const p = await pickPhoto(true); if (p) run({ image: p.b64, mime: p.mime }); };
  const col = { best: C.success, ok: C.secondary, treat: C.warning };
  if (!prem) return <Screen title={`📋 ${t('p2.t.menu')}`}><Locked k="p2.mnLocked" /></Screen>;
  return <Screen title={`📋 ${t('p2.t.menu')}`}>
    <Card><T>{t('p2.mnLeft', { kcal: fmtNum(left) })}</T><Btn label={`📸 ${t('p2.mnPhoto')}`} onPress={photo} /></Card>
    <Card><TextInput testID="menu-text" style={[s.input, { minHeight: 90, textAlignVertical: 'top' }]} multiline value={q} onChangeText={setQ} placeholder={t('p2.mnPh')} />
      <Btn kind="secondary" label={busy ? '…' : `✨ ${t('p2.mnGo')}`} onPress={() => q.trim() && run({ text: q })} /></Card>
    {busy ? <T>⏳ {t('p2.thinking')}</T> : null}{err ? <Text style={{ color: C.primary, fontWeight: '800' }}>{err}</Text> : null}
    {[...ds].sort((a, b) => ['best', 'ok', 'treat'].indexOf(a.pick) - ['best', 'ok', 'treat'].indexOf(b.pick)).map((d) => <Card key={d.name} testID="dish" style={{ borderLeftWidth: 8, borderLeftColor: col[d.pick] }}>
      <Text style={[s.muted, { fontWeight: '900', color: col[d.pick] }]}>{t('p2.pick.' + d.pick)}</Text><CardTitle>{d.name}</CardTitle><T>{fmtNum(d.kcalMin)}–{fmtNum(d.kcalMax)} {t('u.kcal')}</T><Text style={s.muted}>💡 {d.tip}</Text>
      {added === d.name ? <Text style={{ color: C.success, fontWeight: '800' }}>✓ {t('p2.vSaved')}</Text> : <Btn small kind="ghost" label={`＋ ${t('p2.toDiary')}`} onPress={() => { set((x) => ({ ...x, entries: [...x.entries, { id: uid(), date: today(), time: Date.now(), name: d.name, kcal: Math.round((d.kcalMin + d.kcalMax) / 2), p: 0, c: 0, f: 0, source: 'manual' }] })); setAdded(d.name); }} />}</Card>)}
    <Disclaimer /></Screen>;
}

// ---------- Modo antojo ----------
export const CRAVINGS = [['pizza', 850, 380], ['icecream', 270, 120], ['chocolate', 540, 170], ['fries', 480, 160], ['soda', 210, 15], ['sweetbread', 420, 190], ['burger', 750, 420], ['chips', 300, 120]] as const;
export function Craving() {
  const { t } = useTranslation(); const { set } = useStore(); const [sel, setSel] = useState(''); const [added, setAdded] = useState(false);
  const c = CRAVINGS.find((x) => x[0] === sel);
  return <Screen title={`🍫 ${t('p2.t.craving')}`}>
    <IconCard icon="🍫" title={t('p2.t.craving')} sub={t('p2.crHow')}>
    <View style={[s.row, { flexWrap: 'wrap' }]}>{CRAVINGS.map(([k]) => <Chip key={k} label={t(`p2.cr.${k}.n`)} active={sel === k} onPress={() => { setSel(k); setAdded(false); }} />)}</View></IconCard>
    {!c ? <Card><EmptyState image={FOOD.fruit} title={t('p2.crHow')} /></Card> : null}
    {c ? <Card testID="swap" style={{ backgroundColor: C.tint }}><CardTitle>✨ {t(`p2.cr.${c[0]}.s`)}</CardTitle>
      <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1, gap: 4 }}><Text style={s.muted}>{t(`p2.cr.${c[0]}.n`)}</Text><Bar value={c[1]} max={c[1]} color={C.primary} /><Text style={{ fontWeight: '900', color: C.primary }}>{c[1]} kcal</Text></View>
        <View style={{ flex: 1, gap: 4 }}><Text style={s.muted}>✨</Text><Bar value={c[2]} max={c[1]} color={C.success} /><Text style={{ fontWeight: '900', color: C.success }}>{c[2]} kcal</Text></View></View>
      <T>{t('p2.crSave', { a: c[1], b: c[2], d: c[1] - c[2] })}</T><Text style={s.muted}>{t('p2.crKind')}</Text>
      {added ? <Text style={{ color: C.success, fontWeight: '800' }}>✓ {t('p2.vSaved')}</Text> : <Btn small label={`＋ ${t('p2.toDiary')}`} onPress={() => { set((x) => ({ ...x, entries: [...x.entries, { id: uid(), date: today(), time: Date.now(), name: t(`p2.cr.${c[0]}.s`), kcal: c[2], p: 0, c: 0, f: 0, source: 'manual' }] })); setAdded(true); }} />}</Card> : null}
    <Note k="p2.crNote" /></Screen>;
}

// ---------- Sueño y estrés ----------
export type Sleep = { date: string; h: number; stress: number };
export function SleepStress() {
  const { t } = useTranslation(); const [log, setLog] = useExt<Sleep[]>('sleep', []); const cur = log.find((x) => x.date === today()) || { date: today(), h: 7, stress: 2 };
  const up = (p: Partial<Sleep>) => setLog((v) => [...v.filter((x) => x.date !== today()), { ...cur, ...p }].slice(-60));
  const week = Array.from({ length: 7 }, (_, i) => dayStr(6 - i)).map((d) => log.find((x) => x.date === d));
  const avg = week.filter(Boolean) as Sleep[]; const ah = avg.length ? avg.reduce((a, x) => a + x.h, 0) / avg.length : 0;
  const tip = cur.stress >= 4 ? 'slTipStress' : cur.h < 6 ? 'slTipShort' : 'slTipGood';
  return <Screen title={`😴 ${t('p2.t.sleep')}`}>
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}><Ring value={cur.h} max={8} size={120} stroke={13}><Text style={{ fontSize: 22 }}>🌙</Text><Text style={{ fontSize: 26, fontWeight: '900', color: C.text }}>{cur.h} h</Text></Ring>
      <View style={{ flex: 1, gap: 8 }}><Text style={s.muted}>{t('p2.slStress')}</Text><View style={{ flexDirection: 'row', gap: 4 }}>{[1, 2, 3, 4, 5].map((n) => <View key={n} style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: n <= cur.stress ? (cur.stress >= 4 ? C.primary : C.secondary) : C.border }} />)}</View>
        {avg.length ? <Text style={s.muted}>{t('p2.slAvg', { h: fmtNum(ah, 1) })}</Text> : null}</View></Card>
    <Card><CardTitle>🌙 {t('p2.slHours')}</CardTitle><View style={[s.row, { flexWrap: 'wrap' }]}>{[4, 5, 6, 7, 8, 9, 10].map((h) => <Chip key={h} label={`${h} h`} active={log.some((x) => x.date === today()) && cur.h === h} onPress={() => up({ h })} />)}</View></Card>
    <Card><CardTitle>🌿 {t('p2.slStress')}</CardTitle><View style={[s.row, { flexWrap: 'wrap' }]}>{[1, 2, 3, 4, 5].map((n) => <Chip key={n} label={t(`p2.st${n}`)} active={log.some((x) => x.date === today()) && cur.stress === n} onPress={() => up({ stress: n })} />)}</View></Card>
    <Card testID="sleep-tip"><CardTitle icon="💡">{t('p2.' + tip)}</CardTitle>{cur.stress >= 4 ? <Btn small kind="secondary" label={`🫁 ${t('p2.slBreath')}`} onPress={() => speak(t('p2.slBreathSay'))} /> : null}</Card>
    <Card><CardTitle>{t('p2.slWeek')}</CardTitle>
      <View style={[s.row, { alignItems: 'flex-end', height: 110, justifyContent: 'space-between' }]}>{week.map((x, i) => <View key={i} style={{ alignItems: 'center', flex: 1 }}>
        <View style={{ width: 22, height: ((x?.h || 0) / 10) * 90, backgroundColor: x && x.h >= 7 ? C.secondary : C.accent, borderRadius: 6 }} /><Text style={s.muted}>{dayStr(6 - i).slice(8)}</Text></View>)}</View>
      {avg.length ? <T>{t('p2.slAvg', { h: fmtNum(ah, 1) })}</T> : null}</Card>
    <Note k="p2.slNote" /></Screen>;
}

// ---------- Avisos inteligentes (dentro de la app) ----------
export type Rem = { water: boolean; meal: boolean; move: boolean; sleep: boolean; checkin: boolean };
const REM0: Rem = { water: true, meal: true, move: true, sleep: true, checkin: true };
export function smartTips(st: State, rem: Rem, sleepLog: Sleep[], hour = new Date().getHours()) {
  const d = today(); const out: { k: string; href: string }[] = []; const co = coachOf(st);
  if (rem.meal && hour >= 11 && !st.entries.some((e) => e.date === d)) out.push({ k: 'meal', href: '/scan' });
  if (rem.water && hour >= 14 && (st.water[d] || 0) < 4) out.push({ k: 'water', href: '/' });
  if (rem.move && hour >= 16 && isPremium(st) && co.plan && !co.plan.workout.days[weekday()].rest && !co.workouts.some((w) => w.date === d)) out.push({ k: 'move', href: '/coach' });
  if (rem.checkin && isPremium(st) && co.plan && nextCheckInDays(co) === 0) out.push({ k: 'checkin', href: '/checkin' });
  if (rem.sleep && hour < 12 && !sleepLog.some((x) => x.date === d)) out.push({ k: 'sleep', href: '/sleep' });
  return out.slice(0, 2);
}
export function SmartTips() {
  const { t } = useTranslation(); const { s: st } = useStore(); const [rem] = useExt<Rem>('rem', REM0); const [sl] = useExt<Sleep[]>('sleep', []);
  const tips = smartTips(st, rem, sl); if (!tips.length) return null;
  return <>{tips.map((x) => <Pressable key={x.k} testID="smart-tip" accessibilityRole="button" onPress={() => router.push(x.href as any)}
    style={{ backgroundColor: C.warnBg, borderRadius: 18, padding: 14, minHeight: 64, justifyContent: 'center' }}><Text style={[s.t, { fontWeight: '700' }]}>🔔 {t('p2.r.' + x.k)}</Text></Pressable>)}</>;
}
export function Reminders() {
  const { t } = useTranslation(); const [rem, setRem] = useExt<Rem>('rem', REM0);
  return <Screen title={`🔔 ${t('p2.t.rem')}`}><InfoNote icon="🔔" text={t('p2.remHow')} />
    {(Object.keys(REM0) as (keyof Rem)[]).map((k, ri) => <Card key={k}><CardTitle icon={({ water: '💧', meal: '🍽️', move: '🚶', sleep: '😴', checkin: '⚖️' } as Record<string, string>)[k] ?? '🔔'}>{t('p2.rn.' + k)}</CardTitle>
      <Row><Chip label={`✓ ${t('p2.on')}`} active={rem[k]} onPress={() => setRem((v) => ({ ...v, [k]: true }))} /><Chip label={t('p2.off')} active={!rem[k]} onPress={() => setRem((v) => ({ ...v, [k]: false }))} /></Row></Card>)}
    <Note k="p2.remNote" /></Screen>;
}

// ---------- Puntos y recompensas ----------
export function points(st: State, w: number, sl: number) {
  const co = coachOf(st); return st.entries.length * 5 + Object.values(st.water).reduce((a, n) => a + n, 0) + st.challengeDays.length * 10 + co.workouts.length * 20 + w * 5 + sl * 3;
}
export const REWARDS = [{ k: 'cap', at: 50, icon: '🧢' }, { k: 'glasses', at: 150, icon: '🕶️' }, { k: 'medal', at: 300, icon: '🏅' }, { k: 'crown', at: 600, icon: '👑' }] as const;
export function usePoints() { const { s: st } = useStore(); const [ws] = useWeights(); const [sl] = useExt<Sleep[]>('sleep', []); return points(st, ws.length, sl.length); }
export function Points() {
  const { t } = useTranslation(); const pts = usePoints(); const lvl = Math.floor(pts / 100) + 1;
  return <Screen title={`🏆 ${t('p2.t.points')}`}>
    <Card style={{ alignItems: 'center', backgroundColor: C.secondary }}><Text testID="pts" style={{ fontSize: 52, fontWeight: '900', color: C.white }}>{fmtNum(pts)}</Text><Text style={[s.h2, { color: C.white }]}>{t('p2.ptLevel', { n: lvl })}</Text></Card>
    <Card><Bar value={pts % 100} max={100} color={C.accent} /><T>{t('p2.ptNext', { n: 100 - (pts % 100) })}</T></Card>
    <Card><CardTitle>{t('p2.ptHow')}</CardTitle><T>{t('p2.ptRules')}</T></Card>
    <Card><CardTitle>🎁 {t('p2.ptRewards')}</CardTitle>{REWARDS.map((r) => <T key={r.k}>{pts >= r.at ? '✅' : '🔒'} {r.icon} {t('p2.rw.' + r.k)} · {r.at} {t('p2.pts')}</T>)}
      <Btn small kind="ghost" label={`🙂 ${t('p2.t.avatar')}`} onPress={() => router.push('/avatar')} /></Card></Screen>;
}

// ---------- Resumen semanal en voz ----------
export function weekSummary(st: State, ws: W[], sl: Sleep[]) {
  const days = Array.from({ length: 7 }, (_, i) => dayStr(i)); const co = coachOf(st);
  const logged = days.filter((d) => st.entries.some((e) => e.date === d));
  const avgK = logged.length ? Math.round(logged.reduce((a, d) => a + st.entries.filter((e) => e.date === d).reduce((x, e) => x + e.kcal, 0), 0) / logged.length) : 0;
  const water = Math.round((days.reduce((a, d) => a + (st.water[d] || 0), 0) / 7) * 10) / 10;
  const wk = co.workouts.filter((w) => days.includes(w.date)); const burned = Math.round(wk.reduce((a, w) => a + w.kcal, 0));
  const wIn = ws.filter((w) => days.includes(w.date)); const dW = wIn.length >= 2 ? Math.round((wIn[wIn.length - 1].kg - wIn[0].kg) * 10) / 10 : null;
  const sIn = sl.filter((x) => days.includes(x.date)); const sh = sIn.length ? Math.round((sIn.reduce((a, x) => a + x.h, 0) / sIn.length) * 10) / 10 : null;
  return { logged: logged.length, avgK, target: coachTarget(st).kcal, water, workouts: wk.length, burned, dW, sh };
}
export function Weekly() {
  const { t } = useTranslation(); const { s: st } = useStore(); const prem = isPremium(st); const [ws] = useWeights(); const [sl] = useExt<Sleep[]>('sleep', []);
  const w = weekSummary(st, ws, sl);
  const lines = [t('p2.wkLogged', { n: w.logged }), w.logged ? t('p2.wkKcal', { a: fmtNum(w.avgK), b: fmtNum(w.target) }) : '', t('p2.wkWater', { n: fmtNum(w.water, 1) }),
    t('p2.wkMove', { n: w.workouts, k: fmtNum(w.burned) }), w.dW !== null ? t('p2.wkWeight', { d: (w.dW > 0 ? '+' : '') + fmtNum(w.dW, 1) }) : '', w.sh !== null ? t('p2.wkSleep', { h: fmtNum(w.sh, 1) }) : '', t(w.logged >= 5 ? 'p2.wkCheer1' : 'p2.wkCheer2')].filter(Boolean);
  return <Screen title={`🗣️ ${t('p2.t.weekly')}`}>
    {!prem ? <Locked k="p2.wkLocked" /> : <><Card testID="weekly">{lines.map((l, i) => <T key={i}>• {l}</T>)}</Card>
      <Btn label={`🔊 ${t('p2.wkPlay')}`} onPress={() => speak(lines.join(' '))} /></>}
  </Screen>;
}

// ---------- Avatar 2D (clon inicial) ----------
export type Av = { skin: number; hair: number; shirt: number; acc: string };
const SKIN = ['#F7D7C4', '#E9B48A', '#C68642', '#8D5524'], HAIR = ['#1A1423', '#6B3E26', '#B45309', '#9CA3AF'], SHIRT = [C.primary, C.secondary, C.accent, C.success];
export function AvatarSvg({ av, size = 180, happy = true }: { av: Av; size?: number; happy?: boolean }) {
  return <Svg width={size} height={size * 1.25} viewBox="0 0 160 200" testID="avatar">
    <Ellipse cx={80} cy={194} rx={46} ry={6} fill="#0002" />
    <Rect x={38} y={102} width={84} height={86} rx={30} fill={SHIRT[av.shirt]} />
    <Circle cx={80} cy={62} r={38} fill={SKIN[av.skin]} />
    <Path d="M42 58 Q46 18 80 20 Q114 18 118 58 Q104 38 80 38 Q56 38 42 58Z" fill={HAIR[av.hair]} />
    <Circle cx={66} cy={64} r={4.5} fill="#1A1423" /><Circle cx={94} cy={64} r={4.5} fill="#1A1423" />
    <Path d={happy ? 'M64 80 Q80 94 96 80' : 'M66 84 L94 84'} stroke="#1A1423" strokeWidth={4} fill="none" strokeLinecap="round" />
    {av.acc === 'cap' ? <Path d="M40 44 Q80 4 120 44 L130 46 L40 46Z" fill={C.primary} /> : null}
    {av.acc === 'glasses' ? <><Circle cx={66} cy={64} r={11} stroke="#1A1423" strokeWidth={3} fill="none" /><Circle cx={94} cy={64} r={11} stroke="#1A1423" strokeWidth={3} fill="none" /><Line x1={77} y1={64} x2={83} y2={64} stroke="#1A1423" strokeWidth={3} /></> : null}
    {av.acc === 'medal' ? <><Path d="M72 104 L80 124 L88 104" stroke={C.secondary} strokeWidth={4} fill="none" /><Circle cx={80} cy={130} r={9} fill={C.accent} /></> : null}
    {av.acc === 'crown' ? <Path d="M52 30 L62 8 L72 24 L80 4 L88 24 L98 8 L108 30Z" fill={C.accent} /> : null}
  </Svg>;
}
export const AV0: Av = { skin: 1, hair: 0, shirt: 0, acc: '' };
export function Avatar() {
  const { t } = useTranslation(); const { s: st } = useStore(); const prem = isPremium(st); const [av, setAv] = useExt<Av>('avatar', AV0); const pts = usePoints();
  const d = today(); const eaten = st.entries.some((e) => e.date === d) || (st.water[d] || 0) > 0;
  const say = () => speak(eaten ? t('p2.avSayGood') : t('p2.avSayStart'));
  return <Screen title={`🙂 ${t('p2.t.avatar')}`}>
    <Card style={{ alignItems: 'center', backgroundColor: C.tint }}><AvatarSvg av={av} /><T style={{ textAlign: 'center' }}>{eaten ? t('p2.avSayGood') : t('p2.avSayStart')}</T>
      <Btn small kind="ghost" label="🔊" a11y={t('home.readAloud')} onPress={say} style={{ width: 64 }} /></Card>
    {!prem ? <Locked k="p2.avLocked" /> : <>
      <Card><CardTitle>{t('p2.avSkin')}</CardTitle><Row>{SKIN.map((c, i) => <Pressable key={c} accessibilityRole="button" accessibilityLabel={`${t('p2.avSkin')} ${i + 1}`} onPress={() => setAv((v) => ({ ...v, skin: i }))} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c, borderWidth: av.skin === i ? 4 : 0, borderColor: C.secondary }} />)}</Row>
        <CardTitle>{t('p2.avHair')}</CardTitle><Row>{HAIR.map((c, i) => <Pressable key={c} accessibilityRole="button" accessibilityLabel={`${t('p2.avHair')} ${i + 1}`} onPress={() => setAv((v) => ({ ...v, hair: i }))} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c, borderWidth: av.hair === i ? 4 : 0, borderColor: C.primary }} />)}</Row>
        <CardTitle>{t('p2.avShirt')}</CardTitle><Row>{SHIRT.map((c, i) => <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${t('p2.avShirt')} ${i + 1}`} onPress={() => setAv((v) => ({ ...v, shirt: i }))} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c, borderWidth: av.shirt === i ? 4 : 0, borderColor: C.text }} />)}</Row></Card>
      <Card><CardTitle>🎁 {t('p2.ptRewards')}</CardTitle><Row><Chip label={t('p2.avNone')} active={!av.acc} onPress={() => setAv((v) => ({ ...v, acc: '' }))} />
        {REWARDS.map((r) => <Chip key={r.k} label={`${pts >= r.at ? r.icon : '🔒'} ${t('p2.rw.' + r.k)}`} active={av.acc === r.k} onPress={() => pts >= r.at && setAv((v) => ({ ...v, acc: r.k }))} />)}</Row></Card></>}
    <Btn kind="secondary" label={`🧍 ${t('p2.avTwin')}`} onPress={() => router.push('/twin')} />
    <Note k="p2.avNote" /></Screen>;
}

// ---------- Opiniones (las lee la IA Programadora) ----------
export type Fb = { id: string; text: string; at: number };
export function FeedbackBox() {
  const { t } = useTranslation(); const [fb, setFb] = useExt<Fb[]>('feedback', []); const [q, setQ] = useState(''); const [ok, setOk] = useState(false);
  return <Card><CardTitle>💌 {t('p2.fbTitle')}</CardTitle><TextInput testID="fb" style={s.input} value={q} onChangeText={(v) => { setQ(v); setOk(false); }} placeholder={t('p2.fbPh')} />
    <Btn small label={t('p2.fbSave')} onPress={() => { if (!q.trim()) return; setFb((v) => [...v, { id: uid(), text: q.trim().slice(0, 300), at: Date.now() }].slice(-50)); setQ(''); setOk(true); }} />
    {ok ? <Text style={{ color: C.success, fontWeight: '800' }}>✓ {t('p2.fbOk')}</Text> : null}<Text style={s.muted}>{t('p2.fbNote')}</Text></Card>;
}

// ---------- IA Programadora v1 (Panel del Fundador) ----------
type Prop = { id: string; title: string; why: string; change: string; risk: 'low' | 'medium'; status: 'proposed' | 'approved' | 'rejected'; src: 'ai' | 'rules' };
const SAMPLE_FB = ['La foto tarda mucho a veces', 'Quiero más recetas venezolanas', 'Letra más grande en el diario'];
export function devMetrics(st: State) {
  const days = Array.from({ length: 7 }, (_, i) => dayStr(i));
  return { activeDays7: days.filter((d) => st.entries.some((e) => e.date === d)).length, entries: st.entries.length, photoAI: Object.values(st.aiPhotos).reduce((a, n) => a + n, 0),
    voiceOrManual: st.entries.filter((e) => e.source === 'manual').length, barcode: st.entries.filter((e) => e.source === 'barcode').length, workouts: coachOf(st).workouts.length, premium: isPremium(st) };
}
export function rulesProposals(m: ReturnType<typeof devMetrics>, fb: string[]): Omit<Prop, 'id' | 'status'>[] {
  const out: Omit<Prop, 'id' | 'status'>[] = []; const all = fb.join(' ').toLowerCase();
  if (/lent|tarda|slow/.test(all)) out.push({ title: 'p2.dr.fastT', why: 'p2.dr.fastW', change: 'p2.dr.fastC', risk: 'low', src: 'rules' });
  if (/letra|grande|font|big/.test(all)) out.push({ title: 'p2.dr.fontT', why: 'p2.dr.fontW', change: 'p2.dr.fontC', risk: 'low', src: 'rules' });
  if (m.activeDays7 < 3) out.push({ title: 'p2.dr.retT', why: 'p2.dr.retW', change: 'p2.dr.retC', risk: 'low', src: 'rules' });
  return out;
}
export function DevAI() {
  const { t } = useTranslation(); const { s: st } = useStore(); const [fb] = useExt<Fb[]>('feedback', []); const [props, setProps] = useExt<Prop[]>('devq', []); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const m = devMetrics(st); const texts = fb.length ? fb.map((f) => f.text) : SAMPLE_FB;
  const analyze = async () => { setBusy(true); setErr(''); let list: Omit<Prop, 'id' | 'status'>[] = [];
    try { const o = await post('/dev', { lang: curLang(), data: { feedback: texts.slice(-20), metrics: m } }, 40000); list = (o.proposals || []).map((x: any) => ({ ...x, src: 'ai' })); }
    catch { setErr(t('p2.devOffline')); list = rulesProposals(m, texts).map((x) => ({ ...x, title: t(x.title), why: t(x.why), change: t(x.change) })); }
    setProps((v) => [...v.filter((x) => x.status !== 'proposed'), ...list.map((x) => ({ ...x, id: uid(), status: 'proposed' as const }))].slice(-20)); setBusy(false); };
  const decide = (id: string, status: Prop['status']) => setProps((v) => v.map((x) => (x.id === id ? { ...x, status } : x)));
  return <Card testID="devai"><CardTitle>🤖 {t('p2.devTitle')}</CardTitle><Text style={s.muted}>{t('p2.devSub')}</Text>
    <T>📊 {t('p2.devMetrics', { a: m.activeDays7, e: m.entries, w: m.workouts })}</T>
    <T>💌 {t('p2.devFb', { n: fb.length })}{fb.length ? '' : ' · ' + t('x.example')}</T>
    <Btn kind="secondary" label={busy ? '…' : `🔍 ${t('p2.devGo')}`} onPress={analyze} />{err ? <Text style={s.muted}>{err}</Text> : null}
    {props.map((p) => <View key={p.id} testID="dev-prop" style={{ gap: 6, borderTopWidth: 1, borderColor: C.border, paddingTop: 8 }}>
      <Text style={[s.t, { fontWeight: '900' }]}>{p.title} · {t('p2.risk.' + p.risk)}</Text><Text style={s.muted}>{p.why}</Text><T>➜ {p.change}</T>
      {p.status === 'proposed' ? <View style={s.row}><Btn label={t('fo.approve')} onPress={() => decide(p.id, 'approved')} style={{ flex: 1, backgroundColor: C.success }} /><Btn kind="danger" label={t('fo.reject')} onPress={() => decide(p.id, 'rejected')} style={{ flex: 1 }} /></View>
        : <Text testID="dev-status" style={{ fontWeight: '900', color: p.status === 'approved' ? C.success : C.primary }}>{p.status === 'approved' ? `✓ ${t('p2.devQueued')}` : '✕ ' + t('fo.rejected')}</Text>}</View>)}
    <Text style={s.muted}>🔒 {t('p2.devNever')}</Text></Card>;
}

