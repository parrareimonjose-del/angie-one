/** Fase 4 (web): marketplace, bienestar corporativo, informes anónimos, tienda Etsy, impacto, mascotas, WhatsApp y propinas. */
import { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Rect, Circle, Text as SvgText } from 'react-native-svg';
import { Screen, Card, Btn, Chip, T, Bar, s } from './ui';
import { C } from './theme';
import { useStore, today, uid } from './store';
import { fmtNum, fmtDate } from './i18n';
import { Row, Disclaimer } from './coach-ui';
import { LATIN_FOODS } from './foods';
import { useExt, Pending, Example, Note, ETSY_SHOP, openUrl } from './ext';
import { alertPending } from './p3';

export function Market() {
  const { t } = useTranslation();
  const pros = [['Dra. Rosa M.', 'nutri', 4.9, 25], ['Carlos P.', 'trainer', 4.8, 20], ['Ana L.', 'physio', 5.0, 30]] as const;
  return <Screen title={`🧑‍⚕️ ${t('x.t.market')}`}><Example /><Pending what={t('x.needPay')} />
    {pros.map(([n, r, st, p]) => <Card key={n}><Text style={s.h2}>{n}</Text><T>{t(`x.role.${r}`)} · ⭐ {fmtNum(st, 1)} · ${p}/{t('x.session')}</T>
      <Btn small kind="ghost" label={t('x.book')} onPress={() => alertPending(t)} /></Card>)}
    <Note k="x.marketNote" /></Screen>;
}

export function Corporate() {
  const { t } = useTranslation(); const [joined, setJ] = useExt<boolean>('corp', false);
  const teams = [['Ventas', 0.72], ['Soporte', 0.64], ['Tecnología', 0.81]] as const;
  return <Screen title={`🏢 ${t('x.t.corp')}`}><Example />
    <Card><Text style={s.h2}>{t('x.corpCh')}</Text>{teams.map(([n, v]) => <View key={n} style={{ gap: 4 }}><T>{n} · {Math.round(v * 100)}%</T><Bar value={v} max={1} color={C.secondary} /></View>)}
      <Btn label={joined ? '✓ ' + t('x.joined') : t('x.join')} kind={joined ? 'secondary' : 'primary'} onPress={() => setJ((v) => !v)} /></Card>
    <Note k="x.corpPrivacy" /></Screen>;
}

/** Informe agregado y anónimo: solo grupos de 20 o más personas; nunca datos individuales. */
export const K_ANON = 20;
export function aggregate(groups: { name: string; n: number; avgKcal: number }[]) { return groups.filter((g) => g.n >= K_ANON); }
export function AggReport() {
  const { t } = useTranslation();
  const g = aggregate([{ name: 'US', n: 120, avgKcal: 1850 }, { name: 'MX', n: 64, avgKcal: 1790 }, { name: 'VE', n: 8, avgKcal: 1700 }]);
  return <Screen title={`📊 ${t('x.aggTitle')}`}><Example />
    {g.map((x) => <Card key={x.name}><T>{x.name} · {x.n} {t('x.people')} · {fmtNum(x.avgKcal)} {t('u.kcal')}</T></Card>)}
    <Note k="x.aggNote" /></Screen>;
}

// ---------- Tienda (Etsy de Parra Apps) ----------
const PRODUCTS = [{ id: 'tee', price: 24 }, { id: 'hoodie', price: 42 }, { id: 'bottle', price: 19 }, { id: 'cap', price: 22 }];
function Mock({ id }: { id: string }) {
  const body = id === 'bottle' ? <Rect x={60} y={14} width={40} height={92} rx={14} fill={C.primary} /> : id === 'cap' ? <Rect x={40} y={40} width={80} height={40} rx={30} fill={C.secondary} /> : <Rect x={40} y={20} width={80} height={86} rx={12} fill={id === 'hoodie' ? C.secondary : C.primary} />;
  return <Svg width={160} height={120}>{body}<Circle cx={80} cy={58} r={14} fill={C.white} /><SvgText x={80} y={63} fontSize={12} fontWeight="900" fill={C.primary} textAnchor="middle">A1</SvgText></Svg>;
}
export function Store() {
  const { t } = useTranslation();
  return <Screen title={`🛍️ ${t('x.t.store')}`}>
    <Card style={{ backgroundColor: C.primary }}><Text style={[s.h2, { color: C.white }]}>💗 {t('x.purpose')}</Text><Text style={[s.t, { color: C.white }]}>{t('x.purposeBody')}</Text></Card>
    <Example /><Pending what="Etsy" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
      {PRODUCTS.map((p) => <Card key={p.id} style={{ width: '47%', alignItems: 'center', padding: 10 }}><Mock id={p.id} /><T style={{ fontWeight: '800', textAlign: 'center' }}>{t(`x.prod.${p.id}`)}</T><Text style={s.muted}>${p.price}</Text></Card>)}
    </View>
    <Btn label={`🛒 ${t('x.openEtsy')}`} onPress={() => alertPending(t)} />
    <Note k="x.storeNote" /></Screen>;
}

// ---------- Impacto: fondo, personas ayudadas, recibos. Cada desembolso lo aprueba Jose en el Panel del Fundador ----------
export type Disb = { id: string; who: string; reason: string; amount: number; date: string; status: 'proposed' | 'approved' | 'rejected'; receipt?: string };
export const FUND_SEED = { raised: 380, goal: 500, list: [
  { id: 'h1', who: 'Persona A (ej.)', reason: 'physio', amount: 250, date: '2026-09-02', status: 'approved', receipt: 'R-0001' },
  { id: 'h2', who: 'Persona B (ej.)', reason: 'nutrition', amount: 180, date: '2026-09-20', status: 'approved', receipt: 'R-0002' },
  { id: 'p1', who: 'Persona C (ej.)', reason: 'physio', amount: 300, date: '2026-10-14', status: 'proposed' },
] as Disb[] };
export function useFund() { return useExt('fund', FUND_SEED); }
export function Impact() {
  const { t } = useTranslation(); const [f] = useFund(); const done = f.list.filter((x) => x.status === 'approved');
  return <Screen title={`💗 ${t('x.t.impact')}`}><Example />
    <Card><Text style={s.h2}>{t('x.fundNext')}</Text><Text testID="fund" style={[s.h1, { color: C.primary }]}>${fmtNum(f.raised)} / ${fmtNum(f.goal)}</Text><Bar value={f.raised} max={f.goal} color={C.primary} /></Card>
    <Card><Text style={s.h2}>{t('x.helped')} ({done.length})</Text>
      {done.map((x) => <T key={x.id}>✓ {x.who} · {t(`x.reason.${x.reason}`)} · ${fmtNum(x.amount)} · {fmtDate(new Date(x.date + 'T12:00:00'))} · 🧾 {x.receipt}</T>)}</Card>
    <Note k="x.impactNote" /><Pending what={t('x.needPay')} /></Screen>;
}

export function Pet() {
  const { t } = useTranslation(); const [pet, setPet] = useExt<{ kind: 'dog' | 'cat'; kg: number; walks: string[] }>('pet', { kind: 'dog', kg: 12, walks: [] });
  const kcal = Math.round(70 * Math.pow(pet.kg, 0.75) * (pet.kind === 'dog' ? 1.6 : 1.2));
  return <Screen title={`🐶 ${t('x.t.pet')}`}>
    <Row><Chip label={`🐶 ${t('x.dog')}`} active={pet.kind === 'dog'} onPress={() => setPet((p) => ({ ...p, kind: 'dog' }))} /><Chip label={`🐱 ${t('x.cat')}`} active={pet.kind === 'cat'} onPress={() => setPet((p) => ({ ...p, kind: 'cat' }))} /></Row>
    <Card><Row>{[4, 8, 12, 25, 35].map((k) => <Chip key={k} label={`${k} kg`} active={pet.kg === k} onPress={() => setPet((p) => ({ ...p, kg: k }))} />)}</Row>
      <Text testID="pet-kcal" style={[s.h2, { color: C.primary }]}>~{fmtNum(kcal)} {t('u.kcal')}/{t('x.day')}</Text></Card>
    {pet.kind === 'dog' && <Btn label={pet.walks.includes(today()) ? '✓ ' + t('x.walked') : `🦮 ${t('x.walk')}`} onPress={() => setPet((p) => ({ ...p, walks: p.walks.includes(today()) ? p.walks : [...p.walks, today()] }))} />}
    <Note k="x.petNote" /></Screen>;
}

/** Registro por WhatsApp: el texto se interpreta igual que llegaría por el canal (aquí, local). */
export function parseMsg(msg: string, name: (id: string) => string) {
  const low = msg.toLowerCase(); const out: { name: string; kcal: number; p: number; c: number; f: number }[] = []; const used = new Set<string>();
  for (const f of LATIN_FOODS) {
    for (const st of [f.name.es, f.name.en, name(f.id)].map((x) => x.toLowerCase().split(/[\s(]/)[0]).filter((x) => x.length > 3)) {
      if (used.has(st)) continue; const m = low.match(new RegExp(`(?:(\\d+)\\s*)?${st.replace(/[.*+?^${}()|[\]\\]/g, '')}`));
      if (m) { used.add(st); const q = m[1] ? Math.min(5, +m[1]) : 1; out.push({ name: name(f.id), kcal: f.kcal * q, p: f.p * q, c: f.c * q, f: f.f * q }); break; }
    }
  }
  return out.slice(0, 4);
}
export function WhatsApp() {
  const { t } = useTranslation(); const { set } = useStore(); const [m, setM] = useState(''); const [res, setRes] = useState<ReturnType<typeof parseMsg> | null>(null);
  return <Screen title={`💬 ${t('x.t.whatsapp')}`}><Pending what="WhatsApp Business" />
    <Card><T>{t('x.waHow')}</T><TextInput testID="wa-input" accessibilityLabel={t('x.waPh')} placeholder={t('x.waPh')} style={s.input} value={m} onChangeText={setM} />
      <Btn label={t('x.waTry')} onPress={() => setRes(parseMsg(m, (id) => t(`foods.${id}`)))} /></Card>
    {res && (res.length ? <Card>{res.map((r, i) => <T key={i}>✓ {r.name} · {fmtNum(r.kcal)} {t('u.kcal')}</T>)}
      <Btn label={`✓ ${t('scan.log')}`} onPress={() => { set((x) => ({ ...x, entries: [...x.entries, ...res.map((r) => ({ id: uid(), date: today(), time: Date.now(), ...r, source: 'manual' as const }))] })); router.replace('/diary'); }} /></Card>
      : <Card><T>{t('manual.noMatch')}</T></Card>)}</Screen>;
}

export function Tips() {
  const { t } = useTranslation();
  return <Screen title={`🎁 ${t('x.t.tips')}`}><Example /><Pending what={t('x.needPay')} />
    {['Chef Mari', 'Coach Leo'].map((n) => <Card key={n}><Text style={s.h2}>{n}</Text><Row>{[1, 3, 5].map((a) => <Chip key={a} label={`$${a}`} onPress={() => alertPending(t)} />)}</Row></Card>)}
    <Note k="x.tipsNote" /></Screen>;
}
