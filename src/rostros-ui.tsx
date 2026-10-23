/** UI de rostros: tarjetas (idea 2) + chats clásicos con caras rectas + Historia / Acerca de. */
import React, { useState } from 'react';
import { View, Text, Image, Pressable, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { C } from './theme';
import { Card, CardTitle, Btn, T, s } from './ui';
import { FACES, FaceId, Face, HISTORIA } from './rostros';

const accentOf = (f: Face) => (f.accent === 'primary' ? C.primary : C.secondary);

export function FaceAvatar({ who, size = 44, testID }: { who: FaceId; size?: number; testID?: string }) {
  const f = FACES[who];
  return (
    <View testID={testID} style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', borderWidth: 2, borderColor: accentOf(f), backgroundColor: C.card }}>
      <Image source={f.circle} style={{ width: size, height: size }} resizeMode="cover" accessibilityIgnoresInvertColors accessibilityLabel={who === 'angie' ? 'Angie' : 'Coach'} />
    </View>
  );
}

/** Cabecera de chat clásico (preview 08/09). */
export function FaceChatHeader({ who }: { who: FaceId }) {
  const { t } = useTranslation();
  const f = FACES[who];
  const online = who === 'angie' ? t('faces.angieOnline') : t('faces.coachOnline');
  return (
    <View testID={`face-header-${who}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
      <FaceAvatar who={who} size={52} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: C.text }}>{t(f.nameKey)}</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: accentOf(f) }}>{online}</Text>
      </View>
    </View>
  );
}

/** Burbuja de chat con avatar a la izquierda (asistente) o a la derecha (usuario). */
export function FaceChatBubble({
  who, role, children, testID,
}: { who: FaceId; role: 'user' | 'assistant'; children: React.ReactNode; testID?: string }) {
  const mine = role === 'user';
  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '94%' }}>
      {!mine ? <FaceAvatar who={who} size={32} /> : null}
      <View style={{
        maxWidth: mine ? '88%' : '82%', backgroundColor: mine ? C.primary : C.card,
        borderRadius: 20, padding: 14, borderWidth: mine ? 0 : 1, borderColor: C.border,
      }}>
        {children}
      </View>
    </View>
  );
}

/** Toggle Angie IA | Coach (idea 2). */
export function FaceToggle({ value, onChange }: { value: FaceId; onChange: (v: FaceId) => void }) {
  const { t } = useTranslation();
  const Pill = ({ id, label }: { id: FaceId; label: string }) => {
    const on = value === id;
    const col = id === 'angie' ? C.primary : C.secondary;
    return (
      <Pressable
        testID={`face-toggle-${id}`}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        onPress={() => onChange(id)}
        style={{
          flex: 1, paddingVertical: 12, borderRadius: 999, alignItems: 'center',
          backgroundColor: on ? col : C.card, borderWidth: 1, borderColor: on ? col : C.border,
        }}
      >
        <Text style={{ fontWeight: '800', color: on ? C.white : C.text }}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View testID="face-toggle" style={{ flexDirection: 'row', gap: 8, padding: 4, borderRadius: 999, backgroundColor: C.bg2, borderWidth: 1, borderColor: C.border }}>
      <Pill id="angie" label={t('faces.angieName')} />
      <Pill id="coach" label={t('faces.coachName')} />
    </View>
  );
}

/** Tarjeta grande de perfil (idea 2 — preview 05/06). */
export function FaceProfileCard({ who, onPress, tip }: { who: FaceId; onPress?: () => void; tip?: string }) {
  const { t } = useTranslation();
  const f = FACES[who];
  const col = accentOf(f);
  return (
    <Pressable testID={`face-card-${who}`} onPress={onPress} disabled={!onPress} style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: C.card, borderWidth: 1, borderColor: C.border }}>
      <View style={{ height: 72, backgroundColor: who === 'angie' ? C.primarySoft : C.tint }} />
      <View style={{ alignItems: 'center', marginTop: -44, paddingBottom: 18, paddingHorizontal: 16, gap: 6 }}>
        <FaceAvatar who={who} size={88} />
        <Text style={{ fontSize: 22, fontWeight: '900', color: C.text, marginTop: 6 }}>{t(f.nameKey)}</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: col }}>{t(f.roleKey)}</Text>
        <Text style={[s.muted, { textAlign: 'center' }]}>{t(f.tagKey)}</Text>
        {tip ? (
          <View style={{ marginTop: 10, width: '100%', padding: 14, borderRadius: 16, backgroundColor: C.bg2, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontWeight: '800', color: C.text }}>{tip}</Text>
            <Text style={[s.muted, { marginTop: 2 }]}>{t(f.hintKey)}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Dos tarjetas lado a lado + historia corta (preview 07). */
export function TeamTogetherCard({ onPick }: { onPick?: (who: FaceId) => void }) {
  const { t } = useTranslation();
  const Mini = ({ who }: { who: FaceId }) => {
    const f = FACES[who];
    const col = accentOf(f);
    return (
      <Pressable
        testID={`team-pick-${who}`}
        onPress={() => onPick?.(who)}
        style={{ flex: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: C.card, borderWidth: 1, borderColor: C.border }}
      >
        <View style={{ height: 48, backgroundColor: who === 'angie' ? C.primarySoft : C.tint }} />
        <View style={{ alignItems: 'center', marginTop: -28, paddingBottom: 14, paddingHorizontal: 8, gap: 4 }}>
          <FaceAvatar who={who} size={64} />
          <Text style={{ fontWeight: '900', color: C.text, marginTop: 4 }}>{t(f.nameKey)}</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: col }}>{t(who === 'angie' ? 'faces.angieShort' : 'faces.coachShort')}</Text>
          <View style={{ marginTop: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: col }}>
            <Text style={{ color: C.white, fontWeight: '800', fontSize: 13 }}>{t('faces.choose')}</Text>
          </View>
        </View>
      </Pressable>
    );
  };
  return (
    <Card testID="team-together" style={{ gap: 14 } as ViewStyle}>
      <Text style={[s.muted, { textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '700' }]}>{t('faces.welcome')}</Text>
      <Text style={s.h2}>{t('faces.meetTitle')}</Text>
      <Text style={s.muted}>{t('faces.meetSub')}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Mini who="angie" />
        <Mini who="coach" />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: C.bg2 }}>
        <View style={{ width: 56, height: 40 }}>
          <View style={{ position: 'absolute', left: 0 }}><FaceAvatar who="angie" size={36} /></View>
          <View style={{ position: 'absolute', left: 20 }}><FaceAvatar who="coach" size={36} /></View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', color: C.text }}>{t('faces.storyTitle')}</Text>
          <Text style={s.muted}>{t('faces.storyBlurb')}</Text>
        </View>
      </View>
    </Card>
  );
}

/** Texto aprobado de Acerca de / Historia. */
export function HistoriaCard() {
  const { t } = useTranslation();
  return (
    <Card testID="historia-card" style={{ gap: 12 } as ViewStyle}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <FaceAvatar who="angie" size={48} />
        <FaceAvatar who="coach" size={48} />
        <View style={{ flex: 1 }}>
          <CardTitle>{t('faces.historiaTitle')}</CardTitle>
          <Text style={s.muted}>{t('faces.historiaSub')}</Text>
        </View>
      </View>
      {HISTORIA.paragraphs.map((p, i) => (
        <T key={i}>{p}</T>
      ))}
      <Text style={{ fontWeight: '700', color: C.secondary, marginTop: 4 }}>{HISTORIA.sign}</Text>
    </Card>
  );
}

/** Bloque completo para la pantalla Equipo / Acerca de. */
export function EquipoSection({ onChat }: { onChat?: (who: FaceId) => void }) {
  const { t } = useTranslation();
  const go = (who: FaceId) => {
    if (onChat) onChat(who);
    else router.push({ pathname: '/chat', params: { who } } as any);
  };
  return (
    <View style={{ gap: 14 }} testID="equipo-section">
      <TeamTogetherCard onPick={go} />
      <FaceProfileCard who="angie" onPress={() => go('angie')} tip={t('faces.tipAngie')} />
      <FaceProfileCard who="coach" onPress={() => go('coach')} tip={t('faces.tipCoach')} />
      <HistoriaCard />
      <Btn kind="primary" label={t('faces.start')} onPress={() => go('angie')} />
    </View>
  );
}

export function useFaceParam(defaultWho: FaceId = 'angie'): [FaceId, (w: FaceId) => void] {
  const [who, setWho] = useState<FaceId>(defaultWho);
  return [who, setWho];
}
