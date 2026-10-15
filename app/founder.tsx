import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen, Card, Btn, T, s } from '../src/ui';
import { useStore } from '../src/store';
import { C } from '../src/theme';

// Panel del Fundador v1 (placeholder): la IA Administrativa propone, Jose aprueba. Nunca mueve dinero.
const CARDS = {
  es: [
    { id: 'c1', title: 'Subir a un servicio superior', body: 'Ingresos > costos 3 meses seguidos. Propuesta: pasar de capa gratis a plan básico (ejemplo).' },
    { id: 'c2', title: 'Ayuda social del mes', body: 'Destinar el 15 % de la ganancia neta a personas necesitadas (ejemplo: 0 $ porque aún no hay ingresos).' },
    { id: 'c3', title: 'Publicar actualización 0.1.1', body: 'La IA Programadora corrigió textos en portugués. Lanzamiento por etapas al 10 %.' },
  ],
  en: [
    { id: 'c1', title: 'Upgrade to a higher service', body: 'Revenue > costs 3 months in a row. Proposal: move from free tier to basic plan (sample).' },
    { id: 'c2', title: 'Monthly social aid', body: 'Allocate 15% of net profit to people in need (sample: $0, no revenue yet).' },
    { id: 'c3', title: 'Publish update 0.1.1', body: 'Programmer AI fixed Portuguese texts. Staged rollout at 10%.' },
  ],
  pt: [
    { id: 'c1', title: 'Subir para um serviço superior', body: 'Receita > custos por 3 meses seguidos. Proposta: sair da camada grátis para o plano básico (exemplo).' },
    { id: 'c2', title: 'Ajuda social do mês', body: 'Destinar 15% do lucro líquido a pessoas necessitadas (exemplo: US$ 0, ainda sem receita).' },
    { id: 'c3', title: 'Publicar atualização 0.1.1', body: 'A IA Programadora corrigiu textos em português. Lançamento gradual em 10%.' },
  ],
};
export default function Founder() {
  const { t, i18n } = useTranslation(); const { s: st, set } = useStore();
  const cards = CARDS[(i18n.language as 'es') in CARDS ? (i18n.language as 'es') : 'en'];
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
      {cards.map((c) => (
        <Card key={c.id}>
          <Text style={s.h2}>{c.title}</Text><T>{c.body}</T>
          {st.founder[c.id] ? <Text style={{ fontWeight: '900', fontSize: 18, color: st.founder[c.id] === 'approved' ? C.success : C.primary }}>{st.founder[c.id] === 'approved' ? '✓ ' + t('fo.approved') : '✕ ' + t('fo.rejected')}</Text>
            : <View style={s.row}><Btn label={t('fo.approve')} onPress={() => decide(c.id, 'approved')} style={{ flex: 1, backgroundColor: C.success }} /><Btn kind="danger" label={t('fo.reject')} onPress={() => decide(c.id, 'rejected')} style={{ flex: 1 }} /></View>}
        </Card>))}
    </Screen>
  );
}
