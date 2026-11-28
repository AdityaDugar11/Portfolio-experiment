import gsap from 'gsap';
import { duration, seekCamera } from './camera';
import { createScene } from './scene';

export async function mountCinematic(root: HTMLElement) {
  (window as Window & { gsap?: typeof gsap }).gsap ??= gsap;
  const view = await createScene(root.querySelector('canvas')!, true);
  view.setSize(Number(root.dataset.width), Number(root.dataset.height));
  // Only composition time drives the camera and both hinges.
  function renderAt(time: number) {
    view.fort.setDoors(...seekCamera(view.camera, time));
    view.render();
  }

  const events = new AbortController();
  window.addEventListener('hf-seek', (event) => {
    renderAt((event as CustomEvent<{ time: number }>).detail.time);
  }, { signal: events.signal });

  const clock = { seconds: 0 };
  const timeline = gsap.timeline({ paused: true });
  timeline.to(clock, { seconds: duration, duration, ease: 'none' }, 0);
  renderAt((window as Window & { __hfThreeTime?: number }).__hfThreeTime ?? 0);
  root.dataset.ready = 'true';

  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    events.abort();
    timeline.kill();
    view.dispose();
  }, { signal: events.signal });
  return { timeline };
}
