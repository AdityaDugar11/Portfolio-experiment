import { CatmullRomCurve3, MathUtils, PerspectiveCamera, Vector3 } from 'three';

type Position = [number, number, number];
type View = { eye: Position; target: Position; fov: number };

export const views = {
  elevated: { eye: [13.7, 14.4, 29.9], target: [-0.9, 4.9, -2.7], fov: 43 },
  ground: { eye: [4.95, 1.88, 17.15], target: [-1.65, 5.12, -0.35], fov: 46 },
  detail: { eye: [2.88, 2.36, 6.12], target: [0.43, 3.29, -0.36], fov: 38 },
  passage: { eye: [0, 1.69, 6.7], target: [0, 2.03, -2.0], fov: 44 },
} satisfies Record<string, View>;

export function placeView(camera: PerspectiveCamera, view: View) {
  camera.position.fromArray(view.eye);
  camera.fov = view.fov;
  camera.lookAt(...view.target);
  camera.updateProjectionMatrix();
}

export function passagePose(camera: PerspectiveCamera, progress: number) {
  const t = MathUtils.clamp(progress, 0, 1);
  const z = MathUtils.lerp(6.7, -8.1, t);
  const turn = MathUtils.smoothstep(t, 0.62, 1);
  const view: View = {
    eye: [0, 1.69 + turn * 0.20, z],
    target: [-1.9 * turn, 2.02 + 1.95 * turn, z - 5.4],
    fov: 44 + 3 * turn,
  };
  placeView(camera, view);
  return view;
}

export const duration = 12;
const marks = [
  { time: 0, ...views.elevated },
  { time: 2.1, eye: [12.4, 7.4, 25.8], target: [-1.75, 4.45, -0.4], fov: 42 },
  { time: 4.2, eye: [4.95, 2.45, 13.0], target: [-0.86, 4.66, -0.65], fov: 40 },
  { time: 6.0, ...views.detail },
  { time: 7.65, eye: [1.15, 1.97, 3.62], target: [0.17, 2.98, -1.77], fov: 47 },
  { time: 9.5, eye: [0.06, 1.72, 0.52], target: [-0.19, 2.34, -7.4], fov: 49 },
  { time: 11.45, eye: [0, 1.88, -7.75], target: [-1.38, 3.45, -12.02], fov: 47 },
  { time: 12, eye: [0, 1.9, -8.07], target: [-1.66, 3.57, -12.14], fov: 47 },
] satisfies Array<View & { time: number }>;

const eyes = new CatmullRomCurve3(marks.map(({ eye }) => new Vector3(...eye)));
const targets = new CatmullRomCurve3(marks.map(({ target }) => new Vector3(...target)));
const target = new Vector3();

export function seekCamera(camera: PerspectiveCamera, time: number) {
  const t = MathUtils.clamp(time, 0, duration);
  const next = marks.findIndex((frame) => t <= frame.time && frame.time > 0);
  const previous = Math.max(0, next - 1);
  const a = marks[previous], b = marks[next];
  const fraction = (t - a.time) / (b.time - a.time);
  const u = (previous + fraction) / (marks.length - 1);
  eyes.getPoint(u, camera.position);
  camera.lookAt(targets.getPoint(u, target));
  camera.fov = MathUtils.lerp(a.fov, b.fov, fraction);
  camera.updateProjectionMatrix();

  return [MathUtils.smoothstep(t, 6.40, 8.51), MathUtils.smoothstep(t, 6.72, 8.86)] as const;
}
