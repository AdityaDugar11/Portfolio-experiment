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

  // Debug HUD is FALSE by default (only visible if ?debug=1 or on pressing 'D')
  const [showDebugHUD, setShowDebugHUD] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === '1' || params.get('debug') === 'true';
  });

  // Subtle mouse parallax state (restrained: max 4px)
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

  // Keyboard shortcut: Press 'D' to toggle debug diagnostics
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        setShowDebugHUD((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  // Subtle, restrained cursor parallax (gentle damping lerp, respects reduced motion)
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const normX = (e.clientX / innerWidth - 0.5) * 2; // -1 to 1
      const normY = (e.clientY / innerHeight - 0.5) * 2; // -1 to 1

      // Subtle restrained max offset: ±4px horizontal, ±2px vertical
      targetOffsetRef.current = {
        x: normX * 4,
        y: normY * 2,
      };
    };

    const handleMouseLeave = () => {
      targetOffsetRef.current = { x: 0, y: 0 };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    const render = () => {
      currentOffsetRef.current.x += (targetOffsetRef.current.x - currentOffsetRef.current.x) * 0.08;
      currentOffsetRef.current.y += (targetOffsetRef.current.y - currentOffsetRef.current.y) * 0.08;

      if (portraitRef.current) {
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
          - Subtle restrained color treatment to restore natural pastel
            pink, peach, soft lavender and periwinkle blue without artificial saturation
          - Zero dark overlay tinting that muddies the sky
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
          className="w-full h-full object-cover object-center pointer-events-none scale-[1.02]"
          style={{
            filter: 'saturate(1.22) contrast(1.05) brightness(1.03)',
          }}
        />
      </div>

      {/* ========================================================
          LAYER 2: FOREGROUND REALISTIC PORTRAIT LAYER
          - Revised transparent PNG (`aditya-transparent.png`) with
            extended, anatomically rounded right shoulder and sleeve drape
          - Scaled for commanding photographic presence (92vh)
          - Natural bottom anchoring directly at viewport bottom
          - Original face, hair, and clothing pixels 100% UNTOUCHED
          - filter: none (zero color adjustments on the portrait)
          ======================================================== */}
      <div
        ref={portraitRef}
        id="portrait-layer"
        className="absolute bottom-0 left-1/2 z-10 will-change-transform pointer-events-none"
        style={{
          transform: 'translate3d(-50%, 0, 0)',
          height: '92vh',
          maxHeight: '92vh',
        }}
      >
        <img
          src="/assets/page-02/aditya-transparent.png"
          alt="Aditya Dugar"
          className="h-full w-auto object-contain object-bottom block select-none pointer-events-none"
          style={{
            aspectRatio: '1175 / 1448',
            filter: 'none',
          }}
          draggable={false}
        />
      </div>

      {/* ========================================================
          LAYER 3: DEBUG DIAGNOSTICS (HIDDEN BY DEFAULT)
          - Only visible when explicitly requested (?debug=1 or press 'D')
          - Clean presentation has ZERO developer overlays
          ======================================================== */}
      {showDebugHUD && (
        <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="px-3.5 py-1.5 rounded-full bg-[#181210]/80 backdrop-blur-md border border-[#FAF7F2]/15 text-xs text-[#FAF7F2]/90 font-mono shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF7E67] animate-pulse" />
              <span className="font-semibold tracking-wide">PAGE 02 DEBUG</span>
              <span className="text-[#FAF7F2]/40">|</span>
              <span className="text-[#FAF7F2]/70">Extended Shoulder</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="hidden sm:flex items-center px-3 py-1.5 rounded-full bg-[#181210]/80 backdrop-blur-md border border-[#FAF7F2]/15 text-xs font-mono text-[#FAF7F2]/80">
              <span>Viewport:</span>
              <span className="ml-1.5 text-[#FF7E67] font-semibold">
                {viewportSize.w} × {viewportSize.h}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#181210]/80 backdrop-blur-md border border-[#FAF7F2]/15 text-xs font-mono text-[#FAF7F2]/80">
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

            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="px-3.5 py-1.5 rounded-full bg-[#FAF7F2]/10 hover:bg-[#FAF7F2]/20 backdrop-blur-md border border-[#FAF7F2]/20 text-xs font-mono text-[#FAF7F2] transition-colors cursor-pointer"
              >
                Exit ✕
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Page02PortraitPrototype;
