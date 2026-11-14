import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Page02PortraitPrototypeProps {
  onExit?: () => void;
}

export const Page02PortraitPrototype: React.FC<Page02PortraitPrototypeProps> = ({ onExit }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);

  // Playback & visibility state
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(10);
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [showHUD, setShowHUD] = useState(true);

  // Subtle mouse parallax state (restrained: max 5px)
  const targetOffsetRef = useRef({ x: 0, y: 0 });
  const currentOffsetRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);

  // Track viewport dimensions
  useEffect(() => {
    const updateSize = () => {
      setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Video visibility management: pause when not visible, play when visible
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        video.pause();
      } else if (!hasEnded) {
        video.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    let observer: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window && containerRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !document.hidden && !hasEnded) {
              video.play().catch(() => {});
            } else {
              video.pause();
            }
          });
        },
        { threshold: 0.2 }
      );
      observer.observe(containerRef.current);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer?.disconnect();
    };
  }, [hasEnded]);

  // Subtle, restrained cursor parallax (damping lerp, respects reduced motion)
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const normX = (e.clientX / innerWidth - 0.5) * 2; // -1 to 1
      const normY = (e.clientY / innerHeight - 0.5) * 2; // -1 to 1

      // Subtle restrained max offset: ±5px horizontal, ±3px vertical
      targetOffsetRef.current = {
        x: normX * 5,
        y: normY * 3,
      };
    };

    const handleMouseLeave = () => {
      targetOffsetRef.current = { x: 0, y: 0 };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    // Smooth RAF loop for lerping
    const render = () => {
      currentOffsetRef.current.x += (targetOffsetRef.current.x - currentOffsetRef.current.x) * 0.08;
      currentOffsetRef.current.y += (targetOffsetRef.current.y - currentOffsetRef.current.y) * 0.08;

      if (portraitRef.current) {
        // Foreground moves with cursor
        portraitRef.current.style.transform = `translate3d(calc(-50% + ${currentOffsetRef.current.x.toFixed(2)}px), ${currentOffsetRef.current.y.toFixed(2)}px, 0)`;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleReplay = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => {
        setHasEnded(false);
      }).catch(console.warn);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      id="page-02-portrait-prototype"
      className="relative w-full h-screen overflow-hidden bg-[#181210] select-none"
    >
      {/* ========================================================
          LAYER 1: PASTEL SKY BACKGROUND VIDEO
          - Autoplay, muted, playsInline, static poster fallback
          - Strictly no loop until seamless loop verified
          ======================================================== */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          ref={videoRef}
          src="/assets/page-02/pastel-sky.mp4"
          poster="/assets/page-02/pastel-sky-poster.jpg"
          autoPlay
          muted
          playsInline
          loop={false}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            setHasEnded(true);
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            setCurrentTime(v.currentTime);
            if (v.duration) setDuration(v.duration);
          }}
          className="w-full h-full object-cover object-center pointer-events-none scale-[1.03]"
        />

        {/* Subtle atmospheric vignette and floor grounding gradient
            Applied strictly behind subject, never over face */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 90% 85% at 50% 50%, transparent 55%, rgba(24, 18, 16, 0.28) 100%), linear-gradient(to top, rgba(24, 18, 16, 0.38) 0%, rgba(24, 18, 16, 0.12) 18%, transparent 45%)',
          }}
        />
      </div>

      {/* ========================================================
          LAYER 2: FOREGROUND REALISTIC PORTRAIT LAYER
          - Transparent PNG (`aditya-transparent.png`)
          - Anchored naturally at the bottom
          - Complete portrait preserved without stretching
          - Subtle restrained positioning animation (no facial distortion, no artificial glow)
          ======================================================== */}
      <div
        ref={portraitRef}
        className="absolute bottom-0 left-1/2 z-10 will-change-transform pointer-events-none"
        style={{
          transform: 'translate3d(-50%, 0, 0)',
          height: '84vh',
          maxHeight: '84vh',
        }}
      >
        <img
          src="/assets/page-02/aditya-transparent.png"
          alt="Aditya Dugar"
          className="h-full w-auto object-contain object-bottom block select-none pointer-events-none filter-none"
          style={{
            aspectRatio: '1086 / 1448',
          }}
          draggable={false}
        />
      </div>

      {/* ========================================================
          LAYER 3: PROTOTYPE DIAGNOSTIC HUD & EXIT CONTROLLER
          - Viewport indicator (1440x900 / 1280x720 validation)
          - Video playback status & replay control
          - Seamless exit back to main experience
          ======================================================== */}
      {showHUD && (
        <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
          {/* Left: Project title & Prototype identifier */}
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="px-3.5 py-1.5 rounded-full bg-[#181210]/75 backdrop-blur-md border border-[#FAF7F2]/15 text-xs text-[#FAF7F2]/90 font-mono shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF7E67] animate-pulse" />
              <span className="font-semibold tracking-wide">PAGE 02 PROTOTYPE</span>
              <span className="text-[#FAF7F2]/40">|</span>
              <span className="text-[#FAF7F2]/70">Portrait + Sky Compositing</span>
            </div>
          </div>

          {/* Right: Controls & Metrics */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Resolution Badge */}
            <div className="hidden sm:flex items-center px-3 py-1.5 rounded-full bg-[#181210]/75 backdrop-blur-md border border-[#FAF7F2]/15 text-xs font-mono text-[#FAF7F2]/80">
              <span>Viewport:</span>
              <span className="ml-1.5 text-[#FF7E67] font-semibold">
                {viewportSize.w} × {viewportSize.h}
              </span>
            </div>

            {/* Video Status & Replay */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#181210]/75 backdrop-blur-md border border-[#FAF7F2]/15 text-xs font-mono text-[#FAF7F2]/80">
              <span>Video:</span>
              <span className={isPlaying ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {isPlaying ? 'Playing' : hasEnded ? 'Ended' : 'Paused'}
              </span>
              <span className="text-[#FAF7F2]/40">({currentTime.toFixed(1)}s/{duration.toFixed(0)}s)</span>
              {hasEnded && (
                <button
                  type="button"
                  onClick={handleReplay}
                  className="ml-1 text-xs text-[#FF7E67] hover:underline cursor-pointer font-semibold"
                >
                  ↻ Replay
                </button>
              )}
            </div>

            {/* Hide HUD Toggle */}
            <button
              type="button"
              onClick={() => setShowHUD(false)}
              className="px-2.5 py-1.5 rounded-full bg-[#181210]/75 hover:bg-[#181210] backdrop-blur-md border border-[#FAF7F2]/15 text-xs font-mono text-[#FAF7F2]/70 hover:text-white transition-colors cursor-pointer"
              title="Hide HUD (Press H to restore)"
            >
              Hide HUD
            </button>

            {/* Return to Full Site */}
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="px-3.5 py-1.5 rounded-full bg-[#FAF7F2]/10 hover:bg-[#FAF7F2]/20 backdrop-blur-md border border-[#FAF7F2]/20 text-xs font-mono text-[#FAF7F2] transition-colors cursor-pointer"
              >
                Exit Prototype ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating restore button when HUD is hidden */}
      {!showHUD && (
        <button
          type="button"
          onClick={() => setShowHUD(true)}
          className="absolute top-4 right-4 z-30 px-3 py-1.5 rounded-full bg-[#181210]/60 hover:bg-[#181210]/90 backdrop-blur-md border border-[#FAF7F2]/15 text-xs font-mono text-[#FAF7F2]/60 hover:text-white transition-colors cursor-pointer"
        >
          Show HUD
        </button>
      )}

      {/* Subtle bottom caption */}
      <div className="absolute bottom-4 left-6 z-20 pointer-events-none hidden md:block">
        <p className="text-[11px] font-mono tracking-widest text-[#FAF7F2]/40 uppercase">
          Aditya Dugar · The Living Signal · Isolated Composure Prototype
        </p>
      </div>
    </div>
  );
};

export default Page02PortraitPrototype;
