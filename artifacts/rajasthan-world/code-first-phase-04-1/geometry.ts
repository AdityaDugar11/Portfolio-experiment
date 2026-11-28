import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type Point = [number, number];

export interface Arch {
  half: number;
  spring: number;
  rise: number;
  point: number;
}

export function archHeight(arch: Arch, x: number) {
  const offset = arch.point;
  const ratio = (Math.abs(x) + offset) / (arch.half + offset);
  const center = offset / (arch.half + offset);
  return arch.spring + arch.rise * Math.sqrt(Math.max(0, (1 - ratio ** 2) / (1 - center ** 2)));
}

export function archSpan(arch: Arch, y: number) {
  const t = T.MathUtils.clamp((y - arch.spring) / arch.rise, 0, 1);
  const center = arch.point / (arch.half + arch.point);
  return (arch.half + arch.point) * Math.sqrt(1 - t * t * (1 - center ** 2)) - arch.point;
}

function archPoint(arch: Arch, angle: number): Point {
  const direction = Math.sign(angle);
  const q = Math.acos(arch.point / (arch.half + arch.point));
  const x = direction * ((arch.half + arch.point) * Math.cos(q * (1 - Math.abs(angle))) - arch.point);
  return [x, archHeight(arch, x)];
}

export function crown(arch: Arch, steps = 48) {
  return Array.from({ length: steps + 1 }, (_, i) => archPoint(arch, 2 * i / steps - 1));
}

export function archBand(inner: Arch, outer: Arch, from: number, to: number, steps: number): Point[] {
  const angles = Array.from({ length: steps + 1 }, (_, i) => T.MathUtils.lerp(from, to, i / steps));
  return [...angles.map((a) => archPoint(outer, a)), ...angles.reverse().map((a) => archPoint(inner, a))];
}

export function archOpening(arch: Arch, left: number, right: number, top: number, bottom = 0): Point[] {
  return [[left, bottom], [-arch.half, bottom], ...crown(arch), [arch.half, bottom], [right, bottom], [right, top], [left, top]];
}

export function rectangle(left: number, bottom: number, right: number, top: number): Point[] {
  return [[left, bottom], [right, bottom], [right, top], [left, top]];
}


function surfaceUV(geometry: T.BufferGeometry, tile: number, horizontalTile = tile) {
  const positions = geometry.getAttribute('position') as T.BufferAttribute;
  const normals = geometry.getAttribute('normal');
  const uvs = geometry.getAttribute('uv');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const nx = Math.abs(normals.getX(i)), ny = Math.abs(normals.getY(i)), nz = Math.abs(normals.getZ(i));
    if (ny > nx && ny > nz) uvs.setXY(i, x / horizontalTile, z / tile);
    else if (nx > nz) uvs.setXY(i, z / horizontalTile, y / tile);
    else uvs.setXY(i, x / horizontalTile, y / tile);
  }
}

export function slab(points: Point[], back: number, front: number, bevel = 0, tile = 1.8, horizontalTile = tile, holes: Point[][] = []) {
  const shape = new T.Shape(points.map(([x, y]) => new T.Vector2(x, y)));
  shape.holes = holes.map((hole) => new T.Path(hole.map(([x, y]) => new T.Vector2(x, y))));
  const geometry = new T.ExtrudeGeometry(shape, {
    depth: front - back,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    steps: 1,
  });
  geometry.translate(0, 0, back);
  surfaceUV(geometry, tile, horizontalTile);
  return geometry;
}

export function block(x: number, y: number, z: number, w: number, h: number, d: number, bevel = 0.013) {
  return slab(rectangle(x - w / 2, y - h / 2, x + w / 2, y + h / 2), z - d / 2, z + d / 2, bevel);
}

export function strip(path: Point[], width: number, back: number, front: number, bevel = 0.006) {
  const shifted = (side: number) => path.map(([x, y], i): Point => {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const w = side * width / (2 * Math.hypot(dx, dy));
    return [x - dy * w, y + dx * w];
  });
  return slab([...shifted(1), ...shifted(-1).reverse()], back, front, bevel);
}

export function trimPath(arch: Arch, bottom: number, steps = 30): Point[] {
  return [[-arch.half, bottom], ...crown(arch, steps), [arch.half, bottom]];
}

export function batch(parent: T.Group, palette: Record<string, T.Material>) {
  const pieces = new Map<string, T.BufferGeometry[]>();
  return {
    add(material: string, geometry: T.BufferGeometry, shade = 1) {
      const piece = geometry.index ? geometry.toNonIndexed() : geometry;
      if (piece !== geometry) geometry.dispose();
      if (!piece.hasAttribute('color')) {
        const colors = new Float32Array(piece.getAttribute('position').count * 3).fill(shade);
        piece.setAttribute('color', new T.BufferAttribute(colors, 3));
      }
      const group = pieces.get(material) ?? [];
      group.push(piece);
      pieces.set(material, group);
    },
    finish() {
      for (const [name, geometries] of pieces) {
        const merged = mergeGeometries(geometries);
        geometries.forEach((geometry) => geometry.dispose());
        if (!merged) throw new Error(`Could not merge ${name} geometry`);
        const mesh = new T.Mesh(merged, palette[name]);
        mesh.name = name;
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
      }
      pieces.clear();
    },
  };
}

export function randomSource(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
