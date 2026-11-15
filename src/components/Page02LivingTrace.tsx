import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Terminal, Cpu, Network, Database, Sparkles } from 'lucide-react';

interface Page02LivingTraceProps {
  progress: number; // 0.0 to 1.0 (Page 2 internal scroll progress scrubbed by ScrollTrigger)
  isVisible?: boolean; // Whether Page 02 is active in viewport
  className?: string;
  onExploreWork?: () => void;
  onStartJourney?: () => void;
  onOpenContact?: () => void;
}

export const Page02LivingTrace: React.FC<Page02LivingTraceProps> = ({
  progress,
  isVisible = true,
  className = '',
  onExploreWork: _onExploreWork,
  onStartJourney: _onStartJourney,
  onOpenContact: _onOpenContact,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Responsive state (mobile < 768px vs laptop >= 768px)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Video playback lifecycle: autoplay muted, pause if hidden or progress <= 0.005
  const [videoEnded, setVideoEnded] = useState(false);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (progress <= 0.005) {
      if (!video.paused) video.pause();
      video.currentTime = 0;
      setVideoEnded(false);
      return;
    }

    if (isVisible && progress > 0.01 && !videoEnded && video.paused) {
      video.play().catch(() => {});
    }
  }, [progress, isVisible, videoEnded]);

  // =========================================================================
  // SCROLL CHOREOGRAPHY MATH (Progress: 0.0 to 1.0)
  // Phase 1 (Ch 01 The Beginning): progress 0.00 to 0.35
  // Phase 2 (The Transformation): progress 0.35 to 0.60
  // Phase 3 (Ch 02 Beyond the Interface): progress 0.60 to 1.00
  // =========================================================================

  // Chapter 01 Visibility & Translation
  const ch01Opacity = useMemo(() => {
    if (progress <= 0.01) return 0;
    if (progress < 0.10) return (progress - 0.01) / 0.09;
    if (progress <= 0.35) return 1;
    if (progress <= 0.52) return Math.max(0, 1 - (progress - 0.35) / 0.17);
    return 0;
  }, [progress]);

  const ch01TranslateY = useMemo(() => {
    if (progress <= 0.35) return (1 - Math.min(progress / 0.12, 1)) * 24;
    return -(progress - 0.35) * 120; // Glides smoothly upward as user scrolls
  }, [progress]);

  // Portrait Transformation (Laptop: Center-right -> pushes past & recedes into midground)
  const portraitProgress = useMemo(() => {
    // 0 = Initial natural frame; 1 = fully transitioned off-camera
    return Math.min(Math.max((progress - 0.30) / 0.28, 0), 1);
  }, [progress]);

  const portraitOpacity = useMemo(() => {
    if (progress < 0.02) return 0;
    if (progress < 0.10) return (progress - 0.02) / 0.08;
    if (progress <= 0.35) return 1;
    return Math.max(0, 1 - Math.pow(portraitProgress, 1.5));
  }, [progress, portraitProgress]);

  const portraitTransform = useMemo(() => {
    if (isMobile) {
      // Mobile: subtle upward glide and dissolve
      const yOffset = portraitProgress * -60;
      const scale = 1.0 - portraitProgress * 0.08;
      return `translate3d(0, ${yOffset.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
    }
    // Laptop: Camera moves towards trace, portrait glides right and expands slightly before receding
    const xOffset = portraitProgress * 32; // Moves rightward in viewport %
    const yOffset = portraitProgress * 15;
    const scale = 1.0 + portraitProgress * 0.12;
    return `translate3d(${xOffset.toFixed(1)}vw, ${yOffset.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
  }, [isMobile, portraitProgress]);

  // Chapter 02 Visibility & Translation
  const ch02Opacity = useMemo(() => {
    if (progress < 0.45) return 0;
    if (progress < 0.65) return (progress - 0.45) / 0.20;
    return 1;
  }, [progress]);

  const ch02TranslateY = useMemo(() => {
    if (progress < 0.45) return 40;
    return Math.max(0, (1 - Math.min((progress - 0.45) / 0.25, 1)) * 40);
  }, [progress]);

  // Living Trace Morph Progress (0 = Observation spark, 1 = Subsurface System Flow)
  const traceDraw = useMemo(() => {
    return Math.min(Math.max((progress - 0.05) / 0.85, 0), 1);
  }, [progress]);

  // =========================================================================
  // LAPTOP THREE.JS SPATIAL DEPTH LAYER
  // Camera moves smoothly along depth axis into the narrative trace
  // =========================================================================
  useEffect(() => {
    if (isMobile) return;
    const container = canvasContainerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Subtle 3D spatial particles indicating the living trace in depth
    const particleCount = 60;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const opacities = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = -Math.random() * 8;
      opacities[i] = 0.2 + Math.random() * 0.5;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Custom shader material for warm coral and amber atmospheric sparks
    const particleMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uColor: { value: new THREE.Color('#E06D53') },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uProgress;
        varying float vAlpha;
        void main() {
          vec3 pos = position;
          // Float gently along depth spline
          pos.y += sin(uTime * 0.8 + pos.x) * 0.15;
          pos.z += uProgress * 2.5;
          vAlpha = smoothstep(-8.0, 0.0, pos.z) * (1.0 - smoothstep(1.0, 3.0, pos.z));
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (18.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          if (dist > 0.5) discard;
          float strength = 1.0 - (dist * 2.0);
          gl_FragColor = vec4(uColor, strength * vAlpha * 0.45);
        }
      `,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    let animId: number;
    let clock = new THREE.Clock();

    const render = () => {
      const elapsedTime = clock.getElapsedTime();
      particleMat.uniforms.uTime.value = elapsedTime;
      particleMat.uniforms.uProgress.value = progress;

      // Camera responds to scroll progress: pushes smoothly into the trace
      // X: 0.0 -> 0.6, Y: 0.0 -> -0.15, Z: 5.0 -> 3.6
      const targetCamX = (progress > 0.35 ? (progress - 0.35) * 1.2 : 0);
      const targetCamZ = 5.0 - (progress > 0.35 ? (progress - 0.35) * 2.2 : 0);
      camera.position.x += (targetCamX - camera.position.x) * 0.1;
      camera.position.z += (targetCamZ - camera.position.z) * 0.1;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!container) return;
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
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isMobile, progress]);

  return (
    <div
      ref={containerRef}
      id="page-02-living-trace-root"
      className={`relative w-full h-full min-h-screen overflow-hidden select-none bg-[#EAE2D8] ${className}`}
    >
      {/* ========================================================
          LAYER 0: ATMOSPHERIC PASTEL SKY VIDEO + DUSK DEPTH OVERLAY
          Continuous sky from Act 01, deepening gently into Chapter 02 amber
          ======================================================== */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <video
          ref={videoRef}
          src="/assets/page-02/pastel-sky.mp4"
          poster="/assets/page-02/pastel-sky-poster.jpg"
          autoPlay
          muted
          playsInline
          loop={false}
          onEnded={() => setVideoEnded(true)}
          className="w-full h-full object-cover object-center pointer-events-none scale-[1.02]"
          style={{
            filter: 'saturate(1.15) contrast(1.03) brightness(1.01)',
          }}
        />

        {/* Dynamic Chapter 02 Warm Dusk Ambient Gradient */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-700"
          style={{
            opacity: Math.min(progress * 1.4, 0.75),
            background:
              'radial-gradient(circle at 60% 40%, rgba(224, 109, 83, 0.18) 0%, rgba(58, 42, 56, 0.22) 65%, rgba(26, 20, 18, 0.35) 100%)',
          }}
        />
      </div>

      {/* ========================================================
          LAYER 1: THREE.JS SPATIAL CAMERA & PARTICLE DEPTH (Laptop Only)
          ======================================================== */}
      {!isMobile && (
        <div
          ref={canvasContainerRef}
          className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
        />
      )}

      {/* ========================================================
          LAYER 2: PROCEDURAL LIVING TRACE (SVG Vector Filament)
          Evolves from Chapter 01 Observation -> Chapter 02 Subsurface System Flow
          ======================================================== */}
      <div className="absolute inset-0 z-15 pointer-events-none">
        <svg
          className="w-full h-full"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="traceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E06D53" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#F0BE8B" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#D65538" stopOpacity="0.9" />
            </linearGradient>
            <filter id="traceGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Master Living Trace Spine */}
          <path
            d="M 120 380 C 380 420, 520 280, 740 450 C 960 620, 1180 480, 1380 520"
            stroke="url(#traceGradient)"
            strokeWidth={isMobile ? "1.5" : "2.2"}
            strokeLinecap="round"
            strokeDasharray="1600"
            strokeDashoffset={1600 * (1 - traceDraw)}
            filter="url(#traceGlow)"
            className="transition-all duration-300 ease-out"
          />

          {/* Subsurface System Branching Filaments (Illuminates in Chapter 02) */}
          {ch02Opacity > 0.1 && (
            <g
              style={{
                opacity: ch02Opacity,
                transition: 'opacity 0.4s ease-out',
              }}
            >
              {/* Branch to IPC Socket */}
              <path
                d="M 740 450 C 780 540, 840 580, 920 600"
                stroke="#E06D53"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                strokeOpacity="0.75"
              />
              {/* Branch to Syscall Gateway */}
              <path
                d="M 960 620 C 1020 680, 1090 690, 1160 670"
                stroke="#F0BE8B"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                strokeOpacity="0.75"
              />
              {/* Active Traveling Pulse Node */}
              <circle
                cx={740 + Math.sin(progress * 15) * 80}
                cy={450 + Math.cos(progress * 15) * 40}
                r="3.5"
                fill="#FFF4E6"
                filter="url(#traceGlow)"
              />
            </g>
          )}
        </svg>
      </div>

      {/* ========================================================
          LAYER 3: AUTHENTIC PHOTOGRAPHIC PORTRAIT
          Laptop: Anchored center-right in Ch 01, recedes on camera push in Ch 02
          Mobile: Positioned seamlessly in upper-mid viewport, gently dissolving
          ======================================================== */}
      <div
        id="aditya-portrait-living-anchor"
        className={`absolute z-20 pointer-events-none will-change-transform ${
          isMobile
            ? 'top-[8vh] inset-x-0 flex justify-center items-start h-[42vh]'
            : 'bottom-0 right-0 flex items-end justify-end'
        }`}
        style={{
          opacity: portraitOpacity,
          transform: portraitTransform,
          height: isMobile ? '42vh' : '90vh',
          maxHeight: isMobile ? '380px' : '92vh',
          transition: 'opacity 0.25s ease-out',
        }}
      >
        <img
          src="/assets/page-02/aditya-cutout.png"
          alt="Aditya Dugar"
          className="h-full w-auto object-contain object-bottom block select-none pointer-events-none"
          style={{
            aspectRatio: '1086 / 1448',
            filter: 'drop-shadow(0 12px 32px rgba(26, 20, 18, 0.18))',
          }}
          draggable={false}
        />
      </div>

      {/* ========================================================
          LAYER 4: CHAPTER 01 — THE BEGINNING
          Active during progress 0.00 to 0.40
          ======================================================== */}
      <div
        id="chapter-01-stage"
        className={`absolute inset-0 z-25 flex flex-col justify-center pointer-events-none ${
          isMobile ? 'px-6 pt-[44vh] pb-12 justify-start' : 'pl-12 lg:pl-20 pr-6 lg:w-[56vw]'
        }`}
        style={{
          opacity: ch01Opacity,
          transform: `translate3d(0, ${ch01TranslateY.toFixed(1)}px, 0)`,
          visibility: ch01Opacity > 0 ? 'visible' : 'hidden',
          pointerEvents: ch01Opacity > 0.6 ? 'auto' : 'none',
        }}
      >
        <div className="flex flex-col space-y-4 max-w-2xl py-6">
          {/* Chapter Metadata Eyebrow */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] uppercase text-[#D65538]">
              SEQUENCE 01 · CHAPTER 01
            </span>
            <span className="w-8 h-[1.5px] bg-[#D65538]/70 rounded-full" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-[#3D2E28]/70">
              THE BEGINNING
            </span>
          </div>

          {/* Central Display Statement */}
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-[2.65rem] font-normal tracking-tight text-[#1A1412] leading-[1.2]">
            &ldquo;I follow questions until they become something I can build.&rdquo;
          </h2>

          {/* Personal Identity Lead */}
          <div className="border-l-2 border-[#D65538] pl-4 py-1 my-1">
            <p className="font-sans text-base sm:text-lg font-medium text-[#221714] leading-relaxed">
              I&rsquo;m Aditya Dugar, a Software Engineering student at Jain University.
            </p>
          </div>

          {/* Progressive Narrative Stanzas */}
          <div className="text-sm sm:text-[15px] font-normal text-[#2A1B16] leading-[1.72] space-y-3 pt-1">
            <p>
              I find myself drawn towards things I don&rsquo;t fully understand yet &mdash; how
              intelligent systems work, what&rsquo;s happening behind an interface, how different
              technologies connect, and what becomes possible when you bring them together.
            </p>
            <p>
              That curiosity has taken me through software development, artificial intelligence,
              automation, Linux environments, and a growing interest in the systems that power
              modern technology.
            </p>
            <p>
              I enjoy learning by exploring, experimenting, making mistakes, and eventually turning
              an idea into something tangible.
            </p>
          </div>

          {/* Scroll Prompt Indicator */}
          <div className="pt-2 flex items-center gap-2 text-xs font-mono text-[#D65538]/80">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Scroll downward to trace beneath the surface</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          LAYER 5: CHAPTER 02 — BEYOND THE INTERFACE
          Active during progress 0.45 to 1.00
          Subsurface investigation environment & authentic systems telemetry
          ======================================================== */}
      <div
        id="chapter-02-stage"
        className={`absolute inset-0 z-30 flex flex-col justify-center pointer-events-none ${
          isMobile
            ? 'px-6 py-16 overflow-y-auto'
            : 'px-12 lg:px-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center'
        }`}
        style={{
          opacity: ch02Opacity,
          transform: `translate3d(0, ${ch02TranslateY.toFixed(1)}px, 0)`,
          visibility: ch02Opacity > 0 ? 'visible' : 'hidden',
          pointerEvents: ch02Opacity > 0.5 ? 'auto' : 'none',
        }}
      >
        {/* Left Column: Chapter 02 Narrative Stanzas */}
        <div className={`flex flex-col space-y-4 ${isMobile ? 'w-full' : 'lg:col-span-6'}`}>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] uppercase text-[#D65538]">
              SEQUENCE 02 · CHAPTER 02
            </span>
            <span className="w-8 h-[1.5px] bg-[#D65538]/70 rounded-full" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-[#3D2E28]/70">
              BEYOND THE INTERFACE
            </span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-[2.65rem] font-normal tracking-tight text-[#1A1412] leading-[1.2]">
            &ldquo;There&rsquo;s always more happening beneath the surface.&rdquo;
          </h2>

          <div className="text-sm sm:text-[15px] font-normal text-[#2A1B16] leading-[1.72] space-y-3 pt-1">
            <p>
              A tool can be useful. A system can be powerful. An interface can be beautiful.
              But what interests me is understanding what makes them possible.
            </p>
            <p>
              I find myself looking beyond what something does and becoming curious about how it
              actually works. What happens behind an application? How do different services
              communicate? What makes an AI model useful?
            </p>
            <p>
              Whether I&rsquo;m exploring a Linux environment, inspecting an application,
              experimenting with an AI model, or building a web experience, I enjoy going a
              little deeper than what&rsquo;s immediately visible.
            </p>
            <p className="font-medium text-[#221714]">
              For me, understanding the underlying system is just as interesting as using the
              final product.
            </p>
          </div>
        </div>

        {/* Right Column: Authentic Subsurface Systems Architecture & Telemetry Field */}
        <div className={`flex flex-col space-y-3 ${isMobile ? 'w-full pt-4' : 'lg:col-span-6'}`}>
          <div className="bg-[#FAF6F0]/90 backdrop-blur-md border border-[#E06D53]/30 rounded-xl p-5 shadow-xl text-[#2A1B16] space-y-4">
            {/* Header Badge */}
            <div className="flex items-center justify-between border-b border-[#E06D53]/20 pb-2.5">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#D65538]" />
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#D65538]">
                  System Routing Topology
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#3D2E28]/70 bg-[#E06D53]/10 px-2 py-0.5 rounded">
                Conceptual POSIX & IPC Model
              </span>
            </div>

            {/* Architecture Flow Layers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              {/* Layer 1: Application Dispatch */}
              <div className="bg-[#F3ECE0] p-3 rounded-lg border border-[#E06D53]/20 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-[#D65538] font-bold pb-1">
                  <Network className="w-3.5 h-3.5" />
                  <span>CLIENT DISPATCH</span>
                </div>
                <p className="text-[11px] text-[#2A1B16]/80 font-sans leading-tight">
                  State emission, fetch dispatch, user interaction triggers.
                </p>
                <div className="text-[10px] text-[#A84A32] font-mono pt-2">
                  PORT: 443 / TLS 1.3
                </div>
              </div>

              {/* Layer 2: Network / Socket Gateway */}
              <div className="bg-[#F3ECE0] p-3 rounded-lg border border-[#E06D53]/20 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-[#D65538] font-bold pb-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>POSIX SOCKET</span>
                </div>
                <p className="text-[11px] text-[#2A1B16]/80 font-sans leading-tight">
                  AF_INET, non-blocking I/O event loops, stream buffers.
                </p>
                <div className="text-[10px] text-[#A84A32] font-mono pt-2">
                  epoll_wait() / IPC
                </div>
              </div>

              {/* Layer 3: System Runtime / Kernel */}
              <div className="bg-[#F3ECE0] p-3 rounded-lg border border-[#E06D53]/20 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-[#D65538] font-bold pb-1">
                  <Database className="w-3.5 h-3.5" />
                  <span>KERNEL RUNTIME</span>
                </div>
                <p className="text-[11px] text-[#2A1B16]/80 font-sans leading-tight">
                  Virtual filesystem, task scheduling, memory pagination.
                </p>
                <div className="text-[10px] text-[#A84A32] font-mono pt-2">
                  SYSCALL GATEWAY
                </div>
              </div>
            </div>

            {/* Monospace System Telemetry Console */}
            <div className="bg-[#1A1412] text-[#F5DEC9] p-3.5 rounded-lg font-mono text-[11px] leading-relaxed overflow-x-auto space-y-1">
              <div className="text-[#E06D53] font-bold">// Illustrative System Investigation Stream</div>
              <div className="text-emerald-400">$ socket(AF_INET, SOCK_STREAM, 0) = 3</div>
              <div className="text-stone-400">  fcntl(3, F_SETFL, O_NONBLOCK) = 0</div>
              <div className="text-stone-400">  epoll_ctl(epfd, EPOLL_CTL_ADD, 3, &ev) = 0</div>
              <div className="text-amber-300">  connect(3, 127.0.0.1:8000) = EINPROGRESS</div>
              <div className="text-stone-400">  [IPC] unix_stream_connect: /run/user/1000/bus &rarr; OK</div>
              <div className="text-emerald-400">✓ System pipeline synchronized (zero drop)</div>
            </div>

            <div className="text-[10px] font-mono text-[#3D2E28]/60 italic">
              * Clearly labelled conceptual telemetry model demonstrating systemic communication flow.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page02LivingTrace;
