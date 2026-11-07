import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CHAPTERS_DATA, ChapterItem } from '../data/chaptersData';
import { ArrowUp, Mail, ExternalLink, X } from 'lucide-react';

interface Page02MobileConstellationProps {
  progress: number; // 0.0 to 1.0 (Page 2 internal scroll progress scrubbed by ScrollTrigger)
  className?: string;
  onExploreWork?: () => void;
  onStartJourney?: () => void;
  onOpenContact?: () => void;
}

const TOTAL_FRAMES = 240;
const FRAME_WIDTH = 1280;
const FRAME_HEIGHT = 720;

// Normalized terminal node coordinates within 1280x720 video frames
const LEFT_NODE_COORDS = [
  { nx: 126.2, ny: 130.8 }, // Node L1 (Ch 01)
  { nx: 171.7, ny: 242.8 }, // Node L2 (Ch 02)
  { nx: 110.7, ny: 344.8 }, // Node L3 (Ch 03)
  { nx: 153.3, ny: 455.3 }, // Node L4 (Ch 04)
  { nx: 181.6, ny: 567.8 }, // Node L5 (Ch 05)
];

const RIGHT_NODE_COORDS = [
  { nx: 1138.5, ny: 134.5 }, // Node R1 (Ch 06)
  { nx: 1121.0, ny: 241.7 }, // Node R2 (Ch 07)
  { nx: 1165.4, ny: 344.9 }, // Node R3 (Ch 08)
  { nx: 1118.4, ny: 454.6 }, // Node R4 (Ch 09)
  { nx: 1093.1, ny: 568.4 }, // Node R5 (Ch 10)
];

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

// Compute choreographed horizontal camera coordinate CamX in native 1280 units
const calculateCamX = (p: number): number => {
  // Stage A & B: Center hold (Aditya introduction & 3 orbital rings)
  if (p <= 0.36) return 640;

  // Stage C (Left Pan): Glide from center (640) to left wing (95)
  if (p <= 0.48) {
    const t = smoothstep(0.36, 0.48, p);
    return 640 + (95 - 640) * t;
  }

  // Left wing hold (Explore Chapters 01 to 05)
  if (p <= 0.58) return 95;

  // Stage C (Sweep through Center): Glide from left wing (95) back through center (640)
  if (p <= 0.70) {
    const t = smoothstep(0.58, 0.70, p);
    return 95 + (640 - 95) * t;
  }

  // Brief center hold showing both sides connected to Aditya
  if (p <= 0.74) return 640;

  // Stage C (Right Pan): Glide from center (640) to right wing (1185)
  if (p <= 0.84) {
    const t = smoothstep(0.74, 0.84, p);
    return 640 + (1185 - 640) * t;
  }

  // Right wing hold (Explore Chapters 06 to 10)
  if (p <= 0.92) return 1185;

  // Stage D (Settle on Complete Discovery State): Return smoothly to center
  const t = smoothstep(0.92, 1.00, p);
  return 1185 + (640 - 1185) * t;
};

export const Page02MobileConstellation: React.FC<Page02MobileConstellationProps> = ({
  progress,
  className = '',
  onExploreWork,
  onStartJourney,
  onOpenContact,
}) => {
  const fgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const loadingSetRef = useRef<Set<number>>(new Set());
  const lastDrawnFrameRef = useRef<number>(-1);
  const animFrameRef = useRef<number | null>(null);

  // Selected Chapter Modal / Compact Card Preview State
  const [selectedChapter, setSelectedChapter] = useState<ChapterItem | null>(null);

  // Interactive camera override when user taps HUD pills in completed stage (Stage D)
  const [hudCamOverride, setHudCamOverride] = useState<number | null>(null);
  const lastScrollProgressRef = useRef<number>(progress);

  // Clear HUD camera override if user resumes vertical scrolling
  useEffect(() => {
    if (Math.abs(progress - lastScrollProgressRef.current) > 0.015) {
      setHudCamOverride(null);
      lastScrollProgressRef.current = progress;
    }
  }, [progress]);

  // Compute active CamX: uses HUD override if present in Stage D, otherwise mathematical camera path
  const activeCamX = useMemo(() => {
    if (hudCamOverride !== null && progress >= 0.88) {
      return hudCamOverride;
    }
    return calculateCamX(progress);
  }, [hudCamOverride, progress]);

  // Target frame index deterministically scrubbed: frameIndex = Math.round(progress * 239)
  const targetFrameIndex = useMemo(() => {
    const clamped = Math.min(Math.max(progress, 0), 1);
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return clamped > 0.5 ? TOTAL_FRAMES - 1 : 0;
    }
    return Math.min(Math.max(Math.round(clamped * (TOTAL_FRAMES - 1)), 0), TOTAL_FRAMES - 1);
  }, [progress]);

  // Preload a single frame with async decode
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

  // Sliding window preloading around current target frame
  const triggerSlidingPreload = useCallback(
    (centerIndex: number) => {
      const PRELOAD_AHEAD = 16;
      const PRELOAD_BEHIND = 6;
      const start = Math.max(0, centerIndex - PRELOAD_BEHIND);
      const end = Math.min(TOTAL_FRAMES - 1, centerIndex + PRELOAD_AHEAD);

      for (let i = start; i <= end; i++) {
        if (!imageCacheRef.current.has(i) && !loadingSetRef.current.has(i)) {
          preloadFrame(i);
        }
      }

      // Memory management: retain up to 50 recent frames in mobile cache
      const cache = imageCacheRef.current;
      if (cache.size > 50) {
        for (const key of cache.keys()) {
          if (Math.abs(key - centerIndex) > 25 && key !== 0 && key !== TOTAL_FRAMES - 1) {
            cache.delete(key);
          }
        }
      }
    },
    [preloadFrame]
  );

  // Initial preload on mount: Frame 0, Frame 239, and early milestone keyframes
  useEffect(() => {
    let isMounted = true;

    Promise.all([preloadFrame(0), preloadFrame(TOTAL_FRAMES - 1)]).then(() => {
      if (isMounted) {
        for (let i = 1; i < 20; i++) {
          if (isMounted) preloadFrame(i);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [preloadFrame]);

  useEffect(() => {
    triggerSlidingPreload(targetFrameIndex);
  }, [targetFrameIndex, triggerSlidingPreload]);

  // Master draw function for sharp foreground 16:9 frame and ambient blurred backdrop
  const drawCurrentFrame = useCallback(() => {
    const fgCanvas = fgCanvasRef.current;
    const bgCanvas = bgCanvasRef.current;
    if (!fgCanvas || !bgCanvas) return;

    const fgCtx = fgCanvas.getContext('2d', { alpha: true });
    const bgCtx = bgCanvas.getContext('2d', { alpha: false });
    if (!fgCtx || !bgCtx) return;

    const windowW = window.innerWidth;
    const windowH = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.0);

    // 1. Resize canvases if needed
    const fgTargetW = Math.round(windowW * dpr);
    const fgTargetH = Math.round(windowH * dpr);
    if (fgCanvas.width !== fgTargetW || fgCanvas.height !== fgTargetH) {
      fgCanvas.width = fgTargetW;
      fgCanvas.height = fgTargetH;
    }

    const bgTargetW = Math.round(windowW * 0.5 * dpr);
    const bgTargetH = Math.round(windowH * 0.5 * dpr);
    if (bgCanvas.width !== bgTargetW || bgCanvas.height !== bgTargetH) {
      bgCanvas.width = bgTargetW;
      bgCanvas.height = bgTargetH;
    }

    // 2. Locate best available frame in cache
    const target = targetFrameIndex;
    const cache = imageCacheRef.current;
    let imgToDraw = cache.get(target);

    if (!imgToDraw || !imgToDraw.complete || imgToDraw.naturalWidth === 0) {
      let closestDist = Infinity;
      let closestIndex = lastDrawnFrameRef.current;

      for (const [idx, cachedImg] of cache.entries()) {
        if (cachedImg.complete && cachedImg.naturalWidth > 0) {
          const dist = Math.abs(idx - target);
          if (dist < closestDist) {
            closestDist = dist;
            closestIndex = idx;
          }
        }
      }

      if (closestIndex >= 0 && cache.has(closestIndex)) {
        imgToDraw = cache.get(closestIndex);
      }
    }

    // 3. Paint only when valid frame is available (NEVER flash black!)
    if (imgToDraw && imgToDraw.complete && imgToDraw.naturalWidth > 0) {
      const scale = windowH / FRAME_HEIGHT;
      const drawW = Math.round(FRAME_WIDTH * scale);
      const drawH = windowH;
      const drawX = Math.round(windowW / 2 - activeCamX * scale);
      const drawY = 0;

      // Layer 1: Ambient Blurred Backdrop Canvas (smooth extension filling viewport)
      bgCtx.save();
      bgCtx.scale(0.5 * dpr, 0.5 * dpr);

      // Base warm gradient
      const bgGrad = bgCtx.createLinearGradient(0, 0, 0, windowH);
      bgGrad.addColorStop(0, '#7A96B2');
      bgGrad.addColorStop(0.28, '#E8A588');
      bgGrad.addColorStop(0.55, '#F4B896');
      bgGrad.addColorStop(0.80, '#D48870');
      bgGrad.addColorStop(1, '#181210');
      bgCtx.fillStyle = bgGrad;
      bgCtx.fillRect(0, 0, windowW, windowH);

      // Ambient blurred frame extension
      const ambientScale = Math.max(windowW / FRAME_WIDTH, windowH / FRAME_HEIGHT) * 1.15;
      const ambW = FRAME_WIDTH * ambientScale;
      const ambH = FRAME_HEIGHT * ambientScale;
      const ambX = (windowW - ambW) / 2;
      const ambY = (windowH - ambH) / 2;
      bgCtx.drawImage(imgToDraw, ambX, ambY, ambW, ambH);
      bgCtx.restore();

      // Layer 2: Sharp Foreground Frame at Horizontal Camera Offset
      fgCtx.save();
      fgCtx.scale(dpr, dpr);
      fgCtx.clearRect(0, 0, windowW, windowH);
      fgCtx.drawImage(imgToDraw, drawX, drawY, drawW, drawH);
      fgCtx.restore();

      lastDrawnFrameRef.current = target;
    }
  }, [activeCamX, targetFrameIndex]);

  // Master render loop using requestAnimationFrame
  useEffect(() => {
    let active = true;

    const loop = () => {
      if (!active) return;
      drawCurrentFrame();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    const handleResize = () => {
      drawCurrentFrame();
    };
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [drawCurrentFrame]);

  // Window metrics for card positioning and SVG connector lines
  const windowW = typeof window !== 'undefined' ? window.innerWidth : 390;
  const windowH = typeof window !== 'undefined' ? window.innerHeight : 844;
  const scale = windowH / FRAME_HEIGHT;
  const cardWidth = Math.min(Math.max(windowW * 0.46, 160), 205);

  // Progressive reveal calculation matching the video's connection formation:
  // Left Cards:
  // Ch 01: 0.38 -> 0.44
  // Ch 02: 0.41 -> 0.47
  // Ch 03: 0.44 -> 0.50
  // Ch 04: 0.47 -> 0.53
  // Ch 05: 0.50 -> 0.56
  // Right Cards:
  // Ch 06: 0.72 -> 0.76
  // Ch 07: 0.75 -> 0.79
  // Ch 08: 0.78 -> 0.82
  // Ch 09: 0.81 -> 0.85
  // Ch 10: 0.84 -> 0.88
  const getCardRevealProgress = (idx: number): number => {
    let start: number;
    let end: number;

    if (idx < 5) {
      // Left cards
      start = 0.38 + idx * 0.03;
      end = start + 0.06;
    } else {
      // Right cards
      start = 0.72 + (idx - 5) * 0.03;
      end = start + 0.05;
    }

    if (progress <= start) return 0;
    if (progress >= end) return 1;
    return (progress - start) / (end - start);
  };

  // Screen coordinates of the 10 terminal nodes
  const nodePositions = useMemo(() => {
    const left = LEFT_NODE_COORDS.map((coord) => ({
      x: Math.round(windowW / 2 + (coord.nx - activeCamX) * scale),
      y: Math.round(coord.ny * scale),
    }));

    const right = RIGHT_NODE_COORDS.map((coord) => ({
      x: Math.round(windowW / 2 + (coord.nx - activeCamX) * scale),
      y: Math.round(coord.ny * scale),
    }));

    return { left, right };
  }, [activeCamX, scale, windowW]);

  // Left 5 chapters (01..05) and Right 5 chapters (06..10)
  const leftChapters = CHAPTERS_DATA.slice(0, 5);
  const rightChapters = CHAPTERS_DATA.slice(5, 10);

  // Dynamic HUD stage label based on scroll progress
  const stageInfo = useMemo(() => {
    if (progress < 0.22) {
      return { stage: 'I', label: 'Aditya Dugar · The Beginning' };
    }
    if (progress < 0.38) {
      return { stage: 'II', label: 'Orbital System Forming' };
    }
    if (progress < 0.60) {
      return { stage: 'III', label: 'Left Wing · Chapters 01–05' };
    }
    if (progress < 0.72) {
      return { stage: 'IV', label: 'Central Node · Interconnected Logic' };
    }
    if (progress < 0.90) {
      return { stage: 'V', label: 'Right Wing · Chapters 06–10' };
    }
    return { stage: 'VI', label: 'Constellation Complete' };
  }, [progress]);

  return (
    <div
      id="page-02-mobile-constellation"
      className={`fixed inset-0 w-full h-full overflow-hidden select-none bg-[#181210] pointer-events-none ${className}`}
      aria-label="The Living Signal — Mobile Horizontal Constellation"
    >
      {/* =========================================================================
          LAYER 1: AMBIENT BACKDROP CANVAS (Enlarged blurred current frame)
          ========================================================================= */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <canvas
          ref={bgCanvasRef}
          className="w-full h-full block filter blur-3xl brightness-75 scale-110"
          style={{ willChange: 'transform' }}
        />
      </div>

      {/* =========================================================================
          LAYER 2: SHARP FOREGROUND CANVAS (Scrubbed deterministically by progress)
          ========================================================================= */}
      <canvas
        ref={fgCanvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none"
        style={{
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      />

      {/* Layer 3: Soft ambient vignette blending outer edges into warm portfolio palette */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-25 mix-blend-multiply" />

      {/* =========================================================================
          LAYER 4: SVG VECTOR CONNECTORS & TERMINAL BEACON DOTS
          Draws animated vector lines and glowing beacons from nodes to cards
          ========================================================================= */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="mobileNodeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Left 5 Connectors (Chapters 01 to 05) */}
        {nodePositions.left.map((node, i) => {
          const cardProg = getCardRevealProgress(i);
          if (cardProg <= 0.02) return null;

          const cardX = node.x - cardWidth - 10;
          const cardAnchorX = cardX + cardWidth;
          const cardAnchorY = node.y;

          return (
            <g key={`mobile-left-node-${i}`} opacity={cardProg}>
              {/* Subtle vector line from node to card */}
              <line
                x1={node.x}
                y1={node.y}
                x2={cardAnchorX}
                y2={cardAnchorY}
                stroke="#E06D53"
                strokeWidth="1.5"
                strokeOpacity="0.8"
                strokeDasharray="4 3"
                filter="url(#mobileNodeGlow)"
              />
              {/* Terminal Node Beacon Dot */}
              <circle
                cx={node.x}
                cy={node.y}
                r="4"
                fill="#FAF6F0"
                stroke="#E06D53"
                strokeWidth="2"
                filter="url(#mobileNodeGlow)"
              />
            </g>
          );
        })}

        {/* Right 5 Connectors (Chapters 06 to 10) */}
        {nodePositions.right.map((node, i) => {
          const cardProg = getCardRevealProgress(i + 5);
          if (cardProg <= 0.02) return null;

          const cardX = node.x + 10;
          const cardAnchorX = cardX;
          const cardAnchorY = node.y;

          return (
            <g key={`mobile-right-node-${i}`} opacity={cardProg}>
              {/* Subtle vector line from node to card */}
              <line
                x1={node.x}
                y1={node.y}
                x2={cardAnchorX}
                y2={cardAnchorY}
                stroke="#E06D53"
                strokeWidth="1.5"
                strokeOpacity="0.8"
                strokeDasharray="4 3"
                filter="url(#mobileNodeGlow)"
              />
              {/* Terminal Node Beacon Dot */}
              <circle
                cx={node.x}
                cy={node.y}
                r="4"
                fill="#FAF6F0"
                stroke="#E06D53"
                strokeWidth="2"
                filter="url(#mobileNodeGlow)"
              />
            </g>
          );
        })}
      </svg>

      {/* =========================================================================
          LAYER 5: CHAPTER CARDS CONSTELLATION
          Touch gestures on cards trigger compact selection & preview.
          Touch gestures outside pass cleanly to window vertical scroll.
          ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {/* LEFT COLUMN: CHAPTERS 01 TO 05 */}
        {leftChapters.map((chapter, i) => {
          const node = nodePositions.left[i];
          if (!node) return null;

          const cardProg = getCardRevealProgress(i);
          if (cardProg <= 0.02) return null;

          const cardX = node.x - cardWidth - 10;
          const cardY = node.y - 42;
          const isSelected = selectedChapter?.id === chapter.id;

          return (
            <div
              key={chapter.id}
              role="button"
              tabIndex={0}
              aria-label={`${chapter.displayNumber}: ${chapter.title}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedChapter(isSelected ? null : chapter);
              }}
              style={{
                position: 'absolute',
                left: `${cardX}px`,
                top: `${cardY}px`,
                width: `${cardWidth}px`,
                opacity: cardProg,
                transform: `translateX(${(1 - cardProg) * -16}px) ${isSelected ? 'scale(1.03)' : 'scale(1)'}`,
                pointerEvents: cardProg > 0.4 ? 'auto' : 'none',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease, opacity 0.2s ease',
              }}
              className={`pointer-events-auto bg-[#FAF6F0] text-[#2A1B16] rounded-xl p-2.5 sm:p-3 border transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#E06D53] ring-2 ring-[#E06D53]/60 shadow-[0_8px_28px_rgba(224,109,83,0.35)]'
                  : 'border-[#E06D53]/25 shadow-[0_4px_18px_rgba(0,0,0,0.30)] active:scale-95'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-mono text-[10.5px] font-bold text-[#E06D53] tracking-wider">
                  {chapter.number}
                </span>
                <span className="font-mono text-[8.5px] uppercase tracking-wider text-[#2A1B16]/65 font-bold truncate max-w-[100px]">
                  {chapter.category.split('·')[0].trim()}
                </span>
              </div>

              <h4 className="font-serif text-[12.5px] sm:text-[13.5px] font-bold text-[#2A1B16] leading-tight line-clamp-1">
                {chapter.title}
              </h4>

              <p className="font-sans text-[10px] sm:text-[10.5px] text-[#2A1B16]/75 mt-0.5 line-clamp-2 leading-snug">
                {chapter.summary}
              </p>
            </div>
          );
        })}

        {/* RIGHT COLUMN: CHAPTERS 06 TO 10 */}
        {rightChapters.map((chapter, i) => {
          const node = nodePositions.right[i];
          if (!node) return null;

          const cardProg = getCardRevealProgress(i + 5);
          if (cardProg <= 0.02) return null;

          const cardX = node.x + 10;
          const cardY = node.y - 42;
          const isSelected = selectedChapter?.id === chapter.id;

          return (
            <div
              key={chapter.id}
              role="button"
              tabIndex={0}
              aria-label={`${chapter.displayNumber}: ${chapter.title}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedChapter(isSelected ? null : chapter);
              }}
              style={{
                position: 'absolute',
                left: `${cardX}px`,
                top: `${cardY}px`,
                width: `${cardWidth}px`,
                opacity: cardProg,
                transform: `translateX(${(1 - cardProg) * 16}px) ${isSelected ? 'scale(1.03)' : 'scale(1)'}`,
                pointerEvents: cardProg > 0.4 ? 'auto' : 'none',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease, opacity 0.2s ease',
              }}
              className={`pointer-events-auto bg-[#FAF6F0] text-[#2A1B16] rounded-xl p-2.5 sm:p-3 border transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#E06D53] ring-2 ring-[#E06D53]/60 shadow-[0_8px_28px_rgba(224,109,83,0.35)]'
                  : 'border-[#E06D53]/25 shadow-[0_4px_18px_rgba(0,0,0,0.30)] active:scale-95'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-mono text-[10.5px] font-bold text-[#E06D53] tracking-wider">
                  {chapter.number}
                </span>
                <span className="font-mono text-[8.5px] uppercase tracking-wider text-[#2A1B16]/65 font-bold truncate max-w-[100px]">
                  {chapter.category.split('·')[0].trim()}
                </span>
              </div>

              <h4 className="font-serif text-[12.5px] sm:text-[13.5px] font-bold text-[#2A1B16] leading-tight line-clamp-1">
                {chapter.title}
              </h4>

              <p className="font-sans text-[10px] sm:text-[10.5px] text-[#2A1B16]/75 mt-0.5 line-clamp-2 leading-snug">
                {chapter.summary}
              </p>
            </div>
          );
        })}
      </div>

      {/* =========================================================================
          LAYER 6: COMPACT CHAPTER SELECTION PREVIEW (Non-intrusive bottom modal)
          Tapping a card opens this refined preview with headline quote and actions.
          ========================================================================= */}
      {selectedChapter && (
        <div
          className="fixed inset-x-4 bottom-20 z-40 max-w-sm mx-auto bg-[#FAF6F0] text-[#2A1B16] rounded-2xl p-4 border border-[#E06D53]/35 shadow-[0_16px_40px_rgba(0,0,0,0.45)] pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-200"
          role="dialog"
          aria-label={`Preview: ${selectedChapter.title}`}
        >
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#E06D53]">
                {selectedChapter.displayNumber}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#E06D53]/50" />
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#2A1B16]/60 font-semibold truncate max-w-[170px]">
                {selectedChapter.category.split('·')[0].trim()}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedChapter(null)}
              className="text-[#2A1B16]/60 hover:text-[#2A1B16] p-1 -mr-1 -mt-1 rounded-full transition-colors"
              aria-label="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="font-serif text-base font-bold text-[#2A1B16] leading-snug">
            {selectedChapter.title}
          </h3>

          <p className="font-sans text-xs text-[#2A1B16]/80 mt-1 leading-relaxed">
            {selectedChapter.summary}
          </p>

          {selectedChapter.headline && (
            <p className="font-serif italic text-xs text-[#E06D53] mt-2 pt-2 border-t border-[#2A1B16]/10 leading-snug">
              “{selectedChapter.headline}”
            </p>
          )}

          {/* Action Button for Milestone Chapters */}
          <div className="mt-3 pt-2 border-t border-[#2A1B16]/10 flex items-center justify-end gap-2">
            {selectedChapter.id === 'chapter-06' && onExploreWork && (
              <button
                type="button"
                onClick={() => {
                  setSelectedChapter(null);
                  onExploreWork();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-white bg-gradient-to-r from-[#E06D53] to-[#D48870] shadow-sm hover:opacity-90 active:scale-95 transition-all"
              >
                <span>{selectedChapter.ctaLabel}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}

            {selectedChapter.id === 'chapter-10' && onOpenContact && (
              <button
                type="button"
                onClick={() => {
                  setSelectedChapter(null);
                  onOpenContact();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-white bg-gradient-to-r from-[#E06D53] to-[#D48870] shadow-sm hover:opacity-90 active:scale-95 transition-all"
              >
                <Mail className="w-3 h-3" />
                <span>{selectedChapter.ctaLabel}</span>
              </button>
            )}

            {selectedChapter.id === 'chapter-01' && onStartJourney && (
              <button
                type="button"
                onClick={() => {
                  setSelectedChapter(null);
                  onStartJourney();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-[#FAF6F0] bg-[#181210] border border-[#E06D53]/50 shadow-sm active:scale-95 transition-all"
              >
                <ArrowUp className="w-3 h-3 text-[#E06D53]" />
                <span>Return to Top</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          LAYER 7: CINEMATIC HUD / CONSTELLATION STAGE INDICATOR (Bottom Center)
          Discreet HUD bar with stage progress and completed quick exploration pills
          ========================================================================= */}
      <div className="fixed inset-x-0 bottom-4 z-30 flex flex-col items-center pointer-events-none px-4">
        <div className="flex flex-col items-center gap-1.5 bg-[#181210]/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#E06D53]/25 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          {/* Top Row: Stage Indicator & 10 Chapter Beacons */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#E06D53] font-bold">
              Stage {stageInfo.stage}
            </span>
            <span className="w-1 h-1 rounded-full bg-[#E06D53]/60" />
            <span className="font-mono text-[8.5px] text-[#FAF6F0]/85 tracking-wider truncate max-w-[200px]">
              {stageInfo.label}
            </span>
          </div>

          {/* Bottom Row: 10 Small Constellation Beacons */}
          <div className="flex items-center gap-1">
            {/* 5 Left Chapters (01..05) */}
            {Array.from({ length: 5 }).map((_, i) => {
              const active = getCardRevealProgress(i) > 0.1;
              return (
                <span
                  key={`hud-left-${i}`}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    active ? 'bg-[#E06D53] shadow-[0_0_6px_#E06D53]' : 'bg-[#FAF6F0]/25'
                  }`}
                />
              );
            })}

            {/* Central Orbital Beacon (Aditya) */}
            <span
              className={`w-2 h-2 mx-0.5 rounded-sm rotate-45 transition-all duration-300 ${
                progress >= 0.22 ? 'bg-[#F4B896] shadow-[0_0_8px_#F4B896]' : 'bg-[#FAF6F0]/30'
              }`}
            />

            {/* 5 Right Chapters (06..10) */}
            {Array.from({ length: 5 }).map((_, i) => {
              const active = getCardRevealProgress(i + 5) > 0.1;
              return (
                <span
                  key={`hud-right-${i}`}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    active ? 'bg-[#E06D53] shadow-[0_0_6px_#E06D53]' : 'bg-[#FAF6F0]/25'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Stage D Completed Constellation Quick Jump Pills */}
        {progress >= 0.88 && (
          <div className="mt-2 flex items-center gap-2 pointer-events-auto animate-in fade-in duration-300">
            <button
              type="button"
              onClick={() => setHudCamOverride(95)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase transition-all shadow-md ${
                activeCamX <= 200
                  ? 'bg-[#E06D53] text-white shadow-[0_0_10px_rgba(224,109,83,0.5)]'
                  : 'bg-[#1E1412]/90 text-[#FAF6F0]/80 border border-[#E06D53]/40 hover:text-white'
              }`}
            >
              ← Left Wing
            </button>

            <button
              type="button"
              onClick={() => setHudCamOverride(640)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase transition-all shadow-md ${
                activeCamX > 200 && activeCamX < 1000
                  ? 'bg-[#E06D53] text-white shadow-[0_0_10px_rgba(224,109,83,0.5)]'
                  : 'bg-[#1E1412]/90 text-[#FAF6F0]/80 border border-[#E06D53]/40 hover:text-white'
              }`}
            >
              Aditya
            </button>

            <button
              type="button"
              onClick={() => setHudCamOverride(1185)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase transition-all shadow-md ${
                activeCamX >= 1000
                  ? 'bg-[#E06D53] text-white shadow-[0_0_10px_rgba(224,109,83,0.5)]'
                  : 'bg-[#1E1412]/90 text-[#FAF6F0]/80 border border-[#E06D53]/40 hover:text-white'
              }`}
            >
              Right Wing →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Page02MobileConstellation;
