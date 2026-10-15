import { useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Btn, Chip, T, s } from './ui';
import { refine, Estimate, AIError } from './ai';
import { C } from './theme';
import { fmtNum } from './i18n';

const PORTIONS = [0.5, 0.75, 1, 1.5, 2];

export function aiErrorText(t: (k: string) => string, e: unknown) {
  return t(`aiErr.${e instanceof AIError ? e.code : 'server'}`);
}

/** Resultado de la IA: rango, afinado en 1 toque, porción y botón para guardar en el diario. */
export function EstimateResult({ est, onLog }: { est: Estimate; onLog: (x: { name: string; kcal: number; p: number; c: number; f: number }) => void }) {
  const { t } = useTranslation();
  const [q, setQ] = useState<{ oil?: boolean; sauce?: boolean; fried?: boolean; portion: number }>({ portion: 1 });
  const r = refine(est, q);
  const yn = (k: 'oil' | 'sauce' | 'fried') => (
    <View key={k} style={[s.row, { justifyContent: 'space-between' }]}><T style={{ fontWeight: '700' }}>{t(`scan.${k}`)}</T>
      <View style={s.row}><Chip label={t('scan.yes')} active={q[k] === true} onPress={() => setQ({ ...q, [k]: true })} /><Chip label={t('scan.no')} active={q[k] === false} onPress={() => setQ({ ...q, [k]: false })} /></View></View>
  );
  return <>
    <Card>
      <Text style={s.h2} testID="est-name">{est.name}</Text>
      <Text style={s.muted}>{t('scan.range')}</Text>
      <Text style={{ fontSize: 40, fontWeight: '900', color: C.primary }} testID="est-range">{fmtNum(r.min)}–{fmtNum(r.max)} {t('u.kcal')}</Text>
      <Text style={s.muted}>{t('scan.confidence')}: {t(`scan.${est.confidence}`)} · {t('home.protein')} {fmtNum(r.p)} {t('u.g')} · {t('home.carbs')} {fmtNum(r.c)} {t('u.g')} · {t('home.fat')} {fmtNum(r.f)} {t('u.g')}</Text>
      <Text style={[s.muted, { fontSize: 13 }]}>{t('scan.disclaimer')}</Text>
    </Card>
    <Card>
      <Text style={s.h2}>{t('scan.questions')}</Text>
      {(['oil', 'sauce', 'fried'] as const).map(yn)}
      <T style={{ fontWeight: '700' }}>{t('scan.portion')}</T>
      <View style={[s.row, { flexWrap: 'wrap' }]}>{PORTIONS.map((p) => <Chip key={p} label={`${p}×`} active={q.portion === p} onPress={() => setQ({ ...q, portion: p })} />)}</View>
    </Card>
    <Btn label={`✓  ${t('scan.log')}`} onPress={() => onLog({ name: est.name, kcal: Math.round((r.min + r.max) / 2), p: r.p, c: r.c, f: r.f })} />
  </>;
}
