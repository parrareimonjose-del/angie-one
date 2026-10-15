/** «Taxes e impuestos»: sección propia y visible (orden maestra, puntos 4-6). Recibos foto/PDF, puntos, informe mensual,
 *  informe anual de impuestos con deducciones, preguntas del contador, PDF y enviar al contador. Bloqueada → vista previa + Premium. */
import { View, Text } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, Chip, T, s, ListRow, HeroPhoto, FOOD, CardTitle } from './ui';
import { C } from './theme';
import { useStore } from './store';
import { isPremium } from './coach';
import { useData } from './datos-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import i18n from 'i18next';
import { useExt } from './ext';
import { fmtNum, fmtLocale } from './i18n';
import { toast } from './ui';
import { INIT_TAX, TaxState, autoGenerate, inSeason, daysToSeason, seasonEnd, TAX_SEASONS, AutoReport } from './taxes';

export const useTax = () => useExt<TaxState>('taxes', INIT_TAX);
const money = (v: number) => '$' + fmtNum(v, 2);
const label = (a: AutoReport) => a.kind === 'year' ? a.period : new Date(a.period + '-15').toLocaleDateString(fmtLocale(), { month: 'long', year: 'numeric' });

/** Corre al abrir la app y cada hora: genera lo que falte y avisa (aviso dentro de la app + notificación local en web si hay permiso). */
export function AutoTaxes() {
  const [d] = useData(); const [tx, setTx] = useTax();
  useEffect(() => {
    const run = () => { const r = autoGenerate(d, tx); if (!r.fresh.length) return; setTx(() => r.tx);
      for (const a of r.fresh) { const m = i18n.t(a.kind === 'year' ? 'tx.readyY' : 'tx.readyM', { p: label(a) }); toast('💼 ' + m);
        try { if (Platform.OS === 'web' && typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification('Angie One', { body: m }); } catch { /* sin notificaciones */ } } };
    run(); const i = setInterval(run, 3600e3); return () => clearInterval(i);
  }, [d, tx]);
  return null;
}

function Timeline() {
  const { t } = useTranslation(); const [tx, setTx] = useTax(); const now = new Date();
  const inS = inSeason(now, tx.country); const n = daysToSeason(now, tx.country);
  const end = seasonEnd(now, tx.country).toLocaleDateString(fmtLocale(), { day: 'numeric', month: 'long' });
  const list = [...tx.auto].sort((a, b) => (a.period < b.period ? 1 : -1));
  return <>
    <Card testID="tax-season">
      <Text style={s.label}>{t('tx.season')}</Text>
      <Text style={[s.h1, { color: inS ? C.success : C.primary }]} testID="season-count">{inS ? t('tx.seasonIn', { end }) : t('tx.seasonDays', { n })}</Text>
      <T>{t('tx.auto')}</T>
      <Text style={s.muted}>{t('tx.country')}</Text>
      <View style={[s.row, { flexWrap: 'wrap' }]}>{Object.keys(TAX_SEASONS).map((c) => <Chip key={c} label={c} active={tx.country === c} onPress={() => setTx((x) => ({ ...x, country: c }))} />)}</View>
    </Card>
    <Card testID="tax-timeline" style={{ gap: 4 }}>
      <CardTitle>🗓️ {t('tx.timeline')}</CardTitle>
      {list.length ? list.map((a) => <ListRow key={a.kind + a.period} testID={`auto-${a.kind}-${a.period}`} icon={a.kind === 'year' ? '📚' : '📅'}
        label={`${a.kind === 'year' ? t('tx.f4') : t('tx.f3')} · ${label(a)}`}
        sub={t('tx.sum', { n: a.count, total: money(a.total) }) + (a.ded != null ? ' · ' + t('tx.dedL', { v: money(a.ded) }) : '')}
        onPress={() => { setTx((x) => ({ ...x, auto: x.auto.map((y) => (y === a ? { ...y, seen: true } : y)) })); router.push({ pathname: a.kind === 'year' ? '/datos-anual' : '/datos-mes', params: { period: a.period } } as any); }} />)
        : <T>{t('tx.none')}</T>}
    </Card>
  </>;
}

const FEATS: [string, string][] = [['📸', 'f1'], ['⭐', 'f2'], ['📅', 'f3'], ['📚', 'f4'], ['🧑‍💼', 'f5'], ['📄', 'f6']];

/** Pestañas dentro de Datos: «Recibos y datos» | «Taxes». */
export function DatosTabs() {
  const { t } = useTranslation(); const path = usePathname();
  return <View style={[s.row, { flexWrap: 'wrap' }]} testID="datos-tabs">
    <Chip label={`🧾 ${t('dt.title')}`} active={path === '/datos'} onPress={() => router.replace('/datos' as any)} />
    <Chip label={`💼 ${t('tx.title')}`} active={path === '/taxes'} onPress={() => router.replace('/taxes' as any)} />
  </View>;
}

/** Tarjeta para Inicio y Más. */
export function TaxesCard() {
  const { t } = useTranslation(); const [tx] = useTax(); const fresh = tx.auto.filter((a) => !a.seen).length;
  return <Card testID="taxes-card">
    <View style={s.row}><View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 28 }}>💼</Text></View>
      <View style={{ flex: 1 }}><CardTitle>{t('tx.title')}</CardTitle><Text style={s.muted}>{t('tx.short')}</Text></View>
      {fresh ? <View testID="taxes-badge" style={{ minWidth: 28, height: 28, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}><Text style={{ color: '#fff', fontWeight: '800' }}>{fresh}</Text></View> : null}</View>
    <Text style={[s.muted, { fontWeight: '700' }]}>⏳ {inSeason(new Date(), tx.country) ? t('tx.season') : t('tx.seasonDays', { n: daysToSeason(new Date(), tx.country) })}</Text>
    <Btn testID="go-taxes" label={t('tx.open')} onPress={() => router.push('/taxes' as any)} />
  </Card>;
}

function SeasonMini() {
  const { t } = useTranslation(); const [tx] = useTax(); const now = new Date(); const inS = inSeason(now, tx.country);
  return <Card testID="tax-season"><Text style={s.label}>{t('tx.season')}</Text><Text style={[s.h2, { color: inS ? C.success : C.primary }]}>{inS ? t('tx.seasonIn', { end: seasonEnd(now, tx.country).toLocaleDateString(fmtLocale(), { day: 'numeric', month: 'long' }) }) : t('tx.seasonDays', { n: daysToSeason(now, tx.country) })}</Text><Text style={s.muted}>{t('tx.auto')}</Text></Card>;
}

function Preview() {
  const { t } = useTranslation();
  return <>
    <Card testID="taxes-preview" style={{ gap: 12 }}>
      <CardTitle>✨ {t('tx.includes')}</CardTitle>
      {FEATS.map(([i, k]) => <ListRow key={k} icon={i} label={t(`tx.${k}`)} sub={t(`tx.${k}d`)} />)}
    </Card>
    <Card testID="taxes-sample" style={{ gap: 6 }}>
      <Text style={s.label}>{t('tx.sample')}</Text>
      <CardTitle>📚 {t('tx.sampleT')}</CardTitle>
      {[['🛒', 'groceries', '$2,480'], ['🍽️', 'restaurant', '$360'], ['💊', 'pharmacy', '$215']].map(([i, k, v]) => <View key={k} style={[s.row, { justifyContent: 'space-between' }]}><T>{i} {t('dt.cat.' + k)}</T><T style={{ fontWeight: '800' }}>{v}</T></View>)}
      <View style={{ height: 1, backgroundColor: C.border, marginVertical: 4 }} />
      <T style={{ fontWeight: '800', color: C.success }}>💡 {t('tx.sampleDed')}</T>
      <Text style={[s.muted, { fontSize: 14 }]}>⚠️ {t('dt.disclaimer')}</Text>
    </Card>
    <Btn testID="taxes-cta" label={`⭐ ${t('tx.cta')}`} onPress={() => router.push('/paywall')} />
  </>;
}

export function TaxesScreen() {
  const { t } = useTranslation(); const { s: st } = useStore(); const [d] = useData();
  const prem = isPremium(st);
  return <Screen title={`💼 ${t('tx.title')}`}>
    <DatosTabs />
    <HeroPhoto source={FOOD.breakfast} height={150} testID="taxes-hero">
      <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>{t('tx.heroT')}</Text>
      <Text style={{ color: '#fff', fontSize: 16 }}>{t('tx.short')}</Text>
    </HeroPhoto>
    {!prem ? <><SeasonMini /><Preview /></> : <>
      <Timeline />
      <Card><CardTitle>⭐ {t('dt.points')}: {d.points}</CardTitle><T>{t('dt.rules')}</T></Card>
      <Card style={{ gap: 4 }}>
        <ListRow testID="tx-receipts" icon="📸" label={t('tx.f1')} sub={t('tx.f1d')} onPress={() => router.push('/datos' as any)} />
        <ListRow testID="tx-month" icon="📅" label={t('tx.f3')} sub={t('tx.f3d')} onPress={() => router.push('/datos-mes' as any)} />
        <ListRow testID="tx-year" icon="📚" label={t('tx.f4')} sub={t('tx.f4d')} onPress={() => router.push('/datos-anual' as any)} />
        <ListRow icon="🧑‍💼" label={t('tx.f5')} sub={t('tx.f5d')} onPress={() => router.push('/datos-anual' as any)} />
        <ListRow icon="📄" label={t('tx.f6')} sub={t('tx.f6d')} onPress={() => router.push('/datos-anual' as any)} />
      </Card>
      {!d.consent ? <Card><T>{t('dt.needConsent')}</T><Btn label={t('dt.title')} onPress={() => router.push('/datos' as any)} /></Card> : null}
      <Text style={[s.muted, { fontSize: 14 }]}>⚠️ {t('dt.disclaimer')}</Text>
    </>}
  </Screen>;
}
