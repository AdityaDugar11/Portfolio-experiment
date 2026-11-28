import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MathUtils } from 'three';
import { passagePose, placeView, views } from './camera';
import { createScene } from './scene';

const canvas = document.querySelector('canvas')!;
const status = document.querySelector<HTMLElement>('#status')!;
const panel = document.querySelector<HTMLElement>('#tools')!;
const doorButton = document.querySelector<HTMLButtonElement>('#doors')!;
const passage = document.querySelector<HTMLElement>('#passage')!;
const scrub = passage.querySelector('input')!;
const viewButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-view]')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const events = new AbortController();
const options = { signal: events.signal };

async function start() {
  const { camera, fort, setSize, render, dispose } = await createScene(canvas);
  const orbit = new OrbitControls(camera, canvas);
  orbit.minDistance = 0.5;
  orbit.maxDistance = 95;
  orbit.maxPolarAngle = Math.PI * 0.49;
  orbit.enableDamping = false;
  let view: keyof typeof views = 'elevated';
  let opened = false;
  let frame = 0;
  let amount = 0;

  function draw() {
    render();
  }

  function doors(next: boolean, instant = false) {
    opened = next;
    doorButton.textContent = opened ? 'Close doors' : 'Open doors';
    doorButton.setAttribute('aria-pressed', String(opened));
    cancelAnimationFrame(frame);
    const desired = Number(opened);
    if (instant || reducedMotion.matches) {
      amount = desired;
      fort.setDoors(amount);
      draw();
      return;
    }
    const begin = performance.now();
    const from = amount;
    function animate(now: number) {
      const progress = MathUtils.clamp((now - begin) / 820, 0, 1);
      amount = MathUtils.lerp(from, desired, MathUtils.smoothstep(progress, 0, 1));
      fort.setDoors(amount);
      draw();
      if (progress < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
  }

  function setView(next: keyof typeof views) {
    view = next;
    const movingThroughGate = view === 'passage';
    orbit.enabled = !movingThroughGate;
    passage.hidden = !movingThroughGate;
    for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.view === view));
    if (movingThroughGate) {
      scrub.value = '0';
      const pose = passagePose(camera, 0);
      orbit.target.fromArray(pose.target);
      doors(true, true);
    } else {
      const preset = views[view];
      const framing = canvas.clientWidth / canvas.clientHeight < 0.75 ? { ...preset, fov: preset.fov + (view === 'detail' ? 8 : 21) } : preset;
      placeView(camera, framing);
      orbit.target.fromArray(framing.target);
      orbit.update();
      draw();
    }
  }

  viewButtons.forEach((button) => button.addEventListener('click', () => setView(button.dataset.view as keyof typeof views), options));
  doorButton.addEventListener('click', () => {
    if (view === 'passage' && opened && Number(scrub.value) > 35) setView('ground');
    doors(!opened);
  }, options);
  scrub.addEventListener('input', () => {
    if (!opened || amount < 1) doors(true, true);
    const pose = passagePose(camera, Number(scrub.value) / 100);
    orbit.target.fromArray(pose.target);
    draw();
  }, options);
  orbit.addEventListener('change', draw);

  let portraitLayout: boolean | undefined;
  function resize() {
    setSize(canvas.clientWidth, canvas.clientHeight, Math.min(devicePixelRatio, 2));
    const narrow = camera.aspect < 0.75;
    if (portraitLayout !== undefined && portraitLayout !== narrow && view !== 'passage') setView(view);
    else draw();
    portraitLayout = narrow;
  }
  const observer = new ResizeObserver(resize);
  resize();
  setView('elevated');
  observer.observe(canvas);

  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    cancelAnimationFrame(frame);
    events.abort();
    observer.disconnect();
    orbit.dispose();
    dispose();
  }, options);

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    status.textContent = 'The WebGL context was lost. Reload the preview to reconnect.';
    status.hidden = false;
    panel.hidden = true;
  }, options);

  status.hidden = true;
  panel.hidden = false;
}

start().catch((error: unknown) => {
  status.textContent = 'The 3D preview could not start. Check WebGL support and reload.';
  console.error(error);
});
