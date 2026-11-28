import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { createRajasthanTerrain, type ChapterPoint } from './rajasthanTerrain';
import './RajasthanWorldPreview.css';

type Journey = 'map' | 'approaching' | 'threshold' | 'returning';
type Pose = { position: THREE.Vector3; target: THREE.Vector3; fov: number; shiftX: number; shiftY: number };
type Mark = { anchorX: number; anchorY: number; x: number; y: number };

const number = (chapter: number) => String(chapter).padStart(2, '0');
const smallWords = new Set(['the', 'into', 'to', 'with']);
const chapterName = (title: string) => title.toLowerCase().replace(/\b\w+/g, (word, index) =>
  index > 0 && smallWords.has(word) ? word : word[0].toUpperCase() + word.slice(1),
);
const revealEase = gsap.parseEase('sine.inOut');
const motionQuery = '(prefers-reduced-motion: reduce)';
const clamp = THREE.MathUtils.clamp;

function pose(position: number[], target: number[], fov: number): Pose {
  return { position: new THREE.Vector3(...position), target: new THREE.Vector3(...target), fov, shiftX: 0, shiftY: 0 };
}

function blend(from: Pose, to: Pose, progress: number, result: Pose) {
  result.position.lerpVectors(from.position, to.position, progress);
  result.target.lerpVectors(from.target, to.target, progress);
  result.fov = THREE.MathUtils.lerp(from.fov, to.fov, progress);
  result.shiftX = THREE.MathUtils.lerp(from.shiftX, to.shiftX, progress);
  result.shiftY = THREE.MathUtils.lerp(from.shiftY, to.shiftY, progress);
}

function approachPose(chapter: ChapterPoint, mobile: boolean, width: number, height: number) {
  const [x, y, z] = chapter.world_xyz_km;
  const approach = pose([x + 132, y + 139, z + 184], [x - 12, y, z - 11], mobile ? 50 : 38);
  approach.shiftX = mobile ? 0 : -width * 0.11;
  approach.shiftY = height * 0.10;
  return approach;
}

function chapterMarks(points: Mark[], width: number, top: number, bottom: number) {
  const marks = points.map((point) => ({ ...point }));
  // Amber and Nahargarh share this part of the map. Keep both anchors exact
  // and give the two labels their own touch-sized space.
  marks[3].x += 27;
  marks[9].x -= 27;
  for (let pass = 0; pass < 12; pass++) {
    for (let i = 0; i < marks.length; i++) {
      for (const other of marks.slice(i + 1)) {
        const mark = marks[i];
        const dx = mark.x - other.x;
        const dy = mark.y - other.y;
        const overlap = 47 - Math.max(Math.abs(dx), Math.abs(dy));
        if (overlap <= 0) continue;
        if (Math.abs(dx) >= Math.abs(dy)) {
          mark.x += Math.sign(dx || 1) * overlap * 0.5;
          other.x -= Math.sign(dx || 1) * overlap * 0.5;
        } else {
          mark.y += Math.sign(dy) * overlap * 0.5;
          other.y -= Math.sign(dy) * overlap * 0.5;
        }
      }
      const mark = marks[i];
      mark.x = clamp(mark.x, 25, width - 25);
      mark.y = clamp(mark.y, top + 23, bottom - 23);
    }
  }
  return marks;
}

interface PreviewProps {
  onExteriorReady?: (chapter: ChapterPoint) => void;
}

export default function RajasthanWorldPreview({ onExteriorReady }: PreviewProps) {
  const runwayRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const mapHeadingRef = useRef<HTMLHeadingElement>(null);
  const thresholdRef = useRef<HTMLHeadingElement>(null);
  const destinationPinRef = useRef<HTMLDivElement>(null);
  const approachButtonRef = useRef<HTMLButtonElement>(null);
  const focusMap = useRef(false);
  const focusApproach = useRef(false);
  const journeyRef = useRef<Journey>('map');
  const chapterRef = useRef<ChapterPoint | null>(null);
  const travel = useRef({ progress: 0 });
  const returnAction = useRef<() => void>(() => {});
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const redraw = useRef(() => {});
  const chaptersRef = useRef<ChapterPoint[]>([]);
  const [chapters, setChapters] = useState<ChapterPoint[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [reveal, setReveal] = useState<'opening' | 'scrolling' | 'atlas'>('opening');
  const [journey, setJourney] = useState<Journey>('map');
  const [selection, setSelection] = useState<ChapterPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState(false);

  function changeJourney(next: Journey) {
    journeyRef.current = next;
    setJourney(next);
  }

  function showAtlas() {
    focusMap.current = true;
    const runway = runwayRef.current!;
    const distance = runway.offsetHeight - viewportRef.current!.offsetHeight;
    window.scrollTo({ top: distance, behavior: matchMedia(motionQuery).matches ? 'instant' : 'smooth' });
    if (reveal === 'atlas') {
      mapHeadingRef.current?.focus({ preventScroll: true });
      focusMap.current = false;
    }
  }

  function select(chapter: ChapterPoint, keyboard: boolean) {
    if (keyboard && chapterRef.current === chapter) {
      approachButtonRef.current?.focus({ preventScroll: true });
      return;
    }
    focusApproach.current = keyboard;
    chapterRef.current = chapter;
    setSelection(chapter);
  }

  function beginApproach() {
    const chapter = chapterRef.current;
    if (!chapter || journeyRef.current !== 'map') return;
    changeJourney('approaching');
    tweenRef.current = gsap.to(travel.current, {
      progress: 1,
      duration: matchMedia(motionQuery).matches || !available ? 0 : 1.45,
      ease: 'power2.inOut',
      onUpdate: redraw.current,
      onComplete: () => {
        changeJourney('threshold');
        onExteriorReady?.(chapter);
      },
    });
  }

  function returnToMap() {
    if (journeyRef.current === 'returning') return;
    tweenRef.current?.kill();
    changeJourney('returning');
    tweenRef.current = gsap.to(travel.current, {
      progress: 0,
      duration: matchMedia(motionQuery).matches || !available ? 0 : 1.05,
      ease: 'power2.inOut',
      onUpdate: redraw.current,
      onComplete: () => changeJourney('map'),
    });
  }

  useEffect(() => {
    returnAction.current = returnToMap;
  });

  useEffect(() => {
    if (reveal === 'atlas' && focusMap.current) {
      mapHeadingRef.current?.focus({ preventScroll: true });
      focusMap.current = false;
    }
  }, [reveal]);

  useEffect(() => {
    if (focusApproach.current) {
      approachButtonRef.current?.focus({ preventScroll: true });
      focusApproach.current = false;
    }
  }, [selection]);

  useEffect(() => {
    if (journey === 'threshold') {
      redraw.current();
      thresholdRef.current?.focus({ preventScroll: true });
    }
    if (journey === 'map') approachButtonRef.current?.focus({ preventScroll: true });
  }, [journey]);

  useEffect(() => {
    const runway = runwayRef.current!;
    const viewport = viewportRef.current!;
    const container = mountRef.current!;
    const reducedMotion = matchMedia(motionQuery);
    const debug = new URLSearchParams(window.location.search).has('debug');
    let renderer: THREE.WebGLRenderer | undefined;
    let world: ReturnType<typeof createRajasthanTerrain> | undefined;
    let stopped = false;
    let frame = 0;
    let progress = 0;
    let width = 1;
    let height = 1;
    let mobile = false;
    let opening = pose([], [], 40);
    let atlas = pose([], [], 40);
    const current = pose([], [], 40);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 3600);
    const debugWindow = window as Window & { __rajasthanWorldStats?: object };
    let draws = 0;
    let adapter = '';

    function applyPose(view: Pose) {
      camera.position.copy(view.position);
      camera.lookAt(view.target);
      camera.fov = view.fov;
      camera.setViewOffset(width, height, view.shiftX, view.shiftY, width, height);
      camera.updateMatrixWorld();
    }

    function project(chapter: ChapterPoint): Mark {
      const projected = new THREE.Vector3(...chapter.world_xyz_km).project(camera);
      const x = (projected.x + 1) * width / 2;
      const y = (1 - projected.y) * height / 2;
      return { anchorX: x, anchorY: y, x, y };
    }

    function render() {
      frame = 0;
      if (!renderer) return;
      const start = performance.now();
      const revealProgress = reducedMotion.matches ? Number(progress >= 0.985) : revealEase(progress);
      blend(opening, atlas, revealProgress, current);
      if (chapterRef.current && travel.current.progress) {
        blend(atlas, approachPose(chapterRef.current, mobile, width, height), travel.current.progress, current);
      }
      applyPose(current);
      if (chapterRef.current && destinationPinRef.current) {
        const point = project(chapterRef.current);
        destinationPinRef.current.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`;
      }
      renderer.render(scene, camera);
      if (debug) {
        debugWindow.__rajasthanWorldStats = {
          renderer: adapter,
          draws: ++draws, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
          submitMs: performance.now() - start, progress, position: camera.position.toArray(), detailLoaded: world?.detailLoaded,
        };
      }
    }

    function requestDraw() {
      if (!frame && renderer && !document.hidden) frame = requestAnimationFrame(render);
    }
    redraw.current = requestDraw;

    function size() {
      width = viewport.clientWidth;
      height = viewport.clientHeight;
      mobile = width < 700;
      renderer?.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.35 : 1.5));
      renderer?.setSize(width, height);
      opening = mobile
        ? pose([10, 56, 217], [-100, 19, 57], 48)
        : pose([24, 51, 227], [-96, 17, 54], 38);
      atlas = mobile
        ? pose([303, 586, 292], [-22, 0, 17], 48)
        : pose([-75, 458, 407], [-22, 0, 17], 40);

      if (chaptersRef.current.length && renderer) {
        const dockHeight = mobile ? 235 : 156;
        const top = mobile ? 131 : 146;
        const bottom = height - dockHeight;
        const offset = atlas.position.clone().sub(atlas.target);
        for (let attempt = 0; attempt < 8; attempt++) {
          applyPose(atlas);
          const points = chaptersRef.current.map(project);
          const minX = Math.min(...points.map(({ x }) => x));
          const maxX = Math.max(...points.map(({ x }) => x));
          const minY = Math.min(...points.map(({ y }) => y));
          const maxY = Math.max(...points.map(({ y }) => y));
          const scale = Math.max(
            (maxX - minX) / (width - (mobile ? 108 : 170)),
            (maxY - minY) / Math.max(90, bottom - top - 40),
          );
          if (scale > 1.005) {
            atlas.position.copy(atlas.target).add(offset.multiplyScalar(scale));
            continue;
          }
          atlas.shiftX = (minX + maxX - width) / 2;
          atlas.shiftY = (minY + maxY - top - bottom) / 2;
          break;
        }
        applyPose(atlas);
        setMarks(chapterMarks(chaptersRef.current.map(project), width, top - 15, bottom + 6));
      }
      requestDraw();
    }

    function scroll() {
      const distance = Math.max(1, runway.offsetHeight - viewport.offsetHeight);
      progress = clamp(-runway.getBoundingClientRect().top / distance, 0, 1);
      setReveal(progress >= 0.985 ? 'atlas' : progress < 0.72 ? 'opening' : 'scrolling');
      viewport.style.setProperty('--opening-opacity', String(1 - clamp(progress / 0.72, 0, 1)));
      if (progress < 0.985 && journeyRef.current !== 'map') {
        tweenRef.current?.kill();
        travel.current.progress = 0;
        changeJourney('map');
      }
      if (progress > 0.45 && world) {
        void world.loadDetail().then((loaded) => {
          if (loaded) requestDraw();
        }).catch((reason) => { if (debug) console.warn('Mewar terrain unavailable', reason); });
      }
      requestDraw();
    }

    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && journeyRef.current !== 'map') returnAction.current();
    }

    function contextLost(event: Event) {
      event.preventDefault();
      changeJourney('map');
      tweenRef.current?.kill();
      travel.current.progress = 0;
      setAvailable(false);
    }

    function contextRestored() {
      setAvailable(true);
      size();
    }

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      if (debug) {
        const gl = renderer.getContext();
        const extension = gl.getExtension('WEBGL_debug_renderer_info');
        adapter = extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      }
      renderer.domElement.addEventListener('webglcontextlost', contextLost);
      renderer.domElement.addEventListener('webglcontextrestored', contextRestored);
      container.appendChild(renderer.domElement);
      world = createRajasthanTerrain(renderer, scene);
    } catch {
      setAvailable(false);
    }

    async function prepare() {
      try {
        const data = await (world ? world.load() : fetch('/preview/rajasthan-world/manifest.json').then((response) => {
          if (!response.ok) throw new Error('Terrain manifest unavailable');
          return response.json() as Promise<{ chapters: ChapterPoint[] }>;
        }));
        if (stopped) return;
        chaptersRef.current = data.chapters;
        setChapters(data.chapters);
        setLoading(false);
        size();
        scroll();
      } catch (reason) {
        if (stopped) return;
        if (debug) console.error(reason);
        setLoading(false);
        setError(true);
      }
    }

    const observer = new ResizeObserver(() => { size(); scroll(); });
    observer.observe(viewport);
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('keydown', escape);
    document.addEventListener('visibilitychange', requestDraw);
    reducedMotion.addEventListener('change', scroll);
    void prepare();
    size();
    scroll();

    return () => {
      stopped = true;
      tweenRef.current?.kill();
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('keydown', escape);
      document.removeEventListener('visibilitychange', requestDraw);
      reducedMotion.removeEventListener('change', scroll);
      world?.dispose();
      renderer?.domElement.removeEventListener('webglcontextlost', contextLost);
      renderer?.domElement.removeEventListener('webglcontextrestored', contextRestored);
      renderer?.dispose();
      renderer?.domElement.remove();
      delete debugWindow.__rajasthanWorldStats;
    };
  }, []);

  const atlasVisible = reveal === 'atlas' && journey === 'map' && !loading && !error;
  const travelling = journey !== 'map';

  return (
    <main className="rw" ref={runwayRef}>
      <div className="rw-viewport" ref={viewportRef} data-stage={travelling ? journey : reveal} data-terrain={available}>
        <div className="rw-canvas" ref={mountRef} aria-hidden="true" />
        <div className="rw-light" aria-hidden="true" />
        <header className="rw-header">
          <a href="/"><ArrowLeft size={15} /> Introduction</a>
          <span>The Living Signal</span>
        </header>

        {loading && <p className="rw-status" role="status">Loading Rajasthan terrain…</p>}
        {error && <div className="rw-status" role="alert">
          <p>The Rajasthan terrain could not be loaded.</p>
          <button className="rw-link" onClick={() => window.location.reload()}>Reload terrain <ArrowRight size={16} /></button>
        </div>}

        {!loading && !error && reveal === 'opening' && (
          <section className="rw-opening">
            <h1>Rajasthan</h1>
            <p>From the Aravalli ridges to the Thar plains</p>
            <button className="rw-link" onClick={showAtlas}><ArrowDown size={17} /> Explore the chapter map</button>
          </section>
        )}

        {atlasVisible && (
          <>
            <div className="rw-map-title">
              <h1 ref={mapHeadingRef} tabIndex={-1}>Rajasthan</h1>
              <p>{available ? 'The chapter map' : 'Chapter index · Terrain unavailable'}</p>
            </div>
            {available && marks.length === chapters.length && (
              <div className="rw-markers">
                <svg className="rw-leaders" aria-hidden="true">
                  {marks.map((mark, i) => Math.hypot(mark.x - mark.anchorX, mark.y - mark.anchorY) > 8 && (
                    <g key={chapters[i].chapter} data-active={selection?.chapter === chapters[i].chapter}>
                      <line x1={mark.anchorX} y1={mark.anchorY} x2={mark.x} y2={mark.y} />
                      <circle cx={mark.anchorX} cy={mark.anchorY} r="2.25" />
                    </g>
                  ))}
                </svg>
                {chapters.map((chapter, i) => (
                  <button className="rw-marker" key={chapter.chapter} style={{ left: marks[i].x, top: marks[i].y }}
                    aria-label={`Chapter ${number(chapter.chapter)}, ${chapter.fort}`}
                    aria-pressed={selection?.chapter === chapter.chapter} onClick={(event) => select(chapter, event.detail === 0)}>
                    <span className="rw-marker-number">{number(chapter.chapter)}</span>
                  </button>
                ))}
                {selection && <span className="rw-marker-name" aria-hidden="true" style={{
                  left: `clamp(90px, ${marks[selection.chapter - 1].x}px, calc(100% - 90px))`,
                  top: marks[selection.chapter - 1].y - 18,
                }}>{selection.fort}</span>}
              </div>
            )}
            <section className="rw-dock" aria-label="Chapter selection">
              <div className="rw-chapter">
                {selection ? (
                  <div aria-live="polite">
                    <h2>{chapterName(selection.title)}</h2>
                    <p>{selection.fort}</p>
                  </div>
                ) : (
                  <div><h2>Ten forts, ten chapters</h2><p>Select a destination to begin.</p></div>
                )}
                {selection && <button ref={approachButtonRef} className="rw-link rw-approach" onClick={beginApproach}>
                  Begin approach <ArrowRight size={16} />
                </button>}
              </div>
              <nav className="rw-index" aria-label="Chapter order">
                <div className="rw-index-caption">
                  <span>Chapter index</span>
                  {selection && <span>{number(selection.chapter)} / {chapters.length}</span>}
                </div>
                <ol>
                  {chapters.map((chapter) => (
                    <li key={chapter.chapter}>
                      <button onClick={(event) => select(chapter, event.detail === 0)} aria-pressed={selection?.chapter === chapter.chapter}
                        aria-label={`${number(chapter.chapter)} ${chapter.fort}, ${chapterName(chapter.title)}`}>
                        {number(chapter.chapter)}
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
            </section>
          </>
        )}

        {travelling && available && <div className="rw-destination-pin" ref={destinationPinRef} aria-hidden="true"><span /></div>}
        {travelling && selection && (
          <section className="rw-arrival">
            <button className="rw-link" onClick={returnToMap} disabled={journey === 'returning'}>
              <ArrowLeft size={16} /> Return to map
            </button>
            <div className="rw-arrival-title">
              <p>{chapterName(selection.title)}</p>
              <h1 ref={thresholdRef} tabIndex={-1}>{selection.fort}</h1>
              {journey === 'threshold' && <p role="status">{available ? 'At the threshold' : 'Terrain unavailable'}</p>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
