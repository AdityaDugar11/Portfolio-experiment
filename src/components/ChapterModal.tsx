import React, { useEffect, useRef } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
import { ChapterItem } from '../data/chaptersData';

interface ChapterModalProps {
  chapter: ChapterItem | null;
  onClose: () => void;
  onOpenContact?: () => void;
  onExploreWork?: () => void;
  onReturnToStart?: () => void;
}

export const ChapterModal: React.FC<ChapterModalProps> = ({
  chapter,
  onClose,
  onOpenContact,
  onExploreWork,
  onReturnToStart,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chapter) return;

    // Save previous active element
    const prevActive = document.activeElement as HTMLElement | null;

    // Focus close button on open
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    // Escape listener and scroll lock
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      prevActive?.focus();
    };
  }, [chapter, onClose]);

  if (!chapter) return null;

  const handleAction = () => {
    onClose();
    if (chapter.ctaAction === 'contact' && onOpenContact) {
      onOpenContact();
    } else if (chapter.ctaAction === 'work' && onExploreWork) {
      onExploreWork();
    } else if (chapter.ctaAction === 'start' && onReturnToStart) {
      onReturnToStart();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chapter-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#1C1513]/95 border border-signal-coral/30 rounded-2xl p-6 md:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.8)] text-signal-ivory focus:outline-none"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-signal-ivory/10 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs tracking-widest text-signal-coral font-bold uppercase">
                {chapter.displayNumber}
              </span>
              <span className="text-signal-ivory/30">·</span>
              <span className="text-[11px] font-mono tracking-wider text-signal-ivory/60 uppercase">
                {chapter.category}
              </span>
            </div>
            <h2
              id="chapter-modal-title"
              className="font-serif text-2xl md:text-3xl text-signal-ivory font-bold mt-1 tracking-tight"
            >
              {chapter.title}
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close chapter dialog"
            className="p-2 rounded-full hover:bg-signal-ivory/10 text-signal-ivory/70 hover:text-signal-coral transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-coral"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Narrative Headline */}
        <div className="mb-6 p-4 rounded-xl bg-signal-coral/10 border-l-2 border-signal-coral">
          <p className="font-serif text-lg md:text-xl text-signal-peach italic font-medium leading-relaxed">
            "{chapter.headline}"
          </p>
        </div>

        {/* Full Story Paragraphs from STORY_CONTENT.md */}
        <div className="space-y-4 font-sans text-sm md:text-base leading-relaxed text-signal-ivory/85">
          {chapter.fullStory.map((para, idx) => (
            <p key={idx}>{para}</p>
          ))}
        </div>

        {/* Action Footer */}
        <div className="mt-8 pt-5 border-t border-signal-ivory/10 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs font-mono tracking-wider uppercase text-signal-ivory/60 hover:text-signal-ivory transition-colors px-3 py-2"
          >
            Close
          </button>

          <button
            onClick={handleAction}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-signal-coral to-signal-terracotta text-signal-ivory font-semibold text-xs tracking-wider uppercase shadow-[0_4px_15px_rgba(224,109,83,0.35)] hover:shadow-[0_6px_20px_rgba(224,109,83,0.5)] transition-all hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-coral"
          >
            <span>{chapter.ctaLabel}</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
