import React, { useMemo } from 'react';
import { CHAPTERS_DATA } from '../data/chaptersData';
import { RenderedRect } from './Page02SequenceCanvas';

interface Page02ChapterCardsProps {
  progress: number; // Page 02 progress (0.0 to 1.0)
  renderedRect: RenderedRect | null;
  className?: string;
}

// Normalized coordinates of the 10 terminal nodes within the 1280x720 video frames
export const LEFT_NODE_COORDS = [
  { nx: 126.2 / 1280, ny: 130.8 / 720 }, // Node L1 (Ch 01)
  { nx: 171.7 / 1280, ny: 242.8 / 720 }, // Node L2 (Ch 02)
  { nx: 110.7 / 1280, ny: 344.8 / 720 }, // Node L3 (Ch 03)
  { nx: 153.3 / 1280, ny: 455.3 / 720 }, // Node L4 (Ch 04)
  { nx: 181.6 / 1280, ny: 567.8 / 720 }, // Node L5 (Ch 05)
];

export const RIGHT_NODE_COORDS = [
  { nx: 1138.5 / 1280, ny: 134.5 / 720 }, // Node R1 (Ch 06)
  { nx: 1121.0 / 1280, ny: 241.7 / 720 }, // Node R2 (Ch 07)
  { nx: 1165.4 / 1280, ny: 344.9 / 720 }, // Node R3 (Ch 08)
  { nx: 1118.4 / 1280, ny: 454.6 / 720 }, // Node R4 (Ch 09)
  { nx: 1093.1 / 1280, ny: 568.4 / 720 }, // Node R5 (Ch 10)
];

export const Page02ChapterCards: React.FC<Page02ChapterCardsProps> = ({
  progress,
  renderedRect,
  className = '',
}) => {
  const isMobile = !renderedRect || renderedRect.isMobile;
  const windowW = typeof window !== 'undefined' ? window.innerWidth : 1280;

  // Progressive reveal calculation matching the video's connection formation:
  // Pair 0 (01 & 06): start 0.38, full 0.50
  // Pair 1 (02 & 07): start 0.48, full 0.60
  // Pair 2 (03 & 08): start 0.58, full 0.70
  // Pair 3 (04 & 09): start 0.68, full 0.80
  // Pair 4 (05 & 10): start 0.78, full 0.90
  const getCardRevealProgress = (pairIndex: number) => {
    const start = 0.36 + pairIndex * 0.10;
    const end = start + 0.12;
    if (progress <= start) return 0;
    if (progress >= end) return 1;
    return (progress - start) / (end - start);
  };

  // Screen coordinates of the 10 terminal nodes on Desktop/Tablet
  const nodePositions = useMemo(() => {
    if (!renderedRect || renderedRect.width === 0) {
      return { left: [], right: [] };
    }

    const left = LEFT_NODE_COORDS.map((coord) => ({
      x: Math.round(renderedRect.x + coord.nx * renderedRect.width),
      y: Math.round(renderedRect.y + coord.ny * renderedRect.height),
    }));

    const right = RIGHT_NODE_COORDS.map((coord) => ({
      x: Math.round(renderedRect.x + coord.nx * renderedRect.width),
      y: Math.round(renderedRect.y + coord.ny * renderedRect.height),
    }));

    return { left, right };
  }, [renderedRect]);

  // Overall overlay opacity: fades in as Page 2 begins
  const overlayOpacity = Math.min(Math.max((progress - 0.2) / 0.15, 0), 1);
  if (overlayOpacity <= 0) return null;

  // Left 5 chapters (01..05) and Right 5 chapters (06..10)
  const leftChapters = CHAPTERS_DATA.slice(0, 5);
  const rightChapters = CHAPTERS_DATA.slice(5, 10);

  // =========================================================================
  // MOBILE VIEW: Single-column vertical arrangement beneath 16:9 character scene
  // Strictly preserves 16:9 video frame, no letterbox bars, unobstructed portrait
  // =========================================================================
  if (isMobile) {
    const frameBottom = (renderedRect?.y || 0) + (renderedRect?.height || 220);
    const mobileReveal = Math.min(Math.max((progress - 0.42) / 0.16, 0), 1);

    // Subtle upward scroll translation as visitor continues scrolling down through Page 2
    // Allows effortless review of all 10 cards across the scroll runway
    const scrollTranslateFactor = Math.min(Math.max((progress - 0.52) / 0.48, 0), 1);
    const scrollOffset = scrollTranslateFactor * 260;

    return (
      <div
        id="mobile-chapter-cards-container"
        className={`fixed inset-x-0 bottom-0 pointer-events-auto z-30 flex flex-col items-center select-none ${className}`}
        style={{
          top: `${frameBottom + 12}px`,
          opacity: mobileReveal,
          transition: 'opacity 0.25s ease',
        }}
        aria-label="Ten Chapter Cards"
      >
        {/* Subtle section label */}
        <div className="w-full max-w-sm px-4 mb-2 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E06D53] animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#FAF6F0]/80 font-bold drop-shadow">
              Ten Chapters
            </span>
          </div>
          <span className="font-mono text-[9px] text-[#FAF6F0]/60 tracking-wider">
            Scroll to browse
          </span>
        </div>

        {/* Clean Single-Column Vertical Arrangement */}
        <div
          className="w-full max-w-sm px-4 overflow-y-auto pb-8 space-y-3 pointer-events-auto touch-pan-y"
          style={{
            maxHeight: `calc(100vh - ${frameBottom + 45}px)`,
            transform: `translateY(${-scrollOffset * 0.5}px)`,
            transition: 'transform 0.1s linear',
          }}
        >
          {CHAPTERS_DATA.map((chapter, idx) => {
            const cardReveal = Math.min(Math.max((progress - (0.42 + idx * 0.05)) / 0.10, 0), 1);
            return (
              <div
                key={chapter.id}
                role="article"
                tabIndex={0}
                aria-label={`${chapter.displayNumber}: ${chapter.title}`}
                style={{
                  opacity: cardReveal,
                  transform: `translateY(${(1 - cardReveal) * 16}px)`,
                  transition: 'opacity 0.25s ease, transform 0.25s ease',
                }}
                className="w-full bg-[#FAF6F0] text-[#2A1B16] rounded-2xl p-4 border border-[#E06D53]/20 shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:scale-[0.98] transition-all cursor-default"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#E06D53] tracking-wider">
                      {chapter.number}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E06D53]/50" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#2A1B16]/65 font-bold truncate max-w-[170px]">
                      {chapter.category.split('·')[0]}
                    </span>
                  </div>
                  <span className="font-mono text-[9px] text-[#E06D53] font-bold tracking-wider">
                    {chapter.displayNumber}
                  </span>
                </div>

                <h4 className="font-serif text-[15px] font-bold text-[#2A1B16] leading-snug">
                  {chapter.title}
                </h4>

                <p className="font-sans text-xs text-[#2A1B16]/75 mt-1 line-clamp-2 leading-relaxed">
                  {chapter.summary}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // DESKTOP & TABLET VIEW: Five Cards Left, Five Cards Right
  // Attached to the ten terminal-node positions in the actual source animation
  // =========================================================================
  const cardWidth = Math.min(Math.max(windowW * 0.18, 220), 285);

  return (
    <div
      id="desktop-chapter-cards-layer"
      className={`fixed inset-0 pointer-events-none z-30 overflow-hidden select-none ${className}`}
      style={{ opacity: overlayOpacity }}
      aria-label="Ten Chapter Cards Constellation"
    >
      {/* SVG Vector Connector Overlay: draws delicate lines from video terminal nodes to cards */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="nodeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Left 5 Connectors */}
        {nodePositions.left.map((node, i) => {
          const cardProg = getCardRevealProgress(i);
          if (cardProg <= 0.02) return null;

          const cardX = Math.max(16, node.x - cardWidth - 14);
          const cardAnchorX = cardX + cardWidth;
          const cardAnchorY = node.y;

          return (
            <g key={`left-node-connector-${i}`} opacity={cardProg}>
              {/* Subtle vector line from node to card */}
              <line
                x1={node.x}
                y1={node.y}
                x2={cardAnchorX}
                y2={cardAnchorY}
                stroke="#E06D53"
                strokeWidth="1.5"
                strokeOpacity="0.75"
                strokeDasharray="4 3"
                filter="url(#nodeGlow)"
              />
              {/* Terminal Node Beacon Dot */}
              <circle
                cx={node.x}
                cy={node.y}
                r="4.5"
                fill="#FAF6F0"
                stroke="#E06D53"
                strokeWidth="2"
                filter="url(#nodeGlow)"
              />
            </g>
          );
        })}

        {/* Right 5 Connectors */}
        {nodePositions.right.map((node, i) => {
          const cardProg = getCardRevealProgress(i);
          if (cardProg <= 0.02) return null;

          const cardX = Math.min(windowW - cardWidth - 16, node.x + 14);
          const cardAnchorX = cardX;
          const cardAnchorY = node.y;

          return (
            <g key={`right-node-connector-${i}`} opacity={cardProg}>
              {/* Subtle vector line from node to card */}
              <line
                x1={node.x}
                y1={node.y}
                x2={cardAnchorX}
                y2={cardAnchorY}
                stroke="#E06D53"
                strokeWidth="1.5"
                strokeOpacity="0.75"
                strokeDasharray="4 3"
                filter="url(#nodeGlow)"
              />
              {/* Terminal Node Beacon Dot */}
              <circle
                cx={node.x}
                cy={node.y}
                r="4.5"
                fill="#FAF6F0"
                stroke="#E06D53"
                strokeWidth="2"
                filter="url(#nodeGlow)"
              />
            </g>
          );
        })}
      </svg>

      {/* LEFT COLUMN: CHAPTERS 01 TO 05 */}
      {leftChapters.map((chapter, i) => {
        const node = nodePositions.left[i];
        if (!node) return null;

        const cardProg = getCardRevealProgress(i);
        const cardX = Math.max(16, node.x - cardWidth - 14);
        const cardY = node.y - 48; // Centered vertically relative to terminal node

        return (
          <div
            key={chapter.id}
            role="article"
            tabIndex={0}
            aria-label={`${chapter.displayNumber}: ${chapter.title}`}
            style={{
              position: 'absolute',
              left: `${cardX}px`,
              top: `${cardY}px`,
              width: `${cardWidth}px`,
              opacity: cardProg,
              transform: `translateX(${(1 - cardProg) * -20}px)`,
              pointerEvents: cardProg > 0.4 ? 'auto' : 'none',
              transition: 'box-shadow 0.25s ease, transform 0.25s ease, opacity 0.2s ease',
            }}
            className="group pointer-events-auto bg-[#FAF6F0] text-[#2A1B16] rounded-2xl p-3.5 lg:p-4 border border-[#E06D53]/25 shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:shadow-[0_14px_36px_rgba(224,109,83,0.3)] hover:-translate-y-1 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E06D53] cursor-default"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs font-bold text-[#E06D53] tracking-wider">
                {chapter.number}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#2A1B16]/65 font-bold truncate max-w-[130px]">
                {chapter.category.split('·')[0]}
              </span>
            </div>

            <h4 className="font-serif text-sm lg:text-[15px] font-bold text-[#2A1B16] leading-snug line-clamp-1 group-hover:text-[#E06D53] transition-colors">
              {chapter.title}
            </h4>

            <p className="font-sans text-[11px] lg:text-xs text-[#2A1B16]/75 mt-0.5 line-clamp-2 leading-relaxed">
              {chapter.summary}
            </p>
          </div>
        );
      })}

      {/* RIGHT COLUMN: CHAPTERS 06 TO 10 */}
      {rightChapters.map((chapter, i) => {
        const node = nodePositions.right[i];
        if (!node) return null;

        const cardProg = getCardRevealProgress(i);
        const cardX = Math.min(windowW - cardWidth - 16, node.x + 14);
        const cardY = node.y - 48; // Centered vertically relative to terminal node

        return (
          <div
            key={chapter.id}
            role="article"
            tabIndex={0}
            aria-label={`${chapter.displayNumber}: ${chapter.title}`}
            style={{
              position: 'absolute',
              left: `${cardX}px`,
              top: `${cardY}px`,
              width: `${cardWidth}px`,
              opacity: cardProg,
              transform: `translateX(${(1 - cardProg) * 20}px)`,
              pointerEvents: cardProg > 0.4 ? 'auto' : 'none',
              transition: 'box-shadow 0.25s ease, transform 0.25s ease, opacity 0.2s ease',
            }}
            className="group pointer-events-auto bg-[#FAF6F0] text-[#2A1B16] rounded-2xl p-3.5 lg:p-4 border border-[#E06D53]/25 shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:shadow-[0_14px_36px_rgba(224,109,83,0.3)] hover:-translate-y-1 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E06D53] cursor-default"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs font-bold text-[#E06D53] tracking-wider">
                {chapter.number}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#2A1B16]/65 font-bold truncate max-w-[130px]">
                {chapter.category.split('·')[0]}
              </span>
            </div>

            <h4 className="font-serif text-sm lg:text-[15px] font-bold text-[#2A1B16] leading-snug line-clamp-1 group-hover:text-[#E06D53] transition-colors">
              {chapter.title}
            </h4>

            <p className="font-sans text-[11px] lg:text-xs text-[#2A1B16]/75 mt-0.5 line-clamp-2 leading-relaxed">
              {chapter.summary}
            </p>
          </div>
        );
      })}
    </div>
  );
};
