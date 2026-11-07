import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Grid,
  Compass,
  Code,
  Layers,
  Cpu,
  Brain,
  FolderGit2,
  Users,
  FlaskConical,
  Milestone,
  Send,
  Sparkles,
} from 'lucide-react';
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
  const bottomTriggerRef = useRef<HTMLDivElement>(null);
  const topTriggerRef = useRef<HTMLDivElement>(null);

  const [slideDirection, setSlideDirection] = useState<'next' | 'prev' | 'none'>('none');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentIndex = CHAPTERS_DATA.findIndex((c) => c.id === currentChapter.id);
  const prevChapter = currentIndex > 0 ? CHAPTERS_DATA[currentIndex - 1] : null;
  const nextChapter = currentIndex < CHAPTERS_DATA.length - 1 ? CHAPTERS_DATA[currentIndex + 1] : null;

  // Transition handler with horizontal slide animation
  const transitionToChapter = useCallback(
    (targetChapter: ChapterItem, direction: 'next' | 'prev') => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setSlideDirection(direction);

      setTimeout(() => {
        onSelectChapter(targetChapter);
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
        setIsTransitioning(false);
        setSlideDirection('none');
      }, 300);
    },
    [isTransitioning, onSelectChapter]
  );

  // Keyboard navigation: ArrowLeft (prev), ArrowRight (next), Escape (return to deck)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && nextChapter) {
        transitionToChapter(nextChapter, 'next');
      } else if (e.key === 'ArrowLeft' && prevChapter) {
        transitionToChapter(prevChapter, 'prev');
      } else if (e.key === 'Escape') {
        onReturnToDeck();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextChapter, prevChapter, transitionToChapter, onReturnToDeck]);

  // Scroll to top whenever chapter changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentChapter.id]);

  // Continuous vertical scroll detection:
  // When user reaches the end of current chapter, scrolling further seamlessly triggers next chapter
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let canTriggerNext = true;

    const handleScroll = () => {
      const scrollHeight = container.scrollHeight;
      const scrollTop = container.scrollTop;
      const clientHeight = container.clientHeight;

      // Bottom threshold (reached end of current chapter narrative -> transition to next chapter)
      if (scrollTop + clientHeight >= scrollHeight - 30) {
        if (nextChapter && canTriggerNext && !isTransitioning) {
          canTriggerNext = false;
          transitionToChapter(nextChapter, 'next');
          setTimeout(() => {
            canTriggerNext = true;
          }, 1000);
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [nextChapter, prevChapter, isTransitioning, transitionToChapter]);

  const IconComponent = CHAPTER_ICONS[currentChapter.id] || Sparkles;

  // Determine slide animation transform classes
  const getCardTransformClass = () => {
    if (slideDirection === 'next') return '-translate-x-full opacity-0';
    if (slideDirection === 'prev') return 'translate-x-full opacity-0';
    return 'translate-x-0 opacity-100';
  };

  return (
    <div
      ref={containerRef}
      id="chapter-reader-view"
      className="fixed inset-0 z-50 bg-[#181210] text-signal-ivory overflow-y-auto selection:bg-signal-coral/30"
    >
      {/* Scroll Top Sentinel */}
      <div ref={topTriggerRef} className="h-1 w-full pointer-events-none" />

      {/* ========================================================
          STICKY TOP NAVIGATION BAR
          ======================================================== */}
      <header className="sticky top-0 left-0 right-0 z-50 bg-[#181210]/95 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-3.5 flex items-center justify-between">
        {/* Return to Deck CTA */}
        <button
          onClick={onReturnToDeck}
          className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono uppercase tracking-wider text-signal-ivory hover:text-signal-coral transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-coral shadow-sm"
        >
          <Grid className="w-3.5 h-3.5 text-signal-coral" />
          <span>Card Deck</span>
        </button>

        {/* Mini Chapter Rail (Direct jump to any of the 10 chapters) */}
        <div className="hidden md:flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 shadow-inner">
          {CHAPTERS_DATA.map((ch) => {
            const isSelected = ch.id === currentChapter.id;
            return (
              <button
                key={ch.id}
                onClick={() => {
                  const dir = parseInt(ch.number) > parseInt(currentChapter.number) ? 'next' : 'prev';
                  transitionToChapter(ch, dir);
                }}
                aria-label={`Jump to Chapter ${ch.number}: ${ch.title}`}
                className={`w-7 h-7 rounded-full font-mono text-[11px] font-bold flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-[#E06D53] text-white scale-110 shadow-[0_0_10px_rgba(224,109,83,0.5)]'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {ch.number}
              </button>
            );
          })}
        </div>

        {/* Current Chapter Indicator & Next Shortcut */}
        <div className="flex items-center gap-3 font-mono text-xs text-signal-ivory/80">
          <span className="hidden sm:inline">Chapter {currentChapter.number} / 10</span>
          {nextChapter ? (
            <button
              onClick={() => transitionToChapter(nextChapter, 'next')}
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
          EDITORIAL CHAPTER CARD PRESENTATION
          Unified warm ivory surface, dark sandstone typography,
          with horizontal spatial transition driven by scrolling or buttons.
          ======================================================== */}
      <div
        className={`w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pt-8 md:pt-14 pb-12 transition-all duration-300 ease-out transform ${getCardTransformClass()}`}
      >
        {/* Chapter Header Card Plate */}
        <section className="bg-gradient-to-b from-[#FAF6F0] via-[#FAF6F0] to-[#F5ECE1] text-[#2A1B16] rounded-[28px] md:rounded-[36px] p-8 md:p-14 border border-[#E06D53]/25 shadow-[0_25px_60px_rgba(0,0,0,0.4)]">
          {/* Eyebrow & Category */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-[#E06D53]/10 flex items-center justify-center text-[#E06D53] shadow-sm">
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono text-xs md:text-sm font-black tracking-wider uppercase text-[#E06D53] block">
                {currentChapter.displayNumber}
              </span>
              <span className="text-[11px] font-mono tracking-widest uppercase block text-[#2A1B16]/65 font-bold mt-0.5">
                {currentChapter.category}
              </span>
            </div>
          </div>

          {/* Chapter Display Title */}
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[#2A1B16] leading-[1.15]">
            {currentChapter.title}
          </h1>

          {/* Original Core Quote */}
          <blockquote className="border-l-[3px] border-[#E06D53] pl-4 md:pl-5 py-1.5 my-6 bg-[#E06D53]/5 rounded-r-xl">
            <p className="font-serif italic text-base sm:text-lg md:text-xl text-[#2A1B16]/90 font-medium leading-relaxed">
              &ldquo;{currentChapter.headline}&rdquo;
            </p>
          </blockquote>

          {/* Divider */}
          <div className="w-full h-px bg-[#2A1B16]/10 my-8" />

          {/* Full Narrative Content from STORY_CONTENT.md */}
          <div className="font-sans text-sm sm:text-base md:text-lg leading-relaxed text-[#2A1B16]/90 space-y-5">
            {currentChapter.fullStory.map((paragraph, idx) => {
              if (idx === 0) {
                return (
                  <p
                    key={idx}
                    className="font-serif text-lg sm:text-xl md:text-2xl text-[#2A1B16] font-medium leading-relaxed italic"
                  >
                    {paragraph}
                  </p>
                );
              }
              return <p key={idx}>{paragraph}</p>;
            })}
          </div>

          {/* Chapter 10 Contact Callout */}
          {currentChapter.id === 'chapter-10' && (
            <div className="mt-8 pt-6 border-t border-[#2A1B16]/10 flex items-center justify-between">
              <span className="font-sans text-xs md:text-sm text-[#2A1B16]/75">
                Ready to collaborate or discuss engineering?
              </span>
              <button
                onClick={onOpenContact}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#E06D53] text-white font-bold text-xs uppercase tracking-wider shadow-md hover:bg-[#C85A3D] transition-colors"
              >
                <span>Get in Touch</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>

        {/* ========================================================
            CONTINUOUS STORYTELLING FOOTER (Vertical scroll or click)
            ======================================================== */}
        <footer className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
          {/* Previous Chapter Button */}
          {prevChapter ? (
            <button
              onClick={() => transitionToChapter(prevChapter, 'prev')}
              className="group flex items-center gap-3 text-left p-2 rounded-xl hover:bg-white/5 transition-all w-full sm:w-auto"
            >
              <div className="w-9 h-9 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors">
                <ArrowLeft className="w-4 h-4 text-signal-ivory/70 group-hover:text-signal-coral" />
              </div>
              <div>
                <span className="font-mono text-[9px] text-signal-ivory/50 uppercase tracking-widest block">
                  Previous
                </span>
                <span className="font-serif text-xs md:text-sm font-bold text-signal-ivory group-hover:text-signal-peach transition-colors">
                  {prevChapter.number} · {prevChapter.title}
                </span>
              </div>
            </button>
          ) : (
            <button
              onClick={onReturnToDeck}
              className="text-left p-2 text-signal-ivory/50 font-mono text-xs uppercase tracking-wider"
            >
              Story Beginning
            </button>
          )}

          {/* Center Return to Deck */}
          <button
            onClick={onReturnToDeck}
            className="px-5 py-2 rounded-full border border-signal-coral/40 text-signal-ivory font-mono text-xs uppercase tracking-widest hover:bg-signal-coral/15 transition-all shadow-sm"
          >
            All 10 Cards
          </button>

          {/* Next Chapter Button */}
          {nextChapter ? (
            <button
              onClick={() => transitionToChapter(nextChapter, 'next')}
              className="group flex items-center gap-3 text-right p-2 rounded-xl hover:bg-white/5 transition-all w-full sm:w-auto justify-end"
            >
              <div>
                <span className="font-mono text-[9px] text-signal-ivory/50 uppercase tracking-widest block">
                  Scroll or Click for Next
                </span>
                <span className="font-serif text-xs md:text-sm font-bold text-signal-ivory group-hover:text-signal-peach transition-colors">
                  {nextChapter.number} · {nextChapter.title}
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors">
                <ArrowRight className="w-4 h-4 text-signal-ivory/70 group-hover:text-signal-coral" />
              </div>
            </button>
          ) : (
            <button
              onClick={onOpenContact}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-signal-coral text-white font-bold text-xs uppercase tracking-wider shadow-md hover:bg-signal-terracotta transition-all"
            >
              <span>Connect</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </footer>

        {/* Scroll End Sentinel */}
        <div ref={bottomTriggerRef} className="h-6 w-full pointer-events-none mt-4 text-center">
          {nextChapter && (
            <span className="font-mono text-[10px] uppercase tracking-widest text-signal-ivory/40">
              ↓ Scroll past bottom to reveal Chapter {nextChapter.number}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
