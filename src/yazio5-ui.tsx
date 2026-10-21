/** Pantallas de las 5 funciones tipo Yazio (ver src/yazio5.ts). Estilo A claro / B oscuro, una mano, 13 idiomas. */
import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, Chip, T, s, Bar, IconCard, IconTile, StatRow, EmptyState, H2, CardTitle, Pill, InfoNote } from './ui';
import { C } from './theme';
import { useStore, today, uid, type Entry } from './store';
import { fmtNum, fmtDate, curLang } from './i18n';
import { coachTarget, safeMin } from './coach';
import { dayName, Row, speak } from './coach-ui';
import { planDelta, weekTargets, weekAvg, type DayPlan, MOODS, FEEL, setWellness, wellnessWeek, NOTE_MAX, DV, VITS, MINS, dayMicro, pctDV, type Micro,
  filterRecipes, stepNext, stepPrev, mmss, MAX_MEALS, cleanMeals, markEaten } from './yazio5';
import { RECIPES, RECIPE_CREDIT, rText } from './recipes-data';

export function useMealNames(): string[] {
  const { t } = useTranslation(); const { s: st } = useStore();
  return st.diaryMeals?.length ? st.diaryMeals : (t('coach.slots4', { returnObjects: true }) as unknown as string[]);
}
export function PlannedRow({ e }: { e: Entry }) {
  const { t } = useTranslation(); const { set } = useStore();
  return <View style={[s.row, { gap: 8 }]}><Pill label={`🗓️ ${t('y5.planned')}`} />
    <Btn small kind="secondary" testID="eat-btn" label={`✓ ${t('y5.ate')}`} onPress={() => set((x) => ({ ...x, entries: x.entries.map((y) => (y.id === e.id ? markEaten(y, today()) : y)) }))} /></View>;
}

// ---------- 1) Calorías por día ----------
export function DayTargetsScreen() {
  const { t } = useTranslation(); const { s: st, set } = useStore();
  const [p, setP] = useState<DayPlan>(st.dayPlan || { mode: 'same', extra: 300, deltas: [0, 0, 0, 0, 0, 0, 0] }); const [msg, setMsg] = useState('');
  const base = coachTarget({ ...st, dayPlan: undefined }).kcal; const min = safeMin(st.profile); const wk = weekTargets(base, p, min); const avg = weekAvg(wk);
  const mx = Math.max(...wk, 1); const modes: DayPlan['mode'][] = ['same', 'weekend', 'alt', 'custom'];
  const bump = (i: number, n: number) => { const d = [...(p.deltas || [0, 0, 0, 0, 0, 0, 0])]; d[i] = Math.max(-800, Math.min(800, (d[i] || 0) + n)); setP({ ...p, deltas: d }); };
  return <Screen title={`📅 ${t('y5.dtTitle')}`}>
    <StatRow items={[{ icon: '🎯', value: fmtNum(base), label: t('y5.base') }, { icon: '📊', value: fmtNum(avg), label: t('y5.avg') }, { icon: '🛡️', value: fmtNum(min), label: t('y5.safeMin') }]} />
    <Card><CardTitle>⚙️ {t('y5.dtMode')}</CardTitle>
      <Row>{modes.map((m) => <Chip key={m} label={t(`y5.m.${m}`)} active={p.mode === m} onPress={() => { setP({ ...p, mode: m }); setMsg(''); }} />)}</Row>
      <Text testID="dt-how" style={s.muted}>{t(`y5.mh.${p.mode}`)}</Text>
      {p.mode === 'weekend' || p.mode === 'alt' ? <Row>{[150, 300, 500].map((n) => <Chip key={n} label={`± ${n}`} active={(p.extra ?? 300) === n} onPress={() => setP({ ...p, extra: n })} />)}</Row> : null}
    </Card>
    <Card testID="dt-week"><CardTitle>🗓️ {t('y5.week')}</CardTitle>
      {wk.map((k, i) => <View key={i} style={{ gap: 4 }}>
        <View style={[s.row, { justifyContent: 'space-between' }]}><Text style={{ fontWeight: '800', color: C.text }}>{dayName(i, true)}</Text>
          {p.mode === 'custom' ? <View style={[s.row, { gap: 6 }]}>
            <Btn small kind="ghost" label="−" testID={`dt-${i}-minus`} a11y={`${t('mf.less')} ${dayName(i, true)}`} style={{ width: 48 }} onPress={() => bump(i, -100)} />
            <Text testID={`dt-${i}`} style={{ fontWeight: '900', color: C.text, minWidth: 64, textAlign: 'center' }}>{fmtNum(k)}</Text>
            <Btn small kind="ghost" label="+" testID={`dt-${i}-plus`} a11y={`${t('mf.more')} ${dayName(i, true)}`} style={{ width: 48 }} onPress={() => bump(i, 100)} />
          </View> : <Text testID={`dt-${i}`} style={{ fontWeight: '900', color: C.text }}>{fmtNum(k)} {t('u.kcal')}</Text>}</View>
        <Bar value={k} max={mx} color={k > base ? C.accent : k < base ? C.secondary : C.primary} /></View>)}
      {Math.abs(avg - base) > 50 ? <InfoNote warn icon="⚖️" text={t('y5.unbalanced', { avg: fmtNum(avg), base: fmtNum(base) })} /> : null}
    </Card>
    <Btn testID="dt-save" label={`✓ ${t('save')}`} onPress={() => { set((x) => ({ ...x, dayPlan: p.mode === 'same' ? undefined : p })); setMsg(t('mf.saved')); }} />
    {msg ? <Text testID="dt-msg" style={{ color: C.success, fontWeight: '800', fontSize: 17 }}>✓ {msg}</Text> : null}
    <InfoNote text={t('y5.dtNote')} /></Screen>;
}
export function DayTargetLine({ d }: { d: Date }) {
  const { t } = useTranslation(); const { s: st } = useStore(); const dl = planDelta(st.dayPlan, d);
  if (!dl) return null; return <Text testID="dt-line" style={{ color: '#fff', opacity: 0.9, fontWeight: '700' }}>📅 {dl > 0 ? '+' : ''}{fmtNum(dl)} {t('u.kcal')} · {t(`y5.m.${st.dayPlan!.mode}`)}</Text>;
}

// ---------- 2) Ánimo, sensaciones y notas ----------
export function WellnessCard({ d }: { d: string }) {
  const { t } = useTranslation(); const { s: st, set } = useStore(); const w = st.wellness?.[d] || {};
  const [note, setNote] = useState(w.note || ''); useEffect(() => setNote(st.wellness?.[d]?.note || ''), [d]);
  const save = (nw: typeof w) => set((x) => ({ ...x, wellness: setWellness(x.wellness, d, { ...(x.wellness?.[d] || {}), ...nw }) }));
  return <IconCard testID="wellness" icon="😊" title={t('y5.wTitle')} sub={t('y5.wSub')}>
    <View style={[s.row, { justifyContent: 'space-between' }]}>{MOODS.map((m, i) => <Pressable key={i} testID={`mood-${i + 1}`} accessibilityRole="button" accessibilityLabel={t(`y5.mood.${i + 1}`)} accessibilityState={{ selected: w.mood === i + 1 }}
      onPress={() => save({ mood: w.mood === i + 1 ? undefined : i + 1 })} style={{ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: w.mood === i + 1 ? C.primarySoft : 'transparent', borderWidth: 2, borderColor: w.mood === i + 1 ? C.primary : C.border }}>
      <Text style={{ fontSize: 28 }}>{m}</Text></Pressable>)}</View>
    <Row>{FEEL.map((f) => { const on = !!w.tags?.includes(f); return <Chip key={f} label={t(`y5.f.${f}`)} active={on} onPress={() => save({ tags: on ? w.tags!.filter((x) => x !== f) : [...(w.tags || []), f] })} />; })}</Row>
    <TextInput testID="w-note" multiline maxLength={NOTE_MAX} accessibilityLabel={t('y5.note')} placeholder={t('y5.notePh')} value={note} onChangeText={setNote} onBlur={() => save({ note })} style={[s.input, { minHeight: 80 }]} />
    <Btn small kind="ghost" testID="w-save" label={`✓ ${t('y5.saveNote')}`} onPress={() => save({ note })} />
  </IconCard>;
}
export function WellnessScreen() {
  const { t } = useTranslation(); const { s: st } = useStore();
  const days = Array.from({ length: 7 }, (_, i) => { const x = new Date(); x.setDate(x.getDate() - i); return today(x); }); const sum = wellnessWeek(st.wellness, days);
  const prev = days.slice(1).filter((d) => st.wellness?.[d]);
  return <Screen title={`😊 ${t('y5.wTitle')}`}>
    <StatRow items={[{ icon: sum.mood ? MOODS[Math.round(sum.mood) - 1] : '—', value: sum.mood ? fmtNum(sum.mood, 1) : '—', label: t('y5.avgMood') }, { icon: '📝', value: sum.days, label: t('y5.daysLogged') }]} />
    {sum.top.length ? <Card testID="w-top"><CardTitle>🔁 {t('y5.top')}</CardTitle><Row>{sum.top.map((k) => <Pill key={k} label={t(`y5.f.${k}`)} />)}</Row></Card> : null}
    <WellnessCard d={today()} />
    <H2>{t('y5.history')}</H2>
    {!prev.length ? <Card><EmptyState icon="📝" title={t('y5.noHistory')} /></Card>
      : prev.map((d) => { const w = st.wellness![d]; return <Card key={d}><Text style={{ fontWeight: '800', color: C.text }}>{w.mood ? MOODS[w.mood - 1] + ' ' : ''}{fmtDate(new Date(d + 'T12:00'))}</Text>
        {w.tags?.length ? <Text style={s.muted}>{w.tags.map((k) => t(`y5.f.${k}`)).join(' · ')}</Text> : null}{w.note ? <T>{w.note}</T> : null}</Card>; })}
    <InfoNote icon="🔒" text={t('y5.wPrivacy')} /></Screen>;
}

// ---------- 3) Vitaminas y minerales ----------
export function MicroPreview({ m }: { m?: Micro }) {
  const { t } = useTranslation(); if (!m) return null; const ks = Object.keys(m).filter((k) => DV[k]).slice(0, 6); if (!ks.length) return null;
  return <View testID="micro-preview" style={{ gap: 2 }}><Text style={{ fontWeight: '800', color: C.text }}>🧪 {t('y5.nTitle')}</Text>
    <Text style={s.muted}>{ks.map((k) => `${t(`y5.n.${k}`)} ${pctDV(k, m[k] || 0)}%`).join(' · ')} {t('y5.dv')}</Text></View>;
}
export function NutrientsScreen() {
  const { t } = useTranslation(); const { s: st } = useStore(); const prm = useLocalSearchParams<{ date?: string }>(); const d = prm.date || today();
  const { sum, known, total } = dayMicro(st.entries.filter((e) => e.date === d) as any);
  const row = (k: string) => { const v = sum[k] || 0; const pc = pctDV(k, v); return <View key={k} testID={`nu-${k}`} style={{ gap: 4 }}>
    <View style={[s.row, { justifyContent: 'space-between' }]}><Text style={{ fontWeight: '800', color: C.text, flex: 1 }}>{t(`y5.n.${k}`)}</Text>
      <Text style={s.muted}>{fmtNum(v, 1)} / {fmtNum(DV[k][0])} {DV[k][1]}</Text><Text style={{ fontWeight: '900', color: k === 'na' && pc > 100 ? C.warning : C.text, minWidth: 52, textAlign: 'right' }}>{pc}%</Text></View>
    <Bar value={Math.min(v, DV[k][0])} max={DV[k][0]} color={k === 'na' ? (pc > 100 ? C.warning : C.secondary) : pc >= 100 ? C.success : C.primary} /></View>; };
  return <Screen title={`🧪 ${t('y5.nTitle')}`}>
    <StatRow items={[{ icon: '🍽️', value: total, label: t('y5.foods') }, { icon: '🧪', value: known, label: t('y5.withData') }, { icon: '📅', value: fmtDate(new Date(d + 'T12:00')), label: t('diary.title') }]} />
    {!total ? <Card><EmptyState icon="🧪" title={t('diary.empty')} sub={t('y5.nHow')} /></Card> : <>
      <Card><CardTitle>💊 {t('y5.vits')}</CardTitle>{VITS.map(row)}</Card>
      <Card><CardTitle>🪨 {t('y5.mins')}</CardTitle>{MINS.map(row)}</Card></>}
    {total > known ? <InfoNote icon="ℹ️" text={t('y5.nMissing', { n: total - known })} /> : null}
    <InfoNote text={t('y5.nNote')} /><Text style={[s.muted, { fontSize: 12 }]}>Open Food Facts (ODbL) · USDA FoodData Central · FDA Daily Values</Text></Screen>;
}

// ---------- 4) Recetario + modo cocina ----------
const MEALK = ['breakfast', 'lunch', 'dinner', 'snack'] as const; const TAGS = ['protein', 'veggie', 'lowcarb', 'quick', 'latino', 'fiber'];
export function RecipesScreen() {
  const { t } = useTranslation(); const lang = curLang(); const [q, setQ] = useState(''); const [meal, setMeal] = useState(''); const [tags, setTags] = useState<string[]>([]); const [maxK, setMaxK] = useState(0);
  const list = filterRecipes(RECIPES, { q, meal: meal || undefined, tags, maxKcal: maxK || undefined }, (r) => rText(r.n, lang));
  return <Screen title={`🍲 ${t('y5.rTitle')}`}>
    <TextInput testID="r-q" accessibilityLabel={t('y5.rSearch')} placeholder={`🔎 ${t('y5.rSearch')}`} value={q} onChangeText={setQ} style={s.input} />
    <Row>{MEALK.map((m) => <Chip key={m} label={t(`y5.meal.${m}`)} active={meal === m} onPress={() => setMeal(meal === m ? '' : m)} />)}</Row>
    <Row>{TAGS.map((g) => <Chip key={g} label={t(`y5.tag.${g}`)} active={tags.includes(g)} onPress={() => setTags(tags.includes(g) ? tags.filter((x) => x !== g) : [...tags, g])} />)}</Row>
    <Row>{[300, 400, 500].map((k) => <Chip key={k} label={`≤ ${k} ${t('u.kcal')}`} active={maxK === k} onPress={() => setMaxK(maxK === k ? 0 : k)} />)}</Row>
    <Text testID="r-count" style={s.muted}>{t('y5.rCount', { n: list.length })}</Text>
    {!list.length ? <Card><EmptyState icon="🍲" title={t('y5.rNone')} /></Card> : list.map((r) => <Pressable key={r.id} testID="recipe" accessibilityRole="button" onPress={() => router.push({ pathname: '/cook', params: { id: r.id } })}>
      <Card><View style={[s.row, { gap: 12 }]}><IconTile icon={r.emoji} size={56} /><View style={{ flex: 1 }}><Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>{rText(r.n, lang)}</Text>
        <Text style={s.muted}>⏱️ {r.min} min · 🔥 {fmtNum(r.kcal)} {t('u.kcal')} · {t('u.p')} {r.p} g</Text>
        <Row>{r.tags.slice(0, 3).map((g) => <Pill key={g} label={t(`y5.tag.${g}`)} />)}</Row></View></View></Card></Pressable>)}
    <Text style={[s.muted, { fontSize: 12 }]}>{RECIPE_CREDIT}</Text></Screen>;
}
export function CookScreen() {
  const { t } = useTranslation(); const lang = curLang(); const { set } = useStore(); const meals = useMealNames();
  const { id } = useLocalSearchParams<{ id?: string }>(); const r = RECIPES.find((x) => x.id === id) || RECIPES[0];
  const [mode, setMode] = useState(false); const [i, setI] = useState(0); const [left, setLeft] = useState(0); const [msg, setMsg] = useState(''); const tm = useRef<any>(null);
  useEffect(() => () => clearInterval(tm.current), []);
  const startT = (sec: number) => { clearInterval(tm.current); setLeft(sec); tm.current = setInterval(() => setLeft((x) => { if (x <= 1) { clearInterval(tm.current); speak(t('y5.timerDone')); return 0; } return x - 1; }), 1000); };
  const n = r.s.length; const st = r.steps[i] || {}; const slot = ['breakfast', 'lunch', 'snack', 'dinner'].indexOf(r.meal);
  const add = (plan: boolean) => { const dt = new Date(); if (plan) dt.setDate(dt.getDate() + 1); const d = today(dt);
    set((x) => ({ ...x, entries: [...x.entries, { id: uid(), date: d, time: dt.getTime(), name: rText(r.n, lang), kcal: r.kcal, p: r.p, c: r.c, f: r.f, meal: Math.min(slot, meals.length - 1), source: 'manual', planned: plan || undefined }] }));
    setMsg(plan ? t('y5.plannedOk') : t('y5.addedOk')); };
  if (mode) return <Screen title={`👩‍🍳 ${rText(r.n, lang)}`}>
    <Text testID="cook-step-n" style={[s.muted, { fontWeight: '800', fontSize: 16 }]}>{t('y5.step', { i: i + 1, n })}</Text>
    <Bar value={i + 1} max={n} color={C.primary} />
    <Card testID="cook-step" style={{ minHeight: 200, justifyContent: 'center' }}><Text style={{ fontSize: 26, fontWeight: '800', color: C.text, lineHeight: 36 }}>{rText(r.s[i], lang)}</Text></Card>
    {st.t ? <Btn kind="accent" testID="cook-timer" label={left ? `⏱️ ${mmss(left)}` : `⏱️ ${t('y5.timer', { m: Math.round(st.t / 60) })}`} onPress={() => { if (left) { clearInterval(tm.current); setLeft(0); } else startT(st.t!); }} /> : null}
    <Btn small kind="ghost" label={`🔊 ${t('home.readAloud')}`} onPress={() => speak(rText(r.s[i], lang))} />
    <View style={[s.row, { gap: 10 }]}><Btn kind="secondary" testID="cook-prev" label={`◀ ${t('y5.prev')}`} style={{ flex: 1 }} onPress={() => setI(stepPrev(i))} />
      {i < n - 1 ? <Btn testID="cook-next" label={`${t('y5.next')} ▶`} style={{ flex: 1 }} onPress={() => setI(stepNext(i, n))} /> : <Btn testID="cook-done" label={`✓ ${t('y5.done')}`} style={{ flex: 1 }} onPress={() => { setMode(false); add(false); }} />}</View>
  </Screen>;
  return <Screen title={`${r.emoji} ${rText(r.n, lang)}`}>
    <StatRow items={[{ icon: '⏱️', value: `${r.min}′`, label: t('y5.time') }, { icon: '🔥', value: fmtNum(r.kcal), label: t('u.kcal') }, { icon: '💪', value: `${r.p} g`, label: t('home.protein') }]} />
    <Card><CardTitle>🛒 {t('y5.ing')}</CardTitle>{r.ing.map((g) => <T key={g}>• {t(`cing.${g}`)}</T>)}</Card>
    <Card><CardTitle>📋 {t('y5.steps')}</CardTitle>{r.s.map((x, j) => <T key={j}>{j + 1}. {rText(x, lang)}</T>)}</Card>
    <Btn testID="cook-start" label={`👩‍🍳 ${t('y5.cookMode')}`} onPress={() => { setI(0); setMode(true); }} />
    <Row><Btn small kind="secondary" testID="cook-add" label={`＋ ${t('y5.addToday')}`} onPress={() => add(false)} /><Btn small kind="ghost" testID="cook-plan" label={`🗓️ ${t('y5.planTomorrow')}`} onPress={() => add(true)} /></Row>
    {msg ? <Text testID="cook-msg" style={{ color: C.success, fontWeight: '800', fontSize: 17 }}>✓ {msg}</Text> : null}
    <Text style={[s.muted, { fontSize: 12 }]}>{RECIPE_CREDIT}</Text></Screen>;
}

// ---------- 5) Diario personalizable ----------
export function DiarySetupScreen() {
  const { t } = useTranslation(); const { s: st, set } = useStore(); const def = t('coach.slots4', { returnObjects: true }) as unknown as string[];
  const [names, setNames] = useState<string[]>(st.diaryMeals || def); const [msg, setMsg] = useState('');
  return <Screen title={`🛠️ ${t('y5.dsTitle')}`}>
    <InfoNote text={t('y5.dsHow')} />
    <Card>{names.map((n, i) => <View key={i} style={[s.row, { gap: 8 }]}><IconTile icon={['🌅', '☀️', '🍎', '🌙', '🥤', '🍽️'][i]} size={40} />
      <TextInput testID={`ds-${i}`} accessibilityLabel={t('y5.mealName', { i: i + 1 })} value={n} maxLength={24} onChangeText={(v) => setNames(names.map((x, j) => (j === i ? v : x)))} style={[s.input, { flex: 1 }]} />
      {names.length > 1 ? <Btn small kind="danger" testID={`ds-del-${i}`} label="✕" a11y={t('diary.remove')} style={{ width: 52 }} onPress={() => setNames(names.filter((_, j) => j !== i))} /> : null}</View>)}
      {names.length < MAX_MEALS ? <Btn small kind="secondary" testID="ds-add" label={`＋ ${t('y5.addMeal')}`} onPress={() => setNames([...names, t('y5.newMeal')])} /> : null}</Card>
    <Btn testID="ds-save" label={`✓ ${t('save')}`} onPress={() => { const c = cleanMeals(names); set((x) => ({ ...x, diaryMeals: c && c.join('|') !== def.join('|') ? c : undefined })); setMsg(t('mf.saved')); }} />
    <Btn small kind="ghost" testID="ds-reset" label={`↺ ${t('y5.reset')}`} onPress={() => { setNames(def); set((x) => ({ ...x, diaryMeals: undefined })); }} />
    {msg ? <Text testID="ds-msg" style={{ color: C.success, fontWeight: '800', fontSize: 17 }}>✓ {msg}</Text> : null}</Screen>;
}
