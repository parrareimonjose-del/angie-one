import { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, T, s } from '../src/ui';
import { useStore, today, uid } from '../src/store';
import { LATIN_FOODS } from '../src/foods';
import { C } from '../src/theme';

export default function Manual() {
  const { t, i18n } = useTranslation(); const { set } = useStore();
  const lang = (['es', 'en', 'pt'].includes(i18n.language) ? i18n.language : 'en') as 'es' | 'en' | 'pt';
  const [q, setQ] = useState(''); const [name, setName] = useState(''); const [kcal, setKcal] = useState('');
  const add = (e: { name: string; kcal: number; p?: number; c?: number; f?: number }) => {
    set((x) => ({ ...x, entries: [...x.entries, { id: uid(), date: today(), time: Date.now(), name: e.name, kcal: e.kcal, p: e.p || 0, c: e.c || 0, f: e.f || 0, source: 'manual' }] }));
    router.replace('/diary');
  };
  // Dictado por voz: Web Speech API en navegador. TODO nativo: expo-speech-recognition (requiere dev build).
  const SR: any = Platform.OS === 'web' && typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
  const dictate = () => { const r = new SR(); r.lang = i18n.language; r.onresult = (ev: any) => { const txt = ev.results[0][0].transcript; setQ(txt); setName(txt); }; r.start(); };
  const list = LATIN_FOODS.filter((f) => f.name[lang].toLowerCase().includes(q.toLowerCase()));
  return (
    <Screen title={t('manual.title')}>
      <TextInput accessibilityLabel={t('manual.search')} style={s.input} placeholder={t('manual.search')} value={q} onChangeText={setQ} />
      {SR && <Btn kind="secondary" small label={`🎙️  ${t('manual.dictate')}`} onPress={dictate} />}
      <Card>
        <Text style={s.h2}>🌎 {t('manual.latin')}</Text>
        {list.slice(0, 12).map((f) => (
          <Pressable key={f.id} accessibilityRole="button" onPress={() => add({ name: f.name[lang], kcal: f.kcal, p: f.p, c: f.c, f: f.f })}
            style={({ pressed }) => [s.row, { minHeight: 60, justifyContent: 'space-between', borderBottomWidth: 1, borderColor: C.border, opacity: pressed ? 0.6 : 1 }]}>
            <View style={{ flex: 1 }}><T style={{ fontWeight: '700' }}>{f.name[lang]}</T><Text style={s.muted}>{f.portion}</Text></View>
            <Text style={{ fontWeight: '900', color: C.primary, fontSize: 17 }}>{f.kcal} kcal  ＋</Text>
          </Pressable>))}
      </Card>
      <Card>
        <TextInput accessibilityLabel={t('manual.name')} style={s.input} placeholder={t('manual.name')} value={name} onChangeText={setName} />
        <TextInput accessibilityLabel={t('manual.kcal')} style={s.input} placeholder={t('manual.kcal')} keyboardType="numeric" value={kcal} onChangeText={setKcal} />
        <Btn label={t('add')} onPress={() => name && +kcal > 0 && add({ name, kcal: +kcal })} />
      </Card>
    </Screen>
  );
}
