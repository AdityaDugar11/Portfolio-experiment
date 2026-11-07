import React, { useState, useEffect, useRef, useCallback } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BackgroundVideo } from './components/BackgroundVideo';
import { Navigation } from './components/Navigation';
import { HeroEditorial } from './components/HeroEditorial';
import { ContactModal } from './components/ContactModal';
import { SceneTransitionCanvas } from './components/SceneTransitionCanvas';
import { Page02Scene } from './components/Page02Scene';
import { Page02MobileConstellation } from './components/Page02MobileConstellation';

gsap.registerPlugin(ScrollTrigger);

export const App: React.FC = () => {
  // Modal State
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Audio State (Unchanged from approved Page 01)
  const [isMuted, setIsMuted] = useState(true);

  // Runway Refs (Strictly Page 01 -> Transition -> Page 02)
  const page01RunwayRef = useRef<HTMLDivElement>(null);
  const transitionRunwayRef = useRef<HTMLDivElement>(null);
  const page02RunwayRef = useRef<HTMLDivElement>(null);
  const mobilePage02RunwayRef = useRef<HTMLDivElement>(null);

  // Visual Scene Layer Refs
  const page01SceneRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const page02SceneRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  // Scroll Progress Tracking
  const [transitionProgress, setTransitionProgress] = useState(0); // 0.0 to 1.0 (Page 1 -> Page 2 shader transition)
  const [page02Progress, setPage02Progress] = useState(0); // 0.0 to 1.0 (Desktop Page 2 240-frame sequence & card reveal)
  const [mobilePage02Progress, setMobilePage02Progress] = useState(0); // 0.0 to 1.0 (Mobile Page 2 horizontal constellation)

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
    (window as any).__lenis = lenis;

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
      !transitionRunwayRef.current
    )
      return;

    const ctx = gsap.context(() => {
      const heroTextBlock = document.getElementById('hero-text-block');
      const mainNav = document.getElementById('main-navigation');
      const scrollIndicator = document.getElementById('scroll-indicator');

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

      // ========================================================
      // TIMELINE 3: PAGE 02 240-FRAME LIVING SIGNAL SEQUENCE (DESKTOP >= 768px)
      // Actual 240 WebP video frames scrubbed deterministically + 10 chapter cards
      // end: 'bottom bottom' ensures progress reaches exactly 1.0 at document scroll bottom
      // ========================================================
      if (window.innerWidth >= 768 && page02RunwayRef.current) {
        const page02Timeline = gsap.timeline({
          scrollTrigger: {
            trigger: page02RunwayRef.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.5,
            onUpdate: (self) => {
              const p = Math.min(Math.max(self.progress, 0), 1);
              setPage02Progress(p);
            },
            onToggle: (self) => {
              if (self.progress >= 0.99) setPage02Progress(1.0);
            },
          },
        });

        page02Timeline.to({}, { duration: 1.0 }, 0);
      }

      // ========================================================
      // TIMELINE 4: PAGE 02 HORIZONTAL CINEMATIC CONSTELLATION (MOBILE < 768px)
      // Pinned cinematic stage explored horizontally via vertical page scroll
      // ========================================================
      if (window.innerWidth < 768 && mobilePage02RunwayRef.current) {
        const mobilePage02Timeline = gsap.timeline({
          scrollTrigger: {
            trigger: mobilePage02RunwayRef.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.4,
            onUpdate: (self) => {
              const p = Math.min(Math.max(self.progress, 0), 1);
              setMobilePage02Progress(p);
            },
            onToggle: (self) => {
              if (self.progress >= 0.99) setMobilePage02Progress(1.0);
            },
          },
        });

        mobilePage02Timeline.to({}, { duration: 1.0 }, 0);
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
    if (window.innerWidth < 768 && mobilePage02RunwayRef.current) {
      // Scroll to right wing on mobile where Chapter 06 is explored (~0.78 progress)
      if (lenisRef.current) {
        const targetY =
          mobilePage02RunwayRef.current.offsetTop +
          mobilePage02RunwayRef.current.offsetHeight * 0.78;
        lenisRef.current.scrollTo(targetY, { duration: 2.0 });
      } else {
        mobilePage02RunwayRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    if (lenisRef.current && page02RunwayRef.current) {
      // Scroll smoothly to Page 02 where Chapter 06 (The Work I Choose to Show) is anchored
      const targetY = page02RunwayRef.current.offsetTop + page02RunwayRef.current.offsetHeight * 0.55;
      lenisRef.current.scrollTo(targetY, { duration: 2.0 });
    } else {
      page02RunwayRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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
          PAGE 02 VISUAL LAYER: THE LIVING SIGNAL (DESKTOP & TABLET >= 768px)
          Actual 240 WebP video frames + 10 chapter cards attached
          to the actual terminal nodes. Strictly NO Page 3.
          ======================================================== */}
      <div
        ref={page02SceneRef}
        id="page-02-scene"
        className="fixed inset-0 z-20 will-change-transform hidden md:block"
        style={{
          opacity: transitionProgress > 0 ? Math.min(transitionProgress * 1.25, 1) : 0,
          pointerEvents: transitionProgress >= 0.8 ? 'auto' : 'none',
        }}
      >
        <Page02Scene progress={page02Progress} />
      </div>

      {/* ========================================================
          PAGE 02 VISUAL LAYER: HORIZONTAL CONSTELLATION (MOBILE < 768px)
          Single continuous cinematic character-and-orbital scene.
          Vertical finger scrolling explores the wider constellation horizontally.
          Strictly NO vertical card lists, NO separate sections, NO Page 3.
          ======================================================== */}
      <div
        id="page-02-mobile-scene"
        className="fixed inset-0 z-20 will-change-transform block md:hidden"
        style={{
          opacity: transitionProgress > 0 ? Math.min(transitionProgress * 1.25, 1) : 0,
          pointerEvents: transitionProgress >= 0.8 ? 'auto' : 'none',
        }}
      >
        <Page02MobileConstellation
          progress={mobilePage02Progress}
          onExploreWork={handleExploreWork}
          onStartJourney={handleStartJourney}
          onOpenContact={() => setIsContactOpen(true)}
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
          Strictly Page 01, Transition, and Page 02. No Page 03!
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

      {/* Runway 3: Page 02 Living Signal (240-frame sequence & 10 cards - Desktop only >= 768px) */}
      <div
        ref={page02RunwayRef}
        id="page-02-runway"
        className="relative w-full h-[380vh] pointer-events-none hidden md:block"
        aria-hidden="true"
      />

      {/* Runway 4: Page 02 Mobile Constellation Exploration Runway (Mobile only < 768px) */}
      <div
        ref={mobilePage02RunwayRef}
        id="page-02-mobile-runway"
        className="relative w-full h-[480vh] pointer-events-none block md:hidden"
        aria-hidden="true"
      />

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
