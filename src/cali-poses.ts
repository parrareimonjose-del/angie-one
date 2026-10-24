// Fotogramas clave por ejercicio (bucle). Coordenadas en el viewBox de cali-geo.
import type { Pose, Equip } from './cali-geo';
const G = 221;
const stand: Pose = { hip: [110, 137], sh: [110, 80], h: [112, 138], f: [112, G] };
const standUp: Pose = { ...stand, h: [[118, 20], [114, 22]], eb: -1 };
const pushTop: Pose = { hip: [116, 186], sh: [170, 164], h: [170, G], f: [34, G] };
const pushBot: Pose = { hip: [115, 206], sh: [165, 199], h: [170, G], f: [34, G] };
const hang: Pose = { hip: [110, 138], sh: [110, 82], h: [112, 26], f: [104, 216], kb: 1 };
const chin: Pose = { hip: [104, 110], sh: [106, 54], h: [112, 26], f: [96, 188], kb: 1 };
const squatB: Pose = { hip: [90, 182], sh: [112, 128], h: [[168, 134], [164, 136]], f: [112, G] };
const plankF: Pose = { hip: [100, 193], sh: [155, 189], h: [184, 219], f: [36, G] };
const frogB: Pose = { hip: [104, 156], sh: [140, 170], h: [136, G], f: [[124, 196], [120, 198]], kb: -1 };
const wallHS: Pose = { hip: [178, 110], sh: [174, 165], h: [[172, G], [168, G]], f: [[190, 28], [188, 30]], hd: 0, sup: false };
export type Anim = { fr: Pose[]; eq?: Equip; hold?: boolean };
export const POSES: Record<string, Anim> = {
  wall_pushup: { eq: { wall: 200 }, fr: [{ hip: [122, 146], sh: [142, 97], h: [196, 96], f: [88, G] }, { hip: [130, 150], sh: [166, 107], h: [196, 96], f: [88, G] }] },
  incline_pushup: { eq: { box: [150, 172, 80, 54] }, fr: [{ hip: [118, 160], sh: [165, 120], h: [168, 170], f: [48, G] }, { hip: [116, 178], sh: [162, 150], h: [168, 170], f: [48, G] }] },
  knee_pushup: { fr: [{ hip: [118, 190], sh: [169, 166], h: [170, G], f: [66, 186] }, { hip: [120, 198], sh: [166, 199], h: [170, G], f: [62, 190] }] },
  pushup: { fr: [pushTop, pushBot] },
  wide_pushup: { fr: [{ ...pushTop, h: [[180, G], [176, G]] }, { ...pushBot, h: [[180, G], [176, G]] }] },
  diamond_pushup: { fr: [{ ...pushTop, sh: [168, 164], h: [[164, G], [162, G]] }, { ...pushBot, sh: [162, 200], h: [[164, G], [162, G]] }] },
  decline_pushup: { eq: { box: [10, 182, 58, 44] }, fr: [{ hip: [118, 172], sh: [175, 164], h: [178, G], f: [58, 178] }, { hip: [116, 190], sh: [170, 198], h: [178, G], f: [58, 178] }] },
  archer_pushup: { fr: [{ ...pushTop, h: [[168, G], [212, G]] }, { ...pushBot, sh: [160, 199], h: [[164, G], [214, G]] }] },
  pseudo_planche_pushup: { fr: [{ hip: [120, 184], sh: [176, 166], h: [150, G], f: [42, G] }, { hip: [118, 202], sh: [172, 198], h: [150, G], f: [42, G] }] },
  one_arm_pushup: { fr: [{ ...pushTop, h: [[168, G], [122, 186]], f: [[40, G], [32, G]] }, { ...pushBot, h: [[168, G], [122, 200]], f: [[40, G], [32, G]] }] },
  pike_pushup: { fr: [{ hip: [116, 128], sh: [158, 164], h: [172, G], f: [72, G], hd: -20 }, { hip: [120, 140], sh: [163, 190], h: [176, G], f: [72, G], hd: -20 }] },
  hspu: { eq: { wall: 200 }, fr: [wallHS, { ...wallHS, hip: [178, 138], sh: [172, 194], f: [[190, 56], [188, 58]] }] },
  dead_hang: { eq: { bar: 26 }, hold: true, fr: [hang, { ...hang, hip: [110, 136], f: [106, 214] }] },
  scap_pull: { eq: { bar: 26 }, fr: [hang, { ...hang, hip: [110, 130], sh: [110, 74], f: [104, 208] }] },
  australian_row: { eq: { low: 150 }, fr: [{ hip: [106, 209], sh: [152, 205], h: [160, 150], f: [40, G], sup: true, eb: -1 }, { hip: [104, 186], sh: [150, 166], h: [160, 150], f: [40, G], sup: true, eb: -1 }] },
  negative_pullup: { eq: { bar: 26 }, fr: [chin, chin, hang] },
  chinup: { eq: { bar: 26 }, fr: [hang, chin] },
  pullup: { eq: { bar: 26 }, fr: [hang, chin] },
  wide_pullup: { eq: { bar: 26 }, fr: [{ ...hang, h: [[118, 26], [100, 26]] }, { ...chin, h: [[118, 26], [100, 26]] }] },
  archer_pullup: { eq: { bar: 26 }, fr: [{ ...hang, h: [[112, 26], [150, 26]] }, { ...chin, h: [[110, 26], [156, 26]] }] },
  muscle_up: { eq: { bar: 62 }, fr: [{ hip: [110, 174], sh: [110, 118], h: [114, 62], f: [88, 222], kb: 1 }, { hip: [100, 140], sh: [104, 84], h: [114, 62], f: [80, 200], kb: 1 }, { hip: [112, 112], sh: [124, 58], h: [114, 62], f: [96, 180], kb: 1, eb: -1 }, { hip: [108, 62], sh: [112, 8], h: [114, 62], f: [98, 140], kb: 1, eb: -1 }] },
  bench_dip: { eq: { box: [10, 170, 70, 56] }, fr: [{ hip: [88, 166], sh: [82, 110], h: [76, 170], f: [172, G], hd: 0 }, { hip: [92, 196], sh: [84, 140], h: [76, 170], f: [168, G] }] },
  dip: { eq: { pbars: 120 }, fr: [{ hip: [108, 120], sh: [110, 64], h: [112, 120], f: [92, 188], kb: 1 }, { hip: [100, 146], sh: [106, 94], h: [112, 120], f: [84, 210], kb: 1 }] },
  squat: { fr: [{ ...stand, h: [[166, 84], [162, 86]] }, squatB] },
  jump_squat: { fr: [squatB, { ...stand, hip: [110, 120], sh: [110, 63], f: [114, 204], h: [[96, 124], [92, 124]] }] },
  lunge: { fr: [{ ...stand, f: [[124, G], [96, G]], h: [118, 136] }, { hip: [104, 172], sh: [106, 115], h: [118, 168], f: [[142, G], [64, G]] }] },
  bulgarian_split: { eq: { box: [16, 188, 54, 38] }, fr: [{ hip: [112, 136], sh: [114, 80], h: [118, 136], f: [[128, G], [60, 188]] }, { hip: [106, 168], sh: [114, 113], h: [120, 166], f: [[134, G], [60, 188]] }] },
  glute_bridge: { fr: [{ hip: [120, 213], sh: [170, 213], h: [130, 219], f: [80, G], kb: 1, sup: true, eb: -1 }, { hip: [118, 186], sh: [168, 210], h: [130, 219], f: [80, G], kb: 1, sup: true, eb: -1 }] },
  calf_raise: { fr: [stand, { ...stand, hip: [110, 130], sh: [110, 73], h: [112, 131], f: [112, 213] }] },
  wall_sit: { eq: { wall: 56 }, hold: true, fr: [{ hip: [82, 178], sh: [80, 121], h: [118, 172], f: [128, G], eb: -1 }, { hip: [82, 179], sh: [80, 122], h: [118, 173], f: [128, G], eb: -1 }] },
  assisted_pistol: { eq: { box: [44, 188, 48, 38] }, fr: [{ ...stand, f: [[112, G], [146, 176]], h: [[150, 104], [146, 106]], eb: -1 }, { hip: [86, 182], sh: [112, 130], h: [[160, 136], [156, 138]], f: [[114, G], [168, 196]], eb: -1 }] },
  pistol_squat: { fr: [{ ...stand, f: [[112, G], [146, 176]], h: [[150, 104], [146, 106]], eb: -1 }, { hip: [96, 198], sh: [126, 148], h: [[178, 142], [174, 144]], f: [[114, G], [178, 204]], eb: -1 }] },
  burpee: { fr: [standUp, { hip: [104, 176], sh: [134, 130], h: [150, G], f: [112, G], kb: -1 }, pushTop, { hip: [104, 176], sh: [134, 130], h: [150, G], f: [112, G] }, { ...standUp, hip: [110, 122], sh: [110, 65], f: [112, 206], h: [[118, 6], [114, 8]] }] },
  plank: { hold: true, fr: [plankF, { ...plankF, hip: [100, 191] }] },
  hollow_hold: { hold: true, fr: [{ hip: [116, 214], sh: [160, 200], h: [212, 190], f: [40, 198], sup: true, hd: -15 }, { hip: [116, 214], sh: [160, 198], h: [212, 186], f: [40, 195], sup: true, hd: -15 }] },
  superman: { fr: [{ hip: [110, 216], sh: [160, 214], h: [214, 214], f: [40, 218], hd: 0 }, { hip: [110, 214], sh: [158, 204], h: [212, 190], f: [42, 200], hd: -10 }] },
  mountain_climber: { fr: [{ ...pushTop, f: [[40, G], [36, G]] }, { ...pushTop, f: [[124, 206], [36, G]] }, { ...pushTop, f: [[40, G], [124, 206]] }] },
  hanging_knee_raise: { eq: { bar: 26 }, fr: [hang, { ...hang, hip: [108, 134], kb: -1, f: [146, 172] }] },
  hanging_leg_raise: { eq: { bar: 26 }, fr: [hang, { ...hang, hip: [106, 132], sh: [108, 78], kb: -1, f: [188, 136] }] },
  tuck_lsit: { eq: { pbars: 150 }, hold: true, fr: [{ hip: [106, 150], sh: [108, 94], h: [112, 150], f: [[140, 172], [136, 174]], kb: -1 }, { hip: [106, 149], sh: [108, 93], h: [112, 150], f: [[140, 170], [136, 172]], kb: -1 }] },
  l_sit: { eq: { pbars: 150 }, hold: true, fr: [{ hip: [106, 150], sh: [108, 94], h: [112, 150], f: [190, 150] }, { hip: [106, 150], sh: [108, 94], h: [112, 150], f: [190, 147] }] },
  wall_handstand: { eq: { wall: 200 }, hold: true, fr: [wallHS, { ...wallHS, f: [[191, 26], [189, 28]] }] },
  frog_stand: { hold: true, fr: [{ hip: [108, 168], sh: [136, 162], h: [136, G], f: [[118, G], [114, G]] }, frogB, frogB] },
  tuck_planche: { hold: true, fr: [{ hip: [100, 168], sh: [136, 168], h: [128, G], f: [[110, 184], [106, 186]], kb: -1 }, { hip: [100, 166], sh: [136, 167], h: [128, G], f: [[110, 182], [106, 184]], kb: -1 }] },
  tuck_front_lever: { eq: { bar: 32 }, hold: true, fr: [{ hip: [124, 94], sh: [176, 84], h: [196, 32], f: [[156, 70], [152, 72]], sup: true, kb: 1 }, { hip: [124, 92], sh: [176, 83], h: [196, 32], f: [[156, 68], [152, 70]], sup: true, kb: 1 }] },
  front_lever: { eq: { bar: 32 }, hold: true, fr: [{ hip: [124, 90], sh: [178, 84], h: [198, 32], f: [40, 96], sup: true }, { hip: [124, 89], sh: [178, 83], h: [198, 32], f: [40, 94], sup: true }] },
  tuck_back_lever: { eq: { bar: 32 }, hold: true, fr: [{ hip: [96, 92], sh: [150, 94], h: [128, 32], f: [[104, 62], [100, 64]], kb: 1, eb: -1 }, { hip: [96, 90], sh: [150, 93], h: [128, 32], f: [[104, 60], [100, 62]], kb: 1, eb: -1 }] },
};
