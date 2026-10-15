/** Pantallas de las 5 funciones (ver src/mfp5.ts). Botones grandes, una mano, 13 idiomas. */
import { useState } from 'react';
import { View, Text, TextInput, Platform, Pressable, Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Circle } from 'react-native-svg';
import { Screen, Card, Btn, Chip, T, s, Ring, IconCard, IconTile, StatRow, EmptyState, H2, CardTitle } from './ui';
import { C } from './theme';
import { useStore, today, uid, type Entry } from './store';
import { fmtNum, fmtDate } from './i18n';
import { coachTarget, coachOf, isPremium, rulesPlan, DEFAULT_PREFS, type Prefs } from './coach';
import { useNames, dayName, Row } from './coach-ui';
import { Note } from './ext';
import { useWeights } from './p2';
import { dayGoals, mealGoals, kcalOf, clampG, SLOTS, SHARE, type Macro, slotOf, netCarbs, hhmm, parseTime, totals, copyEntries, quickEntry,
  mondayOf, dayOfWeek, grocery, groceryText, mealFiber, parseHealthFile, mergeHealth, EMPTY_HEALTH, type Prep } from './mfp5';
import { nativeAdapter, sourceName } from './healthsync';

const MCOL = { p: C.protein, c: C.carbs, f: C.fat };
/** Anillo de un macro (gramos comidos / meta). */
export function MacroRing({ k, v, max, label, testID }: { k: 'p' | 'c' | 'f'; v: number; max: number; label: string; testID?: string }) {
  const size = 96, st = 10, r = (size - st) / 2, circ = 2 * Math.PI * r, pct = Math.min(1, max ? v / max : 0);
  return <View testID={testID} style={{ alignItems: 'center', flex: 1 }} accessible accessibilityLabel={`${label} ${Math.round(v)} / ${Math.round(max)} g`}>
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.border} strokeWidth={st} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={v > max * 1.1 ? C.warning : MCOL[k]} strokeWidth={st} fill="none" strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <Text style={{ fontSize: 20, fontWeight: '900', color: C.text }}>{fmtNum(v)}</Text>
      <Text style={[s.muted, { fontSize: 13 }]}>/ {fmtNum(max)} g</Text>
    </View>
    <Text style={{ fontWeight: '800', color: C.text, fontSize: 15, marginTop: 2 }}>{label}</Text>
  </View>;
}
/** Tarjeta de inicio: 3 anillos + netos + pasos importados. */
export function MacroRings() {
  const { t } = useTranslation(); const { s: st } = useStore(); const d = today();
  const g = dayGoals(st); const sum = totals(st.entries.filter((e) => e.date === d)); const net = !!st.macros?.net;
  const steps = st.health?.steps?.[d];
  return <Card testID="macro-rings">
    <View style={s.row}>
      <MacroRing testID="ring-p" k="p" v={sum.p} max={g.p} label={t('home.protein')} />
      <MacroRing testID="ring-c" k="c" v={net ? sum.net : sum.c} max={g.c} label={net ? t('mf.net') : t('home.carbs')} />
      <MacroRing testID="ring-f" k="f" v={sum.f} max={g.f} label={t('home.fat')} />
    </View>
    <Text testID="home-net" style={[s.muted, { textAlign: 'center' }]}>{t('mf.netLine', { net: fmtNum(sum.net), fiber: fmtNum(sum.fiber) })}{steps ? ` · 👣 ${fmtNum(steps)}` : ''}</Text>
    <Row><Btn small kind="ghost" testID="go-macros" label={`🎯 ${t('mf.goals')}`} onPress={() => router.push('/macros')} /><Btn small kind="ghost" testID="go-quick" label={`⚡ ${t('mf.quick')}`} onPress={() => router.push('/quickadd')} /></Row>
  </Card>;
}

function Stepper({ label, value, onChange, step = 5, testID, color }: { label: string; value: number; onChange: (n: number) => void; step?: number; testID: string; color?: string }) {
  const { t } = useTranslation();
  return <View style={[s.row, { justifyContent: 'space-between' }]}>
    <Text style={{ fontSize: 18, fontWeight: '800', color: color || C.text, flex: 1 }}>{label}</Text>
    <Btn small kind="ghost" label="−" a11y={`${t('mf.less')} ${label}`} testID={testID + '-minus'} onPress={() => onChange(clampG(value - step))} style={{ width: 56 }} />
    <TextInput testID={testID} accessibilityLabel={label} keyboardType="numeric" inputMode="numeric" value={String(value)} onChangeText={(x) => onChange(clampG(parseInt(x.replace(/\D/g, '') || '0', 10)))}
      style={[s.input, { width: 80, textAlign: 'center', fontSize: 20, fontWeight: '800' }]} />
    <Btn small kind="ghost" label="+" a11y={`${t('mf.more')} ${label}`} testID={testID + '-plus'} onPress={() => onChange(clampG(value + step))} style={{ width: 56 }} />
  </View>;
}
const Locked = ({ k }: { k: string }) => { const { t } = useTranslation(); return <Card testID="locked" style={{ backgroundColor: C.secondary }}>
  <Text style={[s.h2, { color: C.white }]}>🔒 {t('p2.lockT')}</Text><Text style={[s.t, { color: C.white }]}>{t(k)}</Text>
  <Btn kind="accent" label={`⭐ ${t('coach.unlock')}`} onPress={() => router.push('/paywall')} /></Card>; };

// ---------- 1) Metas de macros ----------
export function MacrosScreen() {
  const { t } = useTranslation(); const { s: st, set } = useStore(); const prem = isPremium(st);
  const g = dayGoals(st); const [day, setDay] = useState<Macro>({ p: g.p, c: g.c, f: g.f }); const [meals, setMeals] = useState<Macro[]>(mealGoals(st));
  const [net, setNet] = useState(!!st.macros?.net); const [msg, setMsg] = useState('');
  const slots = t('coach.slots4') as unknown as string[]; const rec = coachTarget(st);
  const spread = (d: Macro) => SHARE.map((k) => ({ p: Math.round(d.p * k), c: Math.round(d.c * k), f: Math.round(d.f * k) }));
  const setD = (d: Macro) => { setDay(d); setMeals(spread(d)); setMsg(''); };
  const sumM = meals.reduce((a, m) => ({ p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }), { p: 0, c: 0, f: 0 });
  const save = () => { set((x) => ({ ...x, macros: { day, meals: prem ? meals : undefined, net } })); setMsg(t('mf.saved')); };
  return <Screen title={`🎯 ${t('mf.goals')}`}>
    <Card><View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>{(['p', 'c', 'f'] as const).map((k) => { const kc = day[k] * (k === 'f' ? 9 : 4); const tot = Math.max(1, kcalOf(day)); return <View key={k} style={{ alignItems: 'center', gap: 6 }}>
      <Ring value={kc} max={tot} size={96} stroke={11} colors={[MCOL[k], MCOL[k]]}><Text style={{ fontSize: 20, fontWeight: '900', color: C.text }}>{day[k]}</Text><Text style={[s.muted, { fontSize: 12 }]}>g</Text></Ring>
      <Text style={{ fontWeight: '800', color: MCOL[k] }}>{t(k === 'p' ? 'home.protein' : k === 'c' ? 'home.carbs' : 'home.fat')}</Text><Text style={[s.muted, { fontSize: 13 }]}>{Math.round((kc / tot) * 100)}%</Text></View>; })}</View></Card>
    <IconCard icon="🎯" title={t('mf.perDay')} sub={`${fmtNum(kcalOf(day))} ${t('u.kcal')}`}>
      <Stepper testID="g-p" label={t('home.protein')} color={C.protein} value={day.p} onChange={(p) => setD({ ...day, p })} />
      <Stepper testID="g-c" label={t('home.carbs')} color={C.carbs} value={day.c} onChange={(c) => setD({ ...day, c })} />
      <Stepper testID="g-f" label={t('home.fat')} color={C.fat} value={day.f} onChange={(f) => setD({ ...day, f })} />
      <Text testID="g-kcal" style={[s.t, { fontWeight: '800' }]}>= {fmtNum(kcalOf(day))} {t('u.kcal')}</Text>
      {kcalOf(day) < 1000 ? <Text testID="g-low" style={{ color: C.warning, fontWeight: '800' }}>⚠️ {t('mf.low')}</Text> : null}
      <Btn small kind="ghost" testID="g-reset" label={`↺ ${t('mf.recommended', { p: rec.p, c: rec.c, f: rec.f })}`} onPress={() => setD({ p: rec.p, c: rec.c, f: rec.f })} />
    </IconCard>
    <Card><Pressable testID="g-net" accessibilityRole="switch" accessibilityState={{ checked: net }} onPress={() => setNet(!net)} style={[s.row, { minHeight: 56 }]}>
      <Text style={{ fontSize: 28 }}>{net ? '☑' : '☐'}</Text><View style={{ flex: 1 }}><T style={{ fontWeight: '800' }}>{t('mf.useNet')}</T><Text style={s.muted}>{t('mf.netHow')}</Text></View></Pressable></Card>
    <H2>{t('mf.perMeal')}</H2>
    {!prem ? <Locked k="mf.mealLocked" /> : <>
      {meals.map((m, i) => <Card key={i} testID={`meal-goal-${i}`}><View style={[s.row, { gap: 12 }]}><IconTile icon={['🌅', '☀️', '🍎', '🌙'][i] ?? '🍽️'} size={42} /><Text style={[s.h2, { flex: 1 }]}>{slots[i]} · {fmtNum(kcalOf(m))} {t('u.kcal')}</Text></View>
        {(['p', 'c', 'f'] as const).map((k) => <Stepper key={k} testID={`m${i}-${k}`} label={t(k === 'p' ? 'home.protein' : k === 'c' ? 'home.carbs' : 'home.fat')} color={MCOL[k]} value={m[k]}
          onChange={(v) => setMeals(meals.map((x, j) => (j === i ? { ...x, [k]: v } : x)))} />)}</Card>)}
      <Text testID="meal-sum" style={[s.muted, { fontWeight: '700' }]}>{t('mf.mealSum', { p: sumM.p, c: sumM.c, f: sumM.f, dp: day.p, dc: day.c, df: day.f })}</Text></>}
    <Btn testID="g-save" label={`✓ ${t('save')}`} onPress={save} />
    {msg ? <Text testID="g-msg" style={{ color: C.success, fontWeight: '800', fontSize: 17 }}>✓ {msg}</Text> : null}
    <Note k="mf.notMedical" /></Screen>;
}

// ---------- 3) Añadir rápido ----------
export function QuickAddScreen() {
  const { t } = useTranslation(); const { set } = useStore(); const prm = useLocalSearchParams<{ date?: string }>(); const d = prm.date || today();
  const [v, setV] = useState({ kcal: 0, p: 0, c: 0, f: 0, fiber: 0 }); const [meal, setMeal] = useState(-1); const [name, setName] = useState(''); const [msg, setMsg] = useState('');
  const slots = t('coach.slots4') as unknown as string[]; const auto = new Date().getHours(); const m = meal >= 0 ? meal : auto < 11 ? 0 : auto < 16 ? 1 : auto < 19 ? 2 : 3;
  const est = v.kcal || kcalOf(v);
  const add = () => { const e = quickEntry({ ...v, meal: m, name: name || t('mf.quickName') }, d); if (!e) { setMsg(t('mf.quickEmpty')); return; } set((x) => ({ ...x, entries: [...x.entries, e] })); setMsg(t('mf.quickOk', { kcal: e.kcal })); setV({ kcal: 0, p: 0, c: 0, f: 0, fiber: 0 }); setName(''); };
  return <Screen title={`⚡ ${t('mf.quick')}`}>
    <Card><Text style={s.muted}>{t('mf.quickHow')}</Text>
      <Row>{slots.map((l, i) => <Chip key={i} label={l} active={i === m} onPress={() => setMeal(i)} />)}</Row>
      <TextInput testID="q-name" accessibilityLabel={t('mf.name')} placeholder={t('mf.name')} value={name} onChangeText={setName} style={s.input} />
      <Stepper testID="q-kcal" label={t('u.kcal')} step={50} value={v.kcal} onChange={(kcal) => setV({ ...v, kcal: Math.min(5000, kcal * 1) })} />
      <Stepper testID="q-p" label={t('home.protein')} color={C.protein} value={v.p} onChange={(p) => setV({ ...v, p })} />
      <Stepper testID="q-c" label={t('home.carbs')} color={C.carbs} value={v.c} onChange={(c) => setV({ ...v, c })} />
      <Stepper testID="q-fiber" label={t('mf.fiber')} step={1} value={v.fiber} onChange={(fiber) => setV({ ...v, fiber })} />
      <Stepper testID="q-f" label={t('home.fat')} color={C.fat} value={v.f} onChange={(f) => setV({ ...v, f })} />
      <Text testID="q-est" style={[s.t, { fontWeight: '800' }]}>= {fmtNum(est)} {t('u.kcal')}{!v.kcal && est ? ` (${t('mf.fromMacros')})` : ''} · {t('mf.net')} {fmtNum(Math.max(0, v.c - v.fiber))} g</Text>
    </Card>
    <Btn testID="q-add" label={`＋ ${t('mf.addTo', { meal: slots[m] })}`} onPress={add} />
    {msg ? <Card><Text testID="q-msg" style={{ fontWeight: '800', fontSize: 17, color: C.success }}>{msg}</Text><Btn small kind="secondary" label={`📒 ${t('diary.title')}`} onPress={() => router.replace('/diary')} /></Card> : null}
  </Screen>;
}

// ---------- 3) Copiar comidas a otros días ----------
export function CopyScreen() {
  const { t } = useTranslation(); const { s: st, set } = useStore(); const prm = useLocalSearchParams<{ date?: string }>(); const from = prm.date || today();
  const ents = st.entries.filter((e) => e.date === from).sort((a, b) => a.time - b.time);
  const [ids, setIds] = useState<string[]>(ents.map((e) => e.id)); const [days, setDays] = useState<string[]>([]); const [msg, setMsg] = useState('');
  const opts = Array.from({ length: 14 }, (_, i) => { const x = new Date(); x.setDate(x.getDate() - 6 + i); return x; }).filter((x) => today(x) !== from);
  const tog = <V,>(a: V[], v: V) => (a.includes(v) ? a.filter((y) => y !== v) : [...a, v]);
  const slots = t('coach.slots4') as unknown as string[];
  const go = () => { if (!ids.length || !days.length) { setMsg(t('mf.copyPick')); return; } const n = copyEntries(st.entries, ids, days); set((x) => ({ ...x, entries: [...x.entries, ...n] })); setMsg(t('mf.copyOk', { n: ids.length, d: days.length })); setDays([]); };
  return <Screen title={`📋 ${t('mf.copy')}`}>
    <StatRow items={[{ icon: '🍽️', value: ents.length, label: t('mf.copyFrom', { day: fmtDate(new Date(from + 'T12:00')) }) }, { icon: '✅', value: ids.length, label: t('mf.copy') }, { icon: '📅', value: days.length, label: t('mf.copyTo') }]} />
    <H2>{t('mf.copyFrom', { day: fmtDate(new Date(from + 'T12:00')) })}</H2>
    {ents.length === 0 ? <Card><EmptyState icon="📋" title={t('diary.empty')} /></Card> : <Card>
      {slots.map((l, i) => { const es = ents.filter((e) => slotOf(e) === i); if (!es.length) return null; const all = es.every((e) => ids.includes(e.id));
        return <View key={i} style={{ gap: 4 }}>
          <Pressable testID={`cp-meal-${i}`} accessibilityRole="checkbox" accessibilityState={{ checked: all }} onPress={() => setIds(all ? ids.filter((x) => !es.some((e) => e.id === x)) : [...new Set([...ids, ...es.map((e) => e.id)])])} style={[s.row, { minHeight: 48 }]}>
            <Text style={{ fontSize: 24 }}>{all ? '☑' : '☐'}</Text><CardTitle>{l}</CardTitle></Pressable>
          {es.map((e) => <Pressable key={e.id} testID="cp-item" accessibilityRole="checkbox" accessibilityState={{ checked: ids.includes(e.id) }} onPress={() => setIds(tog(ids, e.id))} style={[s.row, { minHeight: 48, paddingLeft: 24 }]}>
            <Text style={{ fontSize: 22 }}>{ids.includes(e.id) ? '☑' : '☐'}</Text><T style={{ flex: 1 }}>{e.name}</T><Text style={s.muted}>{fmtNum(e.kcal)} {t('u.kcal')}</Text></Pressable>)}
        </View>; })}</Card>}
    <H2>{t('mf.copyTo')}</H2>
    <Row>{opts.map((x) => { const d = today(x); return <Chip key={d} label={(d === today() ? t('diary.today') + ' · ' : '') + fmtDate(x)} active={days.includes(d)} onPress={() => setDays(tog(days, d))} />; })}</Row>
    <Btn testID="cp-go" label={`📋 ${t('mf.copyGo', { n: ids.length, d: days.length })}`} onPress={go} />
    {msg ? <Text testID="cp-msg" style={{ fontWeight: '800', fontSize: 17, color: C.success }}>{msg}</Text> : null}
  </Screen>;
}

// ---------- 5) Diario por comidas con hora editable y netos ----------
export function DiaryMeals({ d, ents }: { d: string; ents: Entry[] }) {
  const { t } = useTranslation(); const { s: st, set } = useStore(); const prem = isPremium(st); const mg = mealGoals(st);
  const [edit, setEdit] = useState<string | null>(null); const [txt, setTxt] = useState(''); const [bad, setBad] = useState(false);
  const slots = t('coach.slots4') as unknown as string[]; const ICON: Record<string, string> = { photo: '📸', barcode: '🏷️', manual: '✍️', quick: '⚡' };
  const saveTime = (e: Entry) => { const ms = parseTime(txt, d); if (ms == null) { setBad(true); return; } set((x) => ({ ...x, entries: x.entries.map((y) => (y.id === e.id ? { ...y, time: ms, meal: undefined } : y)) })); setEdit(null); setBad(false); };
  const move = (e: Entry, m: number) => set((x) => ({ ...x, entries: x.entries.map((y) => (y.id === e.id ? { ...y, meal: m } : y)) }));
  return <>{slots.map((l, i) => { const es = ents.filter((e) => slotOf(e) === i).sort((a, b) => a.time - b.time); const sm = totals(es);
    return <View key={i} testID={`meal-${i}`} style={{ gap: 8 }}>
      <View style={[s.row, { justifyContent: 'space-between' }]}><CardTitle>{l}</CardTitle><Text style={[s.muted, { fontWeight: '800' }]}>{fmtNum(sm.kcal)} {t('u.kcal')}</Text></View>
      {prem && es.length ? <Text testID={`meal-${i}-vs`} style={s.muted}>{t('u.p')} {fmtNum(sm.p)}/{mg[i].p} · {t('u.c')} {fmtNum(sm.c)}/{mg[i].c} · {t('u.f')} {fmtNum(sm.f)}/{mg[i].f} g</Text> : null}
      {es.map((e) => <Card key={e.id} testID="entry">
        <View style={[s.row, { alignItems: 'center' }]}>
          <Text style={{ fontSize: 26 }}>{ICON[e.source] || '✍️'}</Text>
          <View style={{ flex: 1 }}><T style={{ fontWeight: '800' }}>{e.name}</T>
            <Text style={s.muted}>{t('u.p')} {fmtNum(e.p)} · {t('u.c')} {fmtNum(e.c)} · {t('u.f')} {fmtNum(e.f)}{e.fiber ? ` · ${t('mf.net')} ${fmtNum(netCarbs(e))}` : ''}</Text></View>
          <Text style={{ fontWeight: '900', fontSize: 18, color: C.primary }}>{fmtNum(e.kcal)}</Text>
        </View>
        {edit === e.id ? <View style={{ gap: 6 }}>
          <View style={s.row}><TextInput testID="time-input" accessibilityLabel={t('mf.time')} value={txt} onChangeText={(x) => { setTxt(x); setBad(false); }} placeholder="08:30" inputMode="numeric" style={[s.input, { width: 110, fontSize: 20, textAlign: 'center' }]} />
            <Btn small testID="time-save" label={`✓ ${t('save')}`} onPress={() => saveTime(e)} /><Btn small kind="ghost" label={t('cancel')} onPress={() => setEdit(null)} /></View>
          {bad ? <Text testID="time-bad" style={{ color: C.primary, fontWeight: '800' }}>{t('mf.timeBad')}</Text> : null}
          <Row>{slots.map((ml, j) => <Chip key={j} label={ml} active={j === slotOf(e)} onPress={() => move(e, j)} />)}</Row>
        </View> : <Row>
          <Btn small kind="ghost" testID="time-btn" a11y={t('mf.changeTime')} label={`🕒 ${hhmm(e.time)}`} onPress={() => { setEdit(e.id); setTxt(hhmm(e.time)); }} />
          <Btn small kind="danger" label={t('diary.remove')} onPress={() => set((x) => ({ ...x, entries: x.entries.filter((y) => y.id !== e.id) }))} />
        </Row>}
      </Card>)}
    </View>; })}</>;
}

// ---------- 4) Preparación semanal + lista de compras ----------
export function MealPrepScreen() {
  const { t } = useTranslation(); const { s: st, set } = useStore(); const prem = isPremium(st); const N = useNames();
  const [d, setD] = useState((new Date().getDay() + 6) % 7); const [msg, setMsg] = useState(''); const [shareTxt, setShareTxt] = useState('');
  const week = mondayOf(); const prep = st.prep?.week === week ? st.prep : undefined;
  const slots = t('coach.slots4') as unknown as string[];
  if (!prem) return <Screen title={`🗓️ ${t('mf.prep')}`}><Locked k="mf.prepLocked" /></Screen>;
  const fill = () => { if (!st.profile) return; const c = coachOf(st); const prefs = { ...DEFAULT_PREFS, ...(c.prefs || {}), meals: 4 } as Prefs;
    const plan = rulesPlan(st.profile, prefs, dayGoals(st).kcal); set((x) => ({ ...x, prep: { week, days: plan.diet.days, checked: [], logged: [] } })); setMsg(t('mf.prepFilled')); };
  const upd = (fn: (p: Prep) => Prep) => set((x) => (x.prep ? { ...x, prep: fn(x.prep) } : x));
  const log = (i: number) => { if (!prep) return; const m = prep.days[d].meals[i]; const date = dayOfWeek(week, d); const id = `${d}-${i}`;
    const [y, mo, dd] = date.split('-').map(Number); const time = new Date(y, mo - 1, dd, [8, 13, 17, 20][i] || 12, 0).getTime();
    set((x) => ({ ...x, entries: [...x.entries, { id: uid(), date, time, name: N.meal(m), kcal: m.kcal, p: m.p, c: m.c, f: m.f, fiber: mealFiber(m), meal: i, source: 'manual' }], prep: x.prep ? { ...x.prep, logged: [...x.prep.logged, id] } : x.prep })); };
  const text = prep ? groceryText(prep, `🛒 ${t('mf.grocery')} · Angie One`, (g) => t(`mf.g.${g}`), (i) => t(`cing.${i}`)) : '';
  const share = async () => { setShareTxt(text); try { if (Platform.OS === 'web') { const n: any = navigator; if (n.share) await n.share({ text }); else { await n.clipboard?.writeText(text); setMsg(t('mf.copied')); } } else await Share.share({ message: text }); } catch { /* cancelado */ } };
  const day = prep?.days[d]; const dk = day ? day.meals.reduce((a, m) => a + m.kcal, 0) : 0;
  return <Screen title={`🗓️ ${t('mf.prep')}`}>
    <Card><T>{t('mf.prepHow')}</T><Btn testID="prep-fill" label={`✨ ${prep ? t('mf.prepRefill') : t('mf.prepFill')}`} onPress={fill} /></Card>
    {msg ? <Text testID="prep-msg" style={{ color: C.success, fontWeight: '800', fontSize: 17 }}>✓ {msg}</Text> : null}
    {prep && day ? <>
      <Row>{[0, 1, 2, 3, 4, 5, 6].map((i) => <Chip key={i} label={dayName(i)} active={i === d} onPress={() => setD(i)} />)}</Row>
      <CardTitle>{dayName(d, true)} · {fmtNum(dk)} {t('u.kcal')}</CardTitle>
      {day.meals.map((m, i) => <Card key={i} testID="prep-meal"><Text style={s.muted}>{slots[m.slot] || slots[i]}</Text><T style={{ fontWeight: '800' }}>{N.meal(m)}</T>
        <Text style={s.muted}>{fmtNum(m.kcal)} {t('u.kcal')} · {t('u.p')} {m.p} · {t('u.c')} {m.c} · {t('u.f')} {m.f} · {t('mf.fiber')} {mealFiber(m)}</Text>
        {prep.logged.includes(`${d}-${i}`) ? <Text style={{ color: C.success, fontWeight: '800' }}>✓ {t('p2.vSaved')}</Text> : <Btn small kind="ghost" testID="prep-log" label={`＋ ${t('p2.toDiary')}`} onPress={() => log(i)} />}</Card>)}
      <CardTitle>🛒 {t('mf.grocery')}</CardTitle>
      <Card testID="grocery">{grocery(prep).map(({ g, items }) => <View key={g} style={{ gap: 2 }}><Text style={[s.h2, { fontSize: 18 }]}>{t(`mf.g.${g}`)}</Text>
        {items.map(([i, n]) => { const on = prep.checked.includes(i); return <Pressable key={i} testID="gro-item" accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => upd((p) => ({ ...p, checked: on ? p.checked.filter((x) => x !== i) : [...p.checked, i] }))} style={[s.row, { minHeight: 48 }]}>
          <Text style={{ fontSize: 24 }}>{on ? '☑' : '☐'}</Text><T style={{ flex: 1, textDecorationLine: on ? 'line-through' : 'none', color: on ? C.muted : C.text } as any}>{t(`cing.${i}`)}</T>{n > 1 ? <Text style={s.muted}>×{n}</Text> : null}</Pressable>; })}</View>)}</Card>
      <Btn testID="gro-share" label={`📤 ${t('mf.share')}`} onPress={share} />
      {shareTxt ? <TextInput testID="gro-text" multiline editable={false} value={shareTxt} style={[s.input, { minHeight: 120, fontSize: 15 }]} /> : null}
    </> : null}
    <Note k="mf.notMedical" /></Screen>;
}

// ---------- 2) Apple Health / Health Connect ----------
export function HealthSyncScreen() {
  const { t } = useTranslation(); const { s: st, set } = useStore(); const [, setW] = useWeights(); const [msg, setMsg] = useState(''); const [err, setErr] = useState(false);
  const h = st.health || EMPTY_HEALTH; const native = nativeAdapter();
  const run = (name: string, txt: string) => { const r = parseHealthFile(name, txt); const n = Object.keys(r.steps).length + r.weights.length + r.workouts.length;
    if (!n) { setErr(true); setMsg(t('mf.hBad')); return; }
    set((x) => ({ ...x, health: mergeHealth(x.health || EMPTY_HEALTH, r) }));
    if (r.weights.length) setW((w) => { const m = new Map(w.map((x) => [x.date, x.kg])); r.weights.forEach((x) => m.set(x.date, x.kg)); return [...m].map(([date, kg]) => ({ date, kg })); });
    setErr(false); setMsg(t('mf.hOk', { s: Object.keys(r.steps).length, w: r.weights.length, x: r.workouts.length })); };
  const pick = () => { if (Platform.OS !== 'web') return; const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xml,.csv,text/xml,text/csv,application/xml';
    inp.onchange = () => { const f = inp.files?.[0]; if (f) f.text().then((x) => run(f.name, x)); }; inp.click(); };
  const last = Object.entries(h.steps).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);
  return <Screen title={`❤️ ${t('mf.health')}`}>
    <Card testID="native-card"><CardTitle>📱 {sourceName()}</CardTitle>
      {native ? <Btn label={t('mf.hConnect')} onPress={async () => { if (await native.requestRead()) run('native.json', ''); }} />
        : <View testID="native-only" style={{ alignSelf: 'flex-start', backgroundColor: C.warnBg, borderColor: C.warning, borderWidth: 2, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: C.warning, fontWeight: '800' }}>📲 {t('mf.phoneOnly')}</Text></View>}
      <Text style={s.muted}>{t('mf.hReads')}</Text></Card>
    <Card><CardTitle>📂 {t('mf.hImport')}</CardTitle><T>{t('mf.hApple')}</T><T>{t('mf.hGoogle')}</T>
      <Btn testID="h-pick" label={`📂 ${t('mf.hPick')}`} onPress={pick} /></Card>
    {msg ? <Card><Text testID="h-msg" style={{ fontWeight: '800', fontSize: 17, color: err ? C.primary : C.success }}>{msg}</Text></Card> : null}
    {last.length || h.workouts.length ? <Card testID="h-data"><CardTitle>{t('mf.hLast')}</CardTitle>
      {last.map(([d, n]) => <Text key={d} style={s.t}>👣 {fmtDate(new Date(d + 'T12:00'))}: {fmtNum(n)}</Text>)}
      {h.workouts.slice(-5).map((w, i) => <Text key={i} style={s.t}>🏃 {fmtDate(new Date(w.date + 'T12:00'))}: {w.type} · {w.min} min{w.kcal ? ` · ${fmtNum(w.kcal)} ${t('u.kcal')}` : ''}</Text>)}
      {h.weights.length ? <Btn small kind="ghost" label={`⚖️ ${t('p2.t.weight')}`} onPress={() => router.push('/weight')} /> : null}
      <Btn small kind="danger" testID="h-clear" label={t('mf.hClear')} onPress={() => { set((x) => ({ ...x, health: undefined })); setMsg(''); }} /></Card> : null}
    <Note k="mf.hPrivacy" /></Screen>;
}
