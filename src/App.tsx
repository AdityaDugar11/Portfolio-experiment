import React, { useState, useEffect, useRef, useCallback } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BackgroundVideo } from './components/BackgroundVideo';
import { Navigation } from './components/Navigation';
import { HeroEditorial } from './components/HeroEditorial';
import { ContactModal } from './components/ContactModal';

gsap.registerPlugin(ScrollTrigger);

export const App: React.FC = () => {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  // Persistent native video audio toggle controller
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

  // 2. Setup GSAP ScrollTrigger Choreography (Page 01 Cinematic Scroll Exit)
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const ctx = gsap.context(() => {
      const heroTextBlock = document.getElementById('hero-text-block');
      const mainNav = document.getElementById('main-navigation');
      const scrollIndicator = document.getElementById('scroll-indicator');

      // Master Scroll-Scrubbed Timeline for Page 01
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: scrollContainerRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
          onUpdate: (self) => {
            setScrollProgress(self.progress);
          },
        },
      });

      // Lock timeline duration to 1.0 for direct progress-to-time mapping
      timeline.to({}, { duration: 1.0 }, 0);

      // --- Cinematic Camera Movement on Background Video Layer (0% to 100%) ---
      if (videoWrapperRef.current) {
        timeline.fromTo(
          videoWrapperRef.current,
          {
            scale: 1.0,
            yPercent: 0,
          },
          {
            scale: 1.14,
            yPercent: -2,
            ease: 'none',
            duration: 1.0,
          },
          0
        );
      }

      // --- Hero Editorial Text Block Exit (0.12 to 0.44 progress) ---
      if (heroTextBlock) {
        timeline.fromTo(
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

      // --- Navigation Header Exit (0.12 to 0.38 progress) ---
      if (mainNav) {
        timeline.fromTo(
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

      // --- Right Scroll Indicator Exit (0.12 to 0.32 progress) ---
      if (scrollIndicator) {
        timeline.fromTo(
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
    }, scrollContainerRef);

    return () => {
      ctx.revert();
    };
  }, []);

  const handleStartJourney = () => {
    if (lenisRef.current && scrollContainerRef.current) {
      // Smooth scroll forward into the transition
      const targetY = window.innerHeight * 0.8;
      lenisRef.current.scrollTo(targetY, { duration: 1.5 });
    } else {
      window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'smooth' });
    }
  };

  const handleExploreWork = () => {
    if (lenisRef.current && scrollContainerRef.current) {
      const targetY = window.innerHeight * 1.5;
      lenisRef.current.scrollTo(targetY, { duration: 1.8 });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#181210] text-[#FAF7F2]">
      {/* Layer 1: Persistent Cinematic Background Video */}
      <BackgroundVideo
        ref={videoWrapperRef}
        videoRef={videoElementRef}
      />

      {/* Layer 3: Semantic DOM UI Layer (Navigation, Editorial Copy, CTAs, Modal) */}
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

      {/* Accessible Contact Modal Dialog */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />

      {/* Scroll Runway Container for Page 01 (Natural, unpinned scroll progression) */}
      <div
        ref={scrollContainerRef}
        className="relative w-full h-[250vh] pointer-events-none"
        aria-hidden="true"
      />

      {/* Page Progress Indicator (Discreet in bottom left) */}
      <div className="fixed bottom-4 left-6 z-30 text-[10px] tracking-widest uppercase font-mono text-signal-ivory/50 pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
        Page 01 · Progress: {(scrollProgress * 100).toFixed(0)}%
      </div>
    </div>
  );
};

export default App;
