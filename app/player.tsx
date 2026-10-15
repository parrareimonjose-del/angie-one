import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Speech from 'expo-speech';
import { Screen, Card, Btn, T, Bar, s } from '../src/ui';
import { C } from '../src/theme';
import { fmtNum } from '../src/i18n';
import { today } from '../src/store';
import { useCoach, CoachLocked, useNames, speak } from '../src/coach-ui';
import { applyBoost, kcalFor, workSecs, Exercise } from '../src/coach';

type Step = { kind: 'work' | 'rest'; ex: Exercise; set: number; sets: number; secs: number; idx: number };

export default function Player() {
  const { t } = useTranslation(); const { st, c, upd, premium } = useCoach(); const N = useNames();
  const { day: dp } = useLocalSearchParams<{ day: string }>(); const di = Math.min(6, Math.max(0, +(dp || 0)));
  const day = c.plan?.workout.days[di];
  const steps = useMemo<Step[]>(() => {
    const out: Step[] = []; if (!day) return out;
    day.exercises.forEach((e, idx) => { const sets = applyBoost(e, c.boost);
      for (let k = 1; k <= sets; k++) {
        out.push({ kind: 'work', ex: e, set: k, sets, secs: e.reps ? 0 : e.secs, idx });
        const last = idx === day.exercises.length - 1 && k === sets;
        if (e.rest > 0 && !last) out.push({ kind: 'rest', ex: e, set: k, sets, secs: e.rest, idx });
      } });
    return out;
  }, [day, c.boost]);
  const [i, setI] = useState(0); const [left, setLeft] = useState(0); const [paused, setPaused] = useState(false);
  const [voice, setVoice] = useState(true); const [burn, setBurn] = useState(0); const [fin, setFin] = useState(false);
  const start = useRef(Date.now()); const saved = useRef(false);
  const kg = st.profile?.weight || 70; const step = steps[i];
  const say = (st2: Step) => {
    if (!voice) return;
    speak(st2.kind === 'rest' ? t('coach.sayRest', { n: st2.secs }) : `${N.ex(st2.ex)}. ${t('coach.setOf', { a: st2.set, b: st2.sets })}. ${st2.ex.reps ? t('coach.reps', { n: st2.ex.reps }) : t('coach.secs', { n: st2.secs })}`);
  };
  useEffect(() => { if (step) { setLeft(step.secs); say(step); } }, [i, steps.length]);
  useEffect(() => {
    if (!step || paused || fin || !step.secs) return;
    if (left <= 0) { next(); return; }
    const tm = setTimeout(() => setLeft(left - 1), 1000); return () => clearTimeout(tm);
  }, [left, paused, fin, i]);
  const next = () => {
    if (!step) return;
    const add = step.kind === 'work' ? kcalFor(step.ex.met, kg, workSecs(step.ex)) : kcalFor(1.5, kg, step.secs - Math.max(0, left));
    setBurn((b) => b + add);
    if (i + 1 >= steps.length) finish(burn + add); else setI(i + 1);
  };
  const finish = (total: number) => {
    setFin(true); Speech.stop();
    if (saved.current || total < 1) return; saved.current = true;
    const min = Math.max(1, Math.round((Date.now() - start.current) / 60000));
    upd((x) => ({ ...x, workouts: [...x.workouts, { date: today(), kcal: Math.round(total), min, day: di }] }));
    if (voice) speak(t('coach.sayDone', { kcal: Math.round(total) }));
  };
  if (!premium) return <CoachLocked />;
  if (!day || day.rest || !steps.length) return <Redirect href="/workout" />;
  if (fin) return (
    <Screen nav={false}>
      <Card style={{ alignItems: 'center', backgroundColor: C.secondary, gap: 8 }}>
        <Text style={{ fontSize: 56 }}>🎉</Text>
        <Text style={[s.h1, { color: C.white, textAlign: 'center' }]}>{t('coach.greatJob')}</Text>
        <Text testID="burned" style={[s.h2, { color: C.white }]}>🔥 {fmtNum(Math.round(burn))} {t('u.kcal')}</Text>
        <Text style={[s.t, { color: C.white, textAlign: 'center' }]}>{t('coach.addedHome')}</Text>
      </Card>
      <Btn label={`🏠 ${t('nav.home')}`} onPress={() => router.replace('/')} />
      <Btn kind="ghost" label={`💪 ${t('coach.title')}`} onPress={() => router.replace('/coach')} />
    </Screen>
  );
  const rest = step.kind === 'rest'; const nextWork = rest ? steps[i + 1] : null;
  return (
    <Screen nav={false}>
      <Bar value={i} max={steps.length} color={C.primary} />
      <Text style={s.muted}>{t('coach.stepOf', { a: i + 1, b: steps.length })} · 🔥 {fmtNum(Math.round(burn))} {t('u.kcal')}</Text>
      <Card style={{ alignItems: 'center', gap: 12, backgroundColor: rest ? '#EDE9FE' : C.card, paddingVertical: 28 }}>
        <Text style={[s.muted, { fontWeight: '800', fontSize: 18 }]}>{rest ? `😮‍💨 ${t('coach.rest')}` : t('coach.setOf', { a: step.set, b: step.sets })}</Text>
        <Text style={[s.h1, { textAlign: 'center' }]} testID="step-name">{rest ? t('coach.breathe') : N.ex(step.ex)}</Text>
        {step.secs ? <Text testID="timer" style={{ fontSize: 72, fontWeight: '900', color: rest ? C.secondary : C.primary }}>{left >= 60 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : `${left}s`}</Text>
          : <Text style={{ fontSize: 56, fontWeight: '900', color: C.primary }}>{t('coach.reps', { n: step.ex.reps })}</Text>}
        {!rest && <T style={{ textAlign: 'center' }}>{N.desc(step.ex)}</T>}
        {rest && nextWork && <T style={{ textAlign: 'center' }}>{t('coach.upNext')}: {N.ex(nextWork.ex)}</T>}
      </Card>
      <Btn label={rest ? `⏭️ ${t('coach.skipRest')}` : `✓ ${t('coach.doneSet')}`} onPress={next} />
      <View style={s.row}>
        {step.secs ? <Btn kind="secondary" style={{ flex: 1 }} label={paused ? `▶️ ${t('coach.resume')}` : `⏸️ ${t('coach.pause')}`} onPress={() => setPaused(!paused)} /> : null}
        <Btn kind="ghost" style={{ flex: 1 }} label={voice ? '🔊' : '🔇'} a11y={t('home.readAloud')} onPress={() => { if (voice) Speech.stop(); else speak(N.ex(step.ex)); setVoice(!voice); }} />
      </View>
      <Btn kind="danger" small label={t('coach.endEarly')} onPress={() => finish(burn)} />
    </Screen>
  );
}
