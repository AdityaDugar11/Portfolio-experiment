import React, { useState, useEffect, useRef, useCallback } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BackgroundVideo } from './components/BackgroundVideo';
import { Navigation } from './components/Navigation';
import { HeroEditorial } from './components/HeroEditorial';
import { ContactModal } from './components/ContactModal';
import { Page02SequenceCanvas, RenderedRect } from './components/Page02SequenceCanvas';
import { ChapterCardsOverlay } from './components/ChapterCardsOverlay';
import { ChapterModal } from './components/ChapterModal';
import { ChapterItem, CHAPTERS_DATA } from './data/chaptersData';

gsap.registerPlugin(ScrollTrigger);

export const App: React.FC = () => {
  // Modal & Selection States
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<ChapterItem | null>(null);

  // Progress States
  const [page01Progress, setPage01Progress] = useState(0);
  const [page02Progress, setPage02Progress] = useState(0);
  const [activePage, setActivePage] = useState<'page-01' | 'page-02'>('page-01');

  // Canvas Tracking
  const [renderedRect, setRenderedRect] = useState<RenderedRect | null>(null);

  // Audio State (Maintained exactly as approved in Page 01)
  const [isMuted, setIsMuted] = useState(true);

  // Runway & Element Refs
  const page01RunwayRef = useRef<HTMLDivElement>(null);
  const page02RunwayRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const page02LayerRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  // Persistent native video audio toggle controller (Unchanged from approved Page 01)
  const handleToggleSound = useCallback(() => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      if (videoElementRef.current) {
        videoElementRef.current.muted = nextMuted;
        if (!nextMuted) {
          videoElementRef.current.volume = 0.75;
          if (videoElementRef.current.paused) {
            videoElementRef.current.play().catch(console.warn);
          }
        }
      }
      return nextMuted;
    });
  }, []);

  // 1. Initialize Lenis Smooth Scrolling & Synchronize with GSAP Ticker
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const updateLenis = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateLenis);
      lenis.destroy();
    };
  }, []);

  // 2. Setup GSAP ScrollTrigger Choreography (Page 01 Exit & Page 02 Entrance/Orbital scrubbing)
  useEffect(() => {
    if (!page01RunwayRef.current || !page02RunwayRef.current) return;

    const ctx = gsap.context(() => {
      const heroTextBlock = document.getElementById('hero-text-block');
      const mainNav = document.getElementById('main-navigation');
      const scrollIndicator = document.getElementById('scroll-indicator');

      // --- PAGE 01 SCROLL TIMELINE (Approved Exit Choreography) ---
      const page01Timeline = gsap.timeline({
        scrollTrigger: {
          trigger: page01RunwayRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6,
          onUpdate: (self) => {
            setPage01Progress(self.progress);
            if (self.progress < 0.85) {
              setActivePage('page-01');
            }
          },
        },
      });

      // Master normalized duration
      page01Timeline.to({}, { duration: 1.0 }, 0);

      // Camera Movement on Background Video Layer (0% to 100%)
      if (videoWrapperRef.current) {
        page01Timeline.fromTo(
          videoWrapperRef.current,
          {
            scale: 1.0,
            yPercent: 0,
            opacity: 1.0,
          },
          {
            scale: 1.14,
            yPercent: -2,
            opacity: 1.0,
            ease: 'none',
            duration: 0.75,
          },
          0
        );

        // Smooth cinematic dissolve out into Page 02 environment (0.75 to 1.0)
        page01Timeline.to(
          videoWrapperRef.current,
          {
            opacity: 0.0,
            ease: 'power2.inOut',
            duration: 0.25,
          },
          0.75
        );
      }

      // Smooth cinematic dissolve in of Page 02 environment and character (0.70 to 1.0)
      if (page02LayerRef.current) {
        page01Timeline.fromTo(
          page02LayerRef.current,
          {
            opacity: 0.0,
          },
          {
            opacity: 1.0,
            ease: 'power2.inOut',
            duration: 0.30,
          },
          0.70
        );
      }

      // Hero Editorial Text Block Exit (0.12 to 0.44 progress)
      if (heroTextBlock) {
        page01Timeline.fromTo(
          heroTextBlock,
          { opacity: 1, y: 0 },
          {
            opacity: 0,
            y: -60,
            ease: 'power2.inOut',
            duration: 0.32,
            onComplete: () => {
              heroTextBlock.style.pointerEvents = 'none';
            },
            onReverseComplete: () => {
              heroTextBlock.style.pointerEvents = 'auto';
            },
          },
          0.12
        );
      }

      // Navigation Header Exit (0.12 to 0.38 progress)
      if (mainNav) {
        page01Timeline.fromTo(
          mainNav,
          { opacity: 1, y: 0 },
          {
            opacity: 0,
            y: -35,
            ease: 'power2.inOut',
            duration: 0.26,
          },
          0.12
        );
      }

      // Right Scroll Indicator Exit (0.12 to 0.32 progress)
      if (scrollIndicator) {
        page01Timeline.fromTo(
          scrollIndicator,
          { opacity: 1 },
          {
            opacity: 0,
            ease: 'power2.inOut',
            duration: 0.20,
          },
          0.12
        );
      }

      // --- PAGE 02 SCROLL TIMELINE (240-Frame Sequence & 10 Connections Scrubbing) ---
      const page02Timeline = gsap.timeline({
        scrollTrigger: {
          trigger: page02RunwayRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.5,
          onUpdate: (self) => {
            setPage02Progress(self.progress);
            if (self.progress > 0.05) {
              setActivePage('page-02');
            }
          },
        },
      });

      // Directly maps Page 02 scroll runway (0.0 to 1.0) to the sequence progress
      page02Timeline.to({}, { duration: 1.0 }, 0);
    });

    return () => {
      ctx.revert();
    };
  }, []);

  // Smooth scroll triggers
  const handleStartJourney = () => {
    if (lenisRef.current && page02RunwayRef.current) {
      // Scroll to start of Page 02
      const targetY = page02RunwayRef.current.offsetTop;
      lenisRef.current.scrollTo(targetY, { duration: 1.8 });
    } else {
      page02RunwayRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleReturnToStart = () => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { duration: 1.6 });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleExploreWork = () => {
    // If Chapter 06 is clicked or explore work triggered:
    const ch06 = CHAPTERS_DATA.find((c) => c.id === 'chapter-06');
    if (ch06) setSelectedChapter(ch06);
  };

  const handleSelectChapter = (chapter: ChapterItem) => {
    if (chapter.ctaAction === 'contact') {
      setIsContactOpen(true);
    } else if (chapter.ctaAction === 'start') {
      handleReturnToStart();
    } else {
      setSelectedChapter(chapter);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#181210] text-[#FAF7F2]">
      {/* ========================================================
          PAGE 01 VISUAL LAYER (Background Video & Atmosphere)
          ======================================================== */}
      <BackgroundVideo
        ref={videoWrapperRef}
        videoRef={videoElementRef}
      />

      {/* ========================================================
          PAGE 02 VISUAL LAYER (240-Frame Sequence Canvas & Overlays)
          ======================================================== */}
      <div
        ref={page02LayerRef}
        id="page-02-visual-layer"
        className="fixed inset-0 z-10 pointer-events-none opacity-0 will-change-opacity"
        aria-hidden="true"
      >
        <Page02SequenceCanvas
          progress={page02Progress}
          onRenderRectChange={setRenderedRect}
        />

        <ChapterCardsOverlay
          progress={page02Progress}
          renderedRect={renderedRect}
          onSelectChapter={handleSelectChapter}
        />
      </div>

      {/* ========================================================
          PAGE 01 DOM UI LAYER (Header Navigation, Hero Editorial)
          ======================================================== */}
      <Navigation
        onOpenContact={() => setIsContactOpen(true)}
        isMuted={isMuted}
        onToggleSound={handleToggleSound}
        onNavigateSection={(section) => {
          if (section === 'work') handleExploreWork();
          if (section === 'journey') handleStartJourney();
          if (section === 'contact') setIsContactOpen(true);
        }}
      />

      <HeroEditorial
        onExploreWork={handleExploreWork}
        onStartJourney={handleStartJourney}
      />

      {/* ========================================================
          MODALS & DIALOGS
          ======================================================== */}
      {/* Page 01 Accessible Contact Modal Dialog */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />

      {/* Page 02 Accessible Chapter Narrative Modal */}
      <ChapterModal
        chapter={selectedChapter}
        onClose={() => setSelectedChapter(null)}
        onOpenContact={() => setIsContactOpen(true)}
        onExploreWork={handleExploreWork}
        onReturnToStart={handleReturnToStart}
      />

      {/* ========================================================
          SCROLL RUNWAYS (GSAP ScrollTrigger Pinned & Scrubbed)
          ======================================================== */}
      {/* Runway 1: Page 01 (Cinematic Video Zoom & Editorial Text Exit) */}
      <div
        ref={page01RunwayRef}
        id="page-01-runway"
        className="relative w-full h-[220vh] pointer-events-none"
        aria-hidden="true"
      />

      {/* Runway 2: Page 02 (240-Frame Scrubbing, 3 Rings & 10 Connections Reveal) */}
      <div
        ref={page02RunwayRef}
        id="page-02-runway"
        className="relative w-full h-[350vh] pointer-events-none"
        aria-hidden="true"
      />

      {/* ========================================================
          PERSISTENT PAGE & PROGRESS INDICATOR
          ======================================================== */}
      <div className="fixed bottom-4 left-6 z-30 flex items-center gap-2 text-[10px] tracking-widest uppercase font-mono text-signal-ivory/60 pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
        <span className="w-1.5 h-1.5 rounded-full bg-signal-coral shadow-[0_0_6px_#E06D53]" />
        <span>
          {activePage === 'page-01'
            ? `Page 01 · Initial Exit · ${(page01Progress * 100).toFixed(0)}%`
            : `Page 02 · The Living Signal · Frame ${Math.round(page02Progress * 239) + 1}/240 (${(page02Progress * 100).toFixed(0)}%)`}
        </span>
      </div>
    </div>
  );
};

export default App;
