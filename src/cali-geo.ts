// Atleta ilustrado original (vector), vista lateral. Geometría pura: sin RN, testeable y reutilizable.
export type P = [number, number];
export type Pose = { hip: P; sh: P; h: P | [P, P]; f: P | [P, P]; eb?: number; kb?: number; sup?: boolean; hd?: number; ebf?: number; kbf?: number };
export type Equip = { bar?: number; pbars?: number; box?: [number, number, number, number]; wall?: number; low?: number };
export type Sex = 'm' | 'f';
export type Shape = { k: 'path' | 'circle' | 'ellipse' | 'line' | 'rect'; a: Record<string, string | number> };
export const GROUND = 226;
export const VIEWBOX = '-10 -30 260 266';
const L = { tor: 56, ua: 30, fa: 27, th: 42, sh: 42 };
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]], sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const mul = (a: P, k: number): P => [a[0] * k, a[1] * k], len = (a: P) => Math.hypot(a[0], a[1]) || 1e-6;
const nrm = (a: P): P => mul(a, 1 / len(a)), perp = (a: P): P => [-a[1], a[0]];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t, lp = (a: P, b: P, t: number): P => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const r1 = (n: number) => Math.round(n * 10) / 10;

/** IK de 2 huesos: devuelve la articulación media (codo / rodilla). */
export function ik(root: P, target: P, l1: number, l2: number, sign: number): [P, P] {
  const v = sub(target, root); let d = len(v); const dir = nrm(v);
  d = Math.min(d, l1 + l2 - 0.01); d = Math.max(d, Math.abs(l1 - l2) + 0.01);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const j = add(add(root, mul(dir, a)), mul(perp(dir), hh * sign));
  return [j, add(j, mul(nrm(sub(target, j)), l2))];
}
const two = (x: P | [P, P]): [P, P] => (Array.isArray(x[0]) ? (x as [P, P]) : [x as P, add(x as P, [-4, -1])]);
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const [ha, ha2] = two(a.h), [hb, hb2] = two(b.h), [fa, fa2] = two(a.f), [fb, fb2] = two(b.f);
  return { ...a, hip: lp(a.hip, b.hip, t), sh: lp(a.sh, b.sh, t), h: [lp(ha, hb, t), lp(ha2, hb2, t)], f: [lp(fa, fb, t), lp(fa2, fb2, t)], hd: lerp(a.hd || 0, b.hd || 0, t) };
}
/** Contorno suave (Catmull-Rom cerrado → Bézier). */
function smooth(pts: P[]): string {
  const n = pts.length; let d = `M${r1(pts[0][0])},${r1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = add(p1, mul(sub(p2, p0), 1 / 6)), c2 = sub(p2, mul(sub(p3, p1), 1 / 6));
    d += `C${r1(c1[0])},${r1(c1[1])} ${r1(c2[0])},${r1(c2[1])} ${r1(p2[0])},${r1(p2[1])}`;
  }
  return d + 'Z';
}
/** Segmento muscular: ancho en A, en el vientre (con desplazamiento hacia un lado) y en B. */
function limb(A: P, B: P, wa: number, wm: number, wb: number, at = 0.38, bias = 0): string {
  const d = nrm(sub(B, A)), n = perp(d), M = lp(A, B, at), M2 = lp(A, B, 0.7);
  return smooth([add(A, mul(d, -wa * 0.35)), add(A, mul(n, wa / 2)), add(M, mul(n, wm / 2 + bias)), add(M2, mul(n, (wm + wb) / 4)), add(B, mul(n, wb / 2)), add(B, mul(d, wb * 0.45)),
    add(B, mul(n, -wb / 2)), add(M2, mul(n, -(wm + wb) / 4)), add(M, mul(n, -wm / 2 + bias)), add(A, mul(n, -wa / 2))]);
}
export type Look = { sex: Sex; skin: string; skinD: string; top: string; bottom: string; hair: string; shoe: string };
export const SKINS = [['#F1C7A5', '#D9A27C'], ['#C68B5E', '#A06A42'], ['#8A5A3B', '#6A4029']] as const;
export function look(sex: Sex, tone = 0, coral = '#FF5A5F'): Look {
  const [skin, skinD] = SKINS[tone] || SKINS[0];
  return sex === 'm' ? { sex, skin, skinD, top: 'none', bottom: coral, hair: '#2B1D16', shoe: '#FFFFFF' }
    : { sex, skin, skinD, top: coral, bottom: '#2D2A3A', hair: '#5A3420', shoe: '#FFFFFF' };
}

/** Dibuja el atleta en una pose. Devuelve formas en orden de pintado. */
export function drawAthlete(p: Pose, lk: Look, eq: Equip = {}): Shape[] {
  const S: Shape[] = []; const m = lk.sex === 'm';
  const u = nrm(sub(p.sh, p.hip)); const front = mul(perp(u), p.sup ? -1 : 1);
  const hip = p.hip, sh = add(hip, mul(u, L.tor));
  const [hN, hF] = two(p.h), [fN, fF] = two(p.f);
  const [eN, wN] = ik(sh, hN, L.ua, L.fa, p.eb ?? 1), [eF, wF] = ik(add(sh, [-2, -1]), hF, L.ua, L.fa, p.ebf ?? p.eb ?? 1);
  const [kN, aN] = ik(hip, fN, L.th, L.sh, p.kb ?? -1), [kF, aF] = ik(add(hip, [-2, -1]), fF, L.th, L.sh, p.kbf ?? p.kb ?? -1);
  // sombra
  const lowY = Math.max(aN[1], aF[1], wN[1], wF[1], hip[1]);
  if (lowY > GROUND - 40) S.push({ k: 'ellipse', a: { cx: r1((hip[0] + sh[0]) / 2), cy: GROUND + 3, rx: 70, ry: 5, fill: '#000', opacity: 0.08 } });
  // equipo detrás
  if (eq.wall != null) S.push({ k: 'rect', a: { x: eq.wall, y: -30, width: 14, height: GROUND + 30, fill: '#E9E2DD' } });
  if (eq.box) S.push({ k: 'rect', a: { x: eq.box[0], y: eq.box[1], width: eq.box[2], height: eq.box[3], rx: 4, fill: '#C9B8AE' } });
  if (eq.pbars != null) S.push({ k: 'rect', a: { x: hN[0] - 70, y: eq.pbars + 3, width: 140, height: 6, rx: 3, fill: '#8E8A9A' } }, { k: 'rect', a: { x: hN[0] - 60, y: eq.pbars + 6, width: 5, height: GROUND - eq.pbars - 6, fill: '#A5A1B0' } }, { k: 'rect', a: { x: hN[0] + 55, y: eq.pbars + 6, width: 5, height: GROUND - eq.pbars - 6, fill: '#A5A1B0' } });
  if (eq.low != null) S.push({ k: 'rect', a: { x: hN[0] - 4, y: eq.low, width: 6, height: GROUND - eq.low, fill: '#A5A1B0' } });
  const bodyD = (c: string) => c; const far = 0.72;
  const skinF = lk.skinD;
  const leg = (h: P, k: P, a: P, farSide: boolean) => {
    const col = farSide ? shade(m ? lk.skin : lk.bottom, far) : (m ? lk.skin : lk.bottom);
    const th = limb(h, k, m ? 20 : 19, m ? 20 : 19, m ? 12 : 11, 0.35, m ? 1.2 : 1.5), shn = limb(k, a, m ? 12 : 11, m ? 12.5 : 11, 7, 0.3, -1.5);
    S.push({ k: 'path', a: { d: th, fill: col } }, { k: 'path', a: { d: shn, fill: m ? (farSide ? skinF : lk.skin) : col } });
    // pantalón corto (hombre) sobre el muslo
    if (m) S.push({ k: 'path', a: { d: limb(h, lp(h, k, 0.62), 22, 22, 19, 0.5), fill: farSide ? shade(lk.bottom, far) : lk.bottom } });
    // pie / zapatilla
    const sd = nrm(sub(a, k)); const toe = mul([sd[1], -sd[0]], p.sup ? -1 : 1);
    const tdir = dot(toe, front) < -0.2 && !p.sup ? mul(toe, -1) : toe;
    const ft = add(a, mul(tdir, 13));
    S.push({ k: 'path', a: { d: limb(add(a, mul(tdir, -3)), ft, 9, 8.5, 6, 0.4), fill: farSide ? '#D8D8DE' : lk.shoe, stroke: shade('#FF5A5F', farSide ? 0.8 : 1), 'stroke-width': 1.4 } });
    if (!farSide) S.push({ k: 'path', a: { d: `M${r1(lp(h, k, 0.25)[0] + front[0] * 4)},${r1(lp(h, k, 0.25)[1] + front[1] * 4)} Q${r1(lp(h, k, 0.6)[0] + front[0] * 8)},${r1(lp(h, k, 0.6)[1] + front[1] * 8)} ${r1(lp(h, k, 0.9)[0] + front[0] * 3)},${r1(lp(h, k, 0.9)[1] + front[1] * 3)}`, stroke: '#000', 'stroke-opacity': 0.12, 'stroke-width': 1.5, fill: 'none' } });
  };
  const arm = (s0: P, e: P, w: P, farSide: boolean) => {
    const col = farSide ? skinF : lk.skin;
    S.push({ k: 'path', a: { d: limb(s0, e, m ? 15 : 11, m ? 15 : 10.5, m ? 10 : 8, 0.4, 1), fill: col } }, { k: 'path', a: { d: limb(e, w, m ? 10.5 : 8.5, m ? 11 : 8.5, 6.5, 0.3), fill: col } },
      { k: 'circle', a: { cx: r1(w[0] + (w[0] - e[0]) * 0.15), cy: r1(w[1] + (w[1] - e[1]) * 0.15), r: m ? 5 : 4.3, fill: col } });
    if (!farSide) {
      S.push({ k: 'path', a: { d: limb(add(s0, mul(u, 2)), lp(s0, e, 0.42), m ? 19 : 13, m ? 17 : 12, m ? 11 : 9, 0.3), fill: lk.skin, stroke: lk.skinD, 'stroke-opacity': 0.35, 'stroke-width': 1 } });
      const mm = lp(s0, e, 0.62), nn = perp(nrm(sub(e, s0)));
      S.push({ k: 'path', a: { d: `M${r1(mm[0] - nn[0] * 4)},${r1(mm[1] - nn[1] * 4)} q${r1(nn[0] * 3)},${r1(nn[1] * 3)} ${r1(nn[0] * 7)},${r1(nn[1] * 7)}`, stroke: '#000', 'stroke-opacity': 0.12, 'stroke-width': 1.3, fill: 'none' } });
    }
  };
  arm(add(sh, [-2, -1]), eF, wF, true); leg(add(hip, [-2, -1]), kF, aF, true);
  // torso (coordenadas locales: s a lo largo hip→hombro, x hacia delante)
  const T = (s: number, x: number): P => add(add(hip, mul(u, s * L.tor)), mul(front, x));
  const tor: P[] = m ? [T(-0.05, 0), T(0.02, 10), T(0.4, 9), T(0.72, 14.5), T(0.95, 10), T(1.08, 3), T(1.02, -9), T(0.75, -12), T(0.42, -8.5), T(0.12, -12), T(-0.06, -9)]
    : [T(-0.05, 0), T(0.02, 10), T(0.45, 6.5), T(0.68, 12.5), T(0.82, 11), T(0.98, 7), T(1.06, 2), T(1.0, -7), T(0.75, -8.5), T(0.42, -6.5), T(0.12, -14), T(-0.08, -9)];
  S.push({ k: 'path', a: { d: smooth(tor), fill: lk.skin } });
  if (m) {
    S.push({ k: 'path', a: { d: smooth([T(-0.07, 0), T(0.0, 11), T(0.22, 10), T(0.26, -11), T(0.1, -13.5), T(-0.07, -10)]), fill: lk.bottom } });
    const pc = T(0.66, 13.5), pe = T(0.68, 2);
    S.push({ k: 'path', a: { d: `M${r1(pc[0])},${r1(pc[1])} Q${r1(T(0.6, 8)[0])},${r1(T(0.6, 8)[1])} ${r1(pe[0])},${r1(pe[1])}`, stroke: '#000', 'stroke-opacity': 0.16, 'stroke-width': 1.6, fill: 'none' } });
    for (const s0 of [0.33, 0.45, 0.56]) { const a0 = T(s0, 8.8), b0 = T(s0, 5.5); S.push({ k: 'line', a: { x1: r1(a0[0]), y1: r1(a0[1]), x2: r1(b0[0]), y2: r1(b0[1]), stroke: '#000', 'stroke-opacity': 0.14, 'stroke-width': 1.3 } }); }
    const l0 = T(0.85, -11), l1 = T(0.5, -8); S.push({ k: 'path', a: { d: `M${r1(l0[0])},${r1(l0[1])} Q${r1(T(0.68, -6)[0])},${r1(T(0.68, -6)[1])} ${r1(l1[0])},${r1(l1[1])}`, stroke: '#000', 'stroke-opacity': 0.12, 'stroke-width': 1.4, fill: 'none' } });
  } else {
    S.push({ k: 'path', a: { d: smooth([T(-0.08, 0), T(0.0, 10.5), T(0.3, 7.5), T(0.32, -7.5), T(0.12, -15), T(-0.09, -10)]), fill: lk.bottom } });
    S.push({ k: 'path', a: { d: smooth([T(0.56, 8), T(0.68, 13.5), T(0.85, 11.8), T(0.9, 5), T(0.92, -8.6), T(0.56, -7.5)]), fill: lk.top } });
  }
  leg(hip, kN, aN, false);
  // cuello y cabeza
  const nk = add(sh, mul(u, 3)), hdDir = rot(u, (p.hd || 0) * (p.sup ? -1 : 1)), hc = add(add(sh, mul(u, 6)), mul(hdDir, 13));
  S.push({ k: 'path', a: { d: limb(add(sh, mul(u, -3)), add(nk, mul(hdDir, 8)), m ? 13 : 9.5, m ? 12 : 9, 9, 0.5), fill: lk.skinD } });
  const hf = mul(perp(hdDir), p.sup ? -1 : 1);
  S.push({ k: 'ellipse', a: { cx: r1(hc[0] + hf[0] * 1.5), cy: r1(hc[1] + hf[1] * 1.5), rx: 11, ry: 12.5, fill: lk.skin, transform: `rotate(${r1(Math.atan2(hdDir[1], hdDir[0]) * 180 / Math.PI - 90)} ${r1(hc[0] + hf[0] * 1.5)} ${r1(hc[1] + hf[1] * 1.5)})` } });
  const nose = add(add(hc, mul(hf, 12)), mul(hdDir, -1));
  S.push({ k: 'circle', a: { cx: r1(nose[0]), cy: r1(nose[1]), r: 2.4, fill: lk.skin } });
  const eye = add(add(hc, mul(hf, 7)), mul(hdDir, 2)); S.push({ k: 'circle', a: { cx: r1(eye[0]), cy: r1(eye[1]), r: 1.4, fill: '#2B1D16' } });
  // pelo
  const H = (s: number, x: number): P => add(add(hc, mul(hdDir, s)), mul(hf, x));
  if (m) S.push({ k: 'path', a: { d: smooth([H(5, 9), H(11, 6), H(13.5, -2), H(10, -10), H(2, -12), H(-3, -11), H(1, -7), H(7, 0), H(6.5, 7)]), fill: lk.hair } });
  else {
    S.push({ k: 'path', a: { d: smooth([H(4, 10), H(11, 7), H(14, -2), H(10, -11), H(0, -12.5), H(-6, -11), H(-1, -7), H(7, 1), H(6, 8)]), fill: lk.hair } });
    const pt = H(8, -13), pt2 = add(pt, add(mul(hf, -10), mul(hdDir, -14)));
    S.push({ k: 'path', a: { d: limb(pt, pt2, 8, 9, 3, 0.4), fill: lk.hair } }, { k: 'circle', a: { cx: r1(pt[0]), cy: r1(pt[1]), r: 3, fill: '#FF5A5F' } });
  }
  const ear = H(0, -2); S.push({ k: 'circle', a: { cx: r1(ear[0]), cy: r1(ear[1]), r: 2.6, fill: lk.skinD } });
  arm(sh, eN, wN, false);
  // equipo delante
  if (eq.bar != null) S.push({ k: 'rect', a: { x: -10, y: eq.bar - 3, width: 260, height: 6, rx: 3, fill: '#4A4658' } });
  if (eq.low != null) S.push({ k: 'rect', a: { x: hN[0] - 50, y: eq.low - 3, width: 110, height: 6, rx: 3, fill: '#4A4658' } });
  if (eq.pbars != null) S.push({ k: 'rect', a: { x: hN[0] - 70, y: eq.pbars - 3, width: 140, height: 6, rx: 3, fill: '#4A4658' } });
  void bodyD;
  return S;
}
const dot = (a: P, b: P) => a[0] * b[0] + a[1] * b[1];
const rot = (a: P, deg: number): P => { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [a[0] * c - a[1] * s, a[0] * s + a[1] * c]; };
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16); const f = (v: number) => Math.round(v * k).toString(16).padStart(2, '0');
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}
export function toSvg(shapes: Shape[], w = 240): string {
  const el = shapes.map((s) => `<${s.k} ${Object.entries(s.a).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w * 266 / 260}" viewBox="${VIEWBOX}"><rect x="-10" y="-30" width="260" height="266" fill="#FFF4EF"/><rect x="-10" y="${GROUND}" width="260" height="10" fill="#F1DED4"/>${el}</svg>`;
}
