import React, { useState, useEffect, useRef, useCallback } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BackgroundVideo } from './components/BackgroundVideo';
import { Navigation } from './components/Navigation';
import { HeroEditorial } from './components/HeroEditorial';
import { ContactModal } from './components/ContactModal';
import { SceneTransitionCanvas } from './components/SceneTransitionCanvas';
import { Page02TheLivingSignal } from './components/Page02TheLivingSignal';
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
  const collectionRunwayRef = useRef<HTMLDivElement>(null);
  const page03RunwayRef = useRef<HTMLDivElement>(null);

  // Visual Scene Layer Refs
  const page01SceneRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const page02SceneRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  // Scroll Progress Tracking
  const [transitionProgress, setTransitionProgress] = useState(0); // 0.0 to 1.0 (Page 1 -> Page 2 shader transition)
  const [page02Progress, setPage02Progress] = useState(0); // 0.0 to 1.0 (Page 2 orbital formation)
  const [collectionProgress, setCollectionProgress] = useState(0); // 0.0 to 1.0 (Page 2 -> Page 3 card assembly)

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
      !collectionRunwayRef.current ||
      !page03RunwayRef.current
    )
      return;

    const ctx = gsap.context(() => {
      const heroTextBlock = document.getElementById('hero-text-block');
      const mainNav = document.getElementById('main-navigation');
      const scrollIndicator = document.getElementById('scroll-indicator');

      // Set initial Page 2 visibility state
      gsap.set(page02SceneRef.current, { opacity: 0, pointerEvents: 'none' });

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
      // TIMELINE 2: CINEMATIC PAGE 01 -> PAGE 02 SHADER TRANSITION
      // Real WebGL noise displacement & chromatic tear transformation
      // ========================================================
      const transitionTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: transitionRunwayRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5,
          onUpdate: (self) => {
            setTransitionProgress(self.progress);
          },
        },
      });

      // Page 01 fades out cleanly across transition zone
      if (page01SceneRef.current) {
        transitionTimeline.fromTo(
          page01SceneRef.current,
          { opacity: 1 },
          { opacity: 0, ease: 'none', duration: 0.8 },
          0
        );
      }

      // Page 02 scene smoothly fades in as transition completes
      if (page02SceneRef.current) {
        transitionTimeline.fromTo(
          page02SceneRef.current,
          { opacity: 0, pointerEvents: 'none' },
          { opacity: 1, pointerEvents: 'auto', ease: 'none', duration: 1.0 },
          0.1
        );
      }

      // ========================================================
      // TIMELINE 3: PAGE 02 ORBITAL PROGRESSION
      // Character centered, 3 luminous rings ignite, 10 connectors draw, 10 cards reveal
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

      // ========================================================
      // TIMELINE 4: PAGE 02 -> PAGE 03 CARD COLLECTION
      // 10 cards detach from orbital scene and assemble into single overlapping stack
      // ========================================================
      const collectionTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: collectionRunwayRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5,
          onUpdate: (self) => {
            setCollectionProgress(self.progress);
          },
        },
      });

      collectionTimeline.to({}, { duration: 1.0 }, 0);

      // When reaching Page 03, gently fade Page 2 layer so Page 03 interactive deck takes focus
      if (page02SceneRef.current) {
        gsap.to(page02SceneRef.current, {
          scrollTrigger: {
            trigger: page03RunwayRef.current,
            start: 'top bottom',
            end: 'top top',
            scrub: 0.5,
          },
          opacity: 0,
          pointerEvents: 'none',
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
    <div className="relative min-h-screen bg-[#181210] text-[#FAF7F2] overflow-x-hidden">
      {/* ========================================================
          PAGE 01 VISUAL LAYER (Background Video & Atmosphere)
          Native video playback remains active and steady
          ======================================================== */}
      <div
        ref={page01SceneRef}
        id="page-01-scene"
        className="fixed inset-0 z-0 will-change-transform"
      >
        <BackgroundVideo ref={videoWrapperRef} videoRef={videoElementRef} />
      </div>

      {/* ========================================================
          PAGE 01 -> PAGE 02 REAL WEBGL SCENE TRANSITION
          Noise displacement, chromatic tear, and luminous coral glow
          ======================================================== */}
      <SceneTransitionCanvas
        progress={transitionProgress}
        videoRef={videoElementRef}
        className="z-10"
      />

      {/* ========================================================
          PAGE 02 VISUAL LAYER: THE LIVING SIGNAL
          Aditya's authentic portrait (aditya.png), 3 orbital rings,
          10 outward curved connectors, 10 chapter cards.
          ======================================================== */}
      <div
        ref={page02SceneRef}
        id="page-02-scene"
        className="fixed inset-0 z-20 will-change-transform"
      >
        <Page02TheLivingSignal
          progress={page02Progress}
          collectionProgress={collectionProgress}
          onOpenChapter={(chapter) => setActiveReadingChapter(chapter)}
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
          SCROLL RUNWAYS (GSAP ScrollTrigger Synchronized)
          ======================================================== */}
      {/* Runway 1: Page 01 (Cinematic Video Zoom & Editorial Text Exit) */}
      <div
        ref={page01RunwayRef}
        id="page-01-runway"
        className="relative w-full h-[180vh] pointer-events-none"
        aria-hidden="true"
      />

      {/* Runway 2: WebGL Scene Transformation Zone (Page 01 dissolves into Page 02) */}
      <div
        ref={transitionRunwayRef}
        id="page-01-to-02-transition-runway"
        className="relative w-full h-[160vh] pointer-events-none"
        aria-hidden="true"
      />

      {/* Runway 3: Page 02 Orbital Constellation Formation (Rings & 10 Connections) */}
      <div
        ref={page02RunwayRef}
        id="page-02-runway"
        className="relative w-full h-[280vh] pointer-events-none"
        aria-hidden="true"
      />

      {/* Runway 4: Page 02 -> Page 03 Card Collection Zone (Cards fly and assemble into deck) */}
      <div
        ref={collectionRunwayRef}
        id="page-02-to-03-collection-runway"
        className="relative w-full h-[180vh] pointer-events-none"
        aria-hidden="true"
      />

      {/* ========================================================
          PAGE 03: THE LAYERED CHAPTER CARD DECK
          Single overlapping stack (Reference Image 2)
          Unified warm ivory cards, dark sandstone text, coral accents
          ======================================================== */}
      <section
        ref={page03RunwayRef}
        id="page-03-section"
        className="relative z-30 w-full min-h-screen bg-[#181210] border-t border-white/10 shadow-[0_-25px_50px_rgba(0,0,0,0.85)]"
      >
        <Page03CardDeck
          onOpenChapter={(chapter) => setActiveReadingChapter(chapter)}
        />
      </section>

      {/* ========================================================
          CONTINUOUS CHAPTER-READING EXPERIENCE (When active)
          Vertical scroll driving horizontal card transition
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
