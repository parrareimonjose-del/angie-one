import { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, T, s } from '../src/ui';
import { useStore, today, uid } from '../src/store';
import { fmtLocale, fmtNum } from '../src/i18n';
import { LATIN_FOODS } from '../src/foods';
import { estimateText, Estimate } from '../src/ai';
import { EstimateResult, aiErrorText } from '../src/estimate';
import { C } from '../src/theme';

export default function Manual() {
  const { t, i18n } = useTranslation(); const { s: st, set } = useStore();
  const fname = (id: string) => t(`foods.${id}`);
  const [q, setQ] = useState(''); const [name, setName] = useState(''); const [kcal, setKcal] = useState('');
  const [desc, setDesc] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [est, setEst] = useState<Estimate | null>(null);
  const add = (e: { name: string; kcal: number; p?: number; c?: number; f?: number }) => {
    set((x) => ({ ...x, entries: [...x.entries, { id: uid(), date: today(), time: Date.now(), name: e.name, kcal: e.kcal, p: e.p || 0, c: e.c || 0, f: e.f || 0, source: 'manual' }] }));
    router.replace('/diary');
  };
  const ask = async (text = desc) => {
    if (text.trim().length < 2 || busy) return;
    setErr(''); setEst(null); setBusy(true);
    try { setEst(await estimateText(text, i18n.language)); } catch (e) { setErr(aiErrorText(t, e)); } finally { setBusy(false); }
  };
  // Dictado por voz: Web Speech API en navegador. TODO nativo: expo-speech-recognition (requiere dev build).
  const SR: any = Platform.OS === 'web' && typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
  const dictate = () => { const r = new SR(); r.lang = fmtLocale(); r.onresult = (ev: any) => { const txt = ev.results[0][0].transcript; setDesc(txt); ask(txt); }; r.start(); };
  const list = LATIN_FOODS.filter((f) => (fname(f.id) + ' ' + f.name.en + ' ' + f.name.es).toLowerCase().includes(q.toLowerCase()));
  return (
    <Screen title={t('manual.title')}>
      {st.aiEnabled && <Card>
        <Text style={s.h2}>✨ {t('manual.aiTitle')}</Text>
        <TextInput accessibilityLabel={t('manual.aiTitle')} style={[s.input, { minHeight: 80, paddingTop: 12 }]} multiline placeholder={t('manual.aiPh')} value={desc} onChangeText={setDesc} />
        <Btn label={busy ? `⏳ ${t('scan.analyzing')}` : `✨  ${t('manual.aiBtn')}`} onPress={() => ask()} />
        {SR && <Btn kind="secondary" small label={`🎙️  ${t('manual.dictate')}`} onPress={dictate} />}
        {err ? <T style={{ color: C.primary, fontWeight: '700' }}>{err}</T> : null}
      </Card>}
      {est && <EstimateResult key={est.name + est.kcalMin} est={est} onLog={(x) => add(x)} />}
      <TextInput accessibilityLabel={t('manual.search')} style={s.input} placeholder={t('manual.search')} value={q} onChangeText={setQ} />
      <Card>
        <Text style={s.h2}>🌎 {t('manual.latin')}</Text>
        {list.length === 0 ? <Text style={s.muted}>{t('manual.noMatch')}</Text> : null}
        {list.slice(0, 12).map((f) => (
          <Pressable key={f.id} accessibilityRole="button" onPress={() => add({ name: fname(f.id), kcal: f.kcal, p: f.p, c: f.c, f: f.f })}
            style={({ pressed }) => [s.row, { minHeight: 60, justifyContent: 'space-between', borderBottomWidth: 1, borderColor: C.border, opacity: pressed ? 0.6 : 1 }]}>
            <View style={{ flex: 1 }}><T style={{ fontWeight: '700' }}>{fname(f.id)}</T><Text style={s.muted}>{f.portion}</Text></View>
            <Text style={{ fontWeight: '900', color: C.primary, fontSize: 17 }}>{fmtNum(f.kcal)} {t('u.kcal')}  ＋</Text>
          </Pressable>))}
      </Card>
      <Card>
        <Text style={s.h2}>✍️ {t('manual.exact')}</Text>
        <TextInput accessibilityLabel={t('manual.name')} style={s.input} placeholder={t('manual.name')} value={name} onChangeText={setName} />
        <TextInput accessibilityLabel={t('manual.kcal')} style={s.input} placeholder={t('manual.kcal')} keyboardType="numeric" value={kcal} onChangeText={(v) => setKcal(v.replace(/[^0-9]/g, ''))} />
        <Btn label={t('add')} onPress={() => name.trim() && +kcal > 0 && +kcal < 5000 && add({ name: name.trim(), kcal: +kcal })} />
      </Card>
    </Screen>
  );
}
