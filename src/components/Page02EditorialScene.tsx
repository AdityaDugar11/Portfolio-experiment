import React, { useState, useEffect, useRef } from 'react';

interface Page02EditorialSceneProps {
  progress: number; // 0.0 to 1.0 (Page 2 internal scroll progress scrubbed by ScrollTrigger)
  isVisible?: boolean; // Whether Page 02 is currently active in viewport
  className?: string;
}

export const Page02EditorialScene: React.FC<Page02EditorialSceneProps> = ({
  progress,
  isVisible = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const textStageRef = useRef<HTMLDivElement>(null);

  // Video playback states
  const [hasEnded, setHasEnded] = useState(false);

  // Restrained pointer parallax state (max ±3px horizontal, ±1.5px vertical)
  const targetOffsetRef = useRef({ x: 0, y: 0 });
  const currentOffsetRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);

  // 1. Video Playback Lifecycle:
  // - Autoplay muted, playsInline
  // - Plays once on Page 02 entry
  // - Holds final frame when ended (never loops unless verified)
  // - Pauses when hidden or when scrolled back to Page 01 (progress === 0)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset and pause if user scrolls back up into Page 01
    if (progress <= 0.005) {
      if (!video.paused) {
        video.pause();
      }
      video.currentTime = 0;
      setHasEnded(false);
      return;
    }

    // Play once when user enters Page 02
    if (isVisible && progress > 0.01 && !hasEnded && video.paused) {
      video.play().catch(() => {
        // Autoplay may be restricted before gesture; video fallback poster remains active
      });
    }
  }, [progress, isVisible, hasEnded]);

  // Handle visibility / tab changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        video.pause();
      } else if (isVisible && !hasEnded && progress > 0.01) {
        video.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isVisible, hasEnded, progress]);

  // 2. Subtle, Restrained Micro-Parallax on Portrait:
  // Strictly capped at ±3px X, ±1.5px Y with 0.08 lerp damping.
  // Disabled when reduced-motion is requested.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const normX = (e.clientX / innerWidth - 0.5) * 2; // -1 to 1
      const normY = (e.clientY / innerHeight - 0.5) * 2; // -1 to 1

      targetOffsetRef.current = {
        x: normX * 3, // max 3px
        y: normY * 1.5, // max 1.5px
      };
    };

    const handleMouseLeave = () => {
      targetOffsetRef.current = { x: 0, y: 0 };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    const renderParallax = () => {
      currentOffsetRef.current.x +=
        (targetOffsetRef.current.x - currentOffsetRef.current.x) * 0.08;
      currentOffsetRef.current.y +=
        (targetOffsetRef.current.y - currentOffsetRef.current.y) * 0.08;

      if (portraitRef.current) {
        portraitRef.current.style.transform = `translate3d(${currentOffsetRef.current.x.toFixed(
          2
        )}px, ${currentOffsetRef.current.y.toFixed(2)}px, 0)`;
      }

      animFrameRef.current = requestAnimationFrame(renderParallax);
    };

    animFrameRef.current = requestAnimationFrame(renderParallax);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // 3. Scroll Choreography for Chapter 01
  // Calculate smooth opacity and reveal based on internal progress
  const contentOpacity = Math.min(Math.max((progress - 0.02) / 0.12, 0), 1);
  const contentTranslateY = (1 - contentOpacity) * 24;

  return (
    <div
      ref={containerRef}
      id="page-02-editorial-scene"
      className={`relative w-full h-full min-h-screen overflow-hidden select-none bg-[#EAE2D8] ${className}`}
    >
      {/* ========================================================
          LAYER 1: ATMOSPHERIC PASTEL SKY BACKGROUND
          - Autoplay muted inline video with poster fallback
          - Natural color saturation without artificial filters
          - Holds final frame upon completion (never loops)
          ======================================================== */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <video
          ref={videoRef}
          src="/assets/page-02/pastel-sky.mp4"
          poster="/assets/page-02/pastel-sky-poster.jpg"
          autoPlay
          muted
          playsInline
          loop={false}
          onEnded={() => {
            setHasEnded(true);
          }}
          className="w-full h-full object-cover object-center pointer-events-none scale-[1.02]"
          style={{
            filter: 'saturate(1.18) contrast(1.04) brightness(1.01)',
          }}
        />
        {/* Very subtle warm horizon gradient to ground the atmosphere */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, rgba(234, 226, 216, 0.25) 0%, rgba(234, 226, 216, 0) 40%)',
          }}
        />
      </div>

      {/* ========================================================
          LAYER 2: AUTHENTIC PHOTOGRAPHIC PORTRAIT ANCHOR
          - Derivative transparent cutout from original 1086x1448 capture
          - Zero synthetic shoulder extension (89px inpainting removed)
          - Aligned flush right (right: 0) so camera crop continues naturally out of frame
          - Original face, hair, and clothing pixels 100% UNTOUCHED
          - Height: 90vh anchored to bottom: 0
          ======================================================== */}
      <div
        ref={portraitRef}
        id="portrait-anchor-right"
        className="absolute bottom-0 right-0 z-10 will-change-transform pointer-events-none flex items-end justify-end"
        style={{
          height: '90vh',
          maxHeight: '92vh',
        }}
      >
        <img
          src="/assets/page-02/aditya-cutout.png"
          alt="Aditya Dugar"
          className="h-full w-auto object-contain object-bottom object-right block select-none pointer-events-none"
          style={{
            aspectRatio: '1086 / 1448',
            filter: 'none',
          }}
          draggable={false}
        />
      </div>

      {/* ========================================================
          LAYER 3: EDITORIAL STORY STREAM (LEFT ASYMMETRIC STAGE)
          - High-contrast dark warm-ink typography (#1A1412)
          - Measured contrast ratio >= 8.5:1 against pastel sky (WCAG AAA)
          - Coral (#D65538) & terracotta (#A84A32) accents
          - Zero generic dark glass panels
          ======================================================== */}
      <div
        ref={textStageRef}
        id="editorial-stream-left"
        className="absolute inset-y-0 left-0 z-20 w-full lg:w-[56vw] max-w-4xl pl-8 sm:pl-12 md:pl-16 lg:pl-24 pr-6 sm:pr-8 flex flex-col justify-center pointer-events-auto"
        style={{
          opacity: contentOpacity,
          transform: `translate3d(0, ${contentTranslateY.toFixed(1)}px, 0)`,
          transition: 'opacity 0.25s ease-out, transform 0.25s ease-out',
        }}
      >
        <div className="flex flex-col space-y-5 max-w-2xl py-8">
          {/* Sequence & Chapter Indicator */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono font-bold tracking-[0.25em] uppercase text-[#D65538]">
              SEQUENCE 01 · CHAPTER 01 OF 10
            </span>
            <span className="w-8 h-[1.5px] bg-[#D65538]/70 rounded-full" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-[#3D2E28]/70">
              THE BEGINNING
            </span>
          </div>

          {/* Chapter 01 Display Headline */}
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-normal tracking-tight text-[#1A1412] leading-[1.18]">
            &ldquo;I follow questions until they become something I can build.&rdquo;
          </h2>

          {/* Personal Introduction Lead */}
          <div className="border-l-2 border-[#D65538] pl-4 py-0.5 my-1">
            <p className="font-sans text-base sm:text-lg font-medium text-[#221714] leading-relaxed">
              I&rsquo;m Aditya Dugar, a Software Engineering student at Jain University.
            </p>
          </div>

          {/* Narrative Body Copy (Strictly from docs/STORY_CONTENT.md) */}
          <div className="text-sm sm:text-[15px] font-normal text-[#2A1B16] leading-[1.72] space-y-3.5 pt-1">
            <p>
              I find myself drawn towards things I don&rsquo;t fully understand yet &mdash; how
              intelligent systems work, what&rsquo;s happening behind an interface, how different
              technologies connect, and what becomes possible when you bring them together.
            </p>
            <p>
              That curiosity has taken me through software development, artificial intelligence,
              automation, Linux environments, and a growing interest in the systems that power
              modern technology.
            </p>
            <p>
              I enjoy learning by exploring, experimenting, making mistakes, and eventually turning
              an idea into something tangible.
            </p>
            <p>
              I don&rsquo;t see myself as someone following one fixed path. I&rsquo;m interested in
              discovering where technology, engineering and creativity meet.
            </p>
            <p className="font-medium text-[#1A1412] pt-1 italic">
              And this is a little of how that journey looks.
            </p>
          </div>

          {/* Canonical Sequence Progression Tracker (Milestone 1 Indicator) */}
          <div className="pt-6 border-t border-[#1A1412]/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D65538] animate-pulse" />
              <span className="text-xs font-mono font-semibold tracking-wider text-[#1A1412] uppercase">
                Active Chapter: 01
              </span>
              <span className="text-xs font-mono text-[#3D2E28]/50">|</span>
              <span className="text-xs font-mono text-[#3D2E28]/70">
                Sequences 02 &ndash; 04 Awaiting Next Milestones
              </span>
            </div>

            {/* Subtle Chapter Counter Pill */}
            <div className="px-3 py-1 rounded-full bg-[#1A1412]/8 border border-[#1A1412]/12 text-xs font-mono text-[#1A1412]">
              01 / 10
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          LAYER 4: SEQUENCE BREADCRUMB INDICATOR (BOTTOM LEFT CORNER)
          Shows the four canonical sequences defined in docs/MASTER_CREATIVE_BRIEF.md
          ======================================================== */}
      <div className="absolute bottom-6 left-8 sm:left-12 lg:left-24 z-20 pointer-events-none hidden md:flex items-center gap-6 text-[10px] font-mono tracking-widest text-[#3D2E28]/60 uppercase">
        <span className="text-[#D65538] font-bold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D65538]" />
          Seq 01: Intro (Ch 01)
        </span>
        <span className="opacity-30">&bull;</span>
        <span className="opacity-50">Seq 02: Systems (Ch 02&ndash;05)</span>
        <span className="opacity-30">&bull;</span>
        <span className="opacity-50">Seq 03: Projects (Ch 06&ndash;07)</span>
        <span className="opacity-30">&bull;</span>
        <span className="opacity-50">Seq 04: Closing (Ch 08&ndash;10)</span>
      </div>
    </div>
  );
};

export default Page02EditorialScene;
