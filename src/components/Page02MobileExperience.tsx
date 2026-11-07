import React, { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CHAPTERS_DATA } from '../data/chaptersData';
import { ArrowUp, Mail, Sparkles } from 'lucide-react';
import { renderMobileFrameToContext } from '../utils/mobileFrameHelper';

gsap.registerPlugin(ScrollTrigger);

interface Page02MobileExperienceProps {
  transitionProgress: number; // 0.0 to 1.0 from Page 01 -> Page 02 shader transition
  className?: string;
  onExploreWork?: () => void;
  onStartJourney?: () => void;
  onOpenContact?: () => void;
}

const TOTAL_FRAMES = 240;

const getFrameUrl = (index: number): string => {
  const frameNum = Math.min(Math.max(index + 1, 1), TOTAL_FRAMES);
  const padded = String(frameNum).padStart(4, '0');
  return `/frames/page-02/frame_${padded}.webp`;
};

export const Page02MobileExperience: React.FC<Page02MobileExperienceProps> = ({
  transitionProgress,
  className = '',
  onExploreWork,
  onStartJourney,
  onOpenContact,
}) => {
  // Section A Animation Runway Ref & Pinned Stage Ref
  const runwayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardsSectionRef = useRef<HTMLElement | null>(null);

  // Frame Cache & Loading Refs
  const imageCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const loadingSetRef = useRef<Set<number>>(new Set());
  const lastDrawnFrameRef = useRef<number>(-1);
  const targetFrameRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Scroll Progress State for Section A (0.0 to 1.0)
  const [animationProgress, setAnimationProgress] = useState(0);
  // Settle progress when cards enter (0.0 to 1.0)
  const [stageSettleProgress, setStageSettleProgress] = useState(0);

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

  // Sliding window preloading around current center frame
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

  // Initial preload on mount: Frame 0 (first paint) + Frame 239 (final state) + initial buffer
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

  // Master draw function for the portrait mobile canvas
  // Uses shared renderMobileFrameToContext to guarantee 100% pixel-perfect alignment with SceneTransitionCanvas
  const drawCurrentFrame = useCallback(() => {
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

    // Locate best available frame in cache
    const target = targetFrameRef.current;
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

    // Paint using the exact shared rendering function — NEVER flash black!
    if (imgToDraw && imgToDraw.complete && imgToDraw.naturalWidth > 0) {
      renderMobileFrameToContext(ctx, imgToDraw, windowW, windowH, dpr);
      lastDrawnFrameRef.current = target;
    }
  }, []);

  // Update target frame deterministically from scroll progress
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      targetFrameRef.current = animationProgress > 0.5 ? TOTAL_FRAMES - 1 : 0;
    } else {
      const clamped = Math.min(Math.max(animationProgress, 0), 1);
      targetFrameRef.current = Math.min(
        Math.max(Math.round(clamped * (TOTAL_FRAMES - 1)), 0),
        TOTAL_FRAMES - 1
      );
    }

    triggerSlidingPreload(targetFrameRef.current);
  }, [animationProgress, triggerSlidingPreload]);

  // Render loop using requestAnimationFrame to coalesce rapid scroll updates
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

  // Section A ScrollTrigger Choreography (scrubs the 240 frames through dedicated mobile runway)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 768) return;
    if (!runwayRef.current) return;

    const ctx = gsap.context(() => {
      // 1. Scrub 240 frames during mobile runway
      gsap.timeline({
        scrollTrigger: {
          trigger: runwayRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.3,
          onUpdate: (self) => {
            const p = Math.min(Math.max(self.progress, 0), 1);
            setAnimationProgress(p);
          },
          onToggle: (self) => {
            if (self.progress >= 0.99) setAnimationProgress(1.0);
          },
        },
      });

      // 2. Cinematic recede / settling effect when cards section enters
      if (cardsSectionRef.current) {
        ScrollTrigger.create({
          trigger: cardsSectionRef.current,
          start: 'top bottom',
          end: 'top 30%',
          scrub: true,
          onUpdate: (self) => {
            setStageSettleProgress(self.progress);
          },
        });
      }
    });

    return () => {
      ctx.revert();
    };
  }, []);

  // Visual visibility of the fixed portrait stage:
  // Fades in with transitionProgress during transition runway,
  // Stays 1.0 throughout animation sequence and initial card entry,
  // Gently recedes as cards slide over it.
  const stageBaseOpacity = transitionProgress > 0 ? Math.min(transitionProgress * 1.25, 1.0) : 0;
  const stageScale = 1.0 - stageSettleProgress * 0.04; // 1.0 -> 0.96 gentle cinematic recede
  const stageOpacity = stageBaseOpacity * Math.max(0, 1.0 - stageSettleProgress * 0.35);

  return (
    <div
      id="page-02-mobile-container"
      className={`relative w-full text-[#FAF6F0] select-none ${className}`}
    >
      {/* =========================================================================
          SECTION A — PORTRAIT CHARACTER FIXED STAGE
          Fixed inset-0 visual layer mounted behind SceneTransitionCanvas.
          Does NOT slide up like a document page.
          Revealed smoothly through the WebGL shader transition.
          Deterministically scrubs 240 frames as user scrolls through Section A runway.
          Gently settles as Section B cards scroll into view.
          Strictly NO unrelated page labels or progress bars obstructing the portrait.
          ========================================================================= */}
      <div
        ref={stageRef}
        id="mobile-portrait-stage"
        className="fixed inset-0 z-10 block md:hidden pointer-events-none select-none overflow-hidden"
        style={{
          opacity: stageOpacity,
          transform: `scale(${stageScale})`,
          transformOrigin: 'center center',
          visibility: stageBaseOpacity > 0 ? 'visible' : 'hidden',
          willChange: 'transform, opacity',
        }}
        aria-label="Portrait Character Animation Sequence"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block pointer-events-none"
          style={{
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        />
      </div>

      {/* =========================================================================
          SECTION A RUNWAY — 240-FRAME SCROLL SCRUB RUNWAY
          Sits immediately following Page 01 -> 02 transition runway in document flow.
          Provides deterministic scroll distance for the 240 WebP frames.
          ========================================================================= */}
      <div
        ref={runwayRef}
        id="mobile-portrait-runway"
        className="relative w-full h-[220vh] pointer-events-none"
        aria-hidden="true"
      />

      {/* =========================================================================
          SECTION B — TEN CHAPTER CARDS IN NORMAL DOCUMENT FLOW
          Placed immediately below the 240-frame animation runway in normal flow.
          ZERO black gap between portrait and cards.
          Smooth background transition continuing the pastel atmosphere into warm sandstone.
          Compact, elegant editorial story markers with delicate coral connection rail.
          Native one-finger vertical touch scrolling for all 10 cards.
          Card 10 is completely accessible and never clipped.
          ========================================================================= */}
      <section
        ref={cardsSectionRef}
        id="mobile-section-b-chapters"
        className="relative z-20 w-full min-h-screen text-[#FAF6F0] pt-6 pb-24 px-4 sm:px-6 pointer-events-auto"
        style={{
          background:
            'linear-gradient(180deg, rgba(30,20,18,0.35) 0%, rgba(34,22,20,0.92) 70px, #221614 140px, #261916 45%, #221614 75%, #181210 100%)',
        }}
        aria-label="Ten Chapter Cards Constellation"
      >
        {/* Atmospheric ambient lighting blurs carrying sunset warmth across the cards */}
        <div
          className="absolute top-0 right-0 w-72 h-72 rounded-full bg-gradient-to-br from-[#E06D53]/12 to-[#F4B896]/0 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/4 -left-12 w-64 h-64 rounded-full bg-gradient-to-tr from-[#8FA9C4]/10 to-transparent blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-2/3 right-0 w-80 h-80 rounded-full bg-[#E06D53]/8 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Subtle Editorial Section Header */}
        <div className="relative max-w-md mx-auto mb-6 text-center px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E06D53]/15 border border-[#E06D53]/35 mb-2">
            <Sparkles className="w-3 h-3 text-[#E06D53]" />
            <span className="font-mono text-[9.5px] tracking-widest uppercase text-[#E06D53] font-bold">
              Ten Chapters
            </span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#FAF6F0] tracking-tight">
            Curiosity to Connected Systems
          </h3>
          <p className="font-sans text-[11.5px] text-[#FAF6F0]/75 mt-1 leading-relaxed max-w-xs mx-auto">
            A journey through software engineering, intelligent systems, Linux architecture, and collaborative craft.
          </p>
        </div>

        {/* Clean Vertical Rail with Ten Numbered Coral Nodes & Compact Editorial Cards */}
        <div className="relative max-w-md mx-auto">
          {/* Subtle Continuous Coral Connection Rail Line */}
          <div
            className="absolute left-[16px] top-4 bottom-8 w-[1.5px] bg-gradient-to-b from-[#E06D53] via-[#E06D53]/60 to-[#E06D53]/30 pointer-events-none"
            aria-hidden="true"
          />

          {/* Ten Compact Chapter Cards List */}
          <div className="space-y-3.5">
            {CHAPTERS_DATA.map((chapter) => {
              // Show quotation only on key anchor chapters (01, 06, 10) to keep cards compact & editorial
              const showQuote =
                (chapter.id === 'chapter-01' || chapter.id === 'chapter-06' || chapter.id === 'chapter-10') &&
                !!chapter.headline;

              return (
                <div
                  key={chapter.id}
                  id={`chapter-card-${chapter.id}`}
                  className="relative flex items-start group"
                >
                  {/* Numbered Coral Node Beacon */}
                  <div className="relative z-10 flex-shrink-0 w-8 flex items-center justify-center pt-2">
                    <div className="w-7 h-7 rounded-full bg-[#FAF6F0] border-[1.5px] border-[#E06D53] shadow-[0_0_8px_rgba(224,109,83,0.35)] flex items-center justify-center transition-transform duration-200">
                      <span className="font-mono text-[10px] font-bold text-[#E06D53]">
                        {chapter.number}
                      </span>
                    </div>
                  </div>

                  {/* Delicate Horizontal Connector Line to Card */}
                  <div
                    className="w-2.5 h-[1.5px] bg-[#E06D53]/55 self-start mt-5 flex-shrink-0 pointer-events-none"
                    aria-hidden="true"
                  />

                  {/* Compact Editorial Story Marker Card */}
                  <div
                    role="article"
                    tabIndex={0}
                    aria-label={`${chapter.displayNumber}: ${chapter.title}`}
                    className="flex-1 bg-[#FAF6F0] text-[#2A1B16] rounded-xl px-3.5 py-3 border border-[#E06D53]/20 shadow-[0_4px_16px_rgba(0,0,0,0.22)] active:scale-[0.99] transition-all cursor-default"
                  >
                    {/* Top Meta: Category + Chapter Number */}
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-[#2A1B16]/60 font-semibold truncate">
                        {chapter.category.split('·')[0].trim()}
                      </span>
                      <span className="font-mono text-[8.5px] font-bold text-[#E06D53] tracking-widest shrink-0">
                        {chapter.displayNumber}
                      </span>
                    </div>

                    {/* Chapter Title */}
                    <h4 className="font-serif text-sm sm:text-base font-bold text-[#2A1B16] leading-snug">
                      {chapter.title}
                    </h4>

                    {/* Concise Summary */}
                    <p className="font-sans text-[11px] text-[#2A1B16]/80 mt-1 leading-relaxed">
                      {chapter.summary}
                    </p>

                    {/* Selected Editorial Headline Quote */}
                    {showQuote && (
                      <p className="font-serif italic text-[10.5px] text-[#E06D53] mt-2 pt-1.5 border-t border-[#2A1B16]/10 leading-snug">
                        “{chapter.headline}”
                      </p>
                    )}

                    {/* Interactive CTAs on Milestone Cards */}
                    {chapter.id === 'chapter-06' && onExploreWork && (
                      <div className="mt-2 pt-1.5 border-t border-[#2A1B16]/10 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onExploreWork();
                          }}
                          className="font-mono text-[10.5px] font-bold text-[#E06D53] hover:text-[#2A1B16] transition-colors"
                        >
                          {chapter.ctaLabel}
                        </button>
                      </div>
                    )}

                    {chapter.id === 'chapter-10' && onOpenContact && (
                      <div className="mt-2 pt-1.5 border-t border-[#2A1B16]/10 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenContact();
                          }}
                          className="font-mono text-[10.5px] font-bold text-[#E06D53] hover:text-[#2A1B16] transition-colors"
                        >
                          {chapter.ctaLabel}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Terminal Rail Anchor & Navigation Actions */}
          <div className="mt-10 pt-6 border-t border-[#E06D53]/20 flex flex-col items-center gap-3.5 text-center">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E06D53]" />
              <span className="font-mono text-[9.5px] uppercase tracking-widest text-[#FAF6F0]/70 font-bold">
                Constellation Complete
              </span>
            </div>

            <p className="font-serif italic text-xs text-[#F4B896] max-w-xs">
              “Good work often begins with a conversation.”
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (onStartJourney) {
                    onStartJourney();
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-bold tracking-wider uppercase text-[#FAF6F0] bg-[#181210] border border-[#E06D53]/60 hover:border-[#E06D53] shadow-md transition-all active:scale-95"
              >
                <ArrowUp className="w-3.5 h-3.5 text-[#E06D53]" />
                <span>Return to Start</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenContact) onOpenContact();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-bold tracking-wider uppercase text-white bg-gradient-to-r from-[#E06D53] to-[#D48870] shadow-[0_4px_16px_rgba(224,109,83,0.35)] transition-all active:scale-95"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Get in Touch</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Page02MobileExperience;
