import * as T from 'three';
import { archBand, archHeight, archOpening, batch, block, crown, randomSource, rectangle, slab, strip, trimPath, type Arch, type Point } from './geometry';
import type { Palette } from './materials';

export const aperture: Arch = { half: 1.57, spring: 3.22, rise: 1.61, point: 0.40 };
const recess: Arch = { half: 2.56, spring: 4.18, rise: 2.92, point: 0.19 };
const wallHalf = 4.32;
const wallTop = 10.94;
const leafZ = -1.27;
export const passageExit = -5.7;

type Mason = ReturnType<typeof batch>;

function clipToCell(polygon: Point[], x0: number, x1: number, y0: number, y1: number) {
  for (const [axis, edge, sign] of [[0, x0, 1], [0, x1, -1], [1, y0, 1], [1, y1, -1]]) {
    polygon = polygon.flatMap((end, i, all): Point[] => {
      const start = all[(i + all.length - 1) % all.length];
      const a = (start[axis] - edge) * sign, b = (end[axis] - edge) * sign;
      if ((a >= 0) === (b >= 0)) return b >= 0 ? [end] : [];
      const t = a / (a - b);
      const cut: Point = [T.MathUtils.lerp(start[0], end[0], t), T.MathUtils.lerp(start[1], end[1], t)];
      return b >= 0 ? [cut, end] : [cut];
    });
  }
  return polygon.filter((p, i, all) => Math.hypot(p[0] - all[(i + 1) % all.length][0], p[1] - all[(i + 1) % all.length][1]) > 0.0001);
}

function masonry(mason: Mason, material: string, left: number, right: number, low: number, high: number,
  front: number, seed: number, arch?: Arch, course = 0.43, width = 0.98) {
  const random = randomSource(seed);
  const profile = arch ? crown(arch) : [];
  const apex = arch ? arch.spring + arch.rise : -1;
  const rightSide: Point[] = arch ? [[arch.half, low], ...profile.slice(24).reverse(), [0, high + 0.02], [right, high + 0.02], [right, low]] : [];
  const leftSide = rightSide.map(([x, y]): Point => [-x, y]);
  for (let y = low, row = 0; y < high - 0.002; row++) {
    const next = Math.min(high, y + course * (0.88 + random() * 0.26));
    for (let x = left; x < right - 0.002;) {
      const nextX = Math.min(right, x + width * ((x === left && row % 2 ? 0.55 : 0.79) + random() * 0.47));
      const seam = 0.003 + random() * 0.0025;
      if (nextX - x > seam * 2 && next - y > seam * 2) {
        const b = [x + seam, nextX - seam, y + seam, next - seam] as const;
        const polygons = arch && y < apex ? [leftSide, rightSide].map((p) => clipToCell(p, ...b)) : [rectangle(b[0], b[2], b[1], b[3])];
        const uneven = (random() - 0.5) * 0.009;
        for (const polygon of polygons) {
          const area = polygon.reduce((sum, p, i, a) => sum + p[0] * a[(i + 1) % a.length][1] - p[1] * a[(i + 1) % a.length][0], 0);
          if (Math.abs(area) > 0.003) {
            mason.add(material, slab(polygon, front - 0.036, front + uneven, arch && y < apex ? 0 : 0.0018, 1.55), 0.92 + random() * 0.14);
          }
        }
      }
      x = nextX;
    }
    y = next;
  }
}

function rosette(mason: Mason, x: number, y: number, z: number, r: number) {
  for (const [radius, tube, height, key] of [[r, r * 0.079, 0.011, 'paleTrim'], [r * 0.72, r * 0.035, 0.018, 'grout']] as const) {
    mason.add(key, new T.TorusGeometry(radius, tube, 6, 32).translate(x, y, z + height));
  }
  const petals: Point[] = Array.from({ length: 64 }, (_, i) => {
    const a = i * Math.PI / 32;
    const radius = r * (0.43 + 0.14 * Math.cos(a * 8));
    return [x + Math.cos(a) * radius, y + Math.sin(a) * radius];
  });
  mason.add('paleTrim', slab(petals, z + 0.013, z + 0.033, 0.004), 0.92);
  mason.add('ochre', new T.SphereGeometry(r * 0.19, 12, 6).scale(1, 1, 0.33).translate(x, y, z + 0.033));
}

function cornice(mason: Mason, key: string, x: number, y: number, z: number, w: number, scale: number) {
  const steps = [[-0.15, 0.115, 0.13], [-0.06, 0.065, 0.21], [0.024, 0.081, 0.27], [0.115, 0.096, 0.36]];
  for (const [dy, h, d] of steps) {
    mason.add(key, block(x, y + dy * scale, z + d * scale * 0.33, w + d * scale, h * scale, d * scale, 0.012 * scale));
  }
  const count = Math.ceil(w / (0.18 * scale));
  for (let i = 0; i < count; i++) {
    const dx = (i + 0.5) / count * w - w * 0.5;
    mason.add(key, block(x + dx, y - 0.116 * scale, z + 0.164 * scale, 0.092 * scale, 0.102 * scale, 0.132 * scale, 0.007 * scale), 0.88 + (i % 5) * 0.025);
  }
}

function gateFacade(m: Mason) {
  // Suraj Pol reference 01: pale square front, shallow outer arch, small pointed aperture and blind panels above.
  const niche: Arch = { half: 0.15, spring: 6.02, rise: 0.20, point: 0.09 };
  const nichePath = trimPath(niche, 5.84);
  m.add('ochre', slab(archOpening(recess, -wallHalf, wallHalf, wallTop), -0.48, 0.541), 0.93);
  masonry(m, 'ochre', -wallHalf, wallHalf, 0, wallTop, 0.55, 928, recess, 0.46, 1.17);
  const opening = archOpening(aperture, -wallHalf, wallHalf, wallTop);
  // The enlarged inner bay clears the arched leaves throughout the inward swing.
  const swingBay: Arch = { half: 1.93, spring: 4.79, rise: 0.91, point: 0.20 };
  m.add('grout', slab(archOpening(swingBay, -wallHalf, wallHalf, wallTop), passageExit, -1.16), 0.96);
  m.add('grout', slab(opening, -1.16, -0.83), 0.96);
  m.add('ochre', slab(opening, -0.83, -0.414, 0, 1.8, 1.8, [nichePath]), 0.91);
  masonry(m, 'ochre', -2.59, 2.59, 0, 5.65, -0.403, 566, aperture, 0.46, 1.10);
  masonry(m, 'ochre', -2.59, -0.39, 5.655, 6.48, -0.403, 613, undefined, 0.42, 1.0);
  masonry(m, 'ochre', 0.39, 2.59, 5.655, 6.48, -0.403, 328, undefined, 0.42, 1.0);
  masonry(m, 'ochre', -2.59, 2.59, 6.484, 7.25, -0.403, 913, undefined, 0.42, 1.0);
  m.add('ochre', slab(rectangle(-0.387, 5.655, 0.387, 6.48), -0.420, -0.403, 0, 1.8, 1.8, [nichePath]), 0.98);
  m.add('ochre', slab(archOpening(aperture, -wallHalf, wallHalf, wallTop), passageExit - 0.12, passageExit), 0.92);
  for (const [arch, z, depth, band] of [[recess, 0.58, 0.038, 0.13], [aperture, -0.36, 0.076, 0.119]] as const) {
    const outer = { ...arch, half: arch.half + band, rise: arch.rise + band };
    const count = arch === recess ? 23 : 19;
    for (let i = 0; i < count; i++) {
      const from = -1 + 2 * i / count + 0.0034;
      const to = -1 + 2 * (i + 1) / count - 0.0034;
      m.add('paleTrim', slab(archBand(arch, outer, from, to, 4), z - 0.038, z + depth, 0.006), 0.88 + (i % 7) * 0.021);
    }
    for (const sign of [-1, 1]) {
      const x = sign * (arch.half + band * 0.56);
      m.add('paleTrim', block(x, arch.spring / 2, z, band, arch.spring - 0.026, depth * 2.3));
    }
  }

  const lintels = [[3.17, 8.12, 3.4, 0.56], [2.03, 5.43, 2.35, -0.39]];
  for (const [half, top, bottom, z] of lintels) {
    m.add('grout', strip([[-half, bottom], [-half, top], [half, top], [half, bottom]], 0.046, z, z + 0.014));
    m.add('paleTrim', strip([[-half - 0.043, bottom], [-half - 0.043, top + 0.041], [half + 0.043, top + 0.041], [half + 0.043, bottom]], 0.042, z, z + 0.028));
    for (const sign of [-1, 1]) rosette(m, sign * (half - 0.40), half > 3 ? 7.63 : 5.10, z + 0.025, half > 3 ? 0.175 : 0.13);
  }

  for (const sign of [-1, 1]) {
    const x = sign * 3.43;
    m.add('ochre', block(x, 1.13, 0.62, 1.64, 2.26, 0.14, 0.023), 0.87);
    m.add('paleTrim', block(x, 0.16, 0.65, 1.78, 0.27, 0.21, 0.019), 0.87);
    cornice(m, 'paleTrim', x, 2.45, 0.57, 1.75, 0.49);
    m.add('paleTrim', block(sign * 1.65, 3.17, -0.22, 0.27, 0.22, 0.30), 0.85);
  }

  cornice(m, 'paleTrim', 0, 8.58, 0.57, 8.65, 0.69);
  cornice(m, 'paleTrim', 0, 10.78, 0.57, 8.65, 0.75);

  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * 1.37;
    const profile = trimPath({ half: 0.61, spring: 9.88, rise: 0.42, point: 0.36 }, 8.76);
    m.add('grout', strip(profile, 0.045, 0.533, 0.577).translate(x, 0, 0), 0.94);
    m.add('paleTrim', strip(profile, 0.028, 0.577, 0.594).translate(x + 0.021, 0, 0), 0.86 + i % 3 * 0.058);
    rosette(m, x, 9.68, 0.574, 0.074);
  }

  m.add('grout', slab(nichePath, -0.832, -0.82), 0.58);
  m.add('paleTrim', strip(nichePath, 0.047, -0.410, -0.352), 0.88);
  m.add('ochre', block(0, 5.827, -0.343, 0.43, 0.054, 0.23, 0.014));

  for (let i = 0; i < 45; i++) {
    const x = (i - 22) * 0.19;
    m.add('ochre', block(x, 10.997, 0.51, 0.128, 0.22, 0.21, 0.011), 0.85 + (i % 6) * 0.023);
  }
  m.add('paleTrim', block(0, 11.13, 0.51, 8.72, 0.065, 0.26, 0.018));
}

function jharokha(m: Mason, x: number, y: number, z: number, scale: number) {
  const add = (key: string, geometry: T.BufferGeometry, shade = 1) =>
    m.add(key, geometry.scale(scale, scale, scale).translate(x, y, z), shade);
  const pillars = [-1.23, -0.45, 0.45, 1.23];
  add('rose', block(0, 0.04, 0.40, 2.78, 0.18, 1.01, 0.026), 0.84);
  add('roseTrim', block(0, 0.15, 0.41, 2.71, 0.085, 0.95));
  add('rose', block(0, 0.29, 0.83, 2.59, 0.25, 0.14), 0.78);
  add('roseTrim', block(0, 0.44, 0.85, 2.73, 0.10, 0.22));
  add('rose', block(0, 1.92, 0.42, 2.64, 0.24, 1.01), 0.88);
  add('roseTrim', block(0, 2.13, 0.44, 2.96, 0.12, 1.21, 0.022));
  add('roseTrim', block(0, 2.26, 0.37, 2.76, 0.14, 1.08, 0.015), 0.88);
  for (let i = 0; i < 15; i++) {
    const dx = -1.31 + i * 0.187;
    add('roseTrim', block(dx, 2.035, 0.96, 0.094, 0.11, 0.23, 0.005), 0.93);
    add('roseTrim', block(dx, 0.30, 0.92, 0.098, 0.11, 0.041, 0.007), i % 2 ? 0.85 : 0.95);
  }
  for (const dx of [-1.04, -0.56, 0, 0.56, 1.04]) {
    const corbel = slab([[-0.084, -0.65], [0.085, -0.65], [0.085, 0], [-0.087, 0]],
      -0.02, 0.20, 0.012);
    add('rose', corbel.rotateX(0.55).translate(dx, 0.055, 0.36), 0.82);
    for (let tier = 0; tier < 5; tier++) {
      add('roseTrim', block(dx, -0.59 + tier * 0.116, 0.09 + tier * 0.06, 0.21 + tier * 0.007, 0.096,
        0.22 + tier * 0.13, 0.012), 0.85 + 0.036 * tier);
    }
  }
  const spindle = new T.LatheGeometry([
    [0.080, 0.42], [0.080, 0.47], [0.066, 0.49], [0.062, 0.56], [0.040, 0.64],
    [0.038, 0.76], [0.043, 0.84], [0.063, 0.92], [0.058, 1.04], [0.039, 1.11],
    [0.039, 1.27], [0.057, 1.36], [0.076, 1.42], [0.082, 1.53],
  ].map(([a, b]) => new T.Vector2(a, b)), 12);
  for (const dx of pillars) {
    add('roseTrim', spindle.clone().translate(dx, 0, 0.83));
    add('rose', block(dx, 0.51, 0.83, 0.18, 0.14, 0.17, 0.011), 0.82);
    add('roseTrim', block(dx, 1.51, 0.84, 0.19, 0.11, 0.17, 0.01));
  }
  spindle.dispose();
  for (let i = 0; i < 3; i++) {
    const dx = (pillars[i] + pillars[i + 1]) * 0.5;
    const arch = { half: (pillars[i + 1] - pillars[i]) * 0.5, spring: 1.49, rise: 0.35, point: 0.19 };
    add('rose', slab(archOpening(arch, -arch.half - 0.005, arch.half + 0.005, 1.96, 1.49), 0.74, 0.87).translate(dx, 0, 0));
    const traced = crown(arch, 32).map(([a, b], step): Point => [a, b - 0.045 * Math.abs(Math.sin(step * Math.PI / 4))]);
    add('roseTrim', strip(traced, 0.047, 0.87, 0.913, 0.005).translate(dx, 0, 0));
  }
  for (const sign of [-1, 1]) {
    add('rose', block(sign * 1.31, 0.32, 0.42, 0.15, 0.29, 0.82), 0.85);
    add('roseTrim', block(sign * 1.31, 1.65, 0.42, 0.14, 0.42, 0.81), 0.91);
    add('roseTrim', block(sign * 1.28, 1.06, 0.13, 0.12, 1.13, 0.14));
  }
}

function adjoiningFacades(m: Mason) {
  // The left elevation adapts photographed Junagarh balconies. Its layout is interpretive.
  const left = -12.4, edge = -4.33, center = (left + edge) / 2, w = edge - left;
  m.add('rose', block(center, 6.60, -2.54, w, 13.20, 4.81), 0.88);
  m.add('rose', block(center, 2.29, -0.24, w, 4.58, 0.20), 0.89);
  masonry(m, 'rose', left, edge, 4.57, 12.66, -0.13, 366, undefined, 0.42, 1.02);
  m.add('masonry', block(center, 0.45, -0.066, w, 0.90, 0.17), 0.69);

  for (const [x, y, s] of [[-10.02, 6.46, 1.18], [-6.56, 8.23, 0.72], [-9.59, 10.44, 0.63]]) {
    const panel = { half: 0.43 * s, spring: y + 1.30 * s, rise: 0.34 * s, point: 0.22 * s };
    const path = trimPath(panel, y + 0.19 * s);
    m.add('grout', slab(path, -0.149, -0.080).translate(x, 0, 0), 0.45);
    jharokha(m, x, y, -0.05, s);
  }
  for (const y of [4.52, 9.98, 12.75]) cornice(m, 'roseTrim', center, y, -0.13, w, y > 12 ? 1.45 : 0.85);
  for (const x of [-11.98, -8.12, -4.67]) {
    m.add('roseTrim', block(x, 6.31, -0.084, 0.26, 12.62, 0.198, 0.02), 0.86);
    m.add('rose', block(x, 0.19, 0.09, 0.46, 0.36, 0.39, 0.018), 0.78);
  }
  for (const x of [-10.32, -7.39, -5.54]) {
    const arch = { half: 0.34, spring: 3.16, rise: 0.32, point: 0.16 };
    const path = trimPath(arch, 1.73);
    m.add('grout', slab(path, -0.13, -0.075).translate(x, 0, 0), 0.40);
    m.add('roseTrim', strip(path, 0.11, -0.11, -0.015).translate(x, 0, 0), 0.85);
    for (let i = -3; i <= 3; i++) {
      m.add('roseTrim', block(x + i * 0.079, 2.47, -0.05, 0.030, 1.41, 0.05, 0.004), 0.76);
    }
    for (let i = 0; i < 13; i++) {
      m.add('rose', block(x, 1.78 + i * 0.107, -0.05, 0.56, 0.031, 0.046, 0.003), 0.81);
    }
    m.add('roseTrim', block(x, 1.69, 0, 0.90, 0.11, 0.25), 0.86);
  }
  m.add('rose', block(-9.10, 13.58, -2.98, 5.7, 1.8, 2.93), 0.89);
  cornice(m, 'roseTrim', -9.10, 14.42, -1.37, 5.72, 0.84);
  for (const x of [-11.14, -10.12, -9.10, -8.08, -7.06]) {
    m.add('grout', block(x, 13.55, -1.40, 0.56, 0.56, 0.22), 0.46);
    m.add('roseTrim', block(x, 13.19, -1.34, 0.75, 0.10, 0.29), 0.85);
  }

  m.add('ochre', block(7.79, 4.39, -2.36, 6.92, 8.78, 3.98), 0.87);
  masonry(m, 'ochre', 4.34, 11.22, 0, 8.78, -0.36, 849, undefined, 0.51, 1.11);
  for (const y of [2.40, 8.79]) cornice(m, 'paleTrim', 7.77, y, -0.36, 6.9, 0.59);
  for (let i = 0; i < 15; i++) {
    const x = 4.62 + i * 0.451;
    const shell: Point[] = [[x - 0.163, 8.83], ...crown({ half: 0.163, spring: 9.12, rise: 0.19, point: 0.16 }, 12)
      .map(([a, b]): Point => [a + x, b]), [x + 0.163, 8.83]];
    m.add('ochre', slab(shell, -0.51, -0.26, 0.016), 0.88 + i % 5 * 0.025);
  }

  // Renderable stone returns give the benchmark solid sides when orbited.
  m.add('rose', block(-12.32, 6.38, -3.04, 0.24, 12.76, 5.78), 0.91);
  m.add('paleTrim', block(11.15, 4.4, -2.65, 0.22, 8.8, 4.59), 0.88);
  m.add('ochre', block(10.92, 3.36, -8.27, 0.67, 6.72, 7.69), 0.89);
  for (const [y, h, d] of [[0.22, 0.42, 0.86], [2.39, 0.14, 0.82], [6.76, 0.22, 0.93]]) {
    m.add('paleTrim', block(10.92, y, -8.27, d, h, 7.79), 0.88);
  }
  for (let i = 0; i < 16; i++) {
    const crownPoints: Point[] = [[-0.15, 6.84], ...crown({ half: 0.15, spring: 7.09, rise: 0.16, point: 0.13 }, 14), [0.15, 6.84]];
    m.add('ochre', slab(crownPoints, -0.21, 0.21, 0.01).rotateY(Math.PI / 2).translate(10.91, 0, -4.87 - i * 0.45), 0.89);
  }
  m.add('ochre', block(7.79, 4.38, -4.61, 6.92, 8.76, 0.24), 0.90);
  m.add('rose', block(center, 6.60, -5.26, w, 13.20, 0.29), 0.89);
  const returnWall: Mason = {
    add(key, geometry, shade) { m.add(key, geometry.rotateY(Math.PI / 2).translate(-12.31, 0, 2.14), shade); },
    finish() {},
  };
  returnWall.add('rose', block(0, 4.24, -0.46, 5.07, 8.48, 0.89), 0.90);
  masonry(returnWall, 'rose', -2.53, 2.53, 0, 8.48, 0.005, 142, undefined, 0.55, 1.18);
  cornice(returnWall, 'roseTrim', 0, 8.48, 0.013, 5.09, 0.94);
  cornice(returnWall, 'roseTrim', 0, 3.91, 0.005, 5.12, 0.65);
  jharokha(returnWall, 0.73, 5.08, 0.04, 0.85);
  for (let i = 0; i < 19; i++) {
    returnWall.add('rose', block((i - 9) * 0.259, 8.73, -0.018, 0.17, 0.35, 0.33), 0.89);
  }
  returnWall.add('roseTrim', block(0, 8.94, 0.01, 5.11, 0.10, 0.43), 0.90);

  // A short sunlit return behind the traversable vault terminates the study.
  const rear = -12.24;
  m.add('rose', block(-4.63, 2.99, rear, 8.35, 5.98, 0.58), 0.85);
  m.add('rose', block(4.86, 2.81, rear, 10.77, 5.62, 0.58), 0.87);
  m.add('rose', block(8.85, 2.39, rear + 0.14, 3.49, 4.78, 0.37), 0.92);
  m.add('roseTrim', block(1.06, 0.18, rear + 0.35, 19.77, 0.33, 0.25, 0.014), 0.83);
  masonry(m, 'rose', -8.73, -0.48, 0, 5.97, rear + 0.33, 275, undefined, 0.46, 0.84);
  masonry(m, 'rose', -0.25, 8.39, 0, 5.61, rear + 0.33, 821, undefined, 0.48, 0.88);
  cornice(m, 'roseTrim', -4.61, 5.9, rear + 0.35, 8.3, 0.79);
  cornice(m, 'roseTrim', 4.99, 5.58, rear + 0.35, 10.35, 0.71);
  for (const x of [-0.11, 2.95, 5.95]) {
    const courtArch: Arch = { half: 0.73, spring: 2.43, rise: 0.55, point: 0.26 };
    const path = trimPath(courtArch, 0.73);
    const center = path.map(([a, b]): Point => [a + x, b]);
    m.add('rose', slab(center, rear + 0.326, rear + 0.346), 0.81);
    m.add('roseTrim', strip(path, 0.13, rear + 0.344, rear + 0.46).translate(x, 0, 0), 0.88);
    m.add('roseTrim', block(x, 0.72, rear + 0.41, 1.68, 0.11, 0.20), 0.88);
  }
  jharokha(m, -2.48, 3.10, rear + 0.36, 0.90);
}

function doors(group: T.Group, palette: Palette) {
  return [-1, 1].map((hand) => {
    const hinge = new T.Group();
    hinge.name = hand < 0 ? 'Left door hinge' : 'Right door hinge';
    hinge.position.set(hand * (aperture.half - 0.073), 0, leafZ);
    group.add(hinge);
    const m = batch(hinge, palette);
    const half = aperture.half - 0.075;
    const tip = 0.026;
    const cap = (x: number) => archHeight(aperture, x) - 0.08;
    const planks = 8;
    for (let i = 0; i < planks; i++) {
      const w = (half - tip) / planks;
      const dx = tip + i * w;
      const edge = (u: number) => hand * u;
      const x0 = edge(dx + 0.004), x1 = edge(dx + w - 0.004);
      const upper = Array.from({ length: 8 }, (_, index): Point => {
        const x = T.MathUtils.lerp(x1, x0, index / 7);
        return [x, cap(x)];
      });
      m.add('wood', slab([[x0, 0.066], [x1, 0.066], ...upper], -0.15, 0.025, 0.008, 2.5, 0.47)
        .translate(-hinge.position.x, 0, 0), 0.77 + ((i * 5 + 3) % 8) * 0.04);
    }
    for (const x of [hand * 0.072, hand * (half - 0.075)]) {
      const h = cap(x) - 0.13;
      m.add('wood', block(x - hinge.position.x, h / 2 + 0.076, 0.043, 0.095, h, 0.05, 0.012), 0.72);
    }
    for (const y of [0.26, 1.07, 2.23, 3.16]) {
      m.add('iron', block(hand * (half + tip) / 2 - hinge.position.x, y, 0.055, half - tip, 0.085, 0.05, 0.009), 0.94);
      m.add('wood', block(hand * (half + tip) / 2 - hinge.position.x, y, -0.208, half - tip, 0.16, 0.11), 0.84);
    }

    const studs: T.Matrix4[] = [];
    for (let row = 0; row < 29; row++) {
      const y = 0.26 + row * 0.153;
      for (let i = 0; i < 10; i++) {
        const x = hand * (0.12 + (i + 0.45 * (row % 2)) * 0.132);
        if (y > cap(x) - 0.12 || x * hand > half - 0.07) continue;
        const spike = row > 18 && row < 23 && i % 2 === 1;
        const scale = spike ? 1.72 : (row + i) % 3 === 0 ? 1.08 : 0.89;
        const matrix = new T.Matrix4().makeScale(scale, scale, spike ? 3.8 : scale);
        matrix.setPosition(x - hinge.position.x, y, spike ? 0.074 : 0.047);
        studs.push(matrix);
      }
    }
    // Instanced hardware retains the photographed stud rhythm without hundreds of draw calls.
    const studGeometry = new T.SphereGeometry(0.024, 9, 6).scale(1, 1, 1.43);
    const studMaterial = palette.iron.clone();
    studMaterial.vertexColors = false;
    const fittings = new T.InstancedMesh(studGeometry, studMaterial, studs.length);
    fittings.name = 'Iron door studs';
    studs.forEach((matrix, i) => {
      fittings.setMatrixAt(i, matrix);
      fittings.setColorAt(i, new T.Color().setScalar(0.72 + i % 7 * 0.077));
    });
    fittings.castShadow = fittings.receiveShadow = true;
    hinge.add(fittings);
    const ringX = hand * 0.235 - hinge.position.x;
    m.add('iron', new T.TorusGeometry(0.105, 0.018, 8, 28).translate(ringX, 1.63, 0.094));
    m.add('iron', block(ringX, 1.74, 0.057, 0.16, 0.12, 0.085, 0.017), 0.77);
    m.finish();
    return hinge;
  });
}

export function buildJunagarh(palette: Palette) {
  const group = new T.Group();
  group.name = 'Suraj Pol gateway and adjoining elevations';
  const m = batch(group, palette);
  gateFacade(m);
  adjoiningFacades(m);
  m.finish();
  const [left, right] = doors(group, palette);
  return {
    group,
    setDoors(leftOpen: number, rightOpen = leftOpen) {
      left.rotation.y = T.MathUtils.clamp(leftOpen, 0, 1) * Math.PI * 0.495;
      right.rotation.y = -T.MathUtils.clamp(rightOpen, 0, 1) * Math.PI * 0.495;
    },
  };
}
