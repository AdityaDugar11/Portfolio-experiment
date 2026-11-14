import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, ArrowUp, ChevronRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface Page02StoryExperienceProps {
  onExit?: () => void;
  externalProgress?: number;
}

export const Page02StoryExperience: React.FC<Page02StoryExperienceProps> = ({
  onExit,
  externalProgress,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const runwayRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Scroll Progress State (0.0 to 1.0)
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  progressRef.current = progress;

  // Active Chapter Index: 1, 2, or 3
  const [activeChapter, setActiveChapter] = useState(1);

  // Micro-parallax mouse coordinates
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  // 1. Lenis Smooth Scrolling Setup (Only when running standalone with own runway)
  useEffect(() => {
    if (externalProgress !== undefined) {
      setProgress(externalProgress);
      return;
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
    });

    lenis.on('scroll', ScrollTrigger.update);
    const updateLenis = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    // GSAP ScrollTrigger on 520vh runway
    let st: ScrollTrigger | null = null;
    if (runwayRef.current) {
      st = ScrollTrigger.create({
        trigger: runwayRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        onUpdate: (self) => {
          const p = Math.min(Math.max(self.progress, 0), 1);
          setProgress(p);

          // Update active chapter based on progress thresholds
          if (p < 0.35) {
            setActiveChapter(1);
          } else if (p < 0.68) {
            setActiveChapter(2);
          } else {
            setActiveChapter(3);
          }
        },
      });
    }

    return () => {
      gsap.ticker.remove(updateLenis);
      st?.kill();
      lenis.destroy();
    };
  }, [externalProgress]);

  // 2. Mouse Parallax Listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth - 0.5) * 2;
      const normY = (e.clientY / window.innerHeight - 0.5) * 2;
      mouseRef.current.targetX = normX;
      mouseRef.current.targetY = normY;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // 3. Three.js Cinematic WebGL Layer
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.0);

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // --- Layer 0: Atmospheric Sky Plane ---
    const skyGeo = new THREE.PlaneGeometry(16, 10);
    let skyTexture: THREE.Texture;

    if (videoRef.current) {
      skyTexture = new THREE.VideoTexture(videoRef.current);
      skyTexture.colorSpace = THREE.SRGBColorSpace;
    } else {
      skyTexture = new THREE.TextureLoader().load('/assets/page-02/pastel-sky-poster.jpg');
      skyTexture.colorSpace = THREE.SRGBColorSpace;
    }

    const skyUniforms = {
      uTexture: { value: skyTexture },
      uProgress: { value: 0 },
      uTime: { value: 0 },
    };

    const skyMat = new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uProgress;
        uniform float uTime;
        varying vec2 vUv;

        void main() {
          vec4 baseColor = texture2D(uTexture, vUv);
          vec3 col = baseColor.rgb;

          // Chapter 01 (0.0 to 0.35): Pristine sunset peach/sky blue
          // Chapter 02 (0.35 to 0.68): Deepens into dusk twilight with warm amber undertones
          float ch2Transition = smoothstep(0.30, 0.55, uProgress) * (1.0 - smoothstep(0.68, 0.85, uProgress));
          vec3 ch2Tint = col * vec3(0.92, 0.84, 0.96) + vec3(0.08, 0.04, 0.06);
          col = mix(col, ch2Tint, ch2Transition * 0.75);

          // Chapter 03 (0.68 to 1.0): Atmospheric indigo & dawn coral depth
          float ch3Transition = smoothstep(0.65, 0.88, uProgress);
          vec3 ch3Tint = col * vec3(0.82, 0.78, 0.90) + vec3(0.09, 0.05, 0.08);
          col = mix(col, ch3Tint, ch3Transition * 0.85);

          // Subtle organic atmospheric vignette
          float dist = distance(vUv, vec2(0.5, 0.5));
          col *= 1.0 - dist * 0.18;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthWrite: false,
    });

    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    skyMesh.position.set(0, 0, -6.5);
    scene.add(skyMesh);

    // --- Layer 1: Authentic Portrait Plane ---
    const portraitGeo = new THREE.PlaneGeometry(3.15, 4.2); // 1086x1448 aspect ratio ~ 0.75
    const portraitTexture = new THREE.TextureLoader().load('/assets/page-02/aditya-cutout.png');
    portraitTexture.colorSpace = THREE.SRGBColorSpace;
    portraitTexture.minFilter = THREE.LinearFilter;
    portraitTexture.magFilter = THREE.LinearFilter;

    const portraitMat = new THREE.MeshBasicMaterial({
      map: portraitTexture,
      transparent: true,
      depthWrite: false,
    });

    const portraitMesh = new THREE.Mesh(portraitGeo, portraitMat);
    portraitMesh.position.set(1.9, -0.4, -1.8);
    scene.add(portraitMesh);

    // --- Layer 2: Chapter 02 Translucent Architectural Monoliths (Separating Layers) ---
    const archGroup = new THREE.Group();
    scene.add(archGroup);

    // 3 layered architectural panes that physically separate on scroll
    const panelConfigs = [
      { w: 3.2, h: 4.8, z: -2.2, basePos: new THREE.Vector3(-1.8, 0.1, -2.2), sepOffset: new THREE.Vector3(-0.9, 0.1, -0.6) },
      { w: 3.8, h: 5.2, z: -3.0, basePos: new THREE.Vector3(0.0, 0.0, -3.0), sepOffset: new THREE.Vector3(0.0, -0.2, -1.2) },
      { w: 3.4, h: 4.9, z: -2.6, basePos: new THREE.Vector3(1.8, -0.1, -2.6), sepOffset: new THREE.Vector3(0.8, 0.1, -0.8) },
    ];

    const panels: {
      mesh: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      edges: THREE.LineSegments;
      edgeMat: THREE.LineBasicMaterial;
      config: typeof panelConfigs[0];
    }[] = [];

    panelConfigs.forEach((cfg) => {
      const pGeo = new THREE.PlaneGeometry(cfg.w, cfg.h);
      const pMat = new THREE.MeshBasicMaterial({
        color: 0xF4D8C8,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.copy(cfg.basePos);
      archGroup.add(pMesh);

      // Subtle warm terracotta edges
      const eGeo = new THREE.EdgesGeometry(pGeo);
      const eMat = new THREE.LineBasicMaterial({
        color: 0xD65538,
        transparent: true,
        opacity: 0,
        linewidth: 1.5,
      });
      const edges = new THREE.LineSegments(eGeo, eMat);
      pMesh.add(edges);

      panels.push({ mesh: pMesh, mat: pMat, edges, edgeMat: eMat, config: cfg });
    });

    // 3D Haveli-inspired Structural Lattice (Internal logic revealed beneath surface)
    const latticeGeo = new THREE.BufferGeometry();
    const latticePoints: number[] = [];
    for (let i = -4; i <= 4; i += 0.8) {
      latticePoints.push(i, -2.5, -3.5, i, 2.5, -3.5);
    }
    for (let j = -2.5; j <= 2.5; j += 0.8) {
      latticePoints.push(-4, j, -3.5, 4, j, -3.5);
    }
    latticeGeo.setAttribute('position', new THREE.Float32BufferAttribute(latticePoints, 3));
    const latticeMat = new THREE.LineBasicMaterial({
      color: 0xE06D53,
      transparent: true,
      opacity: 0,
    });
    const latticeLines = new THREE.LineSegments(latticeGeo, latticeMat);
    archGroup.add(latticeLines);

    // --- Layer 3: Chapter 03 Learning Conduits & Nexus ---
    const learningGroup = new THREE.Group();
    scene.add(learningGroup);

    // 3 Catmull-Rom spline curves representing trial, error, investigation, and convergence
    const splinePaths = [
      // Path 1 (Trial / Exploration): loops through left depth and converges
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2.2, -1.5, -4.0),
        new THREE.Vector3(-2.8, 0.4, -2.8),
        new THREE.Vector3(-1.6, 1.2, -1.8),
        new THREE.Vector3(0.0, 0.1, -1.2),
      ]),
      // Path 2 (Debugging / Investigation): loops through right depth and converges
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(2.2, -1.8, -4.2),
        new THREE.Vector3(2.6, 0.6, -2.6),
        new THREE.Vector3(1.4, 1.1, -1.6),
        new THREE.Vector3(0.0, 0.1, -1.2),
      ]),
      // Path 3 (Synthesis / Application): forward trajectory toward reader
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.0, 0.1, -1.2),
        new THREE.Vector3(0.1, -0.2, 0.0),
        new THREE.Vector3(0.0, -0.6, 1.4),
      ]),
    ];

    const splineLines: { line: THREE.Line; mat: THREE.LineBasicMaterial; totalPoints: number }[] = [];

    splinePaths.forEach((path) => {
      const pts = path.getPoints(80);
      const sGeo = new THREE.BufferGeometry().setFromPoints(pts);
      // Allocate draw range for scroll-driven animated growth
      sGeo.setDrawRange(0, 0);
      const sMat = new THREE.LineBasicMaterial({
        color: 0xD65538,
        transparent: true,
        opacity: 0.85,
        linewidth: 2,
      });
      const line = new THREE.Line(sGeo, sMat);
      learningGroup.add(line);
      splineLines.push({ line, mat: sMat, totalPoints: pts.length });
    });

    // Luminous Nexus Sprite at convergence point (0, 0.1, -1.2)
    const nexusCanvas = document.createElement('canvas');
    nexusCanvas.width = 128;
    nexusCanvas.height = 128;
    const nCtx = nexusCanvas.getContext('2d');
    if (nCtx) {
      const grad = nCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(235, 120, 85, 1.0)');
      grad.addColorStop(0.3, 'rgba(235, 120, 85, 0.6)');
      grad.addColorStop(0.7, 'rgba(235, 120, 85, 0.15)');
      grad.addColorStop(1, 'rgba(235, 120, 85, 0.0)');
      nCtx.fillStyle = grad;
      nCtx.fillRect(0, 0, 128, 128);
    }
    const nexusTexture = new THREE.CanvasTexture(nexusCanvas);
    const nexusMat = new THREE.SpriteMaterial({
      map: nexusTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const nexusSprite = new THREE.Sprite(nexusMat);
    nexusSprite.position.set(0.0, 0.1, -1.2);
    nexusSprite.scale.set(0.9, 0.9, 0.9);
    learningGroup.add(nexusSprite);

    // --- Render Loop with Camera & Scene Choreography ---
    let animId: number;
    const clock = new THREE.Clock();

    const render = () => {
      const p = progressRef.current;
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse lerp
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      // Update Sky Uniforms
      skyUniforms.uProgress.value = p;
      skyUniforms.uTime.value = elapsedTime;

      // 1. CAMERA CHOREOGRAPHY
      // Ch 01 (0.0 to 0.35): Camera starts at (0, 0, 5.0) and pushes in smoothly
      // Ch 02 (0.35 to 0.68): Camera glides left/downward to track through separating layers
      // Ch 03 (0.68 to 1.0): Camera advances forward into converging learning conduit
      let camTargetX = 0;
      let camTargetY = 0;
      let camTargetZ = 5.0;
      let lookTargetX = 0;
      let lookTargetY = 0;

      if (p <= 0.35) {
        const normP = p / 0.35;
        camTargetX = normP * 0.25;
        camTargetY = -normP * 0.12;
        camTargetZ = 5.0 - normP * 0.5;
        lookTargetX = normP * 0.2;
      } else if (p <= 0.68) {
        const normP = (p - 0.35) / 0.33;
        camTargetX = 0.25 - normP * 0.65; // glides left
        camTargetY = -0.12 + normP * 0.28;
        camTargetZ = 4.5 - normP * 0.8; // pushes through layers
        lookTargetX = 0.2 - normP * 0.4;
      } else {
        const normP = (p - 0.68) / 0.32;
        camTargetX = -0.4 + normP * 0.4; // centers forward
        camTargetY = 0.16 - normP * 0.22;
        camTargetZ = 3.7 - normP * 0.7; // advances into nexus
        lookTargetX = -0.2 + normP * 0.2;
      }

      // Add restrained pointer parallax
      camera.position.x = camTargetX + mouse.x * 0.12;
      camera.position.y = camTargetY - mouse.y * 0.08;
      camera.position.z = camTargetZ;
      camera.lookAt(lookTargetX + mouse.x * 0.05, lookTargetY - mouse.y * 0.04, -2.0);

      // 2. PORTRAIT CHOREOGRAPHY
      if (p <= 0.35) {
        // Ch 01: Fade in portrait smoothly and hold commanding position
        const enterAlpha = Math.min(p / 0.10, 1.0);
        portraitMat.opacity = enterAlpha;
        portraitMesh.position.set(1.9 - p * 0.3, -0.4 - p * 0.2, -1.8 - p * 0.4);
      } else if (p <= 0.68) {
        // Ch 02: Portrait recedes into architectural midground
        const normP = (p - 0.35) / 0.33;
        portraitMat.opacity = 1.0 - normP * 0.55; // recedes to 0.45 opacity
        portraitMesh.position.set(1.79 + normP * 0.6, -0.47 - normP * 0.3, -1.94 - normP * 1.2);
      } else {
        // Ch 03: Anchored in deep midground
        portraitMat.opacity = 0.35;
        portraitMesh.position.set(2.4, -0.77, -3.14);
      }

      // 3. CHAPTER 02 LAYERED ARCHITECTURAL SEPARATION
      const ch2Weight = smoothstep(0.32, 0.48, p) * (1.0 - smoothstep(0.68, 0.82, p));
      panels.forEach((pItem) => {
        const cfg = pItem.config;
        pItem.mat.opacity = ch2Weight * 0.22;
        pItem.edgeMat.opacity = ch2Weight * 0.65;
        // Physical layer separation along Z and X axes
        pItem.mesh.position.x = cfg.basePos.x + cfg.sepOffset.x * ch2Weight;
        pItem.mesh.position.y = cfg.basePos.y + cfg.sepOffset.y * ch2Weight;
        pItem.mesh.position.z = cfg.basePos.z + cfg.sepOffset.z * ch2Weight;
      });
      latticeMat.opacity = ch2Weight * 0.35;

      // 4. CHAPTER 03 LEARNING CONDUITS PROGRESSION
      const ch3Weight = smoothstep(0.66, 0.82, p);
      splineLines.forEach((sItem, idx) => {
        sItem.mat.opacity = ch3Weight * 0.9;
        // Staggered draw of paths 1, 2, and 3
        const pathThreshold = 0.68 + idx * 0.08;
        const drawFraction = Math.min(Math.max((p - pathThreshold) / 0.12, 0), 1.0);
        const count = Math.round(sItem.totalPoints * drawFraction);
        sItem.line.geometry.setDrawRange(0, count);
      });
      // Luminous Nexus flare lights up as paths converge
      const nexusAlpha = smoothstep(0.82, 0.94, p);
      nexusMat.opacity = nexusAlpha * 0.95;
      nexusSprite.scale.set(0.9 + Math.sin(elapsedTime * 3) * 0.08, 0.9 + Math.sin(elapsedTime * 3) * 0.08, 1);

      renderer.render(scene, camera);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    // Responsive Resize Handler
    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      skyGeo.dispose();
      skyMat.dispose();
      portraitGeo.dispose();
      portraitMat.dispose();
      panels.forEach((p) => {
        p.mesh.geometry.dispose();
        p.mat.dispose();
        p.edges.geometry.dispose();
        p.edgeMat.dispose();
      });
      latticeGeo.dispose();
      latticeMat.dispose();
      splineLines.forEach((s) => {
        s.line.geometry.dispose();
        s.mat.dispose();
      });
      nexusTexture.dispose();
      nexusMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="page-02-story-experience-root"
      className="relative w-full bg-[#181210] text-[#1A1412] select-none"
    >
      {/* Hidden background video source for Three.js VideoTexture */}
      <video
        ref={videoRef}
        src="/assets/page-02/pastel-sky.mp4"
        poster="/assets/page-02/pastel-sky-poster.jpg"
        autoPlay
        muted
        playsInline
        loop
        className="hidden"
      />

      {/* ========================================================
          STICKY 3D WEBGL VIEWPORT (Always fixed 100vh during story scroll)
          Renders the animated camera, sky, portrait, separating monoliths,
          and learning nexus lines.
          ======================================================== */}
      <div
        id="story-webgl-viewport"
        className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      >
        <div ref={canvasContainerRef} className="w-full h-full" />
      </div>

      {/* ========================================================
          FLOATING PERSISTENT STORY HUD & CHAPTER INDICATOR
          Tracks Sequence, Chapter progress, and reverse navigation
          ======================================================== */}
      <div className="fixed top-6 left-6 right-6 z-40 flex items-center justify-between pointer-events-none">
        {/* Left: Active Chapter Breadcrumb */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#FAF7F2]/80 backdrop-blur-md border border-[#1A1412]/10 shadow-sm pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-[#D65538] animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider text-[#1A1412] uppercase">
            {activeChapter === 1 && 'Seq 01 · Ch 01: The Beginning'}
            {activeChapter === 2 && 'Seq 02 · Ch 02: Beyond the Interface'}
            {activeChapter === 3 && 'Seq 02 · Ch 03: The Learning Curve'}
          </span>
          <span className="text-xs font-mono text-[#3D2E28]/40">|</span>
          <span className="text-xs font-mono text-[#3D2E28]/70">
            {activeChapter.toString().padStart(2, '0')} / 10
          </span>
        </div>

        {/* Right: Exit Button (if standalone preview) */}
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className="px-4 py-2 rounded-full bg-[#FAF7F2]/80 hover:bg-[#FAF7F2] backdrop-blur-md border border-[#1A1412]/15 text-xs font-mono text-[#1A1412] transition-colors shadow-sm cursor-pointer pointer-events-auto flex items-center gap-2"
          >
            <span>Exit Story</span>
            <span className="text-xs">✕</span>
          </button>
        )}
      </div>

      {/* ========================================================
          PROGRESSIVE EDITORIAL TYPOGRAPHY BEATS (DOM LAYER)
          Instead of one large text block, content unfolds in 7 distinct,
          readably-paced cinematic beats as the visitor scrolls.
          ======================================================== */}
      <div
        id="story-typography-stage"
        className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-center px-8 sm:px-14 md:px-20 lg:px-28 max-w-6xl"
      >
        {/* ==================== CHAPTER 01 BEATS ==================== */}

        {/* Beat 1.1: Chapter 01 Display Statement (Progress 0.02 to 0.16) */}
        <div
          className="transition-all duration-500 max-w-2xl"
          style={{
            opacity: getBeatOpacity(progress, 0.02, 0.14),
            transform: `translate3d(0, ${getBeatTranslate(progress, 0.02, 0.14)}px, 0)`,
            display: isBeatActive(progress, 0.00, 0.16) ? 'block' : 'none',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] uppercase text-[#D65538]">
              SEQUENCE 01 · CHAPTER 01
            </span>
            <span className="w-8 h-[1.5px] bg-[#D65538]/70 rounded-full" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-[#3D2E28]/70">
              THE BEGINNING
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[#1A1412] leading-[1.15]">
            &ldquo;I follow questions until they become something I can build.&rdquo;
          </h1>
          <div className="border-l-2 border-[#D65538] pl-4 py-1 mt-6">
            <p className="font-sans text-base sm:text-lg font-medium text-[#221714] leading-relaxed">
              I&rsquo;m Aditya Dugar, a Software Engineering student at Jain University.
            </p>
          </div>
        </div>

        {/* Beat 1.2: Curiosity Across Disciplines (Progress 0.16 to 0.26) */}
        <div
          className="transition-all duration-500 max-w-2xl"
          style={{
            opacity: getBeatOpacity(progress, 0.16, 0.26),
            transform: `translate3d(0, ${getBeatTranslate(progress, 0.16, 0.26)}px, 0)`,
            display: isBeatActive(progress, 0.15, 0.28) ? 'block' : 'none',
          }}
        >
          <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#D65538] block mb-3">
            01 / CURIOSITY
          </span>
          <p className="font-sans text-lg sm:text-xl font-normal text-[#1A1412] leading-relaxed">
            I find myself drawn towards things I don&rsquo;t fully understand yet &mdash; how
            intelligent systems work, what&rsquo;s happening behind an interface, how different
            technologies connect, and what becomes possible when you bring them together.
          </p>
        </div>

        {/* Beat 1.3: Exploration & Finding Tangible Form (Progress 0.26 to 0.36) */}
        <div
          className="transition-all duration-500 max-w-2xl"
          style={{
            opacity: getBeatOpacity(progress, 0.26, 0.36),
            transform: `translate3d(0, ${getBeatTranslate(progress, 0.26, 0.36)}px, 0)`,
            display: isBeatActive(progress, 0.25, 0.38) ? 'block' : 'none',
          }}
        >
          <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#D65538] block mb-3">
            01 / EXPLORATION
          </span>
          <p className="font-sans text-base sm:text-lg text-[#2A1B16] leading-relaxed mb-4">
            That curiosity has taken me through software development, artificial intelligence,
            automation, Linux environments, and a growing interest in the systems that power
            modern technology.
          </p>
          <p className="font-sans text-base sm:text-lg text-[#2A1B16] leading-relaxed mb-4">
            I enjoy learning by exploring, experimenting, making mistakes, and eventually turning
            an idea into something tangible.
          </p>
          <p className="font-serif italic text-lg sm:text-xl text-[#1A1412] font-normal">
            &ldquo;I&rsquo;m interested in discovering where technology, engineering and creativity meet.&rdquo;
          </p>
        </div>

        {/* ==================== CHAPTER 02 BEATS ==================== */}

        {/* Beat 2.1: Chapter 02 Display Statement (Progress 0.38 to 0.52) */}
        <div
          className="transition-all duration-500 max-w-2xl"
          style={{
            opacity: getBeatOpacity(progress, 0.38, 0.50),
            transform: `translate3d(0, ${getBeatTranslate(progress, 0.38, 0.50)}px, 0)`,
            display: isBeatActive(progress, 0.36, 0.53) ? 'block' : 'none',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] uppercase text-[#D65538]">
              SEQUENCE 02 · CHAPTER 02
            </span>
            <span className="w-8 h-[1.5px] bg-[#D65538]/70 rounded-full" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-[#3D2E28]/70">
              BEYOND THE INTERFACE
            </span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[#1A1412] leading-[1.18]">
            &ldquo;There&rsquo;s always more happening beneath the surface.&rdquo;
          </h2>
          <div className="border-l-2 border-[#D65538] pl-4 py-1 mt-6">
            <p className="font-sans text-base sm:text-lg text-[#2A1B16] leading-relaxed">
              A tool can be useful. A system can be powerful. An interface can be beautiful.
              <br />
              <strong className="text-[#1A1412]">But what interests me is understanding what makes them possible.</strong>
            </p>
          </div>
        </div>

        {/* Beat 2.2: The Questions That Drive Me (Progress 0.52 to 0.66) */}
        <div
          className="transition-all duration-500 max-w-2xl"
          style={{
            opacity: getBeatOpacity(progress, 0.52, 0.65),
            transform: `translate3d(0, ${getBeatTranslate(progress, 0.52, 0.65)}px, 0)`,
            display: isBeatActive(progress, 0.50, 0.67) ? 'block' : 'none',
          }}
        >
          <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#D65538] block mb-3">
            02 / UNDERLYING SYSTEMS
          </span>
          <p className="font-sans text-base sm:text-lg text-[#2A1B16] leading-relaxed mb-4">
            What happens behind an application? How do different services communicate? What makes an AI model useful? What happens when you start exploring an operating system beyond its default boundaries?
          </p>
          <p className="font-sans text-base sm:text-lg text-[#2A1B16] leading-relaxed mb-4">
            Whether I&rsquo;m exploring a Linux environment, inspecting an application, or building a web experience, I enjoy going a little deeper than what&rsquo;s immediately visible.
          </p>
          <p className="font-serif italic text-base sm:text-lg text-[#1A1412]">
            For me, understanding the underlying system is just as interesting as using the final product.
          </p>
        </div>

        {/* ==================== CHAPTER 03 BEATS ==================== */}

        {/* Beat 3.1: Chapter 03 Display Statement (Progress 0.68 to 0.82) */}
        <div
          className="transition-all duration-500 max-w-2xl"
          style={{
            opacity: getBeatOpacity(progress, 0.68, 0.80),
            transform: `translate3d(0, ${getBeatTranslate(progress, 0.68, 0.80)}px, 0)`,
            display: isBeatActive(progress, 0.67, 0.83) ? 'block' : 'none',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] uppercase text-[#D65538]">
              SEQUENCE 02 · CHAPTER 03
            </span>
            <span className="w-8 h-[1.5px] bg-[#D65538]/70 rounded-full" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-[#3D2E28]/70">
              THE LEARNING CURVE
            </span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[#1A1412] leading-[1.18]">
            &ldquo;I learn best when there&rsquo;s something I want to figure out.&rdquo;
          </h2>
          <div className="border-l-2 border-[#D65538] pl-4 py-1 mt-6">
            <p className="font-sans text-base sm:text-lg text-[#2A1B16] leading-relaxed">
              My journey into Software Engineering hasn&rsquo;t been a perfectly structured sequence of technologies.
              It&rsquo;s been fundamentals, curiosity-driven experiments, practical projects, and plenty of debugging.
            </p>
          </div>
        </div>

        {/* Beat 3.2: Independent Understanding & Application (Progress 0.82 to 0.98) */}
        <div
          className="transition-all duration-500 max-w-2xl"
          style={{
            opacity: getBeatOpacity(progress, 0.82, 0.96),
            transform: `translate3d(0, ${getBeatTranslate(progress, 0.82, 0.96)}px, 0)`,
            display: isBeatActive(progress, 0.81, 1.00) ? 'block' : 'none',
          }}
        >
          <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#D65538] block mb-3">
            03 / INDEPENDENT UNDERSTANDING
          </span>
          <p className="font-sans text-base sm:text-lg text-[#2A1B16] leading-relaxed mb-4">
            I believe learning becomes more meaningful when you move beyond copying solutions and begin making decisions independently.
          </p>
          <p className="font-sans text-sm sm:text-base text-[#2A1B16] leading-relaxed mb-5">
            That means understanding why something works, recognizing why it breaks, researching alternatives, and having the patience to try again. I&rsquo;m still strengthening my fundamentals and expanding my capabilities.
          </p>
          <div className="p-4 rounded-xl bg-[#FAF7F2]/80 backdrop-blur-md border border-[#1A1412]/10 shadow-sm">
            <p className="font-serif italic text-base sm:text-lg text-[#1A1412] leading-snug">
              &ldquo;Learning something is only the beginning. Applying it is where the real understanding develops.&rdquo;
            </p>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#1A1412]/10 text-xs font-mono text-[#D65538]">
              <span>Sequence 02 Continued in Milestone 2</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          BOTTOM CINEMATIC SCROLL INDICATOR
          Guides the user forward or signals reverse unwinding
          ======================================================== */}
      <div className="fixed bottom-6 left-8 sm:left-14 md:left-20 lg:left-28 z-30 pointer-events-none flex items-center gap-6 text-xs font-mono tracking-widest text-[#3D2E28]/70 uppercase">
        <div className="flex items-center gap-2">
          {progress < 0.95 ? (
            <>
              <ArrowDown className="w-3.5 h-3.5 animate-bounce text-[#D65538]" />
              <span>Scroll to navigate narrative</span>
            </>
          ) : (
            <>
              <ArrowUp className="w-3.5 h-3.5 text-[#D65538]" />
              <span>Reverse scroll to rewind</span>
            </>
          )}
        </div>
        <div className="w-32 h-[2px] bg-[#1A1412]/15 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#D65538] to-[#E8C8A0] transition-all duration-150"
            style={{ width: `${(progress * 100).toFixed(1)}%` }}
          />
        </div>
      </div>

      {/* ========================================================
          VIRTUAL SCROLL RUNWAY (520vh)
          Provides natural unhurried physical scroll distance
          ======================================================== */}
      {externalProgress === undefined && (
        <div
          ref={runwayRef}
          id="page-02-story-runway"
          className="relative w-full h-[520vh] pointer-events-none"
          aria-hidden="true"
        />
      )}
    </div>
  );
};

// --- Helper Functions for Cinematic Beat Opacity & Translation ---

function isBeatActive(progress: number, start: number, end: number): boolean {
  return progress >= start - 0.04 && progress <= end + 0.04;
}

function getBeatOpacity(progress: number, start: number, end: number): number {
  const fadeInWindow = 0.035;
  const fadeOutWindow = 0.035;

  if (progress < start) {
    if (progress >= start - fadeInWindow) {
      return (progress - (start - fadeInWindow)) / fadeInWindow;
    }
    return 0;
  }
  if (progress <= end - fadeOutWindow) {
    return 1;
  }
  if (progress <= end) {
    return 1 - (progress - (end - fadeOutWindow)) / fadeOutWindow;
  }
  return 0;
}

function getBeatTranslate(progress: number, start: number, end: number): number {
  const fadeInWindow = 0.035;
  const fadeOutWindow = 0.035;

  if (progress < start) {
    const fraction = Math.max(0, (progress - (start - fadeInWindow)) / fadeInWindow);
    return (1 - fraction) * 20; // translates up from +20px
  }
  if (progress > end - fadeOutWindow) {
    const fraction = Math.min(1, (progress - (end - fadeOutWindow)) / fadeOutWindow);
    return -fraction * 20; // translates up to -20px on exit
  }
  return 0;
}

function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

export default Page02StoryExperience;
