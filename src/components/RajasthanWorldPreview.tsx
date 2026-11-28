import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ArrowLeft, Compass, Layers, MapPin } from 'lucide-react';

interface ChapterPoint {
  chapter: number;
  fort: string;
  title: string;
  latitude: number;
  longitude: number;
  elevation_dsm_m: number;
  world_xyz_km: [number, number, number];
}

interface TerrainManifest {
  raster_bounds_km: [number, number, number, number];
  geometry: {
    overview: { vertices: number; triangles: number };
    mewar_detail: { vertices: number; triangles: number };
  };
  chapters: ChapterPoint[];
}

type CameraStage = 'aerial' | 'map' | 'approach';

interface CameraPose {
  pos: [number, number, number];
  target: [number, number, number];
  fov: number;
}

const ASSET_BASE = '/preview/rajasthan-world';

const DESKTOP_POSES: Record<'aerial' | 'map', CameraPose> = {
  aerial: {
    pos: [24, 34, 212],
    target: [-85, 2.0, 75],
    fov: 38,
  },
  map: {
    pos: [-42, 465, 365],
    target: [-26, 0.5, 16],
    fov: 40,
  },
};

const MOBILE_POSES: Record<'aerial' | 'map', CameraPose> = {
  aerial: {
    pos: [24, 34, 218],
    target: [-85, 2.0, 75],
    fov: 48,
  },
  map: {
    pos: [245, 810, 215],
    target: [-10, 0.5, 42],
    fov: 55,
  },
};

function getApproachPose(ch: ChapterPoint, isMobile: boolean): CameraPose {
  const [x, y, z] = ch.world_xyz_km;
  if (isMobile) {
    return {
      pos: [x + 36, y + 54, z + 68],
      target: [x, y + 0.5, z - 6],
      fov: 44,
    };
  }
  return {
    pos: [x + 32, y + 42, z + 58],
    target: [x - 4, y + 0.5, z - 4],
    fov: 38,
  };
}

export const RajasthanWorldPreview: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const leaderRefs = useRef<(SVGLineElement | null)[]>([]);

  const [manifest, setManifest] = useState<TerrainManifest | null>(null);
  const [stage, setStage] = useState<CameraStage>('aerial');
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [hoveredChapter, setHoveredChapter] = useState<number | null>(null);
  const [detailLoaded, setDetailLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  const stageRef = useRef<CameraStage>('aerial');
  const selectedRef = useRef<number>(1);
  const manifestRef = useRef<TerrainManifest | null>(null);
  const isMobileRef = useRef<boolean>(isMobile);

  const camStateRef = useRef({
    pos: new THREE.Vector3(...(isMobile ? MOBILE_POSES.aerial.pos : DESKTOP_POSES.aerial.pos)),
    target: new THREE.Vector3(...(isMobile ? MOBILE_POSES.aerial.target : DESKTOP_POSES.aerial.target)),
    fov: isMobile ? MOBILE_POSES.aerial.fov : DESKTOP_POSES.aerial.fov,
    orbitYaw: 0,
    orbitPitch: 0,
    zoomOffset: 0,
  });

  const activeTweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    selectedRef.current = selectedChapter;
  }, [selectedChapter]);

  useEffect(() => {
    manifestRef.current = manifest;
  }, [manifest]);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      isMobileRef.current = mobile;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const animateToPose = useCallback((pose: CameraPose, duration = 1.65) => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = reducedMotion ? 0.01 : duration;

    if (activeTweenRef.current) {
      activeTweenRef.current.kill();
    }

    const st = camStateRef.current;
    const start = {
      px: st.pos.x,
      py: st.pos.y,
      pz: st.pos.z,
      tx: st.target.x,
      ty: st.target.y,
      tz: st.target.z,
      fov: st.fov,
      yaw: st.orbitYaw,
      pitch: st.orbitPitch,
      zoom: st.zoomOffset,
    };

    activeTweenRef.current = gsap.to(start, {
      px: pose.pos[0],
      py: pose.pos[1],
      pz: pose.pos[2],
      tx: pose.target[0],
      ty: pose.target[1],
      tz: pose.target[2],
      fov: pose.fov,
      yaw: 0,
      pitch: 0,
      zoom: 0,
      duration: dur,
      ease: 'power3.inOut',
      onUpdate: () => {
        st.pos.set(start.px, start.py, start.pz);
        st.target.set(start.tx, start.ty, start.tz);
        st.fov = start.fov;
        st.orbitYaw = start.yaw;
        st.orbitPitch = start.pitch;
        st.zoomOffset = start.zoom;
      },
    });
  }, []);

  const enterMap = useCallback(() => {
    setStage('map');
    const poses = isMobileRef.current ? MOBILE_POSES : DESKTOP_POSES;
    animateToPose(poses.map, 1.8);
  }, [animateToPose]);

  const selectAndApproach = useCallback(
    (chapterNum: number) => {
      setSelectedChapter(chapterNum);
      const m = manifestRef.current;
      if (!m) return;
      const ch = m.chapters.find((c) => c.chapter === chapterNum);
      if (!ch) return;
      setStage('approach');
      animateToPose(getApproachPose(ch, isMobileRef.current), 1.65);
    },
    [animateToPose]
  );

  const returnToMap = useCallback(() => {
    setStage('map');
    const poses = isMobileRef.current ? MOBILE_POSES : DESKTOP_POSES;
    animateToPose(poses.map, 1.55);
  }, [animateToPose]);

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stageRef.current === 'approach') {
        returnToMap();
      } else if ((e.key === 'Enter' || e.key === ' ') && stageRef.current === 'aerial') {
        if (document.activeElement === document.body) {
          e.preventDefault();
          enterMap();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (stageRef.current !== 'aerial') {
          e.preventDefault();
          const next = (selectedRef.current % 10) + 1;
          selectAndApproach(next);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (stageRef.current !== 'aerial') {
          e.preventDefault();
          const prev = ((selectedRef.current - 2 + 10) % 10) + 1;
          selectAndApproach(prev);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enterMap, returnToMap, selectAndApproach]);

  // Main Three.js scene setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;
    let rafId = 0;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#221715');

    const camera = new THREE.PerspectiveCamera(
      camStateRef.current.fov,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.2,
      2800
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Sky dome with warm Rajasthan sunset gradient matching Page 01 palette
    const skyGeo = new THREE.SphereGeometry(1800, 32, 20);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uHorizon: { value: new THREE.Color('#E6C2AA') },
        uMidSky: { value: new THREE.Color('#7C6B72') },
        uZenith: { value: new THREE.Color('#21191C') },
        uSunDir: { value: new THREE.Vector3(-0.82, 0.19, -0.54).normalize() },
        uSunColor: { value: new THREE.Color('#FFE8CC') },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uHorizon;
        uniform vec3 uMidSky;
        uniform vec3 uZenith;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        varying vec3 vWorldDir;
        void main() {
          vec3 dir = normalize(vWorldDir);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 col = mix(uHorizon, uMidSky, smoothstep(0.0, 0.22, h));
          col = mix(col, uZenith, smoothstep(0.20, 0.72, h));
          float sunDot = max(dot(dir, uSunDir), 0.0);
          col += uSunColor * pow(sunDot, 22.0) * 0.42;
          col += uSunColor * pow(sunDot, 220.0) * 0.75;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    // Warm low-angle western sunlight + sky hemisphere fill
    const sunLight = new THREE.DirectionalLight('#FFF0DC', 2.45);
    sunLight.position.set(-480, 145, -310);
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight('#F2D5BE', '#3A2A22', 0.95);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight('#9BAAC2', 0.38);
    rimLight.position.set(320, 180, 260);
    scene.add(rimLight);

    // Helper to build atmospheric terrain material with water sheen + smooth horizon edge fade
    const createTerrainMaterial = (
      albedoTex: THREE.Texture,
      normalTex: THREE.Texture,
      maskTex: THREE.Texture | null,
      bounds: [number, number, number, number],
      isDetailPatch = false
    ) => {
      const mat = new THREE.MeshStandardMaterial({
        map: albedoTex,
        normalMap: normalTex,
        normalScale: new THREE.Vector2(isDetailPatch ? 1.15 : 1.05, isDetailPatch ? 1.15 : 1.05),
        roughness: 0.9,
        metalness: 0.02,
      });

      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uMaskTex = { value: maskTex };
        shader.uniforms.uHasMask = { value: maskTex ? 1.0 : 0.0 };
        shader.uniforms.uBounds = { value: new THREE.Vector4(...bounds) };
        shader.uniforms.uHorizonColor = { value: new THREE.Color('#E2BFA8') };
        shader.uniforms.uIsDetail = { value: isDetailPatch ? 1.0 : 0.0 };

        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            `#include <common>
            varying vec3 vTerrainWorldPos;`
          )
          .replace(
            '#include <worldpos_vertex>',
            `#include <worldpos_vertex>
            vTerrainWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
          );

        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>
            uniform sampler2D uMaskTex;
            uniform float uHasMask;
            uniform vec4 uBounds;
            uniform vec3 uHorizonColor;
            uniform float uIsDetail;
            varying vec3 vTerrainWorldPos;`
          )
          .replace(
            '#include <roughnessmap_fragment>',
            `#include <roughnessmap_fragment>
            float waterMask = 0.0;
            float stateMask = 1.0;
            if (uHasMask > 0.5) {
              vec2 mUv = vec2(
                (vTerrainWorldPos.x - uBounds.x) / (uBounds.z - uBounds.x),
                1.0 - ((-vTerrainWorldPos.z) - uBounds.y) / (uBounds.w - uBounds.y)
              );
              vec3 mSample = texture2D(uMaskTex, clamp(mUv, 0.0, 1.0)).rgb;
              waterMask = mSample.r;
              stateMask = mSample.g;
              roughnessFactor = mix(roughnessFactor, 0.24, smoothstep(0.2, 0.75, waterMask));
            }`
          )
          .replace(
            '#include <dithering_fragment>',
            `
            // Subtle warm atmospheric haze by distance (restrained so relief stays crisp)
            float camDist = length(cameraPosition - vTerrainWorldPos);
            float haze = smoothstep(320.0, 1500.0, camDist) * 0.48;

            // Smooth perimeter blend so the terrain never reads as a floating rectangle
            float northCoord = -vTerrainWorldPos.z;
            float edgeX = min(vTerrainWorldPos.x - uBounds.x, uBounds.z - vTerrainWorldPos.x);
            float edgeY = min(northCoord - uBounds.y, uBounds.w - northCoord);
            float edgeFade = 1.0 - smoothstep(28.0, 175.0, min(edgeX, edgeY));
            if (uIsDetail > 0.5) {
              edgeFade = 0.0;
            } else {
              // Subtle softening outside Rajasthan administrative outline
              gl_FragColor.rgb = mix(gl_FragColor.rgb * 0.92 + vec3(0.03, 0.025, 0.02), gl_FragColor.rgb, mix(0.65, 1.0, stateMask));
            }

            float finalFog = clamp(max(haze, edgeFade), 0.0, 0.96);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, uHorizonColor, finalFog);
            #include <dithering_fragment>
            `
          );
      };
      return mat;
    };

    const texLoader = new THREE.TextureLoader();
    const gltfLoader = new GLTFLoader();
    const loadedDisposables: Array<{ dispose: () => void }> = [skyGeo, skyMat];

    const loadTex = (url: string, srgb: boolean) =>
      new Promise<THREE.Texture>((resolve, reject) => {
        texLoader.load(
          url,
          (t) => {
            t.flipY = false;
            t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
            t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
            loadedDisposables.push(t);
            resolve(t);
          },
          undefined,
          reject
        );
      });

    let overviewGroup: THREE.Object3D | null = null;
    let mewarGroup: THREE.Object3D | null = null;

    const initAssets = async () => {
      try {
        const res = await fetch(`${ASSET_BASE}/manifest.json`);
        if (!res.ok) throw new Error(`Manifest HTTP ${res.status}`);
        const data: TerrainManifest = await res.json();
        if (disposed) return;
        setManifest(data);

        const [albedoTex, normalTex, maskTex, gltf] = await Promise.all([
          loadTex(`${ASSET_BASE}/surface-warm.webp`, true),
          loadTex(`${ASSET_BASE}/relief-normal.webp`, false),
          loadTex(`${ASSET_BASE}/surface-masks.webp`, false),
          gltfLoader.loadAsync(`${ASSET_BASE}/rajasthan-overview.glb`),
        ]);
        if (disposed) return;

        const terrainMat = createTerrainMaterial(
          albedoTex,
          normalTex,
          maskTex,
          data.raster_bounds_km,
          false
        );
        loadedDisposables.push(terrainMat);

        gltf.scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            m.material = terrainMat;
            loadedDisposables.push(m.geometry);
          }
        });
        overviewGroup = gltf.scene;
        scene.add(overviewGroup);
        setIsLoading(false);

        // Lazy-load the Mewar/Aravalli higher-resolution terrain mesh after overview is interactive
        gltfLoader
          .loadAsync(`${ASSET_BASE}/mewar-detail.glb`)
          .then((mGltf) => {
            if (disposed) return;
            mGltf.scene.traverse((obj) => {
              if ((obj as THREE.Mesh).isMesh) {
                const m = obj as THREE.Mesh;
                m.material = terrainMat;
                m.position.y += 0.03;
                loadedDisposables.push(m.geometry);
              }
            });
            mewarGroup = mGltf.scene;
            scene.add(mewarGroup);
            setDetailLoaded(true);
          })
          .catch((err) => {
            console.warn('Lazy Mewar detail load skipped:', err);
          });
      } catch (err) {
        if (!disposed) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load terrain assets');
          setIsLoading(false);
        }
      }
    };

    initAssets();

    // Gentle pointer drag orbit + wheel zoom/stage transition
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.closest('button')) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging || stageRef.current === 'aerial') return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      camStateRef.current.orbitYaw = THREE.MathUtils.clamp(
        camStateRef.current.orbitYaw - dx * 0.0022,
        -0.42,
        0.42
      );
      camStateRef.current.orbitPitch = THREE.MathUtils.clamp(
        camStateRef.current.orbitPitch - dy * 0.0018,
        -0.25,
        0.22
      );
    };

    const onPointerUp = () => {
      dragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (stageRef.current === 'aerial' && e.deltaY > 12) {
        enterMap();
        return;
      }
      if (stageRef.current === 'approach' && e.deltaY < -36) {
        returnToMap();
        return;
      }
      if (stageRef.current === 'map') {
        camStateRef.current.zoomOffset = THREE.MathUtils.clamp(
          camStateRef.current.zoomOffset + e.deltaY * 0.12,
          -140,
          120
        );
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Frame loop: update camera, project 10 fort coordinates without React re-renders
    const projVec = new THREE.Vector3();
    const offsetVec = new THREE.Vector3();
    let frameCount = 0;
    let fpsTimer = performance.now();
    let currentFps = 60;

    const animate = () => {
      if (disposed) return;
      rafId = requestAnimationFrame(animate);

      const st = camStateRef.current;
      offsetVec.copy(st.pos).sub(st.target);
      if (st.orbitYaw !== 0 || st.orbitPitch !== 0 || st.zoomOffset !== 0) {
        const sph = new THREE.Spherical().setFromVector3(offsetVec);
        sph.theta += st.orbitYaw;
        sph.phi = THREE.MathUtils.clamp(sph.phi + st.orbitPitch, 0.22, 1.38);
        sph.radius = Math.max(45, sph.radius + st.zoomOffset);
        offsetVec.setFromSpherical(sph);
      }
      camera.position.copy(st.target).add(offsetVec);
      camera.lookAt(st.target);
      if (Math.abs(camera.fov - st.fov) > 0.01) {
        camera.fov = st.fov;
        camera.updateProjectionMatrix();
      }

      renderer.render(scene, camera);

      // Project all 10 chapters to screen space
      const m = manifestRef.current;
      if (m && stageRef.current !== 'aerial') {
        const w = container.clientWidth;
        const h = container.clientHeight;
        const screenPts = m.chapters.map((ch) => {
          projVec.set(ch.world_xyz_km[0], ch.world_xyz_km[1], ch.world_xyz_km[2]);
          projVec.project(camera);
          return {
            x: (projVec.x * 0.5 + 0.5) * w,
            y: (-projVec.y * 0.5 + 0.5) * h,
            visible: projVec.z < 1 && projVec.z > -1,
          };
        });

        // Separate nearby Jaipur pair (Ch 04 Amber & Ch 10 Nahargarh)
        const p4 = screenPts[3];
        const p10 = screenPts[9];
        const amberHigher = p4 && p10 ? p4.y < p10.y : true;

        screenPts.forEach((pt, idx) => {
          const btn = markerRefs.current[idx];
          const line = leaderRefs.current[idx];
          if (!btn) return;
          if (!pt.visible || pt.x < -30 || pt.x > w + 30 || pt.y < -30 || pt.y > h + 30) {
            btn.style.opacity = '0';
            btn.style.pointerEvents = 'none';
            if (line) line.setAttribute('opacity', '0');
            return;
          }

          let ux = pt.x;
          let uy = pt.y;
          if (idx === 3 || idx === 9) {
            const sep = isMobileRef.current ? 18 : 20;
            const sign = (idx === 3) === amberHigher ? -1 : 1;
            ux += idx === 3 ? 16 : -16;
            uy += sign * sep;
            if (line) {
              line.setAttribute('x1', pt.x.toFixed(1));
              line.setAttribute('y1', pt.y.toFixed(1));
              line.setAttribute('x2', ux.toFixed(1));
              line.setAttribute('y2', uy.toFixed(1));
              line.setAttribute('opacity', '0.85');
            }
          } else if (line) {
            line.setAttribute('opacity', '0');
          }

          btn.style.opacity = '1';
          btn.style.pointerEvents = 'auto';
          btn.style.transform = `translate3d(${ux.toFixed(1)}px, ${uy.toFixed(1)}px, 0) translate(-50%, -50%)`;
        });
      }

      frameCount++;
      const now = performance.now();
      if (now - fpsTimer >= 500) {
        currentFps = Math.round((frameCount * 1000) / (now - fpsTimer));
        frameCount = 0;
        fpsTimer = now;
        (window as unknown as Record<string, unknown>).__rajasthanWorldStats = {
          fps: currentFps,
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          stage: stageRef.current,
          selectedChapter: selectedRef.current,
          detailLoaded: Boolean(mewarGroup),
        };
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      if (activeTweenRef.current) activeTweenRef.current.kill();
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      loadedDisposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (dom.parentNode === container) {
        container.removeChild(dom);
      }
    };
  }, [enterMap, returnToMap]);

  const activeData = manifest?.chapters.find((c) => c.chapter === selectedChapter) ?? null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#181210] text-[#FAF7F2] select-none">
      {/* Three.js Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Leader lines for separated Jaipur pair (Ch 04 & Ch 10) */}
      {stage !== 'aerial' && manifest && (
        <svg
          className="pointer-events-none absolute inset-0 w-full h-full z-10"
          aria-hidden="true"
        >
          {manifest.chapters.map((ch, idx) => (
            <line
              key={ch.chapter}
              ref={(el) => {
                leaderRefs.current[idx] = el;
              }}
              stroke="#FAF7F2"
              strokeWidth="1.2"
              strokeDasharray="2 2"
              opacity="0"
            />
          ))}
        </svg>
      )}

      {/* Projected 3D Chapter Markers */}
      {stage !== 'aerial' && manifest && (
        <div className="pointer-events-none absolute inset-0 z-20" role="navigation" aria-label="Rajasthan Fort Chapters">
          {manifest.chapters.map((ch, idx) => {
            const isSelected = selectedChapter === ch.chapter;
            const isHovered = hoveredChapter === ch.chapter;
            const isPrimary = ch.chapter === 1;
            const emphasized = isSelected || isHovered;
            return (
              <button
                key={ch.chapter}
                ref={(el) => {
                  markerRefs.current[idx] = el;
                }}
                type="button"
                onClick={() => selectAndApproach(ch.chapter)}
                onMouseEnter={() => setHoveredChapter(ch.chapter)}
                onMouseLeave={() => setHoveredChapter(null)}
                onFocus={() => setHoveredChapter(ch.chapter)}
                onBlur={() => setHoveredChapter(null)}
                aria-label={`Chapter ${String(ch.chapter).padStart(2, '0')} — ${ch.fort}: ${ch.title}`}
                aria-pressed={isSelected}
                style={{ opacity: 0 }}
                className="pointer-events-auto absolute top-0 left-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B896] rounded-full"
              >
                <span className="relative flex items-center">
                  <span
                    className={`flex items-center justify-center rounded-full font-semibold tracking-wider transition-all duration-200 shadow-lg ${
                      emphasized
                        ? 'w-8 h-8 text-xs bg-[#2A1B16] text-[#FAF7F2] ring-2 ring-[#E06D53] scale-110'
                        : isPrimary
                          ? 'w-7 h-7 text-[11px] bg-[#2A1B16]/95 text-[#FAF7F2] ring-2 ring-[#F4B896]/90'
                          : 'w-6 h-6 text-[10px] bg-[#2A1B16]/88 text-[#FAF7F2]/90 ring-1 ring-[#FAF7F2]/65 hover:ring-[#F4B896]'
                    }`}
                  >
                    {String(ch.chapter).padStart(2, '0')}
                  </span>

                  {/* Chapter 01 persistent callout in Map/Approach; hover callout for others */}
                  {(isPrimary || emphasized) && !isMobile && (
                    <span
                      className={`ml-2.5 px-2.5 py-1 rounded bg-[#181210]/82 backdrop-blur-sm border text-left whitespace-nowrap transition-opacity ${
                        isSelected
                          ? 'border-[#E06D53]/80 text-[#FAF7F2]'
                          : 'border-[#FAF7F2]/20 text-[#FAF7F2]/90'
                      }`}
                    >
                      <span className="block text-[11px] font-medium leading-tight tracking-wide">
                        {String(ch.chapter).padStart(2, '0')} — {ch.fort}
                      </span>
                      <span className="block text-[9px] uppercase tracking-[0.18em] text-[#F4B896]">
                        {ch.title}
                      </span>
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Top Bar HUD */}
      <header className="pointer-events-none absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3.5 md:px-8 md:py-5">
        <div className="pointer-events-auto flex items-center gap-3">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#181210]/75 hover:bg-[#181210]/95 border border-[#FAF7F2]/18 px-3 py-1.5 text-xs tracking-wider uppercase text-[#FAF7F2]/85 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#F4B896]" />
            <span>Page 01</span>
          </a>
          <span className="hidden sm:inline-block text-[11px] uppercase tracking-[0.22em] text-[#FAF7F2]/75">
            The Living Signal · Map Phase 02 Preview
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {detailLoaded && (
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-[#181210]/70 border border-[#FAF7F2]/15 px-3 py-1 text-[11px] text-[#F4B896]/90">
              <Layers className="w-3 h-3" />
              Mewar LOD active
            </span>
          )}
          {stage === 'approach' && (
            <button
              type="button"
              onClick={returnToMap}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#E06D53] hover:bg-[#d25d43] text-[#FAF7F2] px-3.5 py-1.5 text-xs font-medium tracking-wide shadow-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FAF7F2]"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Return to Map</span>
            </button>
          )}
        </div>
      </header>

      {/* Stage A: Opening Aerial Overlay */}
      {stage === 'aerial' && !isLoading && !loadError && (
        <div className="pointer-events-none absolute inset-x-0 bottom-10 md:bottom-14 z-30 flex flex-col items-center text-center px-6">
          <p className="text-[10px] md:text-[11px] uppercase tracking-[0.28em] text-[#F4B896] mb-2">
            Rajasthan · Ten Fort Destinations
          </p>
          <h1 className="text-2xl md:text-4xl font-light tracking-wide text-[#FAF7F2] mb-4 max-w-xl">
            From the Aravalli ridges to the Thar plains
          </h1>
          <button
            type="button"
            onClick={enterMap}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-[#FAF7F2] text-[#2A1B16] hover:bg-[#F4B896] px-5 py-2.5 text-xs md:text-sm font-semibold tracking-wider uppercase shadow-xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E06D53]"
          >
            <MapPin className="w-4 h-4 text-[#E06D53]" />
            <span>Explore Chapter Map</span>
          </button>
        </div>
      )}

      {/* Active Chapter Info Bar (Map & Approach stages) */}
      {stage !== 'aerial' && activeData && (
        <aside className="pointer-events-none absolute bottom-4 inset-x-4 md:left-8 md:right-auto md:bottom-7 z-30 md:max-w-sm">
          <div className="pointer-events-auto rounded-xl bg-[#181210]/86 backdrop-blur-md border border-[#FAF7F2]/16 p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#F4B896]">
                  {activeData.title}
                </p>
                <h2 className="text-base md:text-lg font-medium text-[#FAF7F2] mt-0.5">
                  {String(activeData.chapter).padStart(2, '0')} — {activeData.fort}
                </h2>
                <p className="text-[11px] text-[#FAF7F2]/65 mt-1">
                  {activeData.latitude.toFixed(3)}°N, {activeData.longitude.toFixed(3)}°E ·{' '}
                  {Math.round(activeData.elevation_dsm_m)} m DSM
                </p>
              </div>
              {stage === 'map' ? (
                <button
                  type="button"
                  onClick={() => selectAndApproach(activeData.chapter)}
                  className="shrink-0 rounded-full bg-[#E06D53] hover:bg-[#d25d43] text-[#FAF7F2] px-3 py-1.5 text-[11px] font-medium tracking-wide transition"
                >
                  Approach
                </button>
              ) : (
                <button
                  type="button"
                  onClick={returnToMap}
                  className="shrink-0 rounded-full bg-[#FAF7F2]/12 hover:bg-[#FAF7F2]/22 text-[#FAF7F2] px-3 py-1.5 text-[11px] font-medium tracking-wide transition"
                >
                  Map View
                </button>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* Loading / Error State */}
      {isLoading && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#181210]/90">
          <div className="w-8 h-8 rounded-full border-2 border-[#F4B896]/30 border-t-[#E06D53] animate-spin mb-3" />
          <p className="text-xs uppercase tracking-[0.22em] text-[#FAF7F2]/80">
            Loading Rajasthan Terrain
          </p>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#181210] p-6 text-center">
          <div className="max-w-md rounded-xl border border-[#E06D53]/40 bg-[#2A1B16] p-6">
            <p className="text-sm font-medium text-[#FAF7F2] mb-2">Terrain Preview Unavailable</p>
            <p className="text-xs text-[#FAF7F2]/75">{loadError}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RajasthanWorldPreview;
