import { useRef, useState } from 'react';
import { startVoice, voiceSupported } from '../src/voice';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, T, s } from '../src/ui';
import { useStore, today, uid } from '../src/store';
import { fmtLocale, fmtNum } from '../src/i18n';
import { searchFoods, type VFood } from '../src/verified';
import { FoodRow } from '../src/honest-ui';
import { estimateText, Estimate } from '../src/ai';
import { EstimateResult, aiErrorText } from '../src/estimate';
import { C } from '../src/theme';

export default function Manual() {
  const { t, i18n } = useTranslation(); const { s: st, set } = useStore();
  const fname = (id: string) => t(`foods.${id}`);
  const [q, setQ] = useState(''); const [bad, setBad] = useState(false); const [name, setName] = useState(''); const [kcal, setKcal] = useState('');
  const [desc, setDesc] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [est, setEst] = useState<Estimate | null>(null);
  const add = (e: { name: string; kcal: number; p?: number; c?: number; f?: number; fiber?: number }, mine = false) => {
    set((x) => ({ ...x, entries: [...x.entries, { id: uid(), date: today(), time: Date.now(), name: e.name, kcal: e.kcal, p: e.p || 0, c: e.c || 0, f: e.f || 0, fiber: e.fiber, source: 'manual' }],
      myFoods: mine ? [...(x.myFoods || []).filter((y) => y.name !== e.name), { id: 'u' + uid(), key: '', name: e.name, portion: '1', kcal: e.kcal, p: 0, c: 0, f: 0, verified: false, source: 'user' as const }].slice(-50) : x.myFoods }));
    router.replace('/diary');
  };
  const ask = async (text = desc) => {
    if (text.trim().length < 2 || busy) return;
    setErr(''); setEst(null); setBusy(true);
    try { setEst(await estimateText(text, i18n.language)); } catch (e: any) { setErr(e?.code === 'notFood' ? t('voice.notFood') : aiErrorText(t, e)); } finally { setBusy(false); }
  };
  // Dictado por voz: Web Speech o grabación + transcripción en el Worker (iPhone).
  const SR = voiceSupported(); const [lis, setLis] = useState<'idle' | 'listening' | 'working'>('idle'); const stopRef = useRef<null | (() => void)>(null);
  const dictate = () => { if (lis === 'listening') { stopRef.current?.(); return; } setErr('');
    stopRef.current = startVoice({ onText: (txt) => { setDesc(txt); ask(txt); }, onErr: (e) => setErr(t('voice.' + e)), onState: setLis }); };
  const label = (f: VFood) => (f.nameKey ? t(f.nameKey) : f.name || '?');
  const list = searchFoods(q, label, st.myFoods || []);
  return (
    <Screen title={t('manual.title')}>
      {st.aiEnabled && <Card>
        <Text style={s.h2}>✨ {t('manual.aiTitle')}</Text>
        <TextInput accessibilityLabel={t('manual.aiTitle')} style={[s.input, { minHeight: 80, paddingTop: 12 }]} multiline placeholder={t('manual.aiPh')} value={desc} onChangeText={setDesc} />
        <Btn label={busy ? `⏳ ${t('scan.analyzing')}` : `✨  ${t('manual.aiBtn')}`} onPress={() => ask()} />
        {SR && <Btn kind="secondary" small label={lis === 'working' ? `⏳ ${t('voice.working')}` : lis === 'listening' ? `⏹️ ${t('voice.stop')}` : `🎙️  ${t('manual.dictate')}`} onPress={dictate} />}
        {err ? <T style={{ color: C.primary, fontWeight: '700' }}>{err}</T> : null}
      </Card>}
      {est && <EstimateResult key={est.name + est.kcalMin} est={est} onLog={(x) => add(x)} />}
      <TextInput accessibilityLabel={t('manual.search')} style={s.input} placeholder={t('manual.search')} value={q} onChangeText={setQ} />
      <Card>
        <Text style={s.h2}>🌎 {t('manual.latin')}</Text><Text style={s.muted}>{t('hb.verifiedHow')}</Text>
        {list.length === 0 ? <Text style={s.muted}>{t('manual.noMatch')}</Text> : null}
        {list.slice(0, 12).map((f) => <FoodRow key={f.key} f={f} label={label(f)} onAdd={() => add({ name: label(f), kcal: f.kcal, p: f.p, c: f.c, f: f.f, fiber: f.fiber })} />)}
      </Card>
      <Card>
        <Text style={s.h2}>✍️ {t('manual.exact')}</Text>
        <TextInput accessibilityLabel={t('manual.name')} style={s.input} placeholder={t('manual.name')} value={name} onChangeText={setName} />
        <TextInput accessibilityLabel={t('manual.kcal')} style={s.input} placeholder={t('manual.kcal')} keyboardType="numeric" value={kcal} onChangeText={(v) => setKcal(v.replace(/[^0-9]/g, ''))} />
        {bad ? <T style={{ color: C.primary, fontWeight: '700' }}>{t('manual.badKcal')}</T> : null}
        <Btn label={t('add')} onPress={() => { if (name.trim() && +kcal > 0 && +kcal < 5000) add({ name: name.trim(), kcal: +kcal }, true); else setBad(true); }} />
      </Card>
    </Screen>
  );
}
