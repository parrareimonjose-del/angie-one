/** Rostros oficiales (consentimiento Oct 2026): Angie = IA; hermano = Coach (etiqueta «Coach» hasta que dé su nombre). */
import { ImageSourcePropType } from 'react-native';

export type FaceId = 'angie' | 'coach';

export type Face = {
  id: FaceId;
  /** Nombre visible: «Angie» o «Coach» */
  nameKey: string;
  roleKey: string;
  tagKey: string;
  hintKey: string;
  accent: 'primary' | 'secondary';
  photo: ImageSourcePropType;
  circle: ImageSourcePropType;
};

export const FACES: Record<FaceId, Face> = {
  angie: {
    id: 'angie',
    nameKey: 'faces.angieName',
    roleKey: 'faces.angieRole',
    tagKey: 'faces.angieTag',
    hintKey: 'faces.angieHint',
    accent: 'primary',
    photo: require('../assets/rostros/angie-ia.png'),
    circle: require('../assets/rostros/angie-ia-circle.png'),
  },
  coach: {
    id: 'coach',
    nameKey: 'faces.coachName',
    roleKey: 'faces.coachRole',
    tagKey: 'faces.coachTag',
    hintKey: 'faces.coachHint',
    accent: 'secondary',
    photo: require('../assets/rostros/hermano-coach.png'),
    circle: require('../assets/rostros/hermano-coach-circle.png'),
  },
};

export const HISTORIA = {
  title: 'Angie One',
  paragraphs: [
    'Nos conocemos desde nuestro país. Cuando llegué a Estados Unidos, Angie y mi hermano me abrieron las puertas de su casa y de su familia. Me hicieron sentir en casa y me enseñaron lo esencial para empezar de nuevo aquí.',
    'Angie es carácter fuerte y corazón bondadoso. Mi hermano es serio, firme, y de un corazón enorme. Gracias a ellos di pasos que solos no hubiera dado.',
    'Esta app lleva el nombre de Angie: la IA lleva su rostro; el coach, el de mi hermano. Es mi forma de decir gracias.',
  ],
  sign: '— José · Parra Apps',
} as const;
