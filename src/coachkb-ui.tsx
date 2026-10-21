import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, T, s, IconCard, InfoNote } from './ui';
import { C } from './theme';
import { curLang, fmtNum } from './i18n';
import { today, uid } from './store';
import { useExt } from './ext';
import { useCoach, CoachLocked } from './coach-ui';
import { coachTarget } from './coach';
import { suggestRecipes, kcalLeft, AREAS, AREA_ICON, WEEKS, CHECK, toggleCheck, programWeek, Sugg } from './coachkb';

const nm = (x: Sugg, l: string) => (x.name as any)[l] || x.name.en;
/** Tarjeta del coach: 2-3 recetas que caben en lo que queda hoy, según meta y gustos. */
export function RecipeSuggest() {
  const { t } = useTranslation(); const { st, c, set } = useCoach(); const [added, setAdded] = useState<string[]>([]);
  if (!st.profile) return null; const l = curLang(); const d = today();
  const left = kcalLeft(coachTarget(st).kcal, st.entries, d); const list = left < 120 ? [] : suggestRecipes(left, st.profile.goal, c.prefs?.dislikes || []);
  const add = (x: Sugg) => { set((s0) => ({ ...s0, entries: [...s0.entries, { id: uid(), date: d, time: Date.now(), name: nm(x, l), kcal: x.kcal, p: x.p, c: x.c, f: x.f, source: 'quick' as const }] })); setAdded((a) => [...a, x.id]); };
  return <IconCard testID="ck-recipes" icon="🍲" title={t('ck.recT')} sub={list.length ? t('ck.recSub', { kcal: fmtNum(left) }) : undefined}>
    {!list.length ? <T testID="ck-rec-none">{t('ck.recNone')}</T> : list.map((x) => <View key={x.id} testID="ck-rec" style={{ gap: 6, padding: 10, borderRadius: 16, backgroundColor: C.tint }}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: C.text }}>{x.emoji} {nm(x, l)}</Text>
      <Text style={s.muted}>{fmtNum(x.kcal)} {t('u.kcal')} · P {x.p} g · C {x.c} g · G {x.f} g{x.min ? ` · ⏱ ${x.min} min` : ''}{x.portion ? ` · ${x.portion}` : ''}</Text>
      {x.kind === 'recipe' ? <Btn small testID="ck-cook" label={t('ck.recCook')} onPress={() => router.push({ pathname: '/cook', params: { id: x.id } })} />
        : added.includes(x.id) ? <Text testID="ck-added" style={{ color: C.success, fontWeight: '800' }}>{t('ck.recAdded')}</Text>
        : <Btn small kind="secondary" testID="ck-add" label={t('ck.recAdd')} onPress={() => add(x)} />}
    </View>)}
  </IconCard>;
}
export function RedFlagNote() { const { t } = useTranslation(); return <View testID="ck-red"><InfoNote warn icon="⚠️" text={`${t('ck.redT')}. ${t('ck.redB')}`} /></View>; }

/** Pantalla «Guía profesional»: equipo de profesionales, semana del programa por meta y lista diaria. */
export function CoachGuide() {
  const { t } = useTranslation(); const { st, c, premium } = useCoach(); const [chk, setChk] = useExt<Record<string, string[]>>('ckCheck', {}); const [open, setOpen] = useState<string | null>(null);
  if (!premium) return <CoachLocked />;
  const goal = st.profile?.goal || 'keep'; const wk = programWeek(c.plan?.created); const d = today(); const done = chk[d] || [];
  return <Screen title={t('ck.guide')}>
    <IconCard icon="🧑‍⚕️" title={t('ck.title')} sub={t('ck.sub')} />
    <IconCard testID="ck-week" icon="📅" title={t('ck.weekT', { n: wk })} sub={t('ck.guideSub')}>
      {WEEKS.map((w, i) => <T key={w} style={i + 1 === wk ? { fontWeight: '900', color: C.primary } : undefined}>{i + 1 === wk ? '▶ ' : '• '}{t(`ck.${goal}.${w}`)}</T>)}
    </IconCard>
    <IconCard testID="ck-check" icon="✅" title={t('ck.checkT')} sub={`${done.length}/${CHECK.length}`}>
      {CHECK.map((k) => { const on = done.includes(k); return <Pressable key={k} testID={`ck-${k}`} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => setChk((a) => toggleCheck(a, d, k))} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 6 }}>
        <Text style={{ fontSize: 22 }}>{on ? '☑️' : '⬜'}</Text><Text style={{ fontSize: 17, color: C.text, flex: 1 }}>{t(`ck.${k}`)}</Text></Pressable>; })}
    </IconCard>
    {AREAS.map((a) => <Pressable key={a} testID={`ck-area-${a}`} accessibilityRole="button" onPress={() => setOpen(open === a ? null : a)}>
      <Card style={{ gap: 6 }}><Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>{AREA_ICON[a]} {t(`ck.${a}.t`)} {open === a ? '▴' : '▾'}</Text>
        {open === a && <><T>• {t(`ck.${a}.1`)}</T><T>• {t(`ck.${a}.2`)}</T></>}</Card></Pressable>)}
    <RedFlagNote />
    <InfoNote text={t('ck.disc')} />
  </Screen>;
}
