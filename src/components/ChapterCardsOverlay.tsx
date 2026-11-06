import React, { useMemo } from 'react';
import { Compass, Code, Brain, Cpu, Layers, Sparkles, FolderGit2, Users, FlaskConical, Milestone, Send } from 'lucide-react';
import { CHAPTERS_DATA, ChapterItem } from '../data/chaptersData';
import { RenderedRect } from './Page02SequenceCanvas';

interface ChapterCardsOverlayProps {
  progress: number; // Page 02 progress (0.0 to 1.0)
  renderedRect: RenderedRect | null;
  onSelectChapter: (chapter: ChapterItem) => void;
  className?: string;
}

// Normalized coordinates of the 10 terminal nodes within the 1280x720 frame (0..1)
const LEFT_NODE_COORDS = [
  { nx: 126.2 / 1280, ny: 130.8 / 720 }, // Node L1 (Ch 01)
  { nx: 171.7 / 1280, ny: 242.8 / 720 }, // Node L2 (Ch 02)
  { nx: 110.7 / 1280, ny: 344.8 / 720 }, // Node L3 (Ch 03)
  { nx: 153.3 / 1280, ny: 455.3 / 720 }, // Node L4 (Ch 04)
  { nx: 181.6 / 1280, ny: 567.8 / 720 }, // Node L5 (Ch 05)
];

const RIGHT_NODE_COORDS = [
  { nx: 1138.5 / 1280, ny: 134.5 / 720 }, // Node R1 (Ch 06)
  { nx: 1121.0 / 1280, ny: 241.7 / 720 }, // Node R2 (Ch 07)
  { nx: 1165.4 / 1280, ny: 344.9 / 720 }, // Node R3 (Ch 08)
  { nx: 1118.4 / 1280, ny: 454.6 / 720 }, // Node R4 (Ch 09)
  { nx: 1093.1 / 1280, ny: 568.4 / 720 }, // Node R5 (Ch 10)
];

// Icons associated with chapters
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

export const ChapterCardsOverlay: React.FC<ChapterCardsOverlayProps> = ({
  progress,
  renderedRect,
  onSelectChapter,
  className = '',
}) => {
  // Screen coordinates of the 10 terminal nodes
  const screenNodes = useMemo(() => {
    if (!renderedRect || renderedRect.width === 0) return { left: [], right: [] };

    const left = LEFT_NODE_COORDS.map((coord) => ({
      x: renderedRect.x + coord.nx * renderedRect.width,
      y: renderedRect.y + coord.ny * renderedRect.height,
    }));

    const right = RIGHT_NODE_COORDS.map((coord) => ({
      x: renderedRect.x + coord.nx * renderedRect.width,
      y: renderedRect.y + coord.ny * renderedRect.height,
    }));

    return { left, right };
  }, [renderedRect]);

  // Compute progressive card visibility:
  // Pair 0 (01 & 06): start 0.36, full 0.50
  // Pair 1 (02 & 07): start 0.44, full 0.58
  // Pair 2 (03 & 08): start 0.52, full 0.66
  // Pair 3 (04 & 09): start 0.60, full 0.74
  // Pair 4 (05 & 10): start 0.68, full 0.82
  const getCardProgress = (pairIndex: number) => {
    const start = 0.36 + pairIndex * 0.08;
    const end = start + 0.14;
    if (progress <= start) return 0;
    if (progress >= end) return 1;
    return (progress - start) / (end - start);
  };

  const leftChapters = CHAPTERS_DATA.filter((c) => c.side === 'left');
  const rightChapters = CHAPTERS_DATA.filter((c) => c.side === 'right');

  // Overall overlay opacity: fades in as Page 02 begins, fully visible above 0.35
  const overlayMasterOpacity = Math.min(Math.max((progress - 0.1) / 0.25, 0), 1);

  if (overlayMasterOpacity <= 0) return null;

  return (
    <div
      id="chapter-cards-overlay"
      className={`fixed inset-0 pointer-events-none z-20 overflow-hidden ${className}`}
      style={{ opacity: overlayMasterOpacity }}
      aria-label="Ten Chapter Exploration Map"
    >
      {/* SVG Vector Connector Overlay for deterministic node-to-card lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="connectorGlowLeft" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E06D53" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#F4B896" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="connectorGlowRight" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#E06D53" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#F4B896" stopOpacity="0.4" />
          </linearGradient>
          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Render animated connector lines docking to left terminal nodes */}
        {screenNodes.left.map((node, idx) => {
          const cardProg = getCardProgress(idx);
          if (cardProg <= 0.01) return null;

          // Dock from node (x, y) towards card anchor on left
          const cardAnchorX = Math.max(16, node.x - 70);

          return (
            <g key={`left-connector-${idx}`} opacity={cardProg} filter="url(#glowFilter)">
              <line
                x1={node.x}
                y1={node.y}
                x2={node.x - (node.x - cardAnchorX) * cardProg}
                y2={node.y}
                stroke="url(#connectorGlowLeft)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={node.x}
                cy={node.y}
                r={3 * cardProg}
                fill="#E06D53"
                className="animate-pulse"
              />
            </g>
          );
        })}

        {/* Render animated connector lines docking to right terminal nodes */}
        {screenNodes.right.map((node, idx) => {
          const cardProg = getCardProgress(idx);
          if (cardProg <= 0.01) return null;

          const cardAnchorX = Math.min(window.innerWidth - 16, node.x + 70);

          return (
            <g key={`right-connector-${idx}`} opacity={cardProg} filter="url(#glowFilter)">
              <line
                x1={node.x}
                y1={node.y}
                x2={node.x + (cardAnchorX - node.x) * cardProg}
                y2={node.y}
                stroke="url(#connectorGlowRight)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={node.x}
                cy={node.y}
                r={3 * cardProg}
                fill="#E06D53"
                className="animate-pulse"
              />
            </g>
          );
        })}
      </svg>

      {/* Responsive Cards Layout Container */}
      <div className="relative w-full h-full flex justify-between p-3 md:p-6 lg:p-8">
        {/* LEFT COLUMN: CHAPTERS 01 TO 05 */}
        <div className="w-[44vw] max-w-[280px] sm:max-w-[310px] lg:max-w-[340px] flex flex-col justify-between h-full py-10 md:py-8 lg:py-6 z-30">
          {leftChapters.map((chapter, idx) => {
            const cardProg = getCardProgress(idx);
            const IconComponent = CHAPTER_ICONS[chapter.id] || Sparkles;

            return (
              <div
                key={chapter.id}
                style={{
                  opacity: cardProg,
                  transform: `translateX(${(1 - cardProg) * -25}px) scale(${0.92 + cardProg * 0.08})`,
                  pointerEvents: cardProg > 0.6 ? 'auto' : 'none',
                }}
                className="transition-all duration-300 ease-out will-change-transform mb-1.5 md:mb-2"
              >
                <button
                  type="button"
                  onClick={() => onSelectChapter(chapter)}
                  aria-label={`${chapter.displayNumber}: ${chapter.title}`}
                  className="group w-full text-left p-2.5 md:p-3 lg:p-3.5 rounded-xl bg-[#181210]/90 hover:bg-[#201714]/95 border border-signal-coral/25 hover:border-signal-coral/75 shadow-[0_6px_20px_rgba(0,0,0,0.55)] hover:shadow-[0_8px_25px_rgba(224,109,83,0.3)] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-coral cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] md:text-xs font-bold text-signal-coral tracking-wider">
                        {chapter.number}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-signal-coral/60 group-hover:bg-signal-coral group-hover:scale-125 transition-all" />
                      <span className="text-[9px] md:text-[10px] font-mono tracking-widest uppercase text-signal-ivory/50 truncate max-w-[130px] md:max-w-[160px]">
                        {chapter.category.split('·')[0]}
                      </span>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-signal-ivory/5 group-hover:bg-signal-coral/20 flex items-center justify-center transition-colors">
                      <IconComponent className="w-3 h-3 text-signal-ivory/60 group-hover:text-signal-coral transition-colors" />
                    </div>
                  </div>

                  <h3 className="font-serif text-xs md:text-sm lg:text-[15px] font-bold text-signal-ivory group-hover:text-signal-peach transition-colors leading-tight">
                    {chapter.title}
                  </h3>

                  <p className="hidden md:block font-sans text-[11px] text-signal-ivory/70 line-clamp-1 mt-0.5 group-hover:text-signal-ivory/90 transition-colors">
                    {chapter.headline}
                  </p>
                </button>
              </div>
            );
          })}
        </div>

        {/* CENTER PHOENIX / CHARACTER OPEN SPACE (Zero obstruction of Aditya's face and body) */}
        <div className="flex-1 pointer-events-none" aria-hidden="true" />

        {/* RIGHT COLUMN: CHAPTERS 06 TO 10 */}
        <div className="w-[44vw] max-w-[280px] sm:max-w-[310px] lg:max-w-[340px] flex flex-col justify-between h-full py-10 md:py-8 lg:py-6 z-30">
          {rightChapters.map((chapter, idx) => {
            const cardProg = getCardProgress(idx);
            const IconComponent = CHAPTER_ICONS[chapter.id] || Sparkles;

            return (
              <div
                key={chapter.id}
                style={{
                  opacity: cardProg,
                  transform: `translateX(${(1 - cardProg) * 25}px) scale(${0.92 + cardProg * 0.08})`,
                  pointerEvents: cardProg > 0.6 ? 'auto' : 'none',
                }}
                className="transition-all duration-300 ease-out will-change-transform mb-1.5 md:mb-2"
              >
                <button
                  type="button"
                  onClick={() => onSelectChapter(chapter)}
                  aria-label={`${chapter.displayNumber}: ${chapter.title}`}
                  className="group w-full text-left p-2.5 md:p-3 lg:p-3.5 rounded-xl bg-[#181210]/90 hover:bg-[#201714]/95 border border-signal-coral/25 hover:border-signal-coral/75 shadow-[0_6px_20px_rgba(0,0,0,0.55)] hover:shadow-[0_8px_25px_rgba(224,109,83,0.3)] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-coral cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] md:text-xs font-bold text-signal-coral tracking-wider">
                        {chapter.number}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-signal-coral/60 group-hover:bg-signal-coral group-hover:scale-125 transition-all" />
                      <span className="text-[9px] md:text-[10px] font-mono tracking-widest uppercase text-signal-ivory/50 truncate max-w-[130px] md:max-w-[160px]">
                        {chapter.category.split('·')[0]}
                      </span>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-signal-ivory/5 group-hover:bg-signal-coral/20 flex items-center justify-center transition-colors">
                      <IconComponent className="w-3 h-3 text-signal-ivory/60 group-hover:text-signal-coral transition-colors" />
                    </div>
                  </div>

                  <h3 className="font-serif text-xs md:text-sm lg:text-[15px] font-bold text-signal-ivory group-hover:text-signal-peach transition-colors leading-tight">
                    {chapter.title}
                  </h3>

                  <p className="hidden md:block font-sans text-[11px] text-signal-ivory/70 line-clamp-1 mt-0.5 group-hover:text-signal-ivory/90 transition-colors">
                    {chapter.headline}
                  </p>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
