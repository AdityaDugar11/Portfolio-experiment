import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArrowDown, ArrowLeft, Map as MapIcon } from 'lucide-react';
import { createJunagarh } from './junagarhScene';
import { createRajasthanTerrain, type ChapterPoint } from './rajasthanTerrain';
import './RajasthanWorldPreview.css';

type Pose = { position: THREE.Vector3; target: THREE.Vector3; fov: number; shiftX: number; shiftY: number };
type Mark = { anchorX: number; anchorY: number; x: number; y: number };
type Beat = 'opening' | 'lift' | 'atlas' | 'descent' | 'approach' | 'threshold';

const MAP_START = 0.28;
const MAP_END = 0.40;
const MAP_STOP = 0.34;
const LOCAL_START = 0.87;
const clamp = THREE.MathUtils.clamp;
const mix = THREE.MathUtils.lerp;
const smooth = THREE.MathUtils.smoothstep;
const ease = THREE.MathUtils.smootherstep;
const motionQuery = '(prefers-reduced-motion: reduce)';
const number = (chapter: number) => String(chapter).padStart(2, '0');

function pose(position: [number, number, number], target: [number, number, number], fov: number): Pose {
  return { position: new THREE.Vector3(...position), target: new THREE.Vector3(...target), fov, shiftX: 0, shiftY: 0 };
}

function pathBlend(from: Pose, to: Pose, t: number, result: Pose) {
  result.position.lerpVectors(from.position, to.position, t);
  result.target.lerpVectors(from.target, to.target, t);
  result.fov = mix(from.fov, to.fov, t);
  result.shiftX = mix(from.shiftX, to.shiftX, t);
  result.shiftY = mix(from.shiftY, to.shiftY, t);
}

function beatAt(p: number): Beat {
  if (p >= 0.985) return 'threshold';
  if (p >= LOCAL_START) return 'approach';
  if (p > MAP_END) return 'descent';
  if (p >= MAP_START) return 'atlas';
  return p > 0.006 ? 'lift' : 'opening';
}

function createPath(opening: Pose, atlas: Pose, anchor: THREE.Vector3, mobile: boolean) {
  const toWorld = (x: number, y: number, z: number) => anchor.clone().addScaledVector(new THREE.Vector3(x, y, z), .001);
  const entry = toWorld(mobile ? 17 : 24, mobile ? 15 : 18, mobile ? 91 : 81);
  const entryLook = toWorld(mobile ? -8 : -18, 8, 1);
  const threshold = toWorld(mobile ? -1.4 : -2.1, 2.32, mobile ? 9.7 : 8.4);
  const thresholdLook = toWorld(-.12, mobile ? 5.25 : 4.55, .8);
  const localPosition = new THREE.CatmullRomCurve3([entry, toWorld(12, 6.8, 48), toWorld(3.8, 3.3, 25), threshold]);
  const localTarget = new THREE.CatmullRomCurve3([entryLook, toWorld(-3.2, 6.7, 0), thresholdLook]);
  const regionalOffset = new THREE.Spherical().setFromVector3(atlas.position.clone().sub(atlas.target));
  const entryOffset = new THREE.Spherical().setFromVector3(entry.clone().sub(entryLook));
  const turn = THREE.MathUtils.euclideanModulo(entryOffset.theta - regionalOffset.theta + Math.PI, Math.PI * 2) - Math.PI;
  const orbit = new THREE.Spherical();
  const result = pose([0, 0, 0], [0, 0, 0], 40);

  return (progress: number) => {
    if (progress <= MAP_END) {
      pathBlend(opening, atlas, ease(progress, 0, MAP_START), result);
    } else if (progress < LOCAL_START) {
      const t = (progress - MAP_END) / (LOCAL_START - MAP_END);
      const dolly = Math.pow(smooth(t, 0, 1), 1.85);
      result.target.lerpVectors(atlas.target, anchor, ease(t, 0, .36));
      result.target.lerp(entryLook, ease(t, .60, 1));
      orbit.set(
        Math.exp(mix(Math.log(regionalOffset.radius), Math.log(entryOffset.radius), dolly)),
        mix(regionalOffset.phi, entryOffset.phi, ease(t, .02, .76)),
        regionalOffset.theta + turn * ease(t, .12, .88),
      );
      result.position.setFromSpherical(orbit).add(result.target);
      const framed = 1 - ease(t, 0, .32);
      result.shiftX = atlas.shiftX * framed;
      result.shiftY = atlas.shiftY * framed;
      result.fov = mix(atlas.fov, mobile ? 51 : 44, dolly);
    } else {
      const t = smooth(progress, LOCAL_START, 1);
      localPosition.getPointAt(t, result.position);
      localTarget.getPointAt(t, result.target);
      result.fov = mix(mobile ? 51 : 44, mobile ? 49 : 50, t);
      result.shiftX = result.shiftY = 0;
    }
    return result;
  };
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

export default function RajasthanWorldPreview() {
  const runwayRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const mapButton = useRef<HTMLButtonElement>(null);
  const firstMarker = useRef<HTMLButtonElement>(null);
  const requestedFocus = useRef<'map' | 'controls' | null>(null);
  const retryExterior = useRef(() => {});
  const [chapters, setChapters] = useState<ChapterPoint[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [beat, setBeat] = useState<Beat>('opening');
  const [selected, setSelected] = useState<ChapterPoint | null>(null);
  const [terrainAvailable, setTerrainAvailable] = useState(true);
  const [load, setLoad] = useState<'loading' | 'done' | 'failed'>('loading');
  const [exterior, setExterior] = useState<'loading' | 'done' | 'failed'>('loading');

  function seek(at: number, focus: 'map' | 'controls' | null) {
    const distance = runwayRef.current!.offsetHeight - viewportRef.current!.offsetHeight;
    requestedFocus.current = focus;
    window.scrollTo({ top: distance * at, behavior: matchMedia(motionQuery).matches ? 'instant' : 'smooth' });
    if (focus === 'controls') runwayRef.current?.focus({ preventScroll: true });
  }

  const mapShown = load === 'done' && (beat === 'atlas' || !terrainAvailable);
  useEffect(() => {
    if (mapShown && requestedFocus.current === 'map') {
      firstMarker.current?.focus({ preventScroll: true });
      requestedFocus.current = null;
    }
    if (beat === 'threshold' && requestedFocus.current === 'controls') {
      mapButton.current?.focus({ preventScroll: true });
      requestedFocus.current = null;
    }
  }, [mapShown, beat]);

  useEffect(() => {
    const runway = runwayRef.current!;
    const viewport = viewportRef.current!;
    const container = mountRef.current!;
    const reduced = matchMedia(motionQuery);
    const debug = new URLSearchParams(location.search).has('debug');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, .3, 3600);
    const stats = window as Window & { __rajasthanWorldStats?: object };
    let renderer: THREE.WebGLRenderer | undefined;
    let terrain: ReturnType<typeof createRajasthanTerrain> | undefined;
    let fort: ReturnType<typeof createJunagarh> | undefined;
    let manifest: ChapterPoint[] = [];
    let anchor = new THREE.Vector3();
    let contextLost = false;
    let disposed = false;
    let frame = 0;
    let draws = 0;
    let adapter = '';
    let width = 1;
    let height = 1;
    let mobile = false;
    let detailRequested = false;
    let exteriorRequested = false;
    let progress = 0;
    let path: ReturnType<typeof createPath>;

    function apply(current: Pose, near = .3) {
      camera.position.copy(current.position);
      camera.lookAt(current.target);
      camera.near = near;
      camera.fov = current.fov;
      camera.setViewOffset(width, height, current.shiftX, current.shiftY, width, height);
      camera.updateMatrixWorld();
    }

    function project(chapter: ChapterPoint): Mark {
      const point = new THREE.Vector3(...chapter.world_xyz_km).project(camera);
      const x = (point.x + 1) * width / 2;
      const y = (1 - point.y) * height / 2;
      return { x, y, anchorX: x, anchorY: y };
    }

    function render() {
      frame = 0;
      if (!renderer || !path || contextLost) return;
      const start = performance.now();
      const at = reduced.matches ? progress >= .82 ? 1 : progress >= .22 ? MAP_STOP : 0 : progress;
      const effective = at;
      const cameraPose = path(effective);
      const offset = cameraPose.position.distanceTo(anchor);
      apply(cameraPose, clamp(offset * .014, .00017, .35));
      const logical = reduced.matches ? beatAt(at) : beatAt(progress);
      terrain?.useLocalShadows(fort?.update(logical === 'atlas', offset) ?? false);
      terrain?.useDetail(!mobile && progress > .09 && progress < .74);
      renderer.render(scene, camera);
      if (debug) {
        stats.__rajasthanWorldStats = {
          renderer: adapter, draws: ++draws, progress, effective, beat: logical,
          position: camera.position.toArray(), quaternion: camera.quaternion.toArray(),
          fov: camera.fov, near: camera.near, submitMs: performance.now() - start,
          drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
          geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
          detailLoaded: terrain?.detailLoaded, exteriorReady: fort?.ready,
          canvas: [renderer.domElement.width, renderer.domElement.height],
        };
      }
    }

    function requestDraw() {
      if (!frame && renderer && !document.hidden) frame = requestAnimationFrame(render);
    }

    function size() {
      width = viewport.clientWidth;
      height = viewport.clientHeight;
      mobile = width < 700;
      renderer?.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.35 : 1.5));
      renderer?.setSize(width, height);
      const opening = mobile
        ? pose([10, 56, 217], [-100, 19, 57], 48)
        : pose([24, 51, 227], [-96, 17, 54], 38);
      const atlas = mobile
        ? pose([323, 496, 328], [-24, 0, 13], 49)
        : pose([-55, 411, 348], [-20, 0, 12], 42);

      if (manifest.length) {
        const offset = atlas.position.clone().sub(atlas.target);
        const edgeX = mobile ? 80 : 172;
        const edgeY = mobile ? 150 : 145;
        for (let i = 0; i < 8; i++) {
          apply(atlas);
          const points = manifest.map(project);
          const minX = Math.min(...points.map((p) => p.x));
          const minY = Math.min(...points.map((p) => p.y));
          const maxX = Math.max(...points.map((p) => p.x));
          const maxY = Math.max(...points.map((p) => p.y));
          const scale = Math.max((maxX - minX) / Math.max(130, width - edgeX), (maxY - minY) / Math.max(130, height - edgeY));
          if (scale > 1.004) {
            atlas.position.copy(atlas.target).add(offset.multiplyScalar(scale));
            continue;
          }
          atlas.shiftX = (minX + maxX - width) / 2;
          atlas.shiftY = (minY + maxY - height) / 2 - 7;
          break;
        }
        apply(atlas);
        setMarks(chapterMarks(manifest.map(project), width, 57, height - 25));
      }

      path = createPath(opening, atlas, anchor, mobile);
      requestDraw();
    }

    function streamExterior() {
      if (!fort || exteriorRequested) return;
      exteriorRequested = true;
      setExterior('loading');
      void fort.loadExterior().then(() => {
        if (disposed) return;
        if (renderer && fort && progress < .67 && !contextLost) {
          fort.update(false, .10);
          terrain?.useLocalShadows(true);
          void renderer.compileAsync(scene, camera).catch((error: unknown) => {
            if (debug) console.warn(error);
          });
          terrain?.useLocalShadows(false);
        }
        setExterior('done');
        requestDraw();
      }).catch((error: unknown) => {
        if (disposed) return;
        exteriorRequested = false;
        setExterior('failed');
        if (debug) console.error(error);
      });
    }

    retryExterior.current = streamExterior;

    function scroll() {
      const distance = Math.max(1, runway.offsetHeight - viewport.offsetHeight);
      progress = clamp(-runway.getBoundingClientRect().top / distance, 0, 1);
      const at = reduced.matches ? progress >= .82 ? 1 : progress >= .22 ? MAP_STOP : 0 : progress;
      setBeat(beatAt(at));

      if (progress > .10 && !detailRequested && terrain && !mobile) {
        detailRequested = true;
        void terrain.loadDetail().then(requestDraw).catch((error: unknown) => {
          if (debug) console.warn(error);
        });
      }
      if (progress > .16 && !exteriorRequested) streamExterior();
      requestDraw();
    }

    function onContextLost(event: Event) {
      event.preventDefault();
      contextLost = true;
      setTerrainAvailable(false);
    }

    function onRestored() {
      contextLost = false;
      terrain?.useLocalShadows(false);
      setTerrainAvailable(true);
      requestDraw();
    }

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = .92;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      if (debug) {
        const gl = renderer.getContext();
        const rendererInfo = gl.getExtension('WEBGL_debug_renderer_info');
        adapter = rendererInfo ? gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      }
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', onRestored);
      container.appendChild(renderer.domElement);
      terrain = createRajasthanTerrain(renderer, scene);
    } catch {
      setTerrainAvailable(false);
    }

    const abort = new AbortController();
    async function prepare() {
      try {
        const data = await (terrain ? terrain.load() : fetch('/preview/rajasthan-world/manifest.json', { signal: abort.signal }).then((response) => {
          if (!response.ok) throw new Error('Terrain manifest unavailable');
          return response.json() as Promise<{ chapters: ChapterPoint[] }>;
        }));
        if (disposed) return;
        manifest = data.chapters;
        const first = manifest[0];
        anchor = new THREE.Vector3(...first.world_xyz_km);
        if (terrain) {
          anchor.y = terrain.heightAt(anchor.x, anchor.z, anchor.y) + .0004;
          terrain.lightForecourt(anchor, mobile);
          fort = createJunagarh(scene, anchor);
          void fort.loadAtlas().then(requestDraw).catch((error: unknown) => {
            if (debug) console.warn(error);
          });
        }
        setChapters(manifest);
        setLoad('done');
        size();
        scroll();
      } catch (error) {
        if (disposed) return;
        if (debug) console.error(error);
        setLoad('failed');
      }
    }

    const observer = new ResizeObserver(() => { size(); scroll(); });
    observer.observe(viewport);
    window.addEventListener('scroll', scroll, { passive: true });
    reduced.addEventListener('change', scroll);
    document.addEventListener('visibilitychange', requestDraw);
    size();
    scroll();
    void prepare();

    return () => {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', scroll);
      reduced.removeEventListener('change', scroll);
      document.removeEventListener('visibilitychange', requestDraw);
      fort?.dispose();
      terrain?.dispose();
      renderer?.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer?.domElement.removeEventListener('webglcontextrestored', onRestored);
      renderer?.dispose();
      renderer?.domElement.remove();
      delete stats.__rajasthanWorldStats;
    };
  }, []);

  const leavingMap = beat === 'descent' || beat === 'approach' || beat === 'threshold';
  const nearFort = beat === 'approach' || beat === 'threshold';

  return (
    <main className="rw" ref={runwayRef} tabIndex={-1} aria-label="Rajasthan" onKeyDown={(event) => {
      if (event.key === 'Escape' && leavingMap) seek(MAP_STOP, 'map');
    }}>
      <div className="rw-viewport" ref={viewportRef} data-stage={beat} data-terrain={terrainAvailable}>
        <div className="rw-canvas" ref={mountRef} aria-hidden="true" />
        <a className="rw-control rw-back" href="/" aria-label="Return to Page 01"><ArrowLeft size={19} /></a>
        {load === 'done' && terrainAvailable && beat !== 'atlas' && (
          <button ref={mapButton} className={`rw-control ${leavingMap ? 'rw-map' : 'rw-next'}`}
            aria-label={leavingMap ? 'Return to map' : 'Go to chapter map'}
            onClick={(event) => seek(MAP_STOP, event.detail === 0 ? 'map' : null)}>
            {leavingMap ? <MapIcon size={18} /> : <ArrowDown size={19} />}
          </button>
        )}
        {load === 'loading' && <p className="rw-status" role="status">Loading terrain…</p>}
        {load === 'failed' && <button className="rw-status" onClick={() => location.reload()}>Terrain unavailable. Retry</button>}
        {nearFort && terrainAvailable && exterior === 'loading' && <p className="rw-status" role="status">Loading exterior…</p>}
        {nearFort && terrainAvailable && exterior === 'failed' && <button className="rw-status" onClick={() => retryExterior.current()}>Exterior unavailable. Retry</button>}
        {mapShown && (
          <nav className={terrainAvailable ? 'rw-markers' : 'rw-fallback'} aria-label="Rajasthan chapter destinations">
            {!terrainAvailable && <p role="status">Terrain unavailable</p>}
            {terrainAvailable && <svg className="rw-leaders" aria-hidden="true">
              {marks.map((point, i) => Math.hypot(point.x - point.anchorX, point.y - point.anchorY) > 8 && (
                <line key={i} x1={point.anchorX} y1={point.anchorY} x2={point.x} y2={point.y} />
              ))}
            </svg>}
            {chapters.map((chapter, i) => (
              <button key={chapter.chapter} className="rw-marker" ref={i === 0 ? firstMarker : undefined}
                style={terrainAvailable ? { left: marks[i]?.x, top: marks[i]?.y } : undefined}
                aria-label={`Chapter ${number(chapter.chapter)}, ${chapter.fort}, ${chapter.title}`}
                aria-current={selected?.chapter === chapter.chapter ? 'location' : undefined}
                onClick={(event) => {
                  setSelected(chapter);
                  if (chapter.chapter === 1 && terrainAvailable) seek(1, event.detail === 0 ? 'controls' : null);
                }}>
                <span>{number(chapter.chapter)}</span>
              </button>
            ))}
          </nav>
        )}
        <span className="sr-only" role="status">
          {beat === 'threshold' && exterior === 'done' ? 'Junagarh Fort gateway threshold' :
            selected ? `${selected.fort}. ${selected.title}.` : ''}
        </span>
      </div>
    </main>
  );
}
