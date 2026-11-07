import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { renderMobileFrameToContext } from '../utils/mobileFrameHelper';

interface SceneTransitionCanvasProps {
  progress: number; // 0.0 (Page 1) to 1.0 (Page 2)
  videoRef: React.RefObject<HTMLVideoElement | null>;
  className?: string;
}

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform float uProgress;
uniform float uTime;
uniform sampler2D uTextureA;
uniform sampler2D uTextureB;
uniform vec2 uResolution;
varying vec2 vUv;

// 2D Simplex Noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187,
                      0.366025403784439,
                     -0.577350269189626,
                      0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
        + i.x + vec3(0.0, i1.x, 1.0));
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
  vec2 uv = vUv;
  bool isMobile = uResolution.x < 768.0;

  // Aspect-normalized noise coordinates on mobile to prevent vertical stretching
  vec2 noiseCoord = isMobile
    ? vec2(uv.x, uv.y * (uResolution.y / uResolution.x) * 0.55)
    : uv;

  // Organic multi-octave noise field
  float n1 = snoise(noiseCoord * 3.4 + vec2(uTime * 0.12, uTime * 0.08));
  float n2 = snoise(noiseCoord * 6.8 - vec2(uTime * 0.14, uTime * 0.06));
  float noise = n1 * 0.65 + n2 * 0.35;

  // Peak distortion happens at mid-scroll (0.5 progress)
  float distPeak = sin(clamp(uProgress, 0.0, 1.0) * 3.14159265);
  
  // Controlled displacement on mobile to avoid extreme horizontal tear
  float dispScale = isMobile ? 0.038 : 0.075;
  float displacement = noise * distPeak * dispScale;

  // Sweep transition boundary from bottom-left to top-right with noise modulation
  float edgeWidth = isMobile ? 0.22 : 0.20;
  float wave = isMobile
    ? (uv.y * 0.60 + uv.x * 0.40) + noise * 0.16
    : (uv.y * 0.65 + uv.x * 0.35) + noise * 0.22;
  float p = uProgress * (1.0 + edgeWidth * 2.0) - edgeWidth;
  float mixFactor = smoothstep(p - edgeWidth, p + edgeWidth, wave);

  // Subtle chromatic separation
  float chromaA = isMobile ? distPeak * 0.007 : distPeak * 0.016;
  float chromaB = isMobile ? distPeak * 0.005 : distPeak * 0.012;

  // Sample outgoing Scene A: on mobile, match BackgroundVideo's object-cover object-[22%_center]
  vec2 uvA;
  if (isMobile) {
    float spanX = (uResolution.x / uResolution.y) / (1280.0 / 720.0);
    float startX = clamp(0.22 - spanX * 0.5, 0.0, 1.0 - spanX);
    vec2 mappedUvA = vec2(startX + uv.x * spanX, uv.y);
    uvA = mappedUvA + vec2(displacement * spanX, -displacement * 0.5);
    uvA = clamp(uvA, vec2(startX + 0.001, 0.001), vec2(startX + spanX - 0.001, 0.999));
  } else {
    uvA = uv + vec2(displacement, -displacement * 0.5);
  }

  float rA = texture2D(uTextureA, uvA + vec2(chromaA, 0.0)).r;
  float gA = texture2D(uTextureA, uvA).g;
  float bA = texture2D(uTextureA, uvA - vec2(chromaA, 0.0)).b;
  vec4 colA = vec4(rA, gA, bA, 1.0);

  // Sample incoming Scene B
  vec2 uvB = uv - vec2(displacement * 0.5, displacement * 0.7);
  uvB = clamp(uvB, vec2(0.001), vec2(0.999));
  float rB = texture2D(uTextureB, uvB + vec2(chromaB, 0.0)).r;
  float gB = texture2D(uTextureB, uvB).g;
  float bB = texture2D(uTextureB, uvB - vec2(chromaB, 0.0)).b;
  vec4 colB = vec4(rB, gB, bB, 1.0);

  // Luminous peach/coral boundary glow on the tear edge
  float glowIntensity = (1.0 - smoothstep(0.0, edgeWidth * 0.8, abs(wave - p))) * distPeak;
  float glowMult = isMobile ? 1.2 : 2.4;
  float peachMult = isMobile ? 0.9 : 1.6;
  vec3 coralGlow = vec3(0.88, 0.43, 0.33) * glowIntensity * glowMult;
  vec3 peachGlow = vec3(0.96, 0.72, 0.59) * glowIntensity * peachMult;
  vec3 totalGlow = mix(coralGlow, peachGlow, 0.5 + 0.5 * sin(uTime * 2.5));

  vec4 blendedColor = mix(colB, colA, mixFactor) + vec4(totalGlow, 0.0);
  gl_FragColor = clamp(blendedColor, 0.0, 1.0);
}
`;

export const SceneTransitionCanvas: React.FC<SceneTransitionCanvasProps> = ({
  progress,
  videoRef,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
  const [webGLSupported, setWebGLSupported] = useState(true);

  // Check WebGL support
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setWebGLSupported(false);
    } catch {
      setWebGLSupported(false);
    }
  }, []);

  // WebGL Three.js Scene Setup
  useEffect(() => {
    if (!containerRef.current || !webGLSupported) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: false,
      alpha: true,
      stencil: false,
      depth: false,
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));

    // Clear mount container
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    containerRef.current.appendChild(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();

    // Outgoing Scene A: Poster fallback initially, replaced with live video texture
    const defaultTextureA = textureLoader.load('/media/act-01-environment-poster.jpg');
    defaultTextureA.colorSpace = THREE.SRGBColorSpace;
    defaultTextureA.minFilter = THREE.LinearFilter;
    defaultTextureA.magFilter = THREE.LinearFilter;

    // Incoming Scene B: Desktop uses original landscape frame; Mobile uses exact matching 9:16 portrait crop
    const isMobile = width < 768;
    let textureB: THREE.Texture;
    let offscreenCanvas: HTMLCanvasElement | null = null;
    let cachedSourceImg: HTMLImageElement | null = null;

    if (isMobile) {
      offscreenCanvas = document.createElement('canvas');
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
      offscreenCanvas.width = Math.round(width * dpr);
      offscreenCanvas.height = Math.round(height * dpr);

      const canvasTex = new THREE.CanvasTexture(offscreenCanvas);
      canvasTex.colorSpace = THREE.SRGBColorSpace;
      canvasTex.minFilter = THREE.LinearFilter;
      canvasTex.magFilter = THREE.LinearFilter;
      textureB = canvasTex;

      const img = new Image();
      img.src = '/frames/page-02/frame_0001.webp';
      img.onload = () => {
        cachedSourceImg = img;
        const ctx = offscreenCanvas?.getContext('2d', { alpha: false });
        if (ctx && offscreenCanvas) {
          renderMobileFrameToContext(ctx, img, width, height, dpr);
          canvasTex.needsUpdate = true;
        }
      };
    } else {
      textureB = textureLoader.load('/frames/page-02/frame_0001.webp');
      textureB.colorSpace = THREE.SRGBColorSpace;
      textureB.minFilter = THREE.LinearFilter;
      textureB.magFilter = THREE.LinearFilter;
    }

    // Create shader material
    const uniforms = {
      uProgress: { value: progress },
      uTime: { value: 0 },
      uTextureA: { value: defaultTextureA },
      uTextureB: { value: textureB },
      uResolution: { value: new THREE.Vector2(width, height) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
    materialRef.current = material;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(geometry, material);
    scene.add(quad);

    let clock = new THREE.Clock();

    // Render loop
    const animate = () => {
      const elapsedTime = clock.getElapsedTime();
      if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = elapsedTime;

        // Bind video texture if available and playing
        const video = videoRef.current;
        if (video && video.readyState >= 2 && !videoTextureRef.current) {
          const vTex = new THREE.VideoTexture(video);
          vTex.colorSpace = THREE.SRGBColorSpace;
          vTex.minFilter = THREE.LinearFilter;
          vTex.magFilter = THREE.LinearFilter;
          vTex.generateMipmaps = false;
          videoTextureRef.current = vTex;
          materialRef.current.uniforms.uTextureA.value = vTex;
        }
      }

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    // Resize handler
    const handleResize = () => {
      const newW = window.innerWidth;
      const newH = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
      renderer.setSize(newW, newH);
      renderer.setPixelRatio(dpr);
      if (materialRef.current) {
        materialRef.current.uniforms.uResolution.value.set(newW, newH);
      }
      if (newW < 768 && offscreenCanvas && cachedSourceImg) {
        offscreenCanvas.width = Math.round(newW * dpr);
        offscreenCanvas.height = Math.round(newH * dpr);
        const ctx = offscreenCanvas.getContext('2d', { alpha: false });
        if (ctx) {
          renderMobileFrameToContext(ctx, cachedSourceImg, newW, newH, dpr);
          textureB.needsUpdate = true;
        }
      }
    };
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      geometry.dispose();
      material.dispose();
      defaultTextureA.dispose();
      textureB.dispose();
      if (videoTextureRef.current) videoTextureRef.current.dispose();
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [webGLSupported, videoRef]);

  // Update progress uniform when prop changes
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uProgress.value = progress;
    }
  }, [progress]);

  // Visibility optimization: only display canvas during transition window (progress between 0.001 and 0.999)
  const isTransitioning = progress > 0.002 && progress < 0.998;
  const opacity = isTransitioning ? 1 : progress <= 0.002 ? 0 : 0;

  // Fallback for non-WebGL
  if (!webGLSupported) {
    return (
      <div
        className={`fixed inset-0 pointer-events-none transition-opacity duration-300 ${className}`}
        style={{
          opacity: progress,
          background: 'linear-gradient(135deg, rgba(244,184,150,0.85) 0%, rgba(148,185,216,0.85) 100%)',
          mixBlendMode: 'screen',
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      id="scene-transition-webgl"
      className={`fixed inset-0 pointer-events-none select-none z-15 will-change-opacity transition-opacity duration-150 ${className}`}
      style={{
        opacity,
        visibility: progress > 0.001 && progress < 0.999 ? 'visible' : 'hidden',
      }}
      aria-hidden="true"
    />
  );
};
