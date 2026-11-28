import { useEffect, useRef } from 'react';
import type { createCinematicScene } from './rajasthanCinematicScene';
import './RajasthanCinematicPreview.css';

const ASSETS = '/__rajasthan-cinematic';
const IMAGE_WIDTH = 1728;
const IMAGE_HEIGHT = 1216;
const ASPECT = IMAGE_WIDTH / IMAGE_HEIGHT;
const CHAPTER = { x: (645 + 96) / IMAGE_WIDTH, y: (222 + 96) / IMAGE_HEIGHT };

function readDepthImage() {
  const image = new Image();
  image.src = ASSETS + '/depth.webp';
  return image.decode().then(() => image);
}

export default function RajasthanCinematicPreview() {
  const runwayRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const markerRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const runway = runwayRef.current!;
    const stage = stageRef.current!;
    const poster = posterRef.current!;
    const marker = markerRef.current!;
    const status = statusRef.current!;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const detail = new Image();
    detail.className = 'rc-image';
    detail.alt = '';
    detail.hidden = true;
    poster.after(detail);
    let scene: ReturnType<typeof createCinematicScene> | undefined;
    let frameRequest = 0;
    let detailRequest = 0;
    let detailPath = '';
    let stopped = false;
    let initializing = false;
    let webGLFailed = false;

    const maxScroll = () => runway.offsetHeight - stage.clientHeight;

    function render() {
      frameRequest = 0;
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      const progress = Math.max(0, Math.min(1, window.scrollY / Math.max(1, maxScroll())));
      const isStatic = motion.matches || !scene;
      const travel = isStatic ? Number(progress >= 0.5) : progress * progress * (3 - 2 * progress);
      const portrait = Math.max(0, Math.min(1, (1.1 - width / height) / 0.62));
      const scale = Math.min(width / (1536 * 0.955), height / (1024 * 1.10));
      const openingHeight = IMAGE_HEIGHT * scale;
      const imageHeight = openingHeight * (1 + travel * (0.75 + portrait));
      const openingX = width / 2 + (CHAPTER.x - 0.5) * openingHeight * ASPECT;
      const openingY = height * (0.48 + 0.012 * portrait) + (CHAPTER.y - 0.5) * openingHeight;
      const markerX = openingX + (width * 0.515 - openingX) * travel;
      const markerY = openingY + (height * (0.44 - 0.015 * portrait) - openingY) * travel;

      stage.style.setProperty('--rc-image-height', imageHeight + 'px');
      stage.style.setProperty('--rc-image-width', imageHeight * ASPECT + 'px');
      stage.style.setProperty('--rc-image-x', markerX - CHAPTER.x * imageHeight * ASPECT + 'px');
      stage.style.setProperty('--rc-image-y', markerY - CHAPTER.y * imageHeight + 'px');
      marker.style.transform = `translate3d(${markerX}px, ${markerY}px, 0) translate(-50%, -100%)`;
      const isClose = isStatic ? Boolean(travel) : progress >= 0.985;
      const pressed = String(isClose);
      if (marker.getAttribute('aria-pressed') !== pressed) marker.setAttribute('aria-pressed', pressed);
      marker.hidden = !poster.naturalWidth && detail.hidden;

      if (scene && !motion.matches) {
        scene.draw({ width, height, imageHeight, markerX, markerY, travel });
        stage.dataset.mode = 'depth';
      } else {
        stage.dataset.mode = 'still';
      }
    }

    function schedule() {
      if (!frameRequest && !document.hidden) frameRequest = requestAnimationFrame(render);
    }

    function loseContext() {
      webGLFailed = true;
      discardScene();
      schedule();
    }

    function discardScene() {
      scene?.canvas.removeEventListener('webglcontextlost', loseContext);
      scene?.dispose();
      scene = undefined;
    }

    async function upgradeColor() {
      const target = scene;
      const path = detailPath;
      if (!target || detail.hidden) return;
      const bitmap = await createImageBitmap(detail, { imageOrientation: 'flipY' });
      if (scene !== target || detailPath !== path) {
        bitmap.close();
        return;
      }
      target.setColor(bitmap);
      schedule();
    }

    async function loadScene() {
      if (motion.matches || webGLFailed || scene || initializing) return;
      initializing = true;
      let bitmap: ImageBitmap | undefined;
      try {
        await poster.decode();
        if (stopped || motion.matches) return;
        const [module, depth] = await Promise.all([import('./rajasthanCinematicScene'), readDepthImage()]);
        if (stopped || motion.matches) return;
        bitmap = await createImageBitmap(poster, { imageOrientation: 'flipY' });
        if (stopped || motion.matches) return;
        scene = module.createCinematicScene(stage, bitmap, depth, ASPECT, CHAPTER);
        bitmap = undefined;
        scene.canvas.addEventListener('webglcontextlost', loseContext);
        schedule();
        void upgradeColor().catch(() => {});
      } catch {
        webGLFailed = true;
        schedule();
      } finally {
        bitmap?.close();
        initializing = false;
      }
    }

    function loadDetail() {
      const path = ASSETS + (stage.clientWidth <= 640 ? '/mobile.webp' : '/desktop.webp');
      if (path === detailPath) return;
      detailPath = path;
      detail.hidden = true;
      detail.src = path;
      void detail.decode().then(() => {
        if (stopped || detailPath !== path) return;
        detail.hidden = false;
        status.textContent = '';
        schedule();
        return upgradeColor();
      }).catch(() => {});
    }

    function onResize() {
      schedule();
      window.clearTimeout(detailRequest);
      detailRequest = window.setTimeout(loadDetail, 250);
    }

    function onMotionChange() {
      if (motion.matches) discardScene();
      else void loadScene();
      schedule();
    }

    function seek() {
      const atDetail = marker.getAttribute('aria-pressed') === 'true';
      window.scrollTo({ top: atDetail ? 0 : maxScroll(), behavior: motion.matches || !scene ? 'instant' : 'smooth' });
    }

    function posterFailed() {
      status.textContent = 'The private miniature map image is unavailable.';
    }

    const resize = new ResizeObserver(onResize);
    resize.observe(stage);
    window.addEventListener('scroll', schedule, { passive: true });
    document.addEventListener('visibilitychange', schedule);
    motion.addEventListener('change', onMotionChange);
    marker.addEventListener('click', seek);
    poster.addEventListener('load', schedule);
    poster.addEventListener('error', posterFailed);
    if (poster.complete && !poster.naturalWidth) posterFailed();
    void loadScene();
    schedule();

    return () => {
      stopped = true;
      cancelAnimationFrame(frameRequest);
      window.clearTimeout(detailRequest);
      resize.disconnect();
      window.removeEventListener('scroll', schedule);
      document.removeEventListener('visibilitychange', schedule);
      motion.removeEventListener('change', onMotionChange);
      marker.removeEventListener('click', seek);
      poster.removeEventListener('load', schedule);
      poster.removeEventListener('error', posterFailed);
      discardScene();
      detail.remove();
    };
  }, []);

  return (
    <main className="rc-runway" ref={runwayRef} aria-label="Illustrated Rajasthan miniature">
      <div className="rc-stage" ref={stageRef}>
        <img className="rc-image" ref={posterRef} src={ASSETS + '/poster.webp'} alt="" fetchPriority="high" />
        <button className="rc-marker" ref={markerRef} aria-label="Chapter 01, Junagarh Fort close view" aria-pressed="false" type="button" hidden>
          <span aria-hidden="true">01</span>
        </button>
        <span className="sr-only" role="status" ref={statusRef} />
      </div>
    </main>
  );
}
