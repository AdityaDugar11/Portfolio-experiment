import { useEffect, useRef, useCallback, forwardRef } from 'react';

interface Page02SequenceCanvasProps {
  progress: number; // 0.0 to 1.0 (scrubbed directly by GSAP ScrollTrigger)
  className?: string;
}

const TOTAL_FRAMES = 240;
const FRAME_WIDTH = 1280;
const FRAME_HEIGHT = 720;

const getFrameUrl = (index: number): string => {
  const frameNum = Math.min(Math.max(index + 1, 1), TOTAL_FRAMES);
  const padded = String(frameNum).padStart(4, '0');
  return `/frames/page-02/frame_${padded}.webp`;
};

export const Page02SequenceCanvas = forwardRef<HTMLDivElement, Page02SequenceCanvasProps>(
  ({ progress, className = '' }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imageCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
    const loadingSetRef = useRef<Set<number>>(new Set());
    const lastDrawnFrameRef = useRef<number>(-1);
    const targetFrameRef = useRef<number>(0);
    const animFrameRef = useRef<number | null>(null);

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
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        targetFrameRef.current = progress > 0.5 ? TOTAL_FRAMES - 1 : 0;
      } else {
        const clamped = Math.min(Math.max(progress, 0), 1);
        targetFrameRef.current = Math.round(clamped * (TOTAL_FRAMES - 1));
      }

      triggerSlidingPreload(targetFrameRef.current);
    }, [progress, triggerSlidingPreload]);

    // Draw frame to canvas using COVER mode so mobile, tablet, and desktop fill 100% of viewport with ZERO black letterboxing
    const drawCurrentFrame = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return;

      const windowW = window.innerWidth;
      const windowH = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);

      const targetCanvasW = Math.round(windowW * dpr);
      const targetCanvasH = Math.round(windowH * dpr);
      if (canvas.width !== targetCanvasW || canvas.height !== targetCanvasH) {
        canvas.width = targetCanvasW;
        canvas.height = targetCanvasH;
      }

      // Responsive COVER calculation:
      // Computes the scale factor to ensure the pastel sky and character completely fill the screen
      const scale = Math.max(windowW / FRAME_WIDTH, windowH / FRAME_HEIGHT);
      const drawW = Math.round(FRAME_WIDTH * scale);
      const drawH = Math.round(FRAME_HEIGHT * scale);
      const drawX = Math.round((windowW - drawW) / 2);
      const drawY = Math.round((windowH - drawH) / 2);

      const target = targetFrameRef.current;
      const cache = imageCacheRef.current;

      // Find the best frame to draw: exact target, or closest available cached frame (NEVER black frame!)
      let imgToDraw: HTMLImageElement | undefined = cache.get(target);

      if (!imgToDraw || !imgToDraw.complete) {
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
    }, []);

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

    return (
      <div
        ref={ref}
        id="page-02-sequence-container"
        className={`fixed inset-0 overflow-hidden pointer-events-none select-none bg-[#181210] ${className}`}
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
        {/* Soft atmospheric gradient vignette blending edges seamlessly */}
        <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-25 mix-blend-multiply" />
      </div>
    );
  }
);

Page02SequenceCanvas.displayName = 'Page02SequenceCanvas';
