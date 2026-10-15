/** Sección de Datos (Premium): permiso aparte, recibos, encuestas, puntos, informes mensual y anual, panel del fundador.
 *  SOLO recibos y encuestas; la salud nunca entra. Todo local / DATOS DE EJEMPLO hasta aprobar un servidor. */
import { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { Screen, Card, Btn, T, Bar, s, InfoNote, CardTitle } from './ui';
import { C } from './theme';
import { useStore, uid } from './store';
import { fmtNum, curLang } from './i18n';
import { isPremium } from './coach';
import { useExt, Pending, Example, Note } from './ext';
import { AI_URL } from './ai';
import { shrinkForUpload } from './img';
import { DatosTabs } from './taxes-ui';
import { INIT_DATA, DataState, grant, revoke, ingest, receiptsToday, MAX_RECEIPTS_DAY, monthReceipts, summarize, monthlyCost, monthGap, canRedeem, redeem,
  gapSurveyId, deductions, ACCOUNTANT_QS, LISTS, ListId, listInfo, SAMPLE_USERS, filteredView, decideList, Decision, MIN_GROUP, Receipt, danglingPointers } from './datos';

const BASE = AI_URL.replace(/\/estimate$/, '');
export const useData = () => useExt<DataState>('datos', INIT_DATA);
const SURVEYS = ['shop', 'pay', 'brand'];
const OPTS = ['a', 'b', 'c'];
const thisMonth = () => new Date().toISOString().slice(0, 7);
const thisYear = () => String(new Date().getFullYear());
const money = (v: number) => '$' + fmtNum(v, 2);
const SAMPLE: Receipt = { store: 'Supermercado Ejemplo', date: new Date().toISOString().slice(0, 10), category: 'groceries', total: 42.5, currency: 'USD', items: [{ name: 'Arroz', price: 3.2 }, { name: 'Café', price: 8.9 }, { name: 'Frutas', price: 12.4 }] };

function PremLock() {
  const { t } = useTranslation();
  return <Card style={{ backgroundColor: C.mode === 'dark' ? '#2A1F4A' : '#7C3AED' }} testID="locked"><Text style={[s.h2, { color: C.white }]}>🔒 {t('p2.lockT')}</Text>
    <Text style={[s.t, { color: C.white }]}>{t('dt.lock')}</Text><Btn kind="accent" label={`⭐ ${t('coach.unlock')}`} onPress={() => router.push('/paywall')} /></Card>;
}
const Health = () => { const { t } = useTranslation(); return <Card testID="no-health" style={{ borderWidth: 2, borderColor: C.success }}><T style={{ fontWeight: '800' }}>🛡️ {t('dt.noHealth')}</T></Card>; };

function Survey({ id, onDone }: { id: string; onDone: (a: string) => void }) {
  const { t } = useTranslation(); const base = id.startsWith('gap') ? 'gap' : id;
  return <View style={{ gap: 6 }} testID={'survey-' + base}><T style={{ fontWeight: '800' }}>{t(`dt.sv.${base}.q`)}</T>
    {OPTS.map((o) => <Btn key={o} small kind="ghost" label={t(`dt.sv.${base}.${o}`)} onPress={() => onDone(o)} />)}
    <Text style={[s.muted, { fontSize: 14 }]}>{t('dt.svNote')}</Text></View>;
}

export function Datos() {
  const { t } = useTranslation(); const { s: st } = useStore(); const [d, setD] = useData();
  const [box, setBox] = useState(false); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  if (!isPremium(st)) return <Screen title={`🧾 ${t('dt.title')}`}><DatosTabs /><PremLock /><Health /></Screen>;
  const add = (src: 'receipt' | 'survey', payload: any) => {
    const r = ingest(d, src, payload, uid()); if (r.error) { setMsg(t('dt.err.' + (['limit', 'done', 'no_consent'].includes(r.error) ? r.error : 'bad'))); return; }
    setD(() => r.d); setMsg(t('dt.plus', { n: r.pts }));
  };
  const read = async (b64: string, mime: string) => {
    setBusy(true); setMsg('');
    try { const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 45000);
      const res = await fetch(BASE + '/vision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'receipt', lang: curLang(), image: b64, mime }), signal: ctl.signal });
      clearTimeout(tm); const o = await res.json().catch(() => ({})); if (!res.ok) throw new Error(o.error); add('receipt', o);
    } catch { setMsg(t('dt.err.read')); } finally { setBusy(false); }
  };
  const photo = async () => { const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 }); const a = r.assets?.[0];
    if (!r.canceled && a?.base64) { const x = await shrinkForUpload(a.uri, a.base64, a.mimeType || 'image/jpeg'); read(x.b64, x.mime); } };
  const pdf = () => { if (Platform.OS !== 'web') return; const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/pdf';
    inp.onchange = () => { const f = inp.files?.[0]; if (!f) return; if (f.size > 2.8e6) { setMsg(t('dt.err.big')); return; } const fr = new FileReader(); fr.onload = () => read(String(fr.result).split(',')[1], 'application/pdf'); fr.readAsDataURL(f); }; inp.click(); };
  const done = new Set(Object.values(d.master).map((m) => m.survey?.id));
  return <Screen title={`🧾 ${t('dt.title')}`}>
    <DatosTabs /><Example /><Pending what={t('dt.server')} /><Health />
    <Card testID="consent"><CardTitle>✋ {t('dt.consentT')}</CardTitle>
      {d.consent ? <><T testID="consent-on">✓ {t('dt.consentOn')}</T>
        <Btn kind="danger" label={t('dt.revoke')} onPress={() => { setD((x) => revoke(x)); setMsg(t('dt.revoked')); }} />
        <Btn small kind="ghost" label={t('dt.deleteAll')} onPress={() => { setD((x) => revoke(x, Date.now(), 'delete')); setMsg(t('dt.revoked')); }} /></>
      : <><T>{t('dt.consentBody')}</T>
        <Pressable testID="consent-box" accessibilityState={{ checked: box }} aria-checked={box} role="checkbox" accessibilityLabel={t('dt.consentBox')} onPress={() => setBox((v) => !v)}
          style={{ flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 48 }}>
          <View style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 3, borderColor: C.secondary, alignItems: 'center', justifyContent: 'center', backgroundColor: box ? C.secondary : C.white }}><Text style={{ color: C.white, fontWeight: '900' }}>{box ? '✓' : ''}</Text></View>
          <Text style={[s.t, { flex: 1 }]}>{t('dt.consentBox')}</Text></Pressable>
        <Btn label={t('dt.accept')} kind={box ? 'primary' : 'ghost'} onPress={() => box && setD((x) => grant(x))} />
        <Text style={[s.muted, { fontSize: 14 }]}>{t('dt.consentLegal')}</Text></>}</Card>
    {msg ? <Text testID="dt-msg" style={[s.h2, { color: C.secondary }]}>{msg}</Text> : null}
    {d.consent ? <>
      <Card><Text style={s.h2}>⭐ {t('dt.points')}: <Text testID="dt-points">{d.points}</Text></Text>
        <T>{t('dt.rules')}</T><T testID="dt-today">{t('dt.today', { n: receiptsToday(d), max: MAX_RECEIPTS_DAY })}</T></Card>
      <Card><CardTitle>🧾 {t('dt.receipts')}</CardTitle>
        <Btn label={`📸 ${t('dt.photo')}`} onPress={photo} />
        {Platform.OS === 'web' ? <Btn kind="secondary" label={`📄 ${t('dt.pdf')}`} onPress={pdf} /> : null}
        <Btn small kind="ghost" label={t('dt.sample')} onPress={() => add('receipt', { ...SAMPLE, total: +(20 + Math.random() * 60).toFixed(2) })} />
        {busy ? <T>⏳ {t('dt.reading')}</T> : null}</Card>
      <Card><CardTitle>📝 {t('dt.surveys')}</CardTitle>
        {SURVEYS.filter((x) => !done.has(x)).map((x) => <Survey key={x} id={x} onDone={(a) => add('survey', { id: x, answers: { a } })} />)}
        {SURVEYS.every((x) => done.has(x)) ? <T>✓ {t('dt.allSurveys')}</T> : null}</Card>
      <Btn kind="accent" label={`📅 ${t('dt.month')}`} onPress={() => router.push('/datos-mes' as any)} />
      <Btn kind="accent" label={`📚 ${t('dt.year')}`} onPress={() => router.push('/datos-anual' as any)} />
    </> : null}
    <Note k="dt.localNote" /></Screen>;
}

function ReportScreen({ kind }: { kind: 'month' | 'year' }) {
  const { t } = useTranslation(); const { s: st } = useStore(); const [d, setD] = useData(); const [ans, setAns] = useState<Record<string, string>>({}); const qp = useLocalSearchParams<{ period?: string }>();
  if (!isPremium(st)) return <Screen title={`📅 ${t(kind === 'month' ? 'dt.month' : 'dt.year')}`}><PremLock /></Screen>;
  const want = typeof qp.period === 'string' && (kind === 'month' ? /^\d{4}-\d{2}$/ : /^\d{4}$/).test(qp.period) ? qp.period : '';
  const period = want || (kind === 'month' ? thisMonth() : thisYear());
  const rs = Object.values(d.master).filter((m) => m.source === 'receipt' && m.receipt!.date.startsWith(period)).map((m) => m.receipt!);
  const sum = summarize(rs); const c = canRedeem(d, kind, period); const have = d.reports.some((r) => r.kind === kind && r.period === period);
  const gap = kind === 'month' ? monthGap(d, period) : Math.max(0, 100 - d.points);
  const ded = deductions(rs);
  return <Screen title={kind === 'month' ? `📅 ${t('dt.month')}` : `📚 ${t('dt.year')}`}><Example />
    {!d.consent ? <Card><T>{t('dt.needConsent')}</T><Btn label={t('dt.title')} onPress={() => router.push('/datos' as any)} /></Card> : null}
    <Card testID="cost"><CardTitle>{t('dt.cost', { n: c.cost })}</CardTitle><T>{t('dt.youHave', { n: d.points })}</T>
      <Bar value={Math.min(d.points, c.cost)} max={c.cost} color={C.primary} />
      {kind === 'month' ? <T>{t('dt.gapM', { n: gap })}</T> : <T>{t('dt.gapY')}</T>}</Card>
    {d.consent && !c.gapDone ? <Card><CardTitle>🧩 {t('dt.gapT')}</CardTitle>
      <Survey id={gapSurveyId(kind, period)} onDone={(a) => { const r = ingest(d, 'survey', { id: gapSurveyId(kind, period), answers: { a } }, uid()); if (!r.error) setD(() => r.d); }} /></Card> : null}
    {!have ? <Btn label={c.ok ? `✓ ${t('dt.redeem', { n: c.cost })}` : `🔒 ${t('dt.notYet')}`} kind={c.ok ? 'primary' : 'ghost'} onPress={() => { const n = redeem(d, kind, period); if (n) setD(() => n); }} /> : null}
    {have ? <Card testID="report"><CardTitle>{t('dt.summary')} · {period}</CardTitle>
      <T>{t('dt.total')}: {money(sum.total)} · {sum.count} {t('dt.receipts').toLowerCase()}</T>
      {sum.by.map((x) => <T key={x.cat}>• {t('dt.cat.' + x.cat)}: {money(x.v)}</T>)}
      {kind === 'year' ? <>
        <CardTitle>💡 {t('dt.dedT')}</CardTitle>
        {Object.keys(ded).length ? Object.entries(ded).map(([k, v]) => <T key={k}>• {t('dt.ded.' + k)}: {money(v)}</T>) : <T>{t('dt.dedNone')}</T>}
        <CardTitle>🧑‍💼 {t('dt.accQ')}</CardTitle>
        {ACCOUNTANT_QS.map((q) => <View key={q} style={{ gap: 4 }}><T>{t('dt.acc.' + q)}</T><TextInput value={ans[q] || ''} onChangeText={(v) => setAns((a) => ({ ...a, [q]: v.slice(0, 120) }))} style={[s.input, { minHeight: 48 }]} /></View>)}
        <Btn label={`📄 ${t('dt.pdfDl')}`} onPress={() => downloadPdf(period, sum, ded, ans)} />
        <Btn kind="ghost" label={`✉️ ${t('dt.toAcc')}`} onPress={() => {}} /><Pending what={t('dt.toAccP')} />
      </> : null}
      <Text testID="disclaimer" style={[s.muted, { fontWeight: '800' }]}>⚠️ {t('dt.disclaimer')}</Text></Card> : null}
    <Note k="dt.localNote" /></Screen>;
}
export const MonthReport = () => <ReportScreen kind="month" />;
export const YearReport = () => <ReportScreen kind="year" />;

// ---------- PDF mínimo (sin librerías). Idiomas no latinos usan inglés en el PDF; la pantalla sí sale en su idioma. ----------
export function makePdf(lines: string[]): Uint8Array {
  const esc = (x: string) => x.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?').replace(/([\\()])/g, '\\$1');
  const pages: string[][] = []; for (let i = 0; i < lines.length; i += 48) pages.push(lines.slice(i, i + 48));
  const objs: string[] = ['<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
  const kids: number[] = [];
  for (const pg of pages) {
    const body = 'BT /F1 11 Tf 50 800 Td 15 TL ' + pg.map((l) => `(${esc(l)}) '`).join(' ') + ' ET';
    objs.push(`<< /Length ${body.length} >>\nstream\n${body}\nendstream`); const cs = objs.length;
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${cs} 0 R >>`); kids.push(objs.length);
  }
  objs[1] = `<< /Type /Pages /Kids [${kids.map((k) => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
  let out = '%PDF-1.4\n'; const off: number[] = [];
  objs.forEach((o, i) => { off.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length; out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + off.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
  return Uint8Array.from(out, (ch) => ch.charCodeAt(0) & 255);
}
const LATIN = ['es', 'en', 'pt', 'fr', 'de', 'it', 'tr'];
function downloadPdf(period: string, sum: ReturnType<typeof summarize>, ded: Record<string, number>, ans: Record<string, string>) {
  const t = i18n.getFixedT(LATIN.includes(curLang()) ? curLang() : 'en');
  const L = [`Angie One - ${t('dt.year')} ${period}`, '', `${t('dt.total')}: ${money(sum.total)} (${sum.count})`, ...sum.by.map((x) => `- ${t('dt.cat.' + x.cat)}: ${money(x.v)}`), '', t('dt.dedT'),
    ...(Object.keys(ded).length ? Object.entries(ded).map(([k, v]) => `- ${t('dt.ded.' + k)}: ${money(v)}`) : [t('dt.dedNone')]), '', t('dt.accQ'),
    ...ACCOUNTANT_QS.flatMap((q) => [`- ${t('dt.acc.' + q)}`, `  > ${ans[q] || '...'}`]), '', `!! ${t('dt.disclaimer')}`];
  const wrapped = L.flatMap((l) => l.match(/.{1,90}(\s|$)|.{1,90}/g) || ['']);
  if (Platform.OS !== 'web') return;
  const url = URL.createObjectURL(new Blob([makePdf(wrapped) as unknown as BlobPart], { type: 'application/pdf' }));
  const a = document.createElement('a'); a.href = url; a.download = `angie-one-informe-${period}.pdf`; document.body.appendChild(a); a.click(); a.remove();
}

// ---------- Panel del fundador: listas, aviso de lista lista, estudio de mercado, copia maestra ----------
export function FounderData() {
  const { t } = useTranslation(); const [d] = useData(); const [dec, setDec] = useExt<Record<string, Decision>>('datosDec', {}); const [open, setOpen] = useState<ListId | null>(null);
  const mine = (l: ListId) => (d.lists[l] || []).length;
  const infos = LISTS.map((l) => listInfo(l, SAMPLE_USERS[l] + (mine(l) ? 1 : 0), SAMPLE_USERS[l] * 9 + mine(l), Math.round(SAMPLE_USERS[l] / 8)));
  const ready = infos.filter((i) => i.ready && dec[i.id]?.v !== 'approved');
  const pointers = LISTS.reduce((n, l) => n + mine(l), 0);
  return <Card testID="founder-data"><CardTitle>🗂️ {t('dt.foT')}</CardTitle><Example /><Pending what={t('dt.server')} />
    <T>{t('dt.foMaster', { n: Object.keys(d.master).length, p: pointers, bad: danglingPointers(d).length })}</T>
    <T>{t('dt.foConsent', { g: d.log.filter((x) => x.action === 'grant').length, r: d.log.filter((x) => x.action !== 'grant').length })}</T>
    {ready.length ? <View testID="ready-notice" style={{ backgroundColor: C.warnBg, borderRadius: 12, padding: 10, gap: 4 }}><Text style={[s.h2, { color: C.warning }]}>🔔 {t('dt.readyN', { n: ready.length })}</Text></View> : null}
    {infos.map((i) => <View key={i.id} style={{ gap: 6, borderTopWidth: 1, borderColor: C.border, paddingTop: 8 }} testID={'list-' + i.id}>
      <Pressable accessibilityRole="button" onPress={() => setOpen(open === i.id ? null : i.id)} style={{ minHeight: 48, justifyContent: 'center' }}>
        <Text style={[s.h2, { fontSize: 18 }]}>{i.ready ? '🟢' : '🟡'} {t('dt.list.' + i.id)}</Text>
        <T>{t('dt.foRow', { u: i.users, r: fmtNum(i.records), w: i.week })}</T></Pressable>
      <Bar value={i.users} max={i.goalUsers} color={i.ready ? C.success : C.warning} />
      <Text style={s.muted}>{t('dt.foGoal', { n: Math.min(i.users, MIN_GROUP), m: MIN_GROUP })} · {t('dt.foVal', { a: fmtNum(i.oneTime[0]), b: fmtNum(i.oneTime[1]), c: fmtNum(i.sub[0]), d: fmtNum(i.sub[1]) })}</Text>
      {dec[i.id] && open !== i.id ? <Text testID={'dec-' + i.id} style={{ fontWeight: '900', color: dec[i.id].v === 'approved' ? C.success : C.primary }}>{dec[i.id].v === 'approved' ? `✓ ${t('fo.approved')} · ⏳ ${t('dt.noSale')}` : `⏸ ${t('dt.later')}`}</Text> : null}
      {(open === i.id || !dec[i.id]) && i.ready ? <View testID={'study-' + i.id} style={{ gap: 4, backgroundColor: C.bg, borderRadius: 12, padding: 10 }}>
        <T style={{ fontWeight: '800' }}>📈 {t('dt.study')} · {t('dt.estimated')}</T>
        <T>{t('dt.stType', { l: t('dt.list.' + i.id), n: fmtNum(i.records), u: i.users })}</T>
        <T>💰 {t('dt.stOne', { a: fmtNum(i.oneTime[0]), b: fmtNum(i.oneTime[1]) })}</T>
        <T>🔁 {t('dt.stSub', { a: fmtNum(i.sub[0]), b: fmtNum(i.sub[1]) })}</T>
        <T>🏢 {t('dt.stBuy')}: {i.buyers.map((b) => t('dt.buyer.' + b)).join(', ')}</T>
        <T>🔑 {t('dt.stAccess')}: {i.access.map((b) => t('dt.buyer.' + b)).join(', ')}</T>
        <Text style={[s.muted, { fontSize: 14 }]}>{t('dt.stSrc')}</Text>
        <T>👁️ {t('dt.view')}: {(filteredView(i.id, Object.values(d.master), i.users)?.byCategory || []).slice(0, 3).map((x) => `${t('dt.cat.' + x.cat)} ${fmtNum(x.share, 1)}%`).join(' · ') || '—'}</T>
        {dec[i.id] ? <Text testID={'dec-' + i.id} style={{ fontWeight: '900', color: dec[i.id].v === 'approved' ? C.success : C.primary }}>{dec[i.id].v === 'approved' ? `✓ ${t('fo.approved')} · ⏳ ${t('dt.noSale')}` : `⏸ ${t('dt.later')}`}</Text>
          : <View style={s.row}><Btn label={t('fo.approve')} onPress={() => setDec((x) => ({ ...x, [i.id]: decideList(i.id, 'approved') }))} style={{ flex: 1, backgroundColor: C.success }} />
            <Btn kind="ghost" label={t('dt.later')} onPress={() => setDec((x) => ({ ...x, [i.id]: decideList(i.id, 'later') }))} style={{ flex: 1 }} /></View>}
      </View> : null}
      {!i.ready ? <Text style={[s.muted, { fontSize: 14 }]}>🔒 {t('dt.min50', { n: MIN_GROUP })}</Text> : null}
    </View>)}
    <InfoNote text={t('dt.foNote')} /></Card>;
}
