import * as T from 'three';
import { batch, block, randomSource } from './geometry';
import type { Palette } from './materials';

function grade(x: number, z: number) {
  const distance = Math.hypot(x * 0.83, (z - 1) * 0.75);
  const rise = T.MathUtils.smoothstep(distance, 10, 29);
  const west = Math.exp(-(((x + 19) / 10) ** 2) - ((z - 12) / 13) ** 2);
  const east = Math.exp(-(((x - 17) / 9) ** 2) - ((z - 15) / 10) ** 2);
  const erosion = Math.sin(x * 0.21 + z * 0.085) * Math.cos(z * 0.21) * 0.46;
  return -0.123 + rise * (west * 1.31 + east * 1.10 + erosion + 0.17 * Math.sin(x * 0.46 + z * 0.33));
}

function sandField(palette: Palette) {
  const geometry = new T.PlaneGeometry(260, 240, 220, 204).rotateX(-Math.PI / 2);
  const p = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  const colors = new Float32Array(p.count * 3);
  const light = new T.Color('#fff9e9'), dark = new T.Color('#ba9a79'), shade = new T.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, grade(x, z));
    uv.setXY(i, x / 2.48 + 0.10 * Math.sin(z * 0.57), -z / 2.48 + 0.10 * Math.cos(x * 0.46));
    const patch = T.MathUtils.smoothstep(0.5 + 0.24 * Math.sin(x * 0.30 + z * 0.15) + 0.25 * Math.cos(z * 0.53 - x * 0.21), 0.27, 0.86);
    shade.copy(light).lerp(dark, patch * 0.63).toArray(colors, 3 * i);
  }
  geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const mesh = new T.Mesh(geometry, palette.sand);
  mesh.name = 'Graded sand with directional ripple normals';
  mesh.receiveShadow = true;
  return mesh;
}

function sandToCourt(palette: Palette) {
  const geometry = new T.PlaneGeometry(38, 49, 78, 96).rotateX(-Math.PI / 2).translate(-0.7, 0, 3);
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  const weight = new Float32Array(position.count);
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i);
    const edge = Math.hypot(x / 17.5, (z - 3) / 23);
    const breakup = 0.06 * Math.sin(x * 1.2 + z * 0.88) + 0.08 * Math.cos(x * 0.82 - z * 0.56);
    weight[i] = 1 - T.MathUtils.smoothstep(edge + breakup, 0.48, 0.97);
    position.setY(i, grade(x, z) + 0.008);
    uv.setXY(i, x / 2.2, -z / 2.2);
    const shadow = Math.abs(z) < 0.75 && (x < -1.7 || x > 1.7)
      ? 0.78 + T.MathUtils.smoothstep(Math.abs(z), 0, 0.75) * 0.22
      : 1;
    colors.fill(shadow, i * 3, i * 3 + 3);
  }
  geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
  geometry.setAttribute('coverage', new T.BufferAttribute(weight, 1));
  geometry.computeVertexNormals();
  palette.gravel.transparent = true;
  palette.gravel.depthWrite = false;
  palette.gravel.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float coverage;\nvarying float vCoverage;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCoverage = coverage;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vCoverage;')
      .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= vCoverage;');
  };
  const mesh = new T.Mesh(geometry, palette.gravel);
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  return mesh;
}

function paving(group: T.Group, palette: Palette) {
  const mason = batch(group, palette);
  const random = randomSource(592);
  for (let z = -11.88, row = 0; z < 10; row++) {
    const d = 0.49 + random() * 0.19;
    const half = z < 6 ? 7.6 : 7.6 - (z - 6) * 0.47;
    for (let x = -half; x < half - 0.04;) {
      const w = Math.min(half - x, (x === -half && row % 2 ? 0.40 : 0.73) + random() * 0.38);
      const fade = T.MathUtils.smoothstep(z + 0.23 * Math.abs(x) + Math.sin(x * 0.7) * 0.40, 5.0, 10.9);
      const y = -0.069 + (random() - 0.5) * 0.019 - fade * 0.125;
      const dusty = z > 6 ? 0.13 : 0;
      if (w > 0.09 && fade < 0.80) {
        const edge = Math.abs(x) > 5.6 && z > 3 ? T.MathUtils.smoothstep(Math.abs(x), 5.6, 7.6) * 0.025 : 0;
        const shade = 0.80 + random() * 0.25 + dusty;
        mason.add('courtyard', block(x + w / 2, y - edge, z + d / 2, w - 0.020, 0.063, d - 0.022, 0.007), shade);
      }
      x += w;
    }
    z += d;
  }
  mason.finish();
}

function outcrop(seed: number, sx: number, sy: number, sz: number) {
  const random = randomSource(seed);
  const strata = [[-0.12, 0.84], [0.10, 1.00], [0.28, 0.88], [0.37, 0.94], [0.56, 0.68], [0.72, 0.40], [0.79, 0.085]];
  const size = 19;
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const profile = Array.from({ length: size }, () => 0.74 + random() * 0.50);
  for (let row = 0; row < strata.length; row++) {
    const [height, radius] = strata[row];
    for (let i = 0; i <= size; i++) {
      const angle = i / size * Math.PI * 2;
      const faceting = profile[i % size] * (0.95 + 0.15 * Math.cos(angle * 3 + row));
      const x = sx * (Math.cos(angle) * radius * faceting + height * 0.21);
      const z = sz * (Math.sin(angle) * radius * faceting - height * 0.11);
      const y = sy * (height + 0.066 * Math.cos(angle * 2 + 0.4) + 0.036 * Math.sin(angle * 5 + row));
      positions.push(x, y, z);
      uvs.push(i / size * (sx + sz) * 2.45, y * 1.1 + radius * 0.59);
      if (row && i) {
        const a = row * (size + 1) + i, b = a - size - 1;
        indices.push(b - 1, a - 1, b, b, a - 1, a);
      }
    }
  }
  const center = positions.length / 3;
  positions.push(sx * 0.16, sy * 0.785, -sz * 0.084);
  uvs.push(sx * 1.2, sy * 0.88);
  const top = (strata.length - 1) * (size + 1);
  for (let i = 0; i < size; i++) indices.push(top + i, center, top + i + 1);
  const mesh = new T.BufferGeometry();
  mesh.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  mesh.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  mesh.setIndex(indices);
  mesh.computeVertexNormals();
  return mesh;
}

function scrub(mason: ReturnType<typeof batch>, x: number, z: number, s: number, seed: number) {
  const random = randomSource(seed);
  const y = grade(x, z);
  const base = new T.Vector3(x, y - 0.024, z);
  const positions: number[] = [], colors: number[] = [];
  const start = new T.Color('#e0ce9b'), end = new T.Color('#665939');
  function stem(a: T.Vector3, b: T.Vector3, radius: number) {
    const offset = b.clone().sub(a);
    const geometry = new T.CylinderGeometry(radius * 0.33, radius, offset.length(), 5);
    const rotation = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), offset.normalize());
    geometry.applyQuaternion(rotation).translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    mason.add('stem', geometry, 0.84 + random() * 0.22);
  }
  for (let i = 0; i < 13; i++) {
    const a = i * 2.399963 + random() * 0.32;
    const spread = s * (0.17 + random() * 0.44);
    const tip = new T.Vector3(x + Math.cos(a) * spread, y + s * (0.34 + random() * 0.48), z + Math.sin(a) * spread);
    const branch = base.clone().lerp(tip, 0.61).add(new T.Vector3(0, -s * 0.06, 0));
    stem(base, branch, s * 0.013);
    stem(branch, tip, s * 0.0065);
    for (let j = 0; j < 5; j++) {
      const leafBase = branch.clone().lerp(tip, j / 5);
      const yaw = a + (j % 2 ? -1 : 1) * (0.65 + random() * 0.84);
      const direction = new T.Vector3(Math.cos(yaw), 0.46 + random() * 0.45, Math.sin(yaw));
      const size = s * (0.062 + random() * 0.095);
      const vein = leafBase.clone().addScaledVector(direction, size * 0.50);
      const point = leafBase.clone().addScaledVector(direction, size);
      const cross = new T.Vector3(-direction.z, 0.10, direction.x).multiplyScalar(size * 0.125);
      const l = vein.clone().add(cross), r = vein.clone().sub(cross);
      for (const v of [leafBase, l, point, leafBase, point, r]) {
        positions.push(...v.toArray());
        colors.push(...start.clone().lerp(end, random() * 0.55 + (v === leafBase ? 0.25 : 0)).toArray());
      }
    }
  }
  const geometry = new T.BufferGeometry();
  const vertexCount = positions.length / 3;
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.BufferAttribute(new Float32Array(vertexCount * 2), 2));
  geometry.computeVertexNormals();
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  mason.add('scrub', geometry);
}

export function buildLandscape(palette: Palette) {
  const group = new T.Group();
  group.name = 'Local approach, sandstone flags and dry margin';
  group.add(sandField(palette), sandToCourt(palette));
  paving(group, palette);
  const m = batch(group, palette);
  const random = randomSource(3213);
  // Rocks and scrub collect at the edges of the maintained approach and where the grade changes.
  const clusters = [
    [-9.0, 7.8, 1.5], [-6.7, 16.2, 1.3], [-8.4, 12.7, 1.0], [7.4, 11.7, 1.3],
    [9.0, 6.8, 1.2], [12.2, 2.3, 1.6], [16.1, 12.2, 2.4], [-16.4, 7.4, 1.7],
    [10.4, 19.8, 1.4], [14.5, -5.1, 1.1], [-17.1, -2.0, 1.1], [8.0, -9.1, 0.8],
    [-5.1, 22.2, 1.3], [5.8, 21.1, 1.1], [-19.4, 19.2, 2.3], [19.5, 19.7, 2.0],
  ];
  clusters.forEach(([x, z, size], i) => {
    for (let j = 0; j < 9; j++) {
      const a = j * 2.399963;
      const radius = size * (0.21 + 1.25 * random());
      const px = x + Math.cos(a) * radius, pz = z + Math.sin(a) * radius;
      const scale = size * (j === 0 ? 0.39 + random() * 0.23 : 0.055 + random() * 0.19);
      m.add('rock', outcrop(863 + i * 63 + j, scale * 1.42, scale * (0.48 + random() * 0.58), scale)
        .rotateY(random() * Math.PI).translate(px, grade(px, pz), pz), 0.78 + random() * 0.23);
    }
    for (let j = 0; j < 5; j++) {
      const px = x + (random() - 0.5) * size * 2.45;
      const pz = z + (random() - 0.5) * size * 2.65;
      scrub(m, px, pz, size * (0.25 + random() * 0.40), i * 19 + j * 29);
    }
  });
  m.finish();
  return group;
}
