import { useState } from 'react';
import { View, Text, TextInput, Image } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, Chip, T, s } from '../src/ui';
import { useStore, dailyTarget, Profile } from '../src/store';
import { C } from '../src/theme';

export default function Onboarding() {
  const { t } = useTranslation(); const { set, s: st } = useStore();
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Profile>(st.profile || { goal: 'lose', weight: 70, height: 165, age: 30, sex: 'female', activity: 2 });
  const num = (k: keyof Profile) => (v: string) => setP({ ...p, [k]: Number(v.replace(/[^0-9.]/g, '')) || 0 } as Profile);
  const finish = () => { set((x) => ({ ...x, profile: p, trialStart: x.trialStart || Date.now() })); router.replace('/'); };
  return (
    <Screen nav={false}>
      <View style={{ alignItems: 'center', gap: 8, marginTop: 10 }}>
        <Image source={require('../assets/logo-icon.png')} style={{ width: 96, height: 96, borderRadius: 24 }} />
        <Text style={s.h1}>Angie One</Text>
        <Text style={[s.muted, { textAlign: 'center' }]}>{t('tagline')}</Text>
        <View style={[s.row, { marginTop: 6 }]}>{[0, 1, 2, 3].map((i) => <View key={i} style={{ width: i === step ? 28 : 10, height: 10, borderRadius: 5, backgroundColor: i <= step ? C.primary : C.border }} />)}</View>
      </View>
      {step === 0 && <Card><Text style={s.h2}>{t('ob.goal')}</Text>
        {(['lose', 'keep', 'gain'] as const).map((g) => <Btn key={g} kind={p.goal === g ? 'primary' : 'ghost'} label={t(`ob.${g}`)} onPress={() => setP({ ...p, goal: g })} />)}</Card>}
      {step === 1 && <Card><Text style={s.h2}>{t('ob.body')}</Text>
        {(['weight', 'height', 'age'] as const).map((k) => <View key={k} style={{ gap: 4 }}><T>{t(`ob.${k}`)}</T>
          <TextInput accessibilityLabel={t(`ob.${k}`)} style={s.input} keyboardType="numeric" value={String(p[k] || '')} onChangeText={num(k)} /></View>)}
        <T>{t('ob.sex')}</T>
        <View style={s.row}>{(['female', 'male'] as const).map((x) => <Chip key={x} label={t(`ob.${x}`)} active={p.sex === x} onPress={() => setP({ ...p, sex: x })} />)}</View></Card>}
      {step === 2 && <Card><Text style={s.h2}>{t('ob.activity')}</Text>
        {([1, 2, 3, 4] as const).map((a) => <Btn key={a} kind={p.activity === a ? 'primary' : 'ghost'} label={t(`ob.a${a}`)} onPress={() => setP({ ...p, activity: a })} />)}</Card>}
      {step === 3 && <>
        <Card style={{ backgroundColor: C.secondary }}>
          <Text style={[s.h2, { color: C.white }]}>⭐ {t('ob.trialTitle')}</Text>
          <Text style={[s.t, { color: C.white }]}>{t('ob.trialBody')}</Text>
        </Card>
        <Card style={{ alignItems: 'center' }}><Text style={[s.h2, { color: C.primary }]}>{t('ob.target', { kcal: dailyTarget(p).kcal })}</Text></Card>
      </>}
      <View style={[s.row]}>
        {step > 0 && <Btn kind="ghost" label={t('back')} onPress={() => setStep(step - 1)} style={{ flex: 1 }} />}
        <Btn label={step < 3 ? t('next') : t('ob.go')} onPress={() => (step < 3 ? setStep(step + 1) : finish())} style={{ flex: 2 }} />
      </View>
    </Screen>
  );
}
