import React, { useEffect, useRef, useState, forwardRef } from 'react';
import * as THREE from 'three';

interface BackgroundVideoProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive?: boolean;
}

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uVideoSize;
uniform vec2 uPointer;
uniform vec2 uPointerUv;
uniform vec2 uVelocity;
uniform float uMotionEnergy;
uniform float uTime;
varying vec2 vUv;

vec2 computeCoverUv(vec2 uv, vec2 res, vec2 vidSize) {
  float screenAspect = res.x / max(res.y, 1.0);
  float vidAspect = vidSize.x / max(vidSize.y, 1.0);
  vec2 ratio = (screenAspect > vidAspect)
    ? vec2(1.0, vidAspect / screenAspect)
    : vec2(screenAspect / vidAspect, 1.0);
  vec2 baseUv = (uv - 0.5) * ratio + 0.5;
  // Subtle 3.5% interior margin so parallax & refraction never clamp at edges
  return (baseUv - 0.5) * 0.964 + 0.5;
}

void main() {
  vec2 uv = vUv;
  vec2 scenicUv = computeCoverUv(uv, uResolution, uVideoSize);

  // Depth-aware scene segmentation matching act-01-environment.mp4:
  // 1. Left sandstone haveli archway & bougainvillea (closest foreground)
  float archWeight = smoothstep(0.42, 0.14, scenicUv.x);
  // 2. Bottom carved balustrade railing (foreground)
  float railingWeight = smoothstep(0.28, 0.07, scenicUv.y) * smoothstep(0.86, 0.24, scenicUv.x);
  float fgMask = clamp(max(archWeight, railingWeight * 0.85), 0.0, 1.0);

  // 3. Calm lake water reflection plane (midground)
  float waterMask = smoothstep(0.43, 0.17, scenicUv.y) * smoothstep(0.18, 0.38, scenicUv.x);

  // Distant sky, sunset clouds & lake palace shift subtly; foreground arch shifts ~3.8x more
  float depthWeight = mix(0.26, 0.54, waterMask);
  depthWeight = mix(depthWeight, 1.0, fgMask);

  // Smooth depth-aware parallax (cursor moves right -> camera pans gently right)
  vec2 parallaxOffset = vec2(uPointer.x * 0.0145, uPointer.y * 0.0105) * depthWeight;

  // Localized optical refraction & fluid displacement around pointer
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 delta = uv - uPointerUv;
  vec2 deltaAspect = vec2(delta.x * aspect, delta.y);
  float dist = length(deltaAspect);

  // Soft Gaussian zone around pointer (restrained radius, zero harsh circle)
  float lensZone = exp(-dist * dist * 22.0);
  float waterBoost = mix(1.0, 1.45, waterMask);

  vec2 waveDir = (dist > 0.0001) ? (deltaAspect / dist) : vec2(0.0);
  float ripplePhase = sin(dist * 30.0 - uTime * 3.8) * cos(dist * 14.0 + uTime * 1.4);

  // Velocity wake & subtle fluid ripple that settle cleanly to 0 when pointer stops
  vec2 wakeOffset = -uVelocity * 0.26 * lensZone;
  vec2 rippleOffset = waveDir * ripplePhase * 0.0024 * uMotionEnergy * waterBoost * lensZone;
  // Subtle optical lens curvature
  vec2 lensCurve = -delta * lensZone * (0.0032 + 0.0072 * uMotionEnergy);

  vec2 totalDisp = parallaxOffset + wakeOffset + rippleOffset + lensCurve;
  vec2 finalUv = clamp(scenicUv + totalDisp, vec2(0.001), vec2(0.999));

  // Whisper-soft optical dispersion only inside active motion wake
  float chromaShift = 0.00075 * uMotionEnergy * lensZone;
  vec2 chromaVec = uVelocity * 0.12 + vec2(chromaShift, 0.0);

  float r = texture2D(uTexture, clamp(finalUv + chromaVec, vec2(0.001), vec2(0.999))).r;
  float g = texture2D(uTexture, finalUv).g;
  float b = texture2D(uTexture, clamp(finalUv - chromaVec, vec2(0.001), vec2(0.999))).b;
  vec3 color = vec3(r, g, b);

  // Gentle warm peach/ivory atmospheric light sheen on active pointer ripple
  vec3 warmSheen = vec3(0.98, 0.78, 0.64);
  color += warmSheen * (lensZone * uMotionEnergy * 0.032 * waterBoost);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

export const BackgroundVideo = forwardRef<HTMLDivElement, BackgroundVideoProps>(
  ({ videoRef, isActive = true }, ref) => {
    const canvasHostRef = useRef<HTMLDivElement>(null);
    const fallbackParallaxRef = useRef<HTMLDivElement>(null);

    const [enableInteractiveEnv, setEnableInteractiveEnv] = useState(false);
    const [webGLAvailable, setWebGLAvailable] = useState(true);
    const [canvasReady, setCanvasReady] = useState(false);

    const isActiveRef = useRef(isActive);
    isActiveRef.current = isActive;
    const resumeLoopRef = useRef<(() => void) | null>(null);

    // Autoplay muted native video once on mount
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      video.defaultMuted = true;
      video.muted = true;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Autoplay deferred by browser policy:', err);
        });
      }
    }, [videoRef]);

    // Check pointer capability (fine pointer only) and reduced-motion preference
    useEffect(() => {
      const finePointerMq = window.matchMedia('(pointer: fine)');
      const reducedMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');

      const evaluate = () => {
        setEnableInteractiveEnv(finePointerMq.matches && !reducedMotionMq.matches);
      };
      evaluate();

      finePointerMq.addEventListener('change', evaluate);
      reducedMotionMq.addEventListener('change', evaluate);
      return () => {
        finePointerMq.removeEventListener('change', evaluate);
        reducedMotionMq.removeEventListener('change', evaluate);
      };
    }, []);

    // WebGL Pointer-Responsive Video Environment (or lightweight CSS parallax fallback)
    useEffect(() => {
      if (!enableInteractiveEnv) {
        setCanvasReady(false);
        return;
      }

      let supportsWebGL = true;
      try {
        const test = document.createElement('canvas');
        const gl =
          test.getContext('webgl2') ||
          test.getContext('webgl') ||
          test.getContext('experimental-webgl');
        if (!gl) supportsWebGL = false;
      } catch {
        supportsWebGL = false;
      }
      setWebGLAvailable(supportsWebGL);

      // Shared smoothed pointer state (updated inside rAF, zero React rerenders)
      const pointer = {
        targetNormX: 0,
        targetNormY: 0,
        currNormX: 0,
        currNormY: 0,
        targetUvX: 0.5,
        targetUvY: 0.5,
        currUvX: 0.5,
        currUvY: 0.5,
        velX: 0,
        velY: 0,
        energy: 0,
        lastMoveTime: 0,
      };

      const onPointerMove = (e: PointerEvent) => {
        if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
        const w = Math.max(window.innerWidth, 1);
        const h = Math.max(window.innerHeight, 1);

        const uvX = Math.min(Math.max(e.clientX / w, 0), 1);
        const uvY = Math.min(Math.max(1 - e.clientY / h, 0), 1);

        const dx = uvX - pointer.targetUvX;
        const dy = uvY - pointer.targetUvY;

        pointer.targetUvX = uvX;
        pointer.targetUvY = uvY;
        pointer.targetNormX = uvX * 2 - 1;
        pointer.targetNormY = uvY * 2 - 1;

        const speed = Math.hypot(dx, dy);
        pointer.velX = Math.max(-0.08, Math.min(0.08, pointer.velX * 0.55 + dx * 0.85));
        pointer.velY = Math.max(-0.08, Math.min(0.08, pointer.velY * 0.55 + dy * 0.85));
        pointer.energy = Math.min(1.0, pointer.energy + Math.min(speed * 14.0, 0.55));
        pointer.lastMoveTime = performance.now();
      };

      const onPointerLeave = () => {
        pointer.targetNormX = 0;
        pointer.targetNormY = 0;
      };

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('mouseleave', onPointerLeave, { passive: true });

      // Non-WebGL lightweight CSS parallax fallback
      if (!supportsWebGL || !canvasHostRef.current) {
        let rafId: number | null = null;
        const tickFallback = () => {
          rafId = null;
          if (!isActiveRef.current || document.hidden || !fallbackParallaxRef.current) return;
          pointer.currNormX += (pointer.targetNormX - pointer.currNormX) * 0.065;
          pointer.currNormY += (pointer.targetNormY - pointer.currNormY) * 0.065;
          const tx = (-pointer.currNormX * 14).toFixed(2);
          const ty = (pointer.currNormY * 10).toFixed(2);
          fallbackParallaxRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(1.035)`;
          rafId = requestAnimationFrame(tickFallback);
        };
        const startFallback = () => {
          if (rafId === null && isActiveRef.current && !document.hidden) {
            rafId = requestAnimationFrame(tickFallback);
          }
        };
        resumeLoopRef.current = startFallback;
        document.addEventListener('visibilitychange', startFallback);
        startFallback();
        return () => {
          resumeLoopRef.current = null;
          document.removeEventListener('visibilitychange', startFallback);
          if (rafId !== null) cancelAnimationFrame(rafId);
          window.removeEventListener('pointermove', onPointerMove);
          document.removeEventListener('mouseleave', onPointerLeave);
          if (fallbackParallaxRef.current) {
            fallbackParallaxRef.current.style.transform = 'none';
          }
        };
      }

      const host = canvasHostRef.current;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const hardwareCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
      const maxDpr = hardwareCores < 4 ? 1.25 : 1.75;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: false,
          antialias: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: false,
        });
      } catch {
        setWebGLAvailable(false);
        return () => {
          window.removeEventListener('pointermove', onPointerMove);
          document.removeEventListener('mouseleave', onPointerLeave);
        };
      }

      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height);

      while (host.firstChild) {
        host.removeChild(host.firstChild);
      }
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const textureLoader = new THREE.TextureLoader();
      const posterTexture = textureLoader.load('/media/act-01-environment-poster.jpg');
      posterTexture.colorSpace = THREE.SRGBColorSpace;
      posterTexture.minFilter = THREE.LinearFilter;
      posterTexture.magFilter = THREE.LinearFilter;

      let videoTexture: THREE.VideoTexture | null = null;

      const uniforms = {
        uTexture: { value: posterTexture as THREE.Texture },
        uResolution: { value: new THREE.Vector2(width, height) },
        uVideoSize: { value: new THREE.Vector2(1280, 720) },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uPointerUv: { value: new THREE.Vector2(0.5, 0.5) },
        uVelocity: { value: new THREE.Vector2(0, 0) },
        uMotionEnergy: { value: 0 },
        uTime: { value: 0 },
      };

      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms,
        depthTest: false,
        depthWrite: false,
      });

      scene.add(new THREE.Mesh(geometry, material));

      const clock = new THREE.Clock();
      let animFrameId: number | null = null;
      let isMounted = true;
      let hasRenderedFirstFrame = false;

      const animate = () => {
        animFrameId = null;
        if (!isMounted || !isActiveRef.current || document.hidden) return;

        const video = videoRef.current;
        if (video && video.readyState >= 2 && !videoTexture) {
          const vTex = new THREE.VideoTexture(video);
          vTex.colorSpace = THREE.SRGBColorSpace;
          vTex.minFilter = THREE.LinearFilter;
          vTex.magFilter = THREE.LinearFilter;
          vTex.generateMipmaps = false;
          videoTexture = vTex;
          uniforms.uTexture.value = vTex;
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            uniforms.uVideoSize.value.set(video.videoWidth, video.videoHeight);
          }
        }

        // Smooth physical pointer interpolation & natural settling when pointer stops
        pointer.currNormX += (pointer.targetNormX - pointer.currNormX) * 0.065;
        pointer.currNormY += (pointer.targetNormY - pointer.currNormY) * 0.065;
        pointer.currUvX += (pointer.targetUvX - pointer.currUvX) * 0.085;
        pointer.currUvY += (pointer.targetUvY - pointer.currUvY) * 0.085;

        // Exponentially damp velocity & ripple energy back to calm rest
        pointer.velX *= 0.88;
        pointer.velY *= 0.88;
        pointer.energy *= 0.935;
        if (pointer.energy < 0.002) pointer.energy = 0;

        uniforms.uPointer.value.set(pointer.currNormX, pointer.currNormY);
        uniforms.uPointerUv.value.set(pointer.currUvX, pointer.currUvY);
        uniforms.uVelocity.value.set(pointer.velX, pointer.velY);
        uniforms.uMotionEnergy.value = pointer.energy;
        uniforms.uTime.value = clock.getElapsedTime();

        renderer.render(scene, camera);

        if (!hasRenderedFirstFrame) {
          hasRenderedFirstFrame = true;
          setCanvasReady(true);
        }

        animFrameId = requestAnimationFrame(animate);
      };

      const startRenderLoop = () => {
        if (isMounted && animFrameId === null && isActiveRef.current && !document.hidden) {
          animFrameId = requestAnimationFrame(animate);
        }
      };
      resumeLoopRef.current = startRenderLoop;
      document.addEventListener('visibilitychange', startRenderLoop);
      startRenderLoop();

      const handleResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const nextDpr = Math.min(window.devicePixelRatio || 1, maxDpr);
        renderer.setPixelRatio(nextDpr);
        renderer.setSize(w, h);
        uniforms.uResolution.value.set(w, h);
        if (isActiveRef.current && !document.hidden) {
          renderer.render(scene, camera);
        }
      };
      window.addEventListener('resize', handleResize, { passive: true });

      return () => {
        isMounted = false;
        resumeLoopRef.current = null;
        document.removeEventListener('visibilitychange', startRenderLoop);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('mouseleave', onPointerLeave);
        if (animFrameId !== null) cancelAnimationFrame(animFrameId);
        geometry.dispose();
        material.dispose();
        posterTexture.dispose();
        if (videoTexture) videoTexture.dispose();
        renderer.dispose();
        if (host && renderer.domElement && renderer.domElement.parentNode === host) {
          host.removeChild(renderer.domElement);
        }
      };
    }, [enableInteractiveEnv, videoRef]);

    // Wake paused render loop immediately when Page 01 becomes active again
    useEffect(() => {
      if (isActive) {
        resumeLoopRef.current?.();
      }
    }, [isActive]);

    return (
      <div
        id="background-video-layer"
        className="fixed inset-0 z-0 overflow-hidden bg-[#181210] pointer-events-none select-none"
        aria-hidden="true"
      >
        {/* Inner animated wrapper for smooth GSAP cinematic camera zoom / pan */}
        <div
          ref={ref}
          id="camera-video-wrapper"
          className="relative w-full h-full will-change-transform"
          style={{
            transformOrigin: '35% 50%',
            transform: 'scale(1.0)',
          }}
        >
          {/* Native video wrapper (single authoritative playback & sound timeline) */}
          <div
            ref={fallbackParallaxRef}
            className="w-full h-full will-change-transform"
          >
            <video
              ref={videoRef}
              src="/media/act-01-environment.mp4"
              poster="/media/act-01-environment-poster.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="w-full h-full object-cover object-[22%_center] md:object-[30%_center] lg:object-center"
            />
          </div>

          {/* Interactive Depth-Aware WebGL Shader Canvas sampling live native video */}
          {enableInteractiveEnv && webGLAvailable && (
            <div
              ref={canvasHostRef}
              id="page-01-interactive-canvas"
              className={`absolute inset-0 z-10 w-full h-full pointer-events-none transition-opacity duration-300 ${
                canvasReady ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}
        </div>

        {/* Atmospheric depth vignette ensuring text readability without hiding scenery */}
        <div className="absolute inset-0 z-20 bg-gradient-to-r from-black/50 via-black/20 to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/45 via-transparent to-black/25 pointer-events-none" />
      </div>
    );
  }
);

BackgroundVideo.displayName = 'BackgroundVideo';
