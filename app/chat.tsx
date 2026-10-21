import { AIReport } from '../src/review-ui';
import { useState } from 'react';
import { View, Text, TextInput, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, Chip, T, s, InfoNote } from '../src/ui';
import { C } from '../src/theme';
import { curLang } from '../src/i18n';
import { today } from '../src/store';
import { useCoach, CoachLocked, Row, speak } from '../src/coach-ui';
import { useExt } from '../src/ext';
import { Mem, MEM0, learnFact, memContext } from '../src/p2';
import { kbContext, redFlag } from '../src/coachkb';
import { RedFlagNote } from '../src/coachkb-ui';
import { askCoach, coachTarget, ChatMsg } from '../src/coach';

const DAILY = 20;
const plain = (x: string) => x.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\s*[*-]\s+/gm, '• ').replace(/[*_#`]/g, '');
export default function Chat() {
  const { t } = useTranslation(); const { st, c, upd, premium } = useCoach();
  const [mem, setMem] = useExt<Mem>('mem', MEM0);
  const [q, setQ] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [red, setRed] = useState(false);
  if (!premium) return <CoachLocked />;
  const used = c.chatCount[today()] || 0;
  const send = async (text: string) => {
    text = text.trim(); if (!text || busy) return;
    if (used >= DAILY) { setErr(t('chat.limit', { n: DAILY })); return; }
    setErr(''); setQ(''); setBusy(true); setRed(redFlag(text));
    const msgs: ChatMsg[] = [...c.chat, { role: 'user', text }];
    upd((x) => ({ ...x, chat: msgs.slice(-30), chatCount: { [today()]: used + 1 } }));
    const p = st.profile; const pr = c.prefs;
    const ctx = p ? `goal ${p.goal}, ${p.age} y, ${p.weight} kg, target ${coachTarget(st).kcal} kcal/day${pr ? `, trains at ${pr.place} ${pr.days} days/week, level ${pr.level}${pr.injuries.length ? ', limits: ' + pr.injuries.join(' ') : ''}` : ''}` : '';
    const fact = mem.on ? learnFact(text) : null; if (fact) setMem((m) => ({ ...m, facts: [...m.facts, { id: String(Date.now()), text: fact }].slice(-20) }));
    try { const r = await askCoach(msgs, curLang(), kbContext(text, p?.goal, ctx + memContext(mem))); upd((x) => ({ ...x, chat: [...msgs, { role: 'coach' as const, text: r }].slice(-30) })); }
    catch { setErr(t('chat.offline')); }
    finally { setBusy(false); }
  };
  const last = [...c.chat].reverse().find((m) => m.role === 'coach');
  return (
    <Screen title={`💬 ${t('coach.chat')}`}>
      <InfoNote warn text={t('chat.disclaimer')} />
      {!c.chat.length && <Card><T>👋 {t('chat.hello')}</T></Card>}
      {c.chat.map((m, i) => (
        <View key={i} testID={m.role === 'coach' ? 'chat-reply' : undefined} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', backgroundColor: m.role === 'user' ? C.secondary : C.card, borderRadius: 20, padding: 14 }}>
          <Text style={{ color: m.role === 'user' ? C.white : C.text, fontSize: 17, lineHeight: 24 }}>{plain(m.text)}</Text>
          {m.role === 'coach' ? <AIReport kind="chat" text={m.text} /> : null}
        </View>
      ))}
      {red && <RedFlagNote />}
      {busy && <ActivityIndicator size="large" color={C.primary} />}
      {err ? <T style={{ color: C.primary, fontWeight: '700' }}>{err}</T> : null}
      <Row>{(['s1', 's2', 's3'] as const).map((k) => <Chip key={k} label={t(`chat.${k}`)} onPress={() => send(t(`chat.${k}`))} />)}</Row>
      <TextInput testID="chat-input" accessibilityLabel={t('chat.placeholder')} style={[s.input, { minHeight: 64 }]} value={q} onChangeText={setQ} placeholder={t('chat.placeholder')} maxLength={400} multiline onSubmitEditing={() => send(q)} />
      <View style={s.row}>
        <Btn style={{ flex: 2 }} label={`➤ ${t('chat.send')}`} onPress={() => send(q)} />
        {last && <Btn style={{ flex: 1 }} kind="ghost" label="🔊" a11y={t('home.readAloud')} onPress={() => speak(plain(last.text))} />}
      </View>
    </Screen>
  );
}
