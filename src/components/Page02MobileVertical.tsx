import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CHAPTERS_DATA, ChapterItem } from '../data/chaptersData';
import { ArrowUp, Mail, ExternalLink, X, Compass, ChevronDown } from 'lucide-react';

interface Page02MobileVerticalProps {
  progress: number; // 0.0 to 1.0 (Page 2 internal scroll progress scrubbed by ScrollTrigger)
  className?: string;
  onExploreWork?: () => void;
  onStartJourney?: () => void;
  onOpenContact?: () => void;
}

const TOTAL_FRAMES = 240;
const FRAME_WIDTH = 1280;
const FRAME_HEIGHT = 720;

const getFrameUrl = (index: number): string => {
  const frameNum = Math.min(Math.max(index + 1, 1), TOTAL_FRAMES);
  const padded = String(frameNum).padStart(4, '0');
  return `/frames/page-02/frame_${padded}.webp`;
};

// Smooth cubic easing helper
const smoothstep = (min: number, max: number, value: number): number => {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
};

export const Page02MobileVertical: React.FC<Page02MobileVerticalProps> = ({
  progress,
  className = '',
  onExploreWork,
  onStartJourney,
  onOpenContact,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const loadingSetRef = useRef<Set<number>>(new Set());
  const lastDrawnFrameRef = useRef<number>(-1);
  const animFrameRef = useRef<number | null>(null);

  // Selected Chapter Modal / Compact Card Preview State
  const [selectedChapter, setSelectedChapter] = useState<ChapterItem | null>(null);

  // Viewport dimensions state
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 390,
    height: typeof window !== 'undefined' ? window.innerHeight : 844,
  });

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. Sliding Window Preloading for the 240 WebP Frames
  const preloadFrame = useCallback((index: number): Promise<HTMLImageElement> => {
    const clamped = Math.min(Math.max(index, 0), TOTAL_FRAMES - 1);
    const cache = imageCacheRef.current;

    if (cache.has(clamped)) {
      const cached = cache.get(clamped)!;
      if (cached.complete && cached.naturalWidth > 0) {
        return Promise.resolve(cached);
      }
    }

    if (loadingSetRef.current.has(clamped)) {
      return new Promise((resolve) => {
        const check = () => {
          if (cache.has(clamped) && cache.get(clamped)!.complete) {
            resolve(cache.get(clamped)!);
          } else {
            setTimeout(check, 16);
          }
        };
        check();
      });
    }

    loadingSetRef.current.add(clamped);

    return new Promise((resolve) => {
      const img = new Image();
      img.src = getFrameUrl(clamped);
      img.onload = () => {
        if ('decode' in img && typeof img.decode === 'function') {
          img
            .decode()
            .catch(() => {})
            .finally(() => {
              cache.set(clamped, img);
              loadingSetRef.current.delete(clamped);
              resolve(img);
            });
        } else {
          cache.set(clamped, img);
          loadingSetRef.current.delete(clamped);
          resolve(img);
        }
      };
      img.onerror = () => {
        loadingSetRef.current.delete(clamped);
        resolve(img);
      };
    });
  }, []);

  const triggerSlidingPreload = useCallback(
    (centerIndex: number) => {
      const PRELOAD_AHEAD = 24;
      const PRELOAD_BEHIND = 10;
      const start = Math.max(0, centerIndex - PRELOAD_BEHIND);
      const end = Math.min(TOTAL_FRAMES - 1, centerIndex + PRELOAD_AHEAD);

      for (let i = start; i <= end; i++) {
        if (!imageCacheRef.current.has(i) && !loadingSetRef.current.has(i)) {
          preloadFrame(i);
        }
      }

      // Memory management: retain up to 70 frames to prevent heap pressure on low-end mobile devices
      const cache = imageCacheRef.current;
      if (cache.size > 70) {
        for (const key of cache.keys()) {
          if (Math.abs(key - centerIndex) > 35 && key !== 0 && key !== TOTAL_FRAMES - 1) {
            cache.delete(key);
          }
        }
      }
    },
    [preloadFrame]
  );

  // Initial Preload: Frame 0 + Frame 239 + first 20 frames for instant responsiveness
  useEffect(() => {
    let isMounted = true;
    Promise.all([preloadFrame(0), preloadFrame(TOTAL_FRAMES - 1)]).then(() => {
      if (isMounted) {
        for (let i = 1; i <= 20; i++) {
          preloadFrame(i);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [preloadFrame]);

  // Compute deterministic target frame index: Math.round(progress * 239)
  const targetFrame = useMemo(() => {
    const clamped = Math.min(Math.max(progress, 0), 1);
    return Math.min(Math.max(Math.round(clamped * (TOTAL_FRAMES - 1)), 0), TOTAL_FRAMES - 1);
  }, [progress]);

  useEffect(() => {
    triggerSlidingPreload(targetFrame);
  }, [targetFrame, triggerSlidingPreload]);

  // ========================================================
  // VERTICAL CINEMATIC STAGE CHOREOGRAPHY
  // Stage 1 (0.00 - 0.20): Aditya introduction (centered hero, face & upper body clearly visible)
  // Stage 2 (0.20 - 0.38): 3 orbital rings ignite and circulate around Aditya in center
  // Stage 3 (0.38 - 0.88): Aditya smoothly docks to top ~28% as vertical camera moves down
  // Stage 4 (0.88 - 1.00): Complete discovery state, all 10 chapters connected
  // ========================================================

  // Docking progress: 0.0 (centered in viewport) -> 1.0 (docked in upper ~28% of screen)
  const dockProgress = smoothstep(0.24, 0.44, progress);

  // Render video frame onto canvas
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const windowW = window.innerWidth;
    const windowH = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.0);

    const targetW = Math.round(windowW * dpr);
    const targetH = Math.round(windowH * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    // Try target frame, fallback to nearest available cached frame
    let frameImg = imageCacheRef.current.get(targetFrame);
    if (!frameImg || !frameImg.complete || frameImg.naturalWidth === 0) {
      for (let offset = 1; offset <= 30; offset++) {
        const lower = targetFrame - offset;
        const higher = targetFrame + offset;
        if (lower >= 0 && imageCacheRef.current.has(lower) && imageCacheRef.current.get(lower)!.complete) {
          frameImg = imageCacheRef.current.get(lower);
          break;
        }
        if (higher < TOTAL_FRAMES && imageCacheRef.current.has(higher) && imageCacheRef.current.get(higher)!.complete) {
          frameImg = imageCacheRef.current.get(higher);
          break;
        }
      }
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Atmospheric sky & sunset background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, windowH);
    bgGrad.addColorStop(0, '#7A96B2'); // Soft sky-blue
    bgGrad.addColorStop(0.26, '#E8A588'); // Soft warm peach
    bgGrad.addColorStop(0.52, '#F4B896'); // Sunset peach
    bgGrad.addColorStop(0.78, '#D48870'); // Warm terracotta
    bgGrad.addColorStop(1, '#181210'); // Dark sandstone
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, windowW, windowH);

    if (frameImg && frameImg.complete && frameImg.naturalWidth > 0) {
      // 2. Enlarged ambient blurred frame for seamless outer extensions
      const ambientScale = Math.max(windowW / FRAME_WIDTH, windowH / FRAME_HEIGHT) * 1.15;
      const ambW = FRAME_WIDTH * ambientScale;
      const ambH = FRAME_HEIGHT * ambientScale;
      const ambX = (windowW - ambW) / 2;
      const ambY = (windowH - ambH) / 2;

      ctx.save();
      ctx.filter = 'blur(28px) brightness(0.85)';
      ctx.drawImage(frameImg, ambX, ambY, ambW, ambH);
      ctx.restore();

      // 3. Sharp Foreground Character & Orbital Rings
      // When dockProgress = 0: Aditya is centered vertically in viewport (camX = 640)
      // When dockProgress = 1: Aditya smoothly docks into top ~28% of viewport
      const baseScale = windowH / FRAME_HEIGHT;
      // Slightly adjust scale during docking so rings and head frame majestically at top
      const currentScale = baseScale * (1.0 - dockProgress * 0.12);
      const drawW = Math.round(FRAME_WIDTH * currentScale);
      const drawH = Math.round(FRAME_HEIGHT * currentScale);
      // Strictly horizontal center: camX is ALWAYS 640 (zero horizontal camera panning)
      const drawX = Math.round(windowW / 2 - 640 * currentScale);

      // Vertical translation: starts at 0, smoothly glides upward as scroll descends
      const initialDrawY = 0;
      const dockedDrawY = Math.round(-windowH * 0.28);
      const drawY = Math.round(initialDrawY + (dockedDrawY - initialDrawY) * dockProgress);

      ctx.drawImage(frameImg, drawX, drawY, drawW, drawH);

      // 4. Soft atmospheric fade mask over lower portion of docked stage
      // Blends the character canvas smoothly into the vertical scrollytelling card stage below
      if (dockProgress > 0.05) {
        const maskTop = windowH * (0.24 - dockProgress * 0.04);
        const maskHeight = windowH * 0.18;
        const fadeGrad = ctx.createLinearGradient(0, maskTop, 0, maskTop + maskHeight);
        fadeGrad.addColorStop(0, 'rgba(24, 18, 16, 0)');
        fadeGrad.addColorStop(0.65, `rgba(24, 18, 16, ${0.75 * dockProgress})`);
        fadeGrad.addColorStop(1, `rgba(24, 18, 16, ${0.95 * dockProgress})`);
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(0, maskTop, windowW, windowH - maskTop);
      }

      // 5. Subtle ambient vignette
      const vignette = ctx.createRadialGradient(
        windowW / 2,
        windowH / 2,
        windowW * 0.35,
        windowW / 2,
        windowH / 2,
        windowH * 0.75
      );
      vignette.addColorStop(0, 'rgba(24, 18, 16, 0)');
      vignette.addColorStop(1, 'rgba(24, 18, 16, 0.38)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, windowW, windowH);

      lastDrawnFrameRef.current = targetFrame;
    }

    ctx.restore();
  }, [targetFrame, dockProgress]);

  // RequestAnimationFrame Render Loop
  useEffect(() => {
    const loop = () => {
      drawFrame();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [drawFrame]);

  // ========================================================
  // VERTICAL CHAPTER CONSTELLATION MAPPING
  // 10 chapters organized in 5 vertical tiers along the vertical camera path
  // Alternating Left / Right around the central luminous signal spine (x = 50%)
  // ========================================================

  // Vertical tier configuration:
  // Tier 0: Ch 01 (Left) & Ch 02 (Right)  - reveal 0.36 -> 0.48
  // Tier 1: Ch 03 (Left) & Ch 04 (Right)  - reveal 0.46 -> 0.58
  // Tier 2: Ch 05 (Left) & Ch 06 (Right)  - reveal 0.56 -> 0.68 (Ch 06 is The Work)
  // Tier 3: Ch 07 (Left) & Ch 08 (Right)  - reveal 0.66 -> 0.78
  // Tier 4: Ch 09 (Left) & Ch 10 (Right)  - reveal 0.76 -> 0.88 (Ch 10 is Closing)
  // Hold & Discovery state: 0.88 -> 1.00

  // Vertical world height & camera translation
  const totalWorldHeight = viewport.height * 2.4;
  const maxCameraTravel = totalWorldHeight - viewport.height * 0.72;

  const cameraY = useMemo(() => {
    if (progress <= 0.36) return 0;
    const t = smoothstep(0.36, 0.94, progress);
    return t * maxCameraTravel;
  }, [progress, maxCameraTravel]);

  // Overall cards layer visibility (fades in cleanly as docking begins)
  const cardsLayerOpacity = smoothstep(0.32, 0.42, progress);

  // Compute individual card reveal progress (0.0 to 1.0)
  const getCardReveal = (cardIdx: number): { opacity: number; scale: number; isRevealed: boolean } => {
    // 10 cards mapped to progressive reveal points
    // Card 0 (Ch 01): start 0.36, full 0.44
    // Card 1 (Ch 02): start 0.40, full 0.48
    // Card 2 (Ch 03): start 0.46, full 0.54
    // Card 3 (Ch 04): start 0.50, full 0.58
    // Card 4 (Ch 05): start 0.56, full 0.64
    // Card 5 (Ch 06): start 0.60, full 0.68  (Work)
    // Card 6 (Ch 07): start 0.66, full 0.74
    // Card 7 (Ch 08): start 0.70, full 0.78
    // Card 8 (Ch 09): start 0.76, full 0.84
    // Card 9 (Ch 10): start 0.80, full 0.88  (Next Connection)
    const start = 0.36 + cardIdx * 0.046;
    const end = start + 0.08;
    const t = smoothstep(start, end, progress);
    return {
      opacity: t,
      scale: 0.92 + 0.08 * t,
      isRevealed: progress >= start,
    };
  };

  // 10 Spatially Positioned Chapter Items in the Vertical World
  // Staggered vertical tiers: Left cards at tierBaseY, Right cards at tierBaseY + 85px
  // Ensures generous vertical spacing, zero collision, and visible central spine!
  const cardLayouts = useMemo(() => {
    const tierSpacing = Math.max(viewport.height * 0.42, 310);
    const startY = Math.max(viewport.height * 0.24, 180);

    return CHAPTERS_DATA.map((chapter, idx) => {
      const tier = Math.floor(idx / 2);
      const isRight = idx % 2 === 1;
      const baseY = startY + tier * tierSpacing;
      // Stagger right cards vertically below left cards
      const y = isRight ? baseY + 88 : baseY;
      return {
        chapter,
        idx,
        isRight,
        y,
      };
    });
  }, [viewport.height]);

  // Center vertical spine start and end points
  const spineStartX = viewport.width / 2;
  const spineStartY = 0;
  const spineEndY = cardLayouts[cardLayouts.length - 1].y + 140;

  return (
    <div
      id="page-02-mobile-vertical-root"
      className={`relative w-full h-full min-h-screen overflow-hidden select-none touch-none ${className}`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* ========================================================
          1. 240 WEBP VIDEO FRAME CANVAS & AMBIENT BACKDROP
          Aditya is centered horizontally (camX = 640).
          Gently docks to top ~28% as scroll descends.
          ======================================================== */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
      />

      {/* ========================================================
          2. STAGE 1 & 2 HERO CALLOUT (Before Cards Appear)
          Visually informs the visitor during initial scroll
          ======================================================== */}
      <div
        className="absolute inset-x-0 bottom-10 z-10 flex flex-col items-center justify-center text-center px-6 transition-all duration-500 pointer-events-none"
        style={{
          opacity: progress < 0.32 ? Math.max(0, 1 - progress * 3.5) : 0,
          transform: `translateY(${progress * 40}px)`,
        }}
      >
        <span className="text-[11px] font-mono tracking-[0.25em] text-[#FAF7F2]/80 uppercase bg-[#181210]/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#FAF7F2]/20 shadow-md">
          Scroll Down to Explore Signal
        </span>
        <ChevronDown className="w-4 h-4 text-[#FAF7F2]/60 animate-bounce mt-2" />
      </div>

      {/* ========================================================
          3. DOCKED TOP IDENTITY CROWN (STAGE 3 & 4)
          Aditya's name & status crown pinned gracefully at the top
          ======================================================== */}
      <div
        className="absolute top-4 inset-x-0 z-20 flex items-center justify-between px-5 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: dockProgress > 0.4 ? Math.min((dockProgress - 0.4) * 2.5, 1) : 0,
        }}
      >
        <div className="flex items-center gap-2 bg-[#181210]/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#E8A588]/30 shadow-md">
          <span className="w-2 h-2 rounded-full bg-[#E06D53] animate-pulse" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#FAF7F2]/90 font-medium">
            The Living Signal
          </span>
        </div>
        <div className="bg-[#FAF6F0]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-[#181210]/15 shadow-sm">
          <span className="text-[10px] font-mono text-[#2A1B16] font-semibold">
            {Math.min(10, Math.max(0, Math.floor(progress * 11)))} / 10 CONNECTED
          </span>
        </div>
      </div>

      {/* ========================================================
          3.5 FIXED DOCKED SIGNAL EMITTER BEAM (STAGE 3 & 4)
          Streams downward from Aditya's orbital rings into the scrollytelling world
          ======================================================== */}
      <div
        className="absolute inset-x-0 top-0 h-[260px] z-15 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: dockProgress > 0.3 ? Math.min((dockProgress - 0.3) * 2.0, 1) : 0,
        }}
      >
        <svg className="w-full h-full">
          <defs>
            <filter id="dock-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Luminous Core Line streaming from rings down to y = 260 */}
          <line
            x1={viewport.width / 2}
            y1={Math.round(viewport.height * 0.14)}
            x2={viewport.width / 2}
            y2={260}
            stroke="#E06D53"
            strokeWidth="3.5"
            strokeOpacity="0.45"
            filter="url(#dock-glow)"
          />
          <line
            x1={viewport.width / 2}
            y1={Math.round(viewport.height * 0.14)}
            x2={viewport.width / 2}
            y2={260}
            stroke="#FAF7F2"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeOpacity="0.85"
          />
          {/* Heart Anchor Node */}
          <circle
            cx={viewport.width / 2}
            y1={Math.round(viewport.height * 0.14)}
            r="8"
            fill="#E06D53"
            fillOpacity="0.3"
            className="animate-pulse"
          />
          <circle
            cx={viewport.width / 2}
            cy={Math.round(viewport.height * 0.14)}
            r="4"
            fill="#FAF7F2"
            stroke="#E06D53"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* ========================================================
          4. VERTICAL EXTENDED SCENE: CENTRAL LUMINOUS SPINE & CONNECTORS
          Runs through the tall virtual environment under the camera
          ======================================================== */}
      <div
        id="mobile-vertical-world-container"
        className="absolute inset-0 w-full h-full pointer-events-auto z-10 transition-opacity duration-300"
        style={{
          opacity: cardsLayerOpacity,
          transform: `translateY(${-cameraY}px)`,
          willChange: 'transform',
          maskImage:
            'linear-gradient(to bottom, transparent 0%, transparent 16%, black 25%, black 92%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, transparent 16%, black 25%, black 92%, transparent 100%)',
        }}
      >
        {/* SVG Canvas for Central Luminous Spine & Curved Bezier Connectors */}
        <svg
          className="absolute inset-0 w-full pointer-events-none"
          style={{ height: `${totalWorldHeight}px` }}
        >
          <defs>
            {/* Luminous Glow Filter for Peach/Coral Energy Stream */}
            <filter id="spine-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Linear Gradient for Continuous Energy Flow */}
            <linearGradient id="spine-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FAF7F2" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#F4B896" stopOpacity="0.8" />
              <stop offset="65%" stopColor="#E06D53" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#D48870" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {/* Central Luminous Signal Spine (Vertical line along center x = 50%) */}
          <line
            x1={spineStartX}
            y1={spineStartY}
            x2={spineStartX}
            y2={spineEndY}
            stroke="#E06D53"
            strokeWidth="4"
            strokeOpacity="0.35"
            filter="url(#spine-glow)"
          />
          <line
            x1={spineStartX}
            y1={spineStartY}
            x2={spineStartX}
            y2={spineEndY}
            stroke="url(#spine-gradient)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Curved Bezier Connectors for each of the 10 chapters */}
          {cardLayouts.map((item) => {
            const reveal = getCardReveal(item.idx);
            if (reveal.opacity <= 0.02) return null;

            // Connector coordinates:
            // Spine junction node is at (spineStartX, item.y + 42)
            const junctionX = spineStartX;
            const junctionY = item.y + 42;

            // Card attachment node on card's inner edge (the edge facing the spine)
            // Left card attaches on its right edge (at ~72% width + 12px)
            // Right card attaches on its left edge (at ~100% - 72% width - 12px)
            const cardW = Math.min(viewport.width * 0.70, 275);
            const cardNodeX = item.isRight
              ? viewport.width - cardW - 12
              : 12 + cardW;
            const cardNodeY = item.y + 42;

            // Quadratic control point creating organic curved tension
            const controlX = (junctionX + cardNodeX) / 2;
            const controlY = junctionY + (item.isRight ? -8 : 8);

            const pathD = `M ${junctionX} ${junctionY} Q ${controlX} ${controlY} ${cardNodeX} ${cardNodeY}`;

            return (
              <g key={`connector-${item.chapter.id}`} opacity={reveal.opacity}>
                {/* Outer Glow Stroke */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#E06D53"
                  strokeWidth="3.5"
                  strokeOpacity="0.4"
                  filter="url(#spine-glow)"
                />
                {/* Core Ivory Stroke */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#FAF7F2"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeOpacity="0.9"
                />

                {/* Central Spine Junction Node */}
                <circle
                  cx={junctionX}
                  cy={junctionY}
                  r="6"
                  fill="#E06D53"
                  fillOpacity="0.3"
                />
                <circle
                  cx={junctionX}
                  cy={junctionY}
                  r="3.5"
                  fill="#FAF7F2"
                  stroke="#E06D53"
                  strokeWidth="1.5"
                />

                {/* Card Edge Terminal Node Dot */}
                <circle
                  cx={cardNodeX}
                  cy={cardNodeY}
                  r="5"
                  fill="#E06D53"
                  fillOpacity="0.4"
                  className="animate-pulse"
                />
                <circle
                  cx={cardNodeX}
                  cy={cardNodeY}
                  r="3"
                  fill="#FAF7F2"
                />
              </g>
            );
          })}
        </svg>

        {/* ========================================================
            5. THE TEN CHAPTER CARDS
            Spatially positioned in the vertical world, alternating Left & Right
            Comfortable touch targets, warm ivory surface, dark sandstone typography
            ======================================================== */}
        <div className="relative w-full" style={{ height: `${totalWorldHeight}px` }}>
          {cardLayouts.map((item) => {
            const reveal = getCardReveal(item.idx);
            const cardW = Math.min(viewport.width * 0.70, 275);

            return (
              <div
                key={item.chapter.id}
                className="absolute z-10 transition-transform duration-300 ease-out"
                style={{
                  top: `${item.y}px`,
                  left: item.isRight ? 'auto' : '12px',
                  right: item.isRight ? '12px' : 'auto',
                  width: `${cardW}px`,
                  opacity: reveal.opacity,
                  transform: `scale(${reveal.scale})`,
                  pointerEvents: reveal.isRevealed ? 'auto' : 'none',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedChapter(item.chapter)}
                  className="group w-full text-left bg-[#FAF6F0]/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-[#E06D53]/25 shadow-[0_8px_24px_rgba(24,18,16,0.18)] active:scale-[0.98] transition-all hover:border-[#E06D53]/50 focus:outline-none focus:ring-2 focus:ring-[#E06D53]/40 cursor-pointer"
                >
                  {/* Card Header: Chapter Number & Category */}
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-[#E06D53] bg-[#E06D53]/10 px-2 py-0.5 rounded-md">
                      {item.chapter.displayNumber}
                    </span>
                    <span className="text-[9px] font-mono text-[#2A1B16]/55 truncate max-w-[120px]">
                      {item.chapter.category.split('·')[0].trim()}
                    </span>
                  </div>

                  {/* Chapter Title */}
                  <h4 className="text-[13px] sm:text-sm font-bold text-[#2A1B16] leading-snug tracking-tight group-hover:text-[#E06D53] transition-colors">
                    {item.chapter.title}
                  </h4>

                  {/* Concise Headline */}
                  <p className="text-[11px] text-[#2A1B16]/75 mt-1 leading-relaxed line-clamp-2">
                    {item.chapter.headline}
                  </p>

                  {/* Subtle Touch Preview Cue */}
                  <div className="mt-2.5 pt-2 border-t border-[#2A1B16]/10 flex items-center justify-between text-[10px] font-medium text-[#E06D53]">
                    <span className="tracking-wide">Explore Chapter</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </button>
              </div>
            );
          })}

          {/* ========================================================
              6. STAGE 4 COMPLETE DISCOVERY FOOTER BEACON
              Reached at the bottom of the vertical descent (progress >= 0.88)
              ======================================================== */}
          <div
            className="absolute inset-x-0 z-10 flex flex-col items-center justify-center text-center px-6"
            style={{
              top: `${spineEndY + 40}px`,
              opacity: smoothstep(0.86, 0.96, progress),
            }}
          >
            <div className="w-10 h-10 rounded-full bg-[#E06D53]/20 border border-[#E06D53]/40 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(224,109,83,0.3)]">
              <Compass className="w-5 h-5 text-[#FAF7F2]" />
            </div>
            <h3 className="text-base font-bold text-[#FAF7F2] tracking-tight">
              All 10 Chapters Discovered
            </h3>
            <p className="text-xs text-[#FAF7F2]/75 mt-1 max-w-[280px] leading-relaxed">
              You have traversed the living signal. Every chapter remains fully interactive above.
            </p>

            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  if (onOpenContact) onOpenContact();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#E06D53] text-[#FAF7F2] text-xs font-semibold shadow-md active:scale-95 transition-transform"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Get In Touch</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onStartJourney) onStartJourney();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#181210]/80 border border-[#FAF7F2]/20 text-[#FAF7F2] text-xs font-medium shadow-md active:scale-95 transition-transform"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Top of Signal</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          7. COMPACT CHAPTER PREVIEW BOTTOM SHEET / MODAL
          Opens smoothly when any chapter card is tapped.
          Displays authentic story excerpt and actions without Page 3.
          ======================================================== */}
      {selectedChapter && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedChapter(null)}
        >
          <div
            className="w-full sm:max-w-md bg-[#FAF6F0] text-[#2A1B16] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl border border-[#E06D53]/30 max-h-[82vh] overflow-y-auto animate-in slide-in-from-bottom-6 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle (Mobile) */}
            <div className="w-10 h-1 bg-[#2A1B16]/20 rounded-full mx-auto mb-4 sm:hidden" />

            {/* Header: Badge & Close Button */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-mono font-bold tracking-wider text-[#E06D53] bg-[#E06D53]/10 px-2.5 py-1 rounded-md">
                {selectedChapter.displayNumber}
              </span>
              <button
                type="button"
                onClick={() => setSelectedChapter(null)}
                className="w-8 h-8 rounded-full bg-[#2A1B16]/10 flex items-center justify-center text-[#2A1B16] hover:bg-[#2A1B16]/20 active:scale-95 transition-all"
                aria-label="Close chapter preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chapter Title */}
            <h3 className="text-lg font-bold text-[#2A1B16] tracking-tight">
              {selectedChapter.title}
            </h3>

            {/* Category */}
            <p className="text-[11px] font-mono text-[#E06D53] mt-0.5 font-medium">
              {selectedChapter.category}
            </p>

            {/* Headline */}
            <p className="text-xs font-semibold text-[#2A1B16]/90 mt-3 p-2.5 bg-[#E06D53]/8 rounded-xl border-l-2 border-[#E06D53]">
              "{selectedChapter.headline}"
            </p>

            {/* Authentic Story Excerpt */}
            <div className="mt-3.5 space-y-2.5 text-xs text-[#2A1B16]/80 leading-relaxed font-normal">
              {selectedChapter.fullStory.slice(0, 3).map((para, pIdx) => (
                <p key={pIdx}>{para}</p>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="mt-5 pt-3.5 border-t border-[#2A1B16]/15 flex items-center gap-3">
              {selectedChapter.id === 'chapter-06' ? (
                <div className="flex-1 flex gap-2">
                  <a
                    href="https://github.com/adityadugar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#E06D53] text-[#FAF7F2] text-xs font-semibold shadow-md active:scale-95 transition-transform"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>GitHub Repositories</span>
                  </a>
                  {onExploreWork && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedChapter(null);
                        onExploreWork();
                      }}
                      className="inline-flex items-center justify-center py-2.5 px-3 rounded-xl bg-[#181210]/10 text-[#2A1B16] text-xs font-medium active:scale-95 transition-transform"
                    >
                      Focus
                    </button>
                  )}
                </div>
              ) : selectedChapter.id === 'chapter-10' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChapter(null);
                    if (onOpenContact) onOpenContact();
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#E06D53] text-[#FAF7F2] text-xs font-semibold shadow-md active:scale-95 transition-transform"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Get In Touch</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedChapter(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#E06D53] text-[#FAF7F2] text-xs font-semibold shadow-md active:scale-95 transition-transform text-center"
                >
                  Return to Constellation
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedChapter(null)}
                className="py-2.5 px-4 rounded-xl bg-[#2A1B16]/10 text-[#2A1B16] text-xs font-medium active:scale-95 transition-transform"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page02MobileVertical;
