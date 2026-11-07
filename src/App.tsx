import React, { useState, useEffect, useRef, useCallback } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BackgroundVideo } from './components/BackgroundVideo';
import { Navigation } from './components/Navigation';
import { HeroEditorial } from './components/HeroEditorial';
import { ContactModal } from './components/ContactModal';
import { Page02SequenceCanvas } from './components/Page02SequenceCanvas';
import { Page03CardDeck } from './components/Page03CardDeck';
import { ChapterReader } from './components/ChapterReader';
import { ChapterItem, CHAPTERS_DATA } from './data/chaptersData';

gsap.registerPlugin(ScrollTrigger);

export const App: React.FC = () => {
  // Modal & Reader States
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [activeReadingChapter, setActiveReadingChapter] = useState<ChapterItem | null>(null);

  // Audio State (Unchanged from approved Page 01)
  const [isMuted, setIsMuted] = useState(true);

  // Runway Refs
  const page01RunwayRef = useRef<HTMLDivElement>(null);
  const transitionRunwayRef = useRef<HTMLDivElement>(null);
  const page02RunwayRef = useRef<HTMLDivElement>(null);
  const page03RunwayRef = useRef<HTMLDivElement>(null);

  // Visual Scene Layer Refs
  const page01SceneRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const page02SceneRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  // Scroll Progress Tracking for Page 02 Sequence Canvas (0.0 to 1.0)
  const [page02Progress, setPage02Progress] = useState(0);

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

  // 2. Setup GSAP ScrollTrigger Choreography
  useEffect(() => {
    if (
      !page01RunwayRef.current ||
      !transitionRunwayRef.current ||
      !page02RunwayRef.current ||
      !page03RunwayRef.current
    )
      return;

    const ctx = gsap.context(() => {
      const heroTextBlock = document.getElementById('hero-text-block');
      const mainNav = document.getElementById('main-navigation');
      const scrollIndicator = document.getElementById('scroll-indicator');

      // Set initial transform states cleanly via GSAP (avoids inline style conflicts)
      gsap.set(page02SceneRef.current, { yPercent: 100, opacity: 0 });

      // ========================================================
      // TIMELINE 1: PAGE 01 SCROLL (Approved Exit Choreography)
      // ========================================================
      const page01Timeline = gsap.timeline({
        scrollTrigger: {
          trigger: page01RunwayRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6,
        },
      });

      page01Timeline.to({}, { duration: 1.0 }, 0);

      // Camera Movement on Background Video Layer (0% to 100%)
      if (videoWrapperRef.current) {
        page01Timeline.fromTo(
          videoWrapperRef.current,
          { scale: 1.0, yPercent: 0 },
          { scale: 1.14, yPercent: -2, ease: 'none', duration: 1.0 },
          0
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
          { opacity: 0, y: -35, ease: 'power2.inOut', duration: 0.26 },
          0.12
        );
      }

      // Right Scroll Indicator Exit (0.12 to 0.32 progress)
      if (scrollIndicator) {
        page01Timeline.fromTo(
          scrollIndicator,
          { opacity: 1 },
          { opacity: 0, ease: 'power2.inOut', duration: 0.20 },
          0.12
        );
      }

      // ========================================================
      // TIMELINE 2: CINEMATIC PAGE 01 -> PAGE 02 TRANSITION ZONE
      // (Page 01 moves up and away; Page 02 rises from below and fills screen)
      // ========================================================
      const transitionTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: transitionRunwayRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6,
        },
      });

      transitionTimeline.to({}, { duration: 1.0 }, 0);

      // Page 01 moves up and scales slightly back as it exits
      if (page01SceneRef.current) {
        transitionTimeline.fromTo(
          page01SceneRef.current,
          { yPercent: 0, scale: 1.0, opacity: 1.0 },
          { yPercent: -40, scale: 0.95, opacity: 0.0, ease: 'power1.inOut', duration: 0.9 },
          0
        );
      }

      // Page 02 scene rises smoothly from below the viewport (100% -> 0%) and fills screen
      if (page02SceneRef.current) {
        transitionTimeline.fromTo(
          page02SceneRef.current,
          { yPercent: 100, opacity: 0.2 },
          { yPercent: 0, opacity: 1.0, ease: 'power2.out', duration: 1.0 },
          0
        );
      }

      // ========================================================
      // TIMELINE 3: PAGE 02 SEQUENCE SCRUBBING (240 Frames)
      // (Character centered, 3 luminous rings & 10 branches form progressively)
      // ========================================================
      const page02Timeline = gsap.timeline({
        scrollTrigger: {
          trigger: page02RunwayRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5,
          onUpdate: (self) => {
            setPage02Progress(self.progress);
          },
        },
      });

      page02Timeline.to({}, { duration: 1.0 }, 0);

      // At the end of Page 02, as user scrolls towards Page 03:
      // Page 02 gently slides up to reveal Page 03 deck
      if (page02SceneRef.current) {
        gsap.to(page02SceneRef.current, {
          scrollTrigger: {
            trigger: page03RunwayRef.current,
            start: 'top bottom',
            end: 'top top',
            scrub: 0.6,
          },
          yPercent: -100,
          opacity: 0.2,
          ease: 'power1.inOut',
        });
      }
    });

    return () => {
      ctx.revert();
    };
  }, []);

  // Smooth scroll triggers
  const handleStartJourney = () => {
    if (lenisRef.current && transitionRunwayRef.current) {
      const targetY = transitionRunwayRef.current.offsetTop;
      lenisRef.current.scrollTo(targetY, { duration: 1.8 });
    } else {
      transitionRunwayRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleExploreWork = () => {
    const ch06 = CHAPTERS_DATA.find((c) => c.id === 'chapter-06');
    if (ch06) setActiveReadingChapter(ch06);
  };

  return (
    <div className="relative min-h-screen bg-[#140F0E] text-[#FAF7F2] overflow-x-hidden">
      {/* ========================================================
          PAGE 01 VISUAL LAYER (Background Video & Atmosphere)
          ======================================================== */}
      <div
        ref={page01SceneRef}
        id="page-01-scene"
        className="fixed inset-0 z-0 will-change-transform"
      >
        <BackgroundVideo
          ref={videoWrapperRef}
          videoRef={videoElementRef}
        />
      </div>

      {/* ========================================================
          PAGE 02 VISUAL LAYER (240-Frame Sequence Canvas)
          Exclusively the Character, Pastel Sky, 3 Rings, 10 Nodes
          Zero cards, zero modals, zero debug overlays
          ======================================================== */}
      <div
        ref={page02SceneRef}
        id="page-02-scene"
        className="fixed inset-0 z-10 will-change-transform"
      >
        <Page02SequenceCanvas progress={page02Progress} />
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
          SCROLL RUNWAYS (GSAP ScrollTrigger Synchronized)
          ======================================================== */}
      {/* Runway 1: Page 01 (Cinematic Video Zoom & Editorial Text Exit) */}
      <div
        ref={page01RunwayRef}
        id="page-01-runway"
        className="relative w-full h-[200vh] pointer-events-none"
        aria-hidden="true"
      />

      {/* Runway 2: Transition Zone (Page 01 moves away, Page 02 rises to fill viewport) */}
      <div
        ref={transitionRunwayRef}
        id="page-01-to-02-transition-runway"
        className="relative w-full h-[150vh] pointer-events-none"
        aria-hidden="true"
      />

      {/* Runway 3: Page 02 Orbital Progression (240 Frames scrubbed) */}
      <div
        ref={page02RunwayRef}
        id="page-02-runway"
        className="relative w-full h-[320vh] pointer-events-none"
        aria-hidden="true"
      />

      {/* ========================================================
          PAGE 03: THE CHAPTER CARD DECK & STORY JOURNEY
          ======================================================== */}
      <section
        ref={page03RunwayRef}
        id="page-03-section"
        className="relative z-20 w-full min-h-screen bg-[#16100E] border-t border-white/10 shadow-[0_-25px_50px_rgba(0,0,0,0.8)]"
      >
        <Page03CardDeck
          onOpenChapter={(chapter) => setActiveReadingChapter(chapter)}
        />
      </section>

      {/* ========================================================
          CONTINUOUS CHAPTER-READING EXPERIENCE (When active)
          ======================================================== */}
      {activeReadingChapter && (
        <ChapterReader
          currentChapter={activeReadingChapter}
          onSelectChapter={(chapter) => setActiveReadingChapter(chapter)}
          onReturnToDeck={() => setActiveReadingChapter(null)}
          onOpenContact={() => {
            setActiveReadingChapter(null);
            setIsContactOpen(true);
          }}
        />
      )}

      {/* ========================================================
          ACCESSIBLE CONTACT MODAL DIALOG
          ======================================================== */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </div>
  );
};

export default App;
