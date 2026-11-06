import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

export interface RenderedRect {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
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
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imageCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
    const loadingSetRef = useRef<Set<number>>(new Set());
    const lastDrawnFrameRef = useRef<number>(-1);
    const targetFrameRef = useRef<number>(0);
    const renderedRectRef = useRef<RenderedRect>({ x: 0, y: 0, width: 0, height: 0, scale: 1 });
    const animFrameRef = useRef<number | null>(null);

    // Expose rendered rectangle to parent for SVG connector tracking
    useImperativeHandle(ref, () => ({
      getRenderedRect: () => renderedRectRef.current,
    }));

    // Preload a single frame with async decode
    const preloadFrame = useCallback((index: number): Promise<HTMLImageElement> => {
      const clamped = Math.min(Math.max(index, 0), TOTAL_FRAMES - 1);
      const cache = imageCacheRef.current;

      if (cache.has(clamped)) {
        return Promise.resolve(cache.get(clamped)!);
      }

      if (loadingSetRef.current.has(clamped)) {
        return new Promise((resolve) => {
          const check = () => {
            if (cache.has(clamped)) resolve(cache.get(clamped)!);
            else setTimeout(check, 16);
          };
          check();
        });
      }

      loadingSetRef.current.add(clamped);

      return new Promise((resolve) => {
        const img = new Image();
        img.src = getFrameUrl(clamped);
        img.onload = () => {
          if ('decode' in img) {
            img.decode().catch(() => {}).finally(() => {
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
    const triggerSlidingPreload = useCallback((centerIndex: number) => {
      const PRELOAD_AHEAD = 16;
      const PRELOAD_BEHIND = 8;
      const start = Math.max(0, centerIndex - PRELOAD_BEHIND);
      const end = Math.min(TOTAL_FRAMES - 1, centerIndex + PRELOAD_AHEAD);

      for (let i = start; i <= end; i++) {
        if (!imageCacheRef.current.has(i) && !loadingSetRef.current.has(i)) {
          preloadFrame(i);
        }
      }
    }, [preloadFrame]);

    // Initial preload: Frame 0 (instant first paint) + Milestone frames
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
          // Also buffer first 24 frames
          for (let i = 1; i < 24; i++) {
            if (isMounted) preloadFrame(i);
          }
        }
      });

      return () => {
        isMounted = false;
      };
    }, [preloadFrame]);

    // Compute target frame index from scroll progress (0..1 -> 0..239)
    useEffect(() => {
      // Reduced motion check
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        targetFrameRef.current = progress > 0.5 ? TOTAL_FRAMES - 1 : 0;
      } else {
        const clamped = Math.min(Math.max(progress, 0), 1);
        targetFrameRef.current = Math.round(clamped * (TOTAL_FRAMES - 1));
      }

      triggerSlidingPreload(targetFrameRef.current);
    }, [progress, triggerSlidingPreload]);

    // Draw frame to canvas preserving 16:9 aspect ratio and tracking bounding box
    const drawCurrentFrame = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return;

      const windowW = window.innerWidth;
      const windowH = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);

      // Set canvas physical buffer dimensions
      const targetCanvasW = Math.round(windowW * dpr);
      const targetCanvasH = Math.round(windowH * dpr);
      if (canvas.width !== targetCanvasW || canvas.height !== targetCanvasH) {
        canvas.width = targetCanvasW;
        canvas.height = targetCanvasH;
      }

      // Calculate 16:9 'contain' dimensions to ensure character, 3 rings and 10 endpoints remain 100% visible
      let drawW: number;
      let drawH: number;
      const screenAspect = windowW / windowH;

      if (screenAspect > FRAME_ASPECT) {
        // Wider screen: fit height, letterbox left/right
        drawH = windowH;
        drawW = windowH * FRAME_ASPECT;
      } else {
        // Taller/narrower screen: fit width, letterbox top/bottom
        drawW = windowW;
        drawH = windowW / FRAME_ASPECT;
      }

      const drawX = (windowW - drawW) / 2;
      const drawY = (windowH - drawH) / 2;

      // Update rendered rect for coordinate mapping
      const rect: RenderedRect = {
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH,
        scale: drawW / FRAME_WIDTH,
      };

      if (
        renderedRectRef.current.x !== rect.x ||
        renderedRectRef.current.y !== rect.y ||
        renderedRectRef.current.width !== rect.width ||
        renderedRectRef.current.height !== rect.height
      ) {
        renderedRectRef.current = rect;
        onRenderRectChange?.(rect);
      }

      const target = targetFrameRef.current;
      const cache = imageCacheRef.current;

      // Find the best frame to draw: exact target, or closest available cached frame (NEVER black frame!)
      let imgToDraw: HTMLImageElement | undefined = cache.get(target);

      if (!imgToDraw || !imgToDraw.complete) {
        // Find closest cached frame
        let closestDist = Infinity;
        let closestIndex = lastDrawnFrameRef.current;

        for (const [idx, cachedImg] of cache.entries()) {
          if (cachedImg.complete) {
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

      if (imgToDraw && imgToDraw.complete) {
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, windowW, windowH);
        ctx.drawImage(imgToDraw, drawX, drawY, drawW, drawH);
        ctx.restore();
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
        className={`fixed inset-0 overflow-hidden pointer-events-none select-none ${className}`}
        aria-hidden="true"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        />
        {/* Soft atmospheric radial gradient at outer screen edges to blend with surrounding canvas */}
        <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-40 mix-blend-multiply" />
      </div>
    );
  }
);

Page02SequenceCanvas.displayName = 'Page02SequenceCanvas';
