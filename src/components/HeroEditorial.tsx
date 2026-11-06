import React from 'react';
import { ArrowRight, ArrowUpRight, Mouse } from 'lucide-react';

interface HeroEditorialProps {
  onExploreWork: () => void;
  onStartJourney: () => void;
}

export const HeroEditorial: React.FC<HeroEditorialProps> = ({
  onExploreWork,
  onStartJourney,
}) => {
  return (
    <div
      id="hero-editorial-overlay"
      className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-center px-6 md:px-16 lg:px-24 max-w-7xl mx-auto"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full">
        {/* Editorial Copy Container */}
        <div
          id="hero-text-block"
          className="lg:col-span-8 flex flex-col items-start space-y-6 pt-16 md:pt-12 pointer-events-auto will-change-transform"
        >
          {/* Discipline Eyebrow */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] md:text-xs font-bold tracking-[0.25em] uppercase text-signal-coral drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Software Engineering · AI · Intelligent Systems
            </span>
            <span className="w-10 h-[1.5px] bg-signal-coral rounded-full shadow-[0_0_8px_rgba(224,109,83,0.6)]" />
          </div>

          {/* Headline Name */}
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-tight text-signal-ivory leading-[1.05] drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
            Aditya Dugar
          </h1>

          {/* Personal Quote */}
          <blockquote className="border-l-[3px] border-signal-coral pl-4 py-1 my-1 backdrop-blur-[2px]">
            <p className="font-serif italic text-lg sm:text-xl md:text-2xl text-signal-peach font-normal leading-relaxed drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              &ldquo;I follow questions until they become something I can build.&rdquo;
            </p>
          </blockquote>

          {/* Introduction Text */}
          <p className="text-sm md:text-base text-signal-ivory/90 max-w-xl leading-relaxed font-light drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
            I&rsquo;m Aditya Dugar, a Software Engineering student at Jain University. I enjoy exploring intelligent systems, software engineering, automation and creative technology.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            {/* Primary CTA: Explore My Work → */}
            <button
              onClick={onExploreWork}
              className="group flex items-center gap-2.5 px-6 py-3.5 rounded-full text-xs font-bold tracking-wider uppercase text-white bg-gradient-to-r from-signal-coral to-signal-terracotta hover:from-signal-terracotta hover:to-signal-coral shadow-[0_4px_25px_rgba(224,109,83,0.4)] hover:shadow-[0_6px_30px_rgba(224,109,83,0.6)] transition-all duration-300 transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-peach"
            >
              <span>Explore My Work</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Secondary CTA: The Journey ↗ */}
            <button
              onClick={onStartJourney}
              className="group flex items-center gap-2 px-6 py-3.5 rounded-full text-xs font-bold tracking-wider uppercase text-signal-ivory bg-[#181210]/75 hover:bg-[#181210] border border-signal-coral/60 hover:border-signal-coral backdrop-blur-md transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_6px_25px_rgba(224,109,83,0.3)] transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-coral"
            >
              <span>The Journey</span>
              <ArrowUpRight className="w-4 h-4 text-signal-coral group-hover:text-signal-peach group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Empty Col 9 to 12 allows the scenic lake palace and water reflections to shine through */}
        <div className="hidden lg:block lg:col-span-4 h-full pointer-events-none" />
      </div>

      {/* Right Scroll Indicator */}
      <div
        id="scroll-indicator"
        className="fixed right-8 top-1/2 -translate-y-1/2 hidden xl:flex flex-col items-center gap-4 pointer-events-none z-20 will-change-transform"
      >
        <div className="flex items-center gap-2 text-signal-ivory/80 text-[10px] font-bold tracking-widest uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          <span className="w-2.5 h-2.5 rounded-full border border-signal-coral flex items-center justify-center">
            <span className="w-1 h-1 rounded-full bg-signal-coral" />
          </span>
          <span>01</span>
        </div>
        <div className="text-[9px] font-bold tracking-[0.3em] uppercase text-signal-ivory/70 rotate-90 my-6 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          The Beginning
        </div>
        <div className="w-[1.5px] h-16 bg-gradient-to-b from-signal-coral via-signal-peach/70 to-transparent shadow-[0_0_8px_rgba(224,109,83,0.5)]" />
        <div className="flex flex-col items-center gap-1.5 text-signal-ivory/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          <Mouse className="w-3.5 h-3.5 animate-pulse text-signal-coral" />
          <span className="text-[8px] font-bold tracking-widest uppercase">Scroll</span>
        </div>
      </div>
    </div>
  );
};
