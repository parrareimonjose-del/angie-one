/** Receta en modo «clase de cocina»: ingredientes con cantidades, mise en place, pasos numerados grandes y avisos destacados. */
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { C } from './theme';

const box = (bg: string, bd: string) => ({ backgroundColor: bg, borderLeftWidth: 5, borderLeftColor: bd, borderRadius: 14, padding: 12, gap: 4 });
function Note({ icon, title, text, bg, bd, testID }: { icon: string; title: string; text?: string; bg: string; bd: string; testID?: string }) {
  if (!text) return null;
  return <View testID={testID} style={box(bg, bd)}><Text style={{ fontWeight: '900', color: bd, fontSize: 15 }}>{icon} {title}</Text><Text style={{ color: C.text, fontSize: 16, lineHeight: 23 }}>{text}</Text></View>;
}
export function ChefSteps({ ing, prep, steps, tip, oops, done, plate }: { ing?: string[]; prep?: string[]; steps: string[]; tip?: string; oops?: string; done?: string; plate?: string }) {
  const { t } = useTranslation();
  const H = ({ children }: { children: string }) => <Text style={{ fontSize: 17, fontWeight: '900', color: C.text, marginTop: 6 }}>{children}</Text>;
  return <View testID="chef-steps" style={{ gap: 10 }}>
    {ing?.length ? <><H>{`🛒 ${t('y5.qty')}`}</H>{ing.map((x, j) => <Text key={j} style={{ color: C.text, fontSize: 16, lineHeight: 23 }}>• {x}</Text>)}</> : null}
    {prep?.length ? <><H>{`🔪 ${t('y5.prep')}`}</H>{prep.map((x, j) => <Text key={j} style={{ color: C.text, fontSize: 16, lineHeight: 23 }}>• {x}</Text>)}</> : null}
    <H>{`📋 ${t('y5.steps')}`}</H>
    {steps.map((x, j) => <View key={j} testID="chef-step" style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}><Text style={{ color: '#fff', fontWeight: '900' }}>{j + 1}</Text></View>
      <Text style={{ flex: 1, color: C.text, fontSize: 16, lineHeight: 24 }}>{x}</Text></View>)}
    <Note testID="chef-tip" icon="👩‍🍳" title={t('y5.tip')} text={tip} bg="#FFF4E5" bd="#E58A00" />
    <Note icon="⚠️" title={t('y5.oops')} text={oops} bg="#FDECEC" bd="#D64545" />
    <Note icon="✅" title={t('y5.doneHow')} text={done} bg="#EAF7EE" bd="#2E9B57" />
    <Note icon="🍽️" title={t('y5.plate')} text={plate} bg="#F1ECFB" bd="#7A5CC8" />
  </View>;
}
