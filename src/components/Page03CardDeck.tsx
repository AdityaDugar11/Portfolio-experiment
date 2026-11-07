import React, { useState } from 'react';
import { ArrowUpRight, BookOpen, Layers } from 'lucide-react';
import { CHAPTERS_DATA, ChapterItem } from '../data/chaptersData';

interface Page03CardDeckProps {
  onOpenChapter: (chapter: ChapterItem) => void;
  className?: string;
}

export const Page03CardDeck: React.FC<Page03CardDeckProps> = ({
  onOpenChapter,
  className = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeMobileIndex, setActiveMobileIndex] = useState<number>(0);

  const chapters = CHAPTERS_DATA;

  const handleCardClick = (chapter: ChapterItem, index: number) => {
    // On mobile screens, tapping an inactive card brings it to the front
    if (typeof window !== 'undefined' && window.innerWidth < 768 && activeMobileIndex !== index) {
      setActiveMobileIndex(index);
      return;
    }
    onOpenChapter(chapter);
  };

  return (
    <div
      id="page-03-deck-container"
      className={`relative w-full min-h-screen flex flex-col items-center justify-center px-4 py-16 md:py-24 select-none overflow-hidden ${className}`}
    >
      {/* Editorial Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-8 md:mb-14 px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-signal-coral/15 border border-signal-coral/30 mb-4 shadow-sm">
          <Layers className="w-3.5 h-3.5 text-signal-coral" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-signal-coral font-bold">
            Page 03 · Ten Chapters
          </span>
        </div>
        <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-signal-ivory font-bold tracking-tight">
          The Chapter Deck
        </h2>
        <p className="font-sans text-xs sm:text-sm text-signal-ivory/75 mt-3 max-w-lg mx-auto leading-relaxed">
          Ten connected narratives tracing engineering fundamentals, autonomous workflows, systems craft, and ongoing exploration. Select any card to explore.
        </p>
      </div>

      {/* ========================================================
          DESKTOP & TABLET STACKED CARD DECK
          Single overlapping stack matching Reference Image 2:
          Foreground card 01 on left, 9 cards stacked behind it offset to right.
          Unified warm ivory surface, dark sandstone text, coral accents.
          ======================================================== */}
      <div className="hidden md:flex relative items-center justify-center w-full max-w-6xl h-[520px] lg:h-[600px] my-auto overflow-visible">
        {/* Cascade wrapper with reserved width to comfortably contain all 10 cards */}
        <div className="relative w-[320px] lg:w-[400px] h-[460px] lg:h-[540px]">
          {chapters.map((chapter, i) => {
            const isHovered = hoveredIndex === i;
            // z-index: foreground card is highest (20), subsequent cards behind (19..11).
            // On hover, card separates and lifts to top (50).
            const zIndex = isHovered ? 50 : 25 - i;
            const translateY = isHovered ? -34 : 0;
            const translateXOffset = `calc(${i} * clamp(24px, 3.4vw, 42px))`;

            return (
              <div
                key={chapter.id}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => handleCardClick(chapter, i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(chapter, i);
                  }
                }}
                aria-label={`${chapter.displayNumber}: ${chapter.title}`}
                style={{
                  position: 'absolute',
                  left: translateXOffset,
                  top: '0px',
                  width: '100%',
                  height: '100%',
                  zIndex,
                  transform: `translateY(${translateY}px) scale(${isHovered ? 1.025 : 1.0})`,
                  boxShadow: isHovered
                    ? '0 32px 65px -10px rgba(0, 0, 0, 0.65), 0 16px 32px -12px rgba(224, 109, 83, 0.35)'
                    : '-10px 14px 32px -6px rgba(0, 0, 0, 0.42), -2px 4px 10px rgba(42, 27, 22, 0.2)',
                }}
                className="bg-gradient-to-b from-[#FAF6F0] to-[#F5ECE1] text-[#2A1B16] rounded-[30px] lg:rounded-[36px] p-6 lg:p-8 flex flex-col justify-between cursor-pointer transition-all duration-300 ease-out border border-[#E06D53]/25 will-change-transform group focus:outline-none focus-visible:ring-4 focus-visible:ring-signal-coral"
              >
                {/* Card Top: Number & Category */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-2xl lg:text-3xl font-black text-[#E06D53] tracking-tight block">
                      {chapter.number}
                    </span>
                    <span className="text-[10px] lg:text-[11px] font-mono tracking-widest uppercase font-bold text-[#2A1B16]/65 block mt-0.5">
                      {chapter.category.split('·')[0]}
                    </span>
                  </div>

                  <div className="w-9 h-9 rounded-full bg-[#E06D53]/10 flex items-center justify-center transition-transform group-hover:scale-110 group-hover:bg-[#E06D53] text-[#E06D53] group-hover:text-white">
                    <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>

                {/* Card Center: Chapter Title & Headline */}
                <div className="my-auto pr-3">
                  <h3 className="font-serif text-2xl lg:text-3xl font-bold text-[#2A1B16] leading-tight tracking-tight group-hover:text-[#E06D53] transition-colors">
                    {chapter.title}
                  </h3>
                  <p className="font-sans text-xs lg:text-sm text-[#2A1B16]/75 mt-3 line-clamp-3 leading-relaxed">
                    {chapter.headline}
                  </p>
                </div>

                {/* Card Bottom: Open Chapter Prompt */}
                <div className="pt-4 border-t border-[#2A1B16]/12 flex items-center justify-between">
                  <span className="text-[10px] lg:text-[11px] font-mono uppercase tracking-wider font-bold text-[#2A1B16]/60">
                    {isHovered ? 'Click to Read Story' : 'Chapter ' + chapter.number}
                  </span>
                  <div className="flex items-center gap-1.5 font-sans text-xs font-bold text-[#E06D53]">
                    <span>Read</span>
                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          MOBILE INTERACTIVE STACKED CARD PRESENTATION
          Touch-Optimized single stack: zero horizontal overflow,
          tapping any card brings it to the front with clear "Open Chapter" CTA
          ======================================================== */}
      <div className="md:hidden w-full max-w-sm flex flex-col items-center overflow-hidden px-2">
        <div className="relative w-full h-[410px] flex items-center justify-center my-3 overflow-hidden">
          {chapters.map((chapter, i) => {
            const isActive = activeMobileIndex === i;
            const diff = i - activeMobileIndex;
            // Only show surrounding cards in depth stack to avoid overflow
            if (Math.abs(diff) > 2) return null;

            const offsetX = Math.max(-26, Math.min(26, diff * 15));
            const offsetY = Math.abs(diff) * 10;
            const scale = 1 - Math.abs(diff) * 0.05;
            const zIndex = isActive ? 30 : 20 - Math.abs(diff);

            return (
              <div
                key={chapter.id}
                onClick={() => handleCardClick(chapter, i)}
                role="button"
                tabIndex={0}
                aria-label={`${chapter.displayNumber}: ${chapter.title}`}
                style={{
                  position: 'absolute',
                  width: '88%',
                  maxWidth: '315px',
                  height: '370px',
                  zIndex,
                  transform: `translateX(${offsetX}px) translateY(${offsetY}px) scale(${scale})`,
                  opacity: Math.abs(diff) > 1 ? 0.55 : 1.0,
                  boxShadow: isActive
                    ? '0 22px 45px -8px rgba(0, 0, 0, 0.6), 0 8px 20px -6px rgba(224, 109, 83, 0.3)'
                    : '-6px 10px 22px -4px rgba(0, 0, 0, 0.35)',
                }}
                className="bg-gradient-to-b from-[#FAF6F0] to-[#F5ECE1] text-[#2A1B16] rounded-[28px] p-6 flex flex-col justify-between border border-[#E06D53]/25 transition-all duration-300 ease-out cursor-pointer active:scale-95"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-2xl font-black text-[#E06D53]">
                      {chapter.number}
                    </span>
                    <span className="text-[10px] font-mono tracking-widest uppercase block font-bold text-[#2A1B16]/60 mt-0.5">
                      {chapter.category.split('·')[0]}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#E06D53]/10 flex items-center justify-center text-[#E06D53]">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>

                <div className="my-auto pr-2">
                  <h3 className="font-serif text-xl font-bold leading-snug text-[#2A1B16]">
                    {chapter.title}
                  </h3>
                  <p className="font-sans text-xs text-[#2A1B16]/75 mt-2 line-clamp-3 leading-relaxed">
                    {chapter.headline}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#2A1B16]/12 flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#2A1B16]/60">
                    {isActive ? 'Tap to Read Story' : 'Tap to Select'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenChapter(chapter);
                    }}
                    className="px-3 py-1.5 rounded-full bg-[#E06D53] text-white text-xs font-bold inline-flex items-center gap-1 shadow-sm active:scale-95"
                  >
                    <span>Open</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile 10-Chapter Pagination Bar */}
        <div className="flex items-center gap-2 mt-3">
          {chapters.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveMobileIndex(i)}
              aria-label={`Select chapter ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                activeMobileIndex === i ? 'w-6 bg-signal-coral' : 'w-2 bg-signal-ivory/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
