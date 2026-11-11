import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ArrowRight } from 'lucide-react';

interface CinematicOpeningProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onRevealStart: () => void;
  onComplete: (wasSkipped: boolean) => void;
}

const VEIL_VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const VEIL_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uCoreIntensity;
uniform float uWarmSpread;
uniform float uReveal;
uniform vec2 uResolution;
varying vec2 vUv;

// 2D Simplex Noise for organic portal threshold
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 centered = (vUv - 0.5) * vec2(aspect, 1.0);
  float dist = length(centered);

  // Deep warm atmospheric twilight base
  vec3 twilightDeep = vec3(0.062, 0.044, 0.040);
  vec3 twilightWarm = vec3(0.118, 0.075, 0.066);
  float bgGrad = exp(-dist * dist * 1.45);
  vec3 baseCol = mix(twilightDeep, twilightWarm, bgGrad * (0.45 + 0.55 * uWarmSpread));

  // Luminous palette colors (warm ivory, peach, coral, champagne)
  vec3 colIvory = vec3(0.980, 0.969, 0.949);
  vec3 colPeach = vec3(0.957, 0.722, 0.588);
  vec3 colCoral = vec3(0.878, 0.427, 0.325);
  vec3 colChampagne = vec3(0.898, 0.659, 0.384);

  // Breathing central point signal
  float pulse = 0.92 + 0.08 * sin(uTime * 3.2);
  float pinpoint = exp(-dist * dist * 580.0) * uCoreIntensity * pulse;
  float innerGlow = exp(-dist * dist * 52.0) * uCoreIntensity;
  float outerAura = exp(-dist * dist * (10.0 - 5.5 * uWarmSpread)) * uWarmSpread * 0.55;

  // Faint delicate orbital halo ring as particles gather
  float ringRadius = 0.16 + 0.04 * uWarmSpread;
  float ring = exp(-pow((dist - ringRadius) * 28.0, 2.0)) * uWarmSpread * 0.22;

  vec3 signalColor = baseCol
    + colCoral * outerAura
    + colPeach * innerGlow * 0.85
    + colChampagne * ring
    + colIvory * pinpoint * 1.35;

  // Organic radial portal expansion (2.0s -> 2.8s)
  float maxRadius = length(vec2(aspect * 0.5, 0.5)) + 0.28;
  float n1 = snoise(centered * 3.8 + vec2(uTime * 0.25, -uTime * 0.18));
  float n2 = snoise(centered * 7.5 - vec2(uTime * 0.15, uTime * 0.22));
  float organicPerturb = (n1 * 0.65 + n2 * 0.35) * 0.065 * sin(uReveal * 3.14159265);

  float portalRadius = uReveal * maxRadius;
  float distortedDist = dist + organicPerturb;

  // Alpha: 1.0 outside portal, smoothly 0.0 inside portal to reveal real Page 01 video
  float edgeBand = mix(0.04, 0.16, uReveal);
  float veilAlpha = smoothstep(portalRadius - edgeBand, portalRadius + edgeBand * 0.55, distortedDist);

  // Fade out completely at end of reveal
  float tailFade = 1.0 - smoothstep(0.84, 1.0, uReveal);
  veilAlpha *= tailFade;

  // Luminous warm coral/peach threshold glow along expanding portal wave
  float waveActive = smoothstep(0.0, 0.15, uReveal) * (1.0 - smoothstep(0.78, 1.0, uReveal));
  float rimGlow = exp(-pow((distortedDist - portalRadius) / 0.075, 2.0)) * waveActive;
  vec3 finalColor = signalColor + mix(colCoral, colPeach, 0.55) * rimGlow * 0.72;

  gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), clamp(veilAlpha, 0.0, 1.0));
}
`;

const PARTICLE_VERTEX_SHADER = `
uniform float uTime;
uniform float uGather;
uniform float uBloom;
uniform float uExpand;
uniform float uPixelRatio;

attribute vec3 aStartPos;
attribute float aAngle;
attribute float aOrbitRadius;
attribute float aSpeed;
attribute float aSize;
attribute float aColorMix;
attribute float aDelay;

varying float vAlpha;
varying float vColorMix;
varying float vBloom;

void main() {
  // Staggered gather progress per particle
  float localGather = clamp((uGather - aDelay * 0.32) / max(1.0 - aDelay * 0.32, 0.001), 0.0, 1.0);
  float easedGather = 1.0 - pow(1.0 - localGather, 3.0);

  // Spiral orbit target near center
  float angle = aAngle + uTime * aSpeed + easedGather * 1.45;
  float orbitR = aOrbitRadius * (1.0 - 0.15 * uBloom);
  vec3 targetPos = vec3(
    cos(angle) * orbitR,
    sin(angle) * orbitR * 0.78,
    sin(angle * 2.0 + uTime) * 0.08
  );

  // Organic outward expansion during final 2.0s - 2.8s
  float expandEase = uExpand * uExpand;
  vec3 radialDir = normalize(vec3(cos(angle), sin(angle), aStartPos.z * 0.35));
  vec3 expandedPos = targetPos + radialDir * expandEase * (1.65 + aOrbitRadius * 3.0);

  vec3 pos = mix(aStartPos, expandedPos, easedGather);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Size scales gently with depth and restrained bloom
  float depthScale = clamp(1.8 / max(-mvPosition.z, 0.6), 0.5, 2.0);
  gl_PointSize = aSize * uPixelRatio * depthScale * (1.0 + 0.32 * uBloom) * (1.0 - 0.35 * expandEase);

  float fadeIn = smoothstep(0.0, 0.35, localGather + 0.12);
  float fadeOut = 1.0 - smoothstep(0.25, 0.92, uExpand);
  vAlpha = fadeIn * fadeOut * (0.62 + 0.38 * uBloom);
  vColorMix = aColorMix;
  vBloom = uBloom;
}
`;

const PARTICLE_FRAGMENT_SHADER = `
varying float vAlpha;
varying float vColorMix;
varying float vBloom;

void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float r = length(d);
  if (r > 0.5) discard;

  // Soft circular core + warm halo falloff
  float core = smoothstep(0.28, 0.0, r);
  float halo = pow(max(1.0 - r * 2.0, 0.0), 2.2);
  float intensity = core * 0.85 + halo * (0.55 + 0.35 * vBloom);

  vec3 colIvory = vec3(0.980, 0.969, 0.949);
  vec3 colPeach = vec3(0.957, 0.722, 0.588);
  vec3 colCoral = vec3(0.878, 0.427, 0.325);
  vec3 colChampagne = vec3(0.898, 0.659, 0.384);

  vec3 particleColor;
  if (vColorMix < 0.33) {
    particleColor = mix(colIvory, colPeach, vColorMix * 3.0);
  } else if (vColorMix < 0.68) {
    particleColor = mix(colPeach, colCoral, (vColorMix - 0.33) / 0.35);
  } else {
    particleColor = mix(colCoral, colChampagne, (vColorMix - 0.68) / 0.32);
  }

  gl_FragColor = vec4(particleColor, intensity * vAlpha);
}
`;

export const CinematicOpening: React.FC<CinematicOpeningProps> = ({
  videoRef,
  onRevealStart,
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const titleWrapperRef = useRef<HTMLDivElement>(null);
  const titleTextRef = useRef<HTMLHeadingElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const hairlineRef = useRef<HTMLDivElement>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null);

  const [useWebGL, setUseWebGL] = useState(true);
  const [fallbackReveal, setFallbackReveal] = useState(0);

  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const completedRef = useRef(false);
  const revealTriggeredRef = useRef(false);

  const triggerRevealStart = useCallback(() => {
    if (!revealTriggeredRef.current) {
      revealTriggeredRef.current = true;
      onRevealStart();
    }
  }, [onRevealStart]);

  const finishIntro = useCallback(
    (wasSkipped: boolean) => {
      if (completedRef.current) return;
      completedRef.current = true;
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
      triggerRevealStart();
      onComplete(wasSkipped);
    },
    [onComplete, triggerRevealStart]
  );

  const handleSkip = useCallback(() => {
    finishIntro(true);
  }, [finishIntro]);

  // Allow Escape key to skip intro immediately
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSkip]);

  // Detect WebGL capability once
  useEffect(() => {
    try {
      const testCanvas = document.createElement('canvas');
      const gl =
        testCanvas.getContext('webgl2') ||
        testCanvas.getContext('webgl') ||
        testCanvas.getContext('experimental-webgl');
      if (!gl) setUseWebGL(false);
    } catch {
      setUseWebGL(false);
    }
  }, []);

  // Main Preload + Timeline + Three.js WebGL / 2D Fallback setup
  useEffect(() => {
    let isMounted = true;
    let animFrameId: number | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let veilGeom: THREE.PlaneGeometry | null = null;
    let veilMat: THREE.ShaderMaterial | null = null;
    let particleGeom: THREE.BufferGeometry | null = null;
    let particleMat: THREE.ShaderMaterial | null = null;

    // 1. Preload required Page 01 visual assets (bounded max 450ms so visitor is never stalled)
    const preloadAssets = (): Promise<void> => {
      const posterReady = new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = '/media/act-01-environment-poster.jpg';
      });

      const videoReady = new Promise<void>((resolve) => {
        const video = videoRef.current;
        if (!video || video.readyState >= 2) {
          resolve();
          return;
        }
        const onReady = () => {
          video.removeEventListener('loadeddata', onReady);
          video.removeEventListener('canplay', onReady);
          resolve();
        };
        video.addEventListener('loadeddata', onReady, { once: true });
        video.addEventListener('canplay', onReady, { once: true });
      });

      const fontsReady =
        typeof document !== 'undefined' && document.fonts?.ready
          ? document.fonts.ready.then(() => undefined).catch(() => undefined)
          : Promise.resolve();

      const maxWait = new Promise<void>((resolve) => setTimeout(resolve, 450));
      return Promise.race([Promise.all([posterReady, videoReady, fontsReady]).then(() => undefined), maxWait]);
    };

    const hardwareCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
    const isLowSpec = hardwareCores < 4;
    const dpr = Math.min(window.devicePixelRatio || 1, isLowSpec ? 1.25 : 1.75);
    const particleCount = isLowSpec ? 110 : 220;

    // Shared animation state driven deterministically by GSAP timeline (~2.8s)
    const state = {
      coreIntensity: 0.12,
      warmSpread: 0.04,
      gather: 0.0,
      bloom: 0.0,
      reveal: 0.0,
    };

    if (useWebGL && canvasHostRef.current) {
      const host = canvasHostRef.current;
      const width = window.innerWidth;
      const height = window.innerHeight;

      const scene = new THREE.Scene();
      const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const perspCam = new THREE.PerspectiveCamera(48, width / Math.max(height, 1), 0.1, 20);
      perspCam.position.z = 2.6;

      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: false,
        });
      } catch {
        setUseWebGL(false);
        return;
      }

      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height);
      renderer.autoClear = false;

      while (host.firstChild) {
        host.removeChild(host.firstChild);
      }
      host.appendChild(renderer.domElement);

      // Layer A: Atmospheric Veil + Organic Signal Portal Shader
      const veilScene = new THREE.Scene();
      const veilUniforms = {
        uTime: { value: 0 },
        uCoreIntensity: { value: 0 },
        uWarmSpread: { value: 0 },
        uReveal: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
      };

      veilGeom = new THREE.PlaneGeometry(2, 2);
      veilMat = new THREE.ShaderMaterial({
        vertexShader: VEIL_VERTEX_SHADER,
        fragmentShader: VEIL_FRAGMENT_SHADER,
        uniforms: veilUniforms,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      veilScene.add(new THREE.Mesh(veilGeom, veilMat));

      // Layer B: Gathering Particles
      particleGeom = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const startPositions = new Float32Array(particleCount * 3);
      const angles = new Float32Array(particleCount);
      const orbitRadii = new Float32Array(particleCount);
      const speeds = new Float32Array(particleCount);
      const sizes = new Float32Array(particleCount);
      const colorMixes = new Float32Array(particleCount);
      const delays = new Float32Array(particleCount);

      for (let i = 0; i < particleCount; i++) {
        const theta = i * 2.39996323 + (Math.random() - 0.5) * 0.4; // Golden angle distribution
        const startDist = 1.1 + Math.random() * 1.45;
        const sx = Math.cos(theta) * startDist * 1.35;
        const sy = Math.sin(theta) * startDist * 0.85;
        const sz = (Math.random() - 0.5) * 1.4;

        startPositions[i * 3] = sx;
        startPositions[i * 3 + 1] = sy;
        startPositions[i * 3 + 2] = sz;

        positions[i * 3] = sx;
        positions[i * 3 + 1] = sy;
        positions[i * 3 + 2] = sz;

        angles[i] = theta;
        orbitRadii[i] = 0.08 + Math.pow(Math.random(), 1.4) * 0.42;
        speeds[i] = (0.28 + Math.random() * 0.45) * (i % 2 === 0 ? 1 : -0.75);
        sizes[i] = 5.0 + Math.random() * 10.5;
        colorMixes[i] = Math.random();
        delays[i] = Math.random();
      }

      particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeom.setAttribute('aStartPos', new THREE.BufferAttribute(startPositions, 3));
      particleGeom.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
      particleGeom.setAttribute('aOrbitRadius', new THREE.BufferAttribute(orbitRadii, 1));
      particleGeom.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
      particleGeom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      particleGeom.setAttribute('aColorMix', new THREE.BufferAttribute(colorMixes, 1));
      particleGeom.setAttribute('aDelay', new THREE.BufferAttribute(delays, 1));

      const particleUniforms = {
        uTime: { value: 0 },
        uGather: { value: 0 },
        uBloom: { value: 0 },
        uExpand: { value: 0 },
        uPixelRatio: { value: dpr },
      };

      particleMat = new THREE.ShaderMaterial({
        vertexShader: PARTICLE_VERTEX_SHADER,
        fragmentShader: PARTICLE_FRAGMENT_SHADER,
        uniforms: particleUniforms,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const points = new THREE.Points(particleGeom, particleMat);
      scene.add(points);

      const clock = new THREE.Clock();
      const renderWebGL = () => {
        if (!isMounted || completedRef.current || !renderer) return;
        const t = clock.getElapsedTime();

        veilUniforms.uTime.value = t;
        veilUniforms.uCoreIntensity.value = state.coreIntensity;
        veilUniforms.uWarmSpread.value = state.warmSpread;
        veilUniforms.uReveal.value = state.reveal;

        particleUniforms.uTime.value = t;
        particleUniforms.uGather.value = state.gather;
        particleUniforms.uBloom.value = state.bloom;
        particleUniforms.uExpand.value = state.reveal;

        renderer.clear();
        renderer.render(veilScene, orthoCam);
        renderer.render(scene, perspCam);

        animFrameId = requestAnimationFrame(renderWebGL);
      };
      animFrameId = requestAnimationFrame(renderWebGL);

      const onResize = () => {
        if (!renderer) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h);
        perspCam.aspect = w / Math.max(h, 1);
        perspCam.updateProjectionMatrix();
        veilUniforms.uResolution.value.set(w, h);
      };
      window.addEventListener('resize', onResize, { passive: true });

      // Start choreography once assets pass fast preload check
      preloadAssets().then(() => {
        if (!isMounted || completedRef.current) return;
        startChoreography(state, () => {
          window.removeEventListener('resize', onResize);
        });
      });

      return () => {
        isMounted = false;
        window.removeEventListener('resize', onResize);
        if (animFrameId) cancelAnimationFrame(animFrameId);
        if (timelineRef.current) {
          timelineRef.current.kill();
          timelineRef.current = null;
        }
        veilGeom?.dispose();
        veilMat?.dispose();
        particleGeom?.dispose();
        particleMat?.dispose();
        renderer?.dispose();
        if (host && renderer?.domElement && renderer.domElement.parentNode === host) {
          host.removeChild(renderer.domElement);
        }
      };
    } else {
      // Graceful 2D Canvas + CSS Fallback when WebGL is unavailable
      const canvas = fallbackCanvasRef.current;
      const particles = Array.from({ length: 75 }, (_, i) => ({
        angle: i * 2.399963,
        dist: 0.45 + Math.random() * 0.55,
        orbit: 0.06 + Math.random() * 0.16,
        size: 1.5 + Math.random() * 2.5,
        color: i % 3 === 0 ? '#FAF7F2' : i % 3 === 1 ? '#F4B896' : '#E06D53',
      }));

      const renderFallback = () => {
        if (!isMounted || completedRef.current) return;
        if (canvas) {
          const w = window.innerWidth;
          const h = window.innerHeight;
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, w, h);
            const cx = w * 0.5;
            const cy = h * 0.5;
            const maxDim = Math.max(w, h);

            // Core warm glow
            const glowRadius = Math.max(20, (0.14 + state.warmSpread * 0.35) * maxDim);
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
            grad.addColorStop(0, `rgba(250, 247, 242, ${0.75 * state.coreIntensity})`);
            grad.addColorStop(0.28, `rgba(244, 184, 150, ${0.42 * state.coreIntensity})`);
            grad.addColorStop(0.65, `rgba(224, 109, 83, ${0.18 * state.warmSpread})`);
            grad.addColorStop(1, 'rgba(24, 18, 16, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // Gathering particles
            for (const p of particles) {
              const r =
                (p.dist * (1 - state.gather) + p.orbit * state.gather + state.reveal * 0.9) *
                (Math.min(w, h) * 0.7);
              const ang = p.angle + state.gather * 1.4;
              const px = cx + Math.cos(ang) * r;
              const py = cy + Math.sin(ang) * r * 0.8;
              ctx.globalAlpha = Math.max(0, (0.35 + 0.65 * state.gather) * (1 - state.reveal));
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(px, py, p.size, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.globalAlpha = 1;
          }
        }
        setFallbackReveal(state.reveal);
        animFrameId = requestAnimationFrame(renderFallback);
      };

      animFrameId = requestAnimationFrame(renderFallback);
      preloadAssets().then(() => {
        if (!isMounted || completedRef.current) return;
        startChoreography(state);
      });

      return () => {
        isMounted = false;
        if (animFrameId) cancelAnimationFrame(animFrameId);
        if (timelineRef.current) {
          timelineRef.current.kill();
          timelineRef.current = null;
        }
      };
    }

    function startChoreography(
      uniformState: typeof state,
      onDoneCleanup?: () => void
    ) {
      const tl = gsap.timeline({
        onComplete: () => {
          onDoneCleanup?.();
          finishIntro(false);
        },
      });
      timelineRef.current = tl;

      // 0.0s -> 0.6s: Quiet dark opening, central signal awakens
      tl.to(
        uniformState,
        {
          coreIntensity: 0.78,
          duration: 0.6,
          ease: 'power2.out',
        },
        0
      );

      // 0.6s -> 1.4s: Particles gather, warm light spreads outward
      tl.to(
        uniformState,
        {
          gather: 1.0,
          warmSpread: 0.92,
          coreIntensity: 1.0,
          duration: 0.85,
          ease: 'power2.inOut',
        },
        0.55
      );

      // 1.4s -> 2.0s: Restrained particle bloom + "THE LIVING SIGNAL" typography reveal
      tl.to(
        uniformState,
        {
          bloom: 1.0,
          duration: 0.55,
          ease: 'power2.out',
        },
        1.35
      );

      if (titleTextRef.current) {
        tl.fromTo(
          titleTextRef.current,
          { opacity: 0, scale: 0.96, letterSpacing: '0.32em', filter: 'blur(6px)' },
          {
            opacity: 1,
            scale: 1,
            letterSpacing: '0.2em',
            filter: 'blur(0px)',
            duration: 0.55,
            ease: 'power3.out',
          },
          1.38
        );
      }

      if (hairlineRef.current) {
        tl.fromTo(
          hairlineRef.current,
          { scaleX: 0, opacity: 0 },
          { scaleX: 1, opacity: 1, duration: 0.5, ease: 'power2.out' },
          1.45
        );
      }

      if (eyebrowRef.current) {
        tl.fromTo(
          eyebrowRef.current,
          { opacity: 0, y: 6 },
          { opacity: 0.85, y: 0, duration: 0.45, ease: 'power2.out' },
          1.52
        );
      }

      // 2.0s -> 2.8s: Organic signal expansion into real Page 01 sunset video
      tl.to(
        uniformState,
        {
          reveal: 1.0,
          bloom: 0.35,
          duration: 0.82,
          ease: 'power2.inOut',
        },
        1.98
      );

      // Fade typography cleanly as sunset opens
      if (titleWrapperRef.current) {
        tl.to(
          titleWrapperRef.current,
          {
            opacity: 0,
            scale: 1.04,
            y: -10,
            duration: 0.52,
            ease: 'power2.in',
          },
          2.02
        );
      }

      // Signal Page 01 hero + navigation to emerge as sunset opens
      tl.call(
        () => {
          triggerRevealStart();
        },
        undefined,
        2.32
      );
    }
  }, [useWebGL, videoRef, finishIntro, triggerRevealStart]);

  const fallbackMaskStyle: React.CSSProperties | undefined = !useWebGL
    ? {
        backgroundColor: '#181210',
        WebkitMaskImage: `radial-gradient(circle at center, transparent ${fallbackReveal * 125}%, black ${fallbackReveal * 125 + 14}%)`,
        maskImage: `radial-gradient(circle at center, transparent ${fallbackReveal * 125}%, black ${fallbackReveal * 125 + 14}%)`,
        opacity: Math.max(0, 1 - Math.max(0, (fallbackReveal - 0.85) / 0.15)),
      }
    : undefined;

  return (
    <div
      ref={containerRef}
      id="cinematic-opening"
      role="region"
      aria-label="Opening Sequence — The Living Signal"
      className="fixed inset-0 z-50 flex items-center justify-center select-none pointer-events-auto"
      style={fallbackMaskStyle}
    >
      {/* WebGL Three.js Canvas Host */}
      {useWebGL ? (
        <div
          ref={canvasHostRef}
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        />
      ) : (
        <canvas
          ref={fallbackCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Refined Typography Reveal */}
      <div
        ref={titleWrapperRef}
        className="relative z-10 flex flex-col items-center text-center px-6 pointer-events-none"
      >
        <div
          ref={eyebrowRef}
          className="opacity-0 text-[10px] md:text-[11px] font-sans font-semibold tracking-[0.38em] uppercase text-signal-peach/90 mb-3"
        >
          Aditya Dugar
        </div>

        <h2
          ref={titleTextRef}
          className="opacity-0 font-serif text-2xl sm:text-3xl md:text-5xl font-normal uppercase tracking-[0.2em] text-signal-ivory drop-shadow-[0_2px_24px_rgba(244,184,150,0.45)]"
        >
          The Living Signal
        </h2>

        <div
          ref={hairlineRef}
          className="opacity-0 mt-4 w-36 md:w-52 h-[1px] bg-gradient-to-r from-transparent via-signal-coral to-transparent origin-center shadow-[0_0_12px_rgba(224,109,83,0.75)]"
        />
      </div>

      {/* Always-available Skip Intro Control */}
      <button
        type="button"
        onClick={handleSkip}
        aria-label="Skip opening sequence"
        className="fixed bottom-7 right-8 z-20 group flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold tracking-[0.18em] uppercase text-signal-ivory/85 hover:text-signal-ivory bg-[#181210]/70 hover:bg-[#181210]/95 border border-signal-coral/45 hover:border-signal-coral backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.45)] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-coral"
      >
        <span>Skip Intro</span>
        <ArrowRight className="w-3.5 h-3.5 text-signal-coral group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};
