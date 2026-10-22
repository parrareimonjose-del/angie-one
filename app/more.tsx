import { CLONE_ENABLED } from '../src/flags';
import { router } from 'expo-router';
import { useState } from 'react';
import { useFounderMode } from '../src/grants-ui';
import { Text } from 'react-native';
import { TaxesCard } from '../src/taxes-ui';
import { useTranslation } from 'react-i18next';
import { Screen, Btn, Card, ListRow, s } from '../src/ui';
/** «Más» agrupado en listas de vidrio con filas de 60 px (rediseño). */
export default function More() {
  const { t } = useTranslation();
  const [fm] = useFounderMode(); const [taps, setTaps] = useState(0);
  const go = (p: string) => () => router.push(p as any);
  return (
    <Screen title={t('more.title')}>
      <Btn kind="accent" label={`⭐  ${t('more.premium')}`} onPress={go('/paywall')} />
      <Card style={{ gap: 2 }}>
        <ListRow icon="🌱" label={t('p2.hub')} onPress={go('/plus')} />
        <ListRow icon="✨" label={t('x.explore')} onPress={go('/explore')} />
        <ListRow icon="💪" label={t('coach.title')} onPress={go('/coach')} />
        {CLONE_ENABLED ? <ListRow testID="more-clone" icon="🧬" label={t('cl.title')} onPress={go('/clon')} /> : null}
        <ListRow testID="more-habits" icon="🌟" label={t('t6.hTitle')} onPress={go('/habits')} />
        <ListRow testID="more-energy" icon="🔥" label={t('t6.eTitle')} onPress={go('/energy')} />
        <ListRow testID="more-progress" icon="📷" label={t('t6.pTitle')} onPress={go('/progress')} />
        <ListRow testID="more-lessons" icon="🎧" label={t('t6.lTitle')} onPress={go('/lessons')} />
        <ListRow testID="more-friends" icon="🤝" label={t('t6.fTitle')} onPress={go('/friends')} />
        <ListRow testID="more-nutgoals" icon="🎯" label={t('t6.nTitle')} onPress={go('/nutgoals')} />
        <ListRow testID="more-recipes" icon="🍲" label={t('y5.rTitle')} onPress={go('/recipes')} />
        <ListRow testID="more-days" icon="📅" label={t('y5.dtTitle')} onPress={go('/daytargets')} />
        <ListRow testID="more-well" icon="😊" label={t('y5.wTitle')} onPress={go('/wellness')} />
        <ListRow testID="more-nutri" icon="🧪" label={t('y5.nTitle')} onPress={go('/nutrients')} />
        <ListRow testID="more-tut" icon="🎬" label={t('tu.title')} onPress={go('/tutoriales')} />
      </Card>
      <Card style={{ gap: 2 }}>
        <ListRow icon="🏷️" label={t('more.barcode')} onPress={go('/barcode')} />
        <ListRow icon="✍️" label={t('more.manual')} onPress={go('/manual')} />
      </Card>
      <TaxesCard />
      <Card style={{ gap: 2 }}>
        <ListRow icon="🧾" label={t('dt.title')} onPress={go('/datos')} />
        <ListRow icon="⚙️" label={t('more.settings')} onPress={go('/settings')} />
        {fm ? <ListRow icon="👑" label={t('more.founder')} onPress={go('/founder')} /> : null}
      </Card>
      <Text testID="more-brand" onPress={() => { const n = taps + 1; setTaps(n); if (n >= 5) router.push('/founder' as any); }} style={[s.muted, { textAlign: 'center' }]}>Angie One</Text>
    </Screen>
  );
}
