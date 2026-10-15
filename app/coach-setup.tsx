import { useState } from 'react';
import { View, Text, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, Chip, T, s } from '../src/ui';
import { C } from '../src/theme';
import { curLang } from '../src/i18n';
import { useCoach, CoachLocked, Row, Disclaimer } from '../src/coach-ui';
import { Prefs, DEFAULT_PREFS, makePlan, coachTarget, Injury, Dislike, Cuisine } from '../src/coach';

export default function CoachSetup() {
  const { t } = useTranslation(); const { st, c, upd, premium } = useCoach();
  const [p, setP] = useState<Prefs>(c.prefs || DEFAULT_PREFS); const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false); const [note, setNote] = useState('');
  if (!premium) return <CoachLocked />;
  const toggle = <K extends 'injuries' | 'dislikes'>(k: K, v: Prefs[K][number]) => setP({ ...p, [k]: (p[k] as any[]).includes(v) ? (p[k] as any[]).filter((x) => x !== v) : [...p[k], v] });
  const generate = async () => {
    setBusy(true); setNote('');
    const tg = coachTarget(st);
    const plan = await makePlan(st.profile!, p, tg.kcal, tg.p, curLang());
    upd((x) => ({ ...x, prefs: p, plan }));
    setBusy(false);
    if (plan.source === 'rules') setNote(t('coach.fallbackNote')); else router.replace('/coach');
  };
  if (busy) return (
    <Screen nav={false}><Card style={{ alignItems: 'center', gap: 16, paddingVertical: 40 }}>
      <ActivityIndicator size="large" color={C.primary} /><Text style={s.h2}>{t('coach.building')}</Text><T>{t('coach.buildingSub')}</T></Card></Screen>
  );
  if (note) return (
    <Screen nav={false}><Card style={{ backgroundColor: C.warnBg }}><T style={{ fontWeight: '700' }}>{note}</T></Card>
      <Btn label={t('coach.seePlan')} onPress={() => router.replace('/coach')} /><Btn kind="ghost" label={t('coach.tryAgain')} onPress={generate} /></Screen>
  );
  return (
    <Screen nav={false} title={t('coach.setupTitle')}>
      <View style={[s.row, { justifyContent: 'center' }]}>{[0, 1, 2].map((i) => <View key={i} style={{ width: i === step ? 28 : 10, height: 10, borderRadius: 5, backgroundColor: i <= step ? C.primary : C.border }} />)}</View>
      {step === 0 && <>
        <Card><Text style={s.h2}>{t('coach.place')}</Text><Row>
          <Chip label={`🏠 ${t('coach.home')}`} active={p.place === 'home'} onPress={() => setP({ ...p, place: 'home' })} />
          <Chip label={`🏋️ ${t('coach.gym')}`} active={p.place === 'gym'} onPress={() => setP({ ...p, place: 'gym' })} /></Row></Card>
        <Card><Text style={s.h2}>{t('coach.daysQ')}</Text><Row>{[2, 3, 4, 5, 6].map((n) => <Chip key={n} label={String(n)} active={p.days === n} onPress={() => setP({ ...p, days: n })} />)}</Row></Card>
        <Card><Text style={s.h2}>{t('coach.minutesQ')}</Text><Row>{[15, 20, 30, 45, 60].map((n) => <Chip key={n} label={`${n} min`} active={p.minutes === n} onPress={() => setP({ ...p, minutes: n })} />)}</Row></Card>
        <Card><Text style={s.h2}>{t('coach.levelQ')}</Text><Row>{(['beginner', 'intermediate', 'advanced'] as const).map((l) => <Chip key={l} label={t(`coach.${l}`)} active={p.level === l} onPress={() => setP({ ...p, level: l })} />)}</Row></Card>
      </>}
      {step === 1 && <Card>
        <Text style={s.h2}>{t('coach.injuriesQ')}</Text>
        <Row>
          <Chip label={t('coach.none')} active={!p.injuries.length} onPress={() => setP({ ...p, injuries: [] })} />
          {(['knees', 'back', 'shoulders', 'wrists'] as Injury[]).map((k) => <Chip key={k} label={t(`coach.inj.${k}`)} active={p.injuries.includes(k)} onPress={() => toggle('injuries', k)} />)}
        </Row>
        <Text style={s.muted}>⚠️ {t('coach.safety')}</Text>
        <T>{t('coach.injuryNote')}</T>
        <TextInput accessibilityLabel={t('coach.injuryNote')} style={s.input} value={p.injuryNote} maxLength={120} onChangeText={(v) => setP({ ...p, injuryNote: v })} placeholder={t('coach.optional')} />
      </Card>}
      {step === 2 && <>
        <Card><Text style={s.h2}>{t('coach.dislikesQ')}</Text>
          <Row>{(['fish', 'eggs', 'dairy', 'beef', 'chicken', 'legumes', 'nuts', 'veg'] as Dislike[]).map((k) => <Chip key={k} label={t(`coach.dis.${k}`)} active={p.dislikes.includes(k)} onPress={() => toggle('dislikes', k)} />)}</Row></Card>
        <Card><Text style={s.h2}>{t('coach.cuisineQ')}</Text>
          <Row>{(['latin', 'mexican', 'caribbean', 'andean', 'brazilian', 'international'] as Cuisine[]).map((k) => <Chip key={k} label={t(`coach.cui.${k}`)} active={p.cuisine === k} onPress={() => setP({ ...p, cuisine: k })} />)}</Row></Card>
        <Card><Text style={s.h2}>{t('coach.budgetQ')}</Text>
          <Row>{(['low', 'medium', 'high'] as const).map((k) => <Chip key={k} label={t(`coach.bud.${k}`)} active={p.budget === k} onPress={() => setP({ ...p, budget: k })} />)}</Row></Card>
        <Card><Text style={s.h2}>{t('coach.mealsQ')}</Text>
          <Row>{([3, 4, 5] as const).map((k) => <Chip key={k} label={String(k)} active={p.meals === k} onPress={() => setP({ ...p, meals: k })} />)}</Row></Card>
        <Disclaimer />
      </>}
      <View style={s.row}>
        <Btn kind="ghost" label={t('back')} onPress={() => (step ? setStep(step - 1) : router.back())} style={{ flex: 1 }} />
        <Btn label={step < 2 ? t('next') : `✨ ${t('coach.generate')}`} onPress={() => (step < 2 ? setStep(step + 1) : generate())} style={{ flex: 2 }} />
      </View>
    </Screen>
  );
}
