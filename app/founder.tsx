import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, T, s } from '../src/ui';
import { useStore } from '../src/store';
import { C } from '../src/theme';
import { router } from 'expo-router';
import { fmtNum } from '../src/i18n';
import { ADS } from '../src/ext';
import { DevAI } from '../src/p2';
import { FounderData } from '../src/datos-ui';
import { LedgerCard, PanelMaestroCard, AdminAICard } from '../src/faltantes-ui';
export const split = (net: number) => ({ ops: Math.round(net * 60) / 100, growth: Math.round(net * 25) / 100, social: Math.round(net * 15) / 100 });

// Panel del Fundador v1 (placeholder): la IA Administrativa propone, Jose aprueba. Nunca mueve dinero.
const CARD_IDS = ['c1', 'c2', 'c3'];
export default function Founder() {
  const { t, i18n } = useTranslation(); const { s: st, set } = useStore();
  const cards = CARD_IDS.map((id) => ({ id, title: t(`foCards.${id}.title`), body: t(`foCards.${id}.body`) }));
  const decide = (id: string, v: 'approved' | 'rejected') => set((x) => ({ ...x, founder: { ...x.founder, [id]: v } }));
  return (
    <Screen title={`👑 ${t('fo.title')}`}>
      <Text style={s.muted}>{t('fo.sub')}</Text>
      <View style={{ backgroundColor: C.accent, borderRadius: 12, padding: 10 }}><Text style={{ color: C.onAccent, fontWeight: '800' }}>{t('fo.demo')}</Text></View>
      <Card>
        <Text style={s.h2}>{t('fo.kpi')}</Text>
        <View style={[s.row, { justifyContent: 'space-around' }]}>
          {[[t('fo.users'), '1'], [t('fo.paying'), '0'], [t('fo.mrr'), '0 $']].map(([k, v]) => <View key={k} style={{ alignItems: 'center' }}><Text style={[s.h1, { color: C.secondary }]}>{v}</Text><Text style={s.muted}>{k}</Text></View>)}
        </View>
      </Card>
      <Card testID="split"><Text style={s.h2}>{t('x.splitTitle')}</Text>
        {(() => { const sp = split(1000); return <><T>60% · {t('fx.sFounder')}: ${fmtNum(sp.ops)}</T><T>25% · {t('fx.sApp')}: ${fmtNum(sp.growth)}</T><T>15% · {t('fx.sTaxes')}: ${fmtNum(sp.social)}</T></>; })()}
        <Text style={s.muted}>{t('x.splitNote')}</Text></Card>
      <Card><Text style={s.h2}>{t('x.adsTitle')}</Text>{ADS.map((a) => <T key={a.id}>✓ {a.brand}</T>)}<Text style={s.muted}>{t('x.adWhy')}</Text></Card>
      <LedgerCard />
      <AdminAICard />
      <PanelMaestroCard />
      <FounderData />
      <DevAI />
      <Btn kind="ghost" label={`📊 ${t('x.aggTitle')}`} onPress={() => router.push('/aggregate')} />
      {cards.map((c) => (
        <Card key={c.id}>
          <Text style={s.h2}>{c.title}</Text><T>{c.body}</T>
          {st.founder[c.id] ? <Text style={{ fontWeight: '900', fontSize: 18, color: st.founder[c.id] === 'approved' ? C.success : C.primary }}>{st.founder[c.id] === 'approved' ? '✓ ' + t('fo.approved') : '✕ ' + t('fo.rejected')}</Text>
            : <View style={s.row}><Btn label={t('fo.approve')} onPress={() => decide(c.id, 'approved')} style={{ flex: 1, backgroundColor: C.success }} /><Btn kind="danger" label={t('fo.reject')} onPress={() => decide(c.id, 'rejected')} style={{ flex: 1 }} /></View>}
        </Card>))}
    </Screen>
  );
}
