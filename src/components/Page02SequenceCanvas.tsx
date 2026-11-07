import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

export interface RenderedRect {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  isMobile: boolean;
}

interface Page02SequenceCanvasProps {
  progress: number; // 0.0 to 1.0 (scrubbed directly by GSAP ScrollTrigger)
  onRenderRectChange?: (rect: RenderedRect) => void;
  className?: string;
}

export interface Page02CanvasHandle {
  getRenderedRect: () => RenderedRect | null;
}

const TOTAL_FRAMES = 240;
const FRAME_WIDTH = 1280;
const FRAME_HEIGHT = 720;
const FRAME_ASPECT = FRAME_WIDTH / FRAME_HEIGHT;

const getFrameUrl = (index: number): string => {
  const frameNum = Math.min(Math.max(index + 1, 1), TOTAL_FRAMES);
  const padded = String(frameNum).padStart(4, '0');
  return `/frames/page-02/frame_${padded}.webp`;
};

export const Page02SequenceCanvas = forwardRef<Page02CanvasHandle, Page02SequenceCanvasProps>(
  ({ progress, onRenderRectChange, className = '' }, ref) => {
    const fgCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const imageCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
    const loadingSetRef = useRef<Set<number>>(new Set());
    const lastDrawnFrameRef = useRef<number>(-1);
    const targetFrameRef = useRef<number>(0);
    const progressRef = useRef<number>(progress);
    const renderedRectRef = useRef<RenderedRect>({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      scale: 1,
      isMobile: false,
    });
    const animFrameRef = useRef<number | null>(null);

    progressRef.current = progress;

    // Expose rendered rectangle to parent for coordinate tracking
    useImperativeHandle(ref, () => ({
      getRenderedRect: () => renderedRectRef.current,
    }));

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

    // Intelligent sliding window preloading around current target
    const triggerSlidingPreload = useCallback(
      (centerIndex: number) => {
        const PRELOAD_AHEAD = 20;
        const PRELOAD_BEHIND = 8;
        const start = Math.max(0, centerIndex - PRELOAD_BEHIND);
        const end = Math.min(TOTAL_FRAMES - 1, centerIndex + PRELOAD_AHEAD);

        for (let i = start; i <= end; i++) {
          if (!imageCacheRef.current.has(i) && !loadingSetRef.current.has(i)) {
            preloadFrame(i);
          }
        }

        // Memory management: retain up to 80 recent frames in cache to prevent heap congestion
        const cache = imageCacheRef.current;
        if (cache.size > 80) {
          for (const key of cache.keys()) {
            if (Math.abs(key - centerIndex) > 40 && key !== 0 && key !== TOTAL_FRAMES - 1) {
              cache.delete(key);
            }
          }
        }
      },
      [preloadFrame]
    );

    // Initial preload: Frame 0 (instant first paint) + Milestone keyframes
    useEffect(() => {
      let isMounted = true;

      // Immediately load frame 0 and frame 239
      Promise.all([preloadFrame(0), preloadFrame(TOTAL_FRAMES - 1)]).then(() => {
        if (isMounted) {
          // Preload milestone keyframes across the sequence in idle time
          const milestones = [20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220];
          milestones.forEach((idx) => {
            if (isMounted) preloadFrame(idx);
          });
          // Also buffer first 24 frames for instant initial scroll response
          for (let i = 1; i < 24; i++) {
            if (isMounted) preloadFrame(i);
          }
        }
      });

      return () => {
        isMounted = false;
      };
    }, [preloadFrame]);

    // Compute target frame index deterministically: frameIndex = Math.round(progress * 239)
    useEffect(() => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        targetFrameRef.current = progress > 0.5 ? TOTAL_FRAMES - 1 : 0;
      } else {
        const clamped = Math.min(Math.max(progress, 0), 1);
        targetFrameRef.current = Math.min(Math.max(Math.round(clamped * (TOTAL_FRAMES - 1)), 0), TOTAL_FRAMES - 1);
      }

      triggerSlidingPreload(targetFrameRef.current);
    }, [progress, triggerSlidingPreload]);

    // Master draw function for both background atmosphere and sharp 16:9 foreground
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
      const isMobile = windowW < 640 || windowW / windowH < 0.72;

      // 1. Resize canvases if window dimensions changed
      const fgTargetW = Math.round(windowW * dpr);
      const fgTargetH = Math.round(windowH * dpr);
      if (fgCanvas.width !== fgTargetW || fgCanvas.height !== fgTargetH) {
        fgCanvas.width = fgTargetW;
        fgCanvas.height = fgTargetH;
      }

      // Background ambient canvas runs at half resolution for ultra-performant GPU blur
      const bgTargetW = Math.round(windowW * 0.5 * dpr);
      const bgTargetH = Math.round(windowH * 0.5 * dpr);
      if (bgCanvas.width !== bgTargetW || bgCanvas.height !== bgTargetH) {
        bgCanvas.width = bgTargetW;
        bgCanvas.height = bgTargetH;
      }

      // 2. Calculate dimensions for sharp 16:9 foreground
      let drawW: number;
      let drawH: number;
      let drawX: number;
      let drawY: number;

      if (isMobile) {
        // Mobile layout: full viewport width, strictly preserving 16:9 ratio
        drawW = windowW;
        drawH = Math.round(windowW / FRAME_ASPECT);
        drawX = 0;

        // Position 16:9 frame at the top portion of mobile screen
        // Leaves ample vertical space underneath for the single-column vertical cards
        const initialCenterY = Math.max(16, Math.round((windowH - drawH) * 0.28));
        const dockedTopY = 16;
        // As progress nears completion (0.45 -> 0.75), frame gently docks to top
        const dockProgress = Math.min(Math.max((progressRef.current - 0.4) / 0.25, 0), 1);
        drawY = Math.round(initialCenterY + (dockedTopY - initialCenterY) * dockProgress);
      } else {
        // Desktop / Tablet layout: contain inside viewport, preserving 100% of 16:9 ratio
        const screenAspect = windowW / windowH;
        if (screenAspect > FRAME_ASPECT) {
          // Wider screen: fit height, letterbox left/right (filled by ambient blurred backdrop)
          drawH = windowH;
          drawW = Math.round(windowH * FRAME_ASPECT);
        } else {
          // Taller screen: fit width, letterbox top/bottom (filled by ambient blurred backdrop)
          drawW = windowW;
          drawH = Math.round(windowW / FRAME_ASPECT);
        }
        drawX = Math.round((windowW - drawW) / 2);
        drawY = Math.round((windowH - drawH) / 2);
      }

      // Update rendered rect for cards coordinate mapping
      const rect: RenderedRect = {
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH,
        scale: drawW / FRAME_WIDTH,
        isMobile,
      };

      if (
        renderedRectRef.current.x !== rect.x ||
        renderedRectRef.current.y !== rect.y ||
        renderedRectRef.current.width !== rect.width ||
        renderedRectRef.current.height !== rect.height ||
        renderedRectRef.current.isMobile !== rect.isMobile
      ) {
        renderedRectRef.current = rect;
        onRenderRectChange?.(rect);
      }

      // 3. Locate best available frame in cache
      const target = targetFrameRef.current;
      const cache = imageCacheRef.current;
      let imgToDraw: HTMLImageElement | undefined = cache.get(target);

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

      // 4. Paint to canvases only when a valid frame is ready (NEVER flash black!)
      if (imgToDraw && imgToDraw.complete && imgToDraw.naturalWidth > 0) {
        // Draw Background Ambient Extension (Enlarged blurred version of SAME current frame)
        // Completely fills screen with zero black letterbox bars on mobile, tablet, or ultrawide
        const bgScale = Math.max(windowW / FRAME_WIDTH, windowH / FRAME_HEIGHT) * 1.15;
        const bgDrawW = FRAME_WIDTH * bgScale;
        const bgDrawH = FRAME_HEIGHT * bgScale;
        const bgDrawX = (windowW - bgDrawW) / 2;
        const bgDrawY = (windowH - bgDrawH) / 2;

        bgCtx.save();
        bgCtx.scale(0.5 * dpr, 0.5 * dpr);
        bgCtx.drawImage(imgToDraw, bgDrawX, bgDrawY, bgDrawW, bgDrawH);
        bgCtx.restore();

        // Draw Sharp Foreground 16:9 Frame
        fgCtx.save();
        fgCtx.scale(dpr, dpr);
        fgCtx.clearRect(0, 0, windowW, windowH);
        fgCtx.drawImage(imgToDraw, drawX, drawY, drawW, drawH);
        fgCtx.restore();

        lastDrawnFrameRef.current = target;
      }
    }, [onRenderRectChange]);

    // Master render loop using requestAnimationFrame to coalesce rapid scroll updates
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

    return (
      <div
        id="page-02-sequence-container"
        className={`fixed inset-0 overflow-hidden pointer-events-none select-none bg-[#181210] ${className}`}
        aria-hidden="true"
      >
        {/* Layer 1: Ambient Backdrop Canvas — Enlarged blurred version of SAME current frame */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <canvas
            ref={bgCanvasRef}
            className="w-full h-full block filter blur-3xl brightness-75 scale-110"
            style={{ willChange: 'transform' }}
          />
        </div>

        {/* Layer 2: Sharp Foreground 16:9 Frame Canvas — Crisp character, 3 rings, 10 connections */}
        <canvas
          ref={fgCanvasRef}
          className="absolute inset-0 w-full h-full block pointer-events-none"
          style={{
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        />

        {/* Layer 3: Soft ambient vignette blending outer edges into warm portfolio palette */}
        <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-20 mix-blend-multiply" />
      </div>
    );
  }
);

Page02SequenceCanvas.displayName = 'Page02SequenceCanvas';
