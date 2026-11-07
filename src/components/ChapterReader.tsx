import React, { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Grid, Compass, Code, Brain, Cpu, Layers, Sparkles, FolderGit2, Users, FlaskConical, Milestone, Send } from 'lucide-react';
import { CHAPTERS_DATA, ChapterItem } from '../data/chaptersData';

interface ChapterReaderProps {
  currentChapter: ChapterItem;
  onSelectChapter: (chapter: ChapterItem) => void;
  onReturnToDeck: () => void;
  onOpenContact: () => void;
}

const CHAPTER_ICONS: Record<string, React.FC<{ className?: string }>> = {
  'chapter-01': Compass,
  'chapter-02': Code,
  'chapter-03': Layers,
  'chapter-04': Cpu,
  'chapter-05': Brain,
  'chapter-06': FolderGit2,
  'chapter-07': Users,
  'chapter-08': FlaskConical,
  'chapter-09': Milestone,
  'chapter-10': Send,
};

export const ChapterReader: React.FC<ChapterReaderProps> = ({
  currentChapter,
  onSelectChapter,
  onReturnToDeck,
  onOpenContact,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentIndex = CHAPTERS_DATA.findIndex((c) => c.id === currentChapter.id);
  const prevChapter = currentIndex > 0 ? CHAPTERS_DATA[currentIndex - 1] : null;
  const nextChapter = currentIndex < CHAPTERS_DATA.length - 1 ? CHAPTERS_DATA[currentIndex + 1] : null;

  // Keyboard navigation (ArrowLeft = prev, ArrowRight = next, Escape = back to deck)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && nextChapter) {
        onSelectChapter(nextChapter);
      } else if (e.key === 'ArrowLeft' && prevChapter) {
        onSelectChapter(prevChapter);
      } else if (e.key === 'Escape') {
        onReturnToDeck();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextChapter, prevChapter, onSelectChapter, onReturnToDeck]);

  // Scroll to top of content on chapter change
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentChapter.id]);

  const IconComponent = CHAPTER_ICONS[currentChapter.id] || Sparkles;

  return (
    <div
      ref={containerRef}
      id="chapter-reader-view"
      className="fixed inset-0 z-40 bg-[#140F0E] text-signal-ivory overflow-y-auto selection:bg-signal-coral/30"
    >
      {/* ========================================================
          STICKY TOP NAVIGATION BAR
          ======================================================== */}
      <header className="sticky top-0 left-0 right-0 z-50 bg-[#181210]/95 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-3.5 flex items-center justify-between">
        {/* Return to Deck CTA */}
        <button
          onClick={onReturnToDeck}
          className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono uppercase tracking-wider text-signal-ivory hover:text-signal-coral transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-coral"
        >
          <Grid className="w-3.5 h-3.5 text-signal-coral" />
          <span>Card Deck</span>
        </button>

        {/* Mini Chapter Rail (Direct jump to any of the 10 chapters) */}
        <div className="hidden md:flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
          {CHAPTERS_DATA.map((ch) => {
            const isSelected = ch.id === currentChapter.id;
            return (
              <button
                key={ch.id}
                onClick={() => onSelectChapter(ch)}
                aria-label={`Jump to Chapter ${ch.number}: ${ch.title}`}
                style={{
                  backgroundColor: isSelected ? ch.cardColor : 'transparent',
                  color: isSelected ? ch.textColor : 'rgba(255,255,255,0.5)',
                }}
                className={`w-7 h-7 rounded-full font-mono text-[11px] font-bold flex items-center justify-center transition-all ${
                  isSelected ? 'scale-110 shadow-sm' : 'hover:text-white hover:bg-white/10'
                }`}
              >
                {ch.number}
              </button>
            );
          })}
        </div>

        {/* Current Chapter Indicator & Next Shortcut */}
        <div className="flex items-center gap-3 font-mono text-xs text-signal-ivory/70">
          <span className="hidden sm:inline">Chapter {currentChapter.number} / 10</span>
          {nextChapter ? (
            <button
              onClick={() => onSelectChapter(nextChapter)}
              className="inline-flex items-center gap-1.5 text-signal-coral hover:text-signal-peach font-bold transition-colors"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onOpenContact}
              className="inline-flex items-center gap-1.5 text-signal-coral hover:text-signal-peach font-bold transition-colors"
            >
              <span>Contact</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* ========================================================
          HERO BANNER (Styled with the chapter's authentic card color)
          ======================================================== */}
      <section
        style={{
          backgroundColor: currentChapter.cardColor,
          color: currentChapter.textColor,
        }}
        className="relative w-full px-6 md:px-12 lg:px-20 pt-16 pb-20 md:py-24 border-b border-white/15 transition-colors duration-500 ease-out"
      >
        <div className="max-w-4xl mx-auto">
          {/* Eyebrow & Icon */}
          <div className="flex items-center gap-3 mb-4">
            <div
              style={{
                backgroundColor: currentChapter.isDarkText ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
              }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm"
            >
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <span
                style={{ color: currentChapter.accentColor }}
                className="font-mono text-sm md:text-base font-black tracking-wider uppercase block"
              >
                {currentChapter.displayNumber}
              </span>
              <span
                style={{ color: currentChapter.subtextColor }}
                className="text-[11px] font-mono tracking-widest uppercase block"
              >
                {currentChapter.category}
              </span>
            </div>
          </div>

          {/* Chapter Display Title */}
          <h1
            style={{ color: currentChapter.textColor }}
            className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mt-2 drop-shadow-sm"
          >
            {currentChapter.title}
          </h1>

          {/* Chapter Core Quote */}
          <p
            style={{ color: currentChapter.subtextColor }}
            className="font-serif text-lg md:text-2xl italic font-medium mt-6 max-w-2xl leading-relaxed"
          >
            “{currentChapter.headline}”
          </p>
        </div>
      </section>

      {/* ========================================================
          CHAPTER NARRATIVE (Complete authentic content from STORY_CONTENT.md)
          ======================================================== */}
      <main className="max-w-3xl mx-auto px-6 md:px-10 py-16 md:py-24 font-sans text-base md:text-lg leading-relaxed text-signal-ivory/90 space-y-6">
        {currentChapter.fullStory.map((paragraph, idx) => {
          // Subtle styling on first paragraph (editorial drop lead)
          if (idx === 0) {
            return (
              <p
                key={idx}
                className="font-serif text-xl md:text-2xl text-signal-peach leading-relaxed border-l-2 border-signal-coral/60 pl-5 my-6 italic"
              >
                {paragraph}
              </p>
            );
          }
          return <p key={idx}>{paragraph}</p>;
        })}
      </main>

      {/* ========================================================
          CONTINUOUS CHAPTER-TO-CHAPTER READING FOOTER
          ======================================================== */}
      <footer className="w-full border-t border-white/10 bg-[#181210] py-12 px-6 md:px-12 mt-12">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Previous Chapter */}
          {prevChapter ? (
            <button
              onClick={() => onSelectChapter(prevChapter)}
              className="group flex items-center gap-3 text-left p-3 rounded-xl hover:bg-white/5 transition-all w-full md:w-auto"
            >
              <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors">
                <ArrowLeft className="w-4 h-4 text-signal-ivory/70 group-hover:text-signal-coral" />
              </div>
              <div>
                <span className="font-mono text-[10px] text-signal-ivory/50 uppercase tracking-widest block">
                  Previous Chapter
                </span>
                <span className="font-serif text-sm font-bold text-signal-ivory group-hover:text-signal-peach transition-colors">
                  {prevChapter.number} · {prevChapter.title}
                </span>
              </div>
            </button>
          ) : (
            <button
              onClick={onReturnToDeck}
              className="text-left p-3 text-signal-ivory/50 font-mono text-xs uppercase tracking-wider"
            >
              Beginning of Journey
            </button>
          )}

          {/* Central Return to Deck Button */}
          <button
            onClick={onReturnToDeck}
            className="px-6 py-2.5 rounded-full border border-signal-coral/40 text-signal-ivory font-mono text-xs uppercase tracking-widest hover:bg-signal-coral/15 transition-all shadow-sm"
          >
            All 10 Cards
          </button>

          {/* Next Chapter or Final Contact */}
          {nextChapter ? (
            <button
              onClick={() => onSelectChapter(nextChapter)}
              className="group flex items-center gap-3 text-right p-3 rounded-xl hover:bg-white/5 transition-all w-full md:w-auto justify-end"
            >
              <div>
                <span className="font-mono text-[10px] text-signal-ivory/50 uppercase tracking-widest block">
                  Next Chapter
                </span>
                <span className="font-serif text-sm font-bold text-signal-ivory group-hover:text-signal-peach transition-colors">
                  {nextChapter.number} · {nextChapter.title}
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors">
                <ArrowRight className="w-4 h-4 text-signal-ivory/70 group-hover:text-signal-coral" />
              </div>
            </button>
          ) : (
            <button
              onClick={onOpenContact}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-signal-coral to-signal-terracotta text-signal-ivory font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-signal-coral/30 hover:scale-105 transition-all"
            >
              <span>Get in Touch</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
