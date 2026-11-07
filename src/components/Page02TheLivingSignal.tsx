import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { CHAPTERS_DATA, ChapterItem } from '../data/chaptersData';

interface Page02TheLivingSignalProps {
  progress: number; // 0.0 to 1.0 (Page 2 internal scroll progress)
  collectionProgress: number; // 0.0 (Orbital layout) to 1.0 (Assembled Page 3 Card Deck)
  onOpenChapter: (chapter: ChapterItem) => void;
  className?: string;
}

export const Page02TheLivingSignal: React.FC<Page02TheLivingSignalProps> = ({
  progress,
  collectionProgress,
  onOpenChapter,
  className = '',
}) => {
  const chapters = CHAPTERS_DATA;

  // Progressive reveal thresholds on Page 02:
  // 0.00 - 0.20: Portrait settles, subtle atmosphere
  // 0.20 - 0.45: Three luminous orbital rings progressively ignite and glow
  // 0.40 - 0.70: 10 curved connection paths draw outward to terminal nodes
  // 0.55 - 0.90: 10 chapter cards reveal sequentially (01, 06, 02, 07, etc.)
  // 0.85 - 1.00: Full 10-node orbital constellation active and glowing
  const ringOpacity = Math.min(Math.max((progress - 0.15) / 0.25, 0), 1) * (1 - collectionProgress);
  const connectorProgress = Math.min(Math.max((progress - 0.35) / 0.35, 0), 1);
  const connectorOpacity = connectorProgress * (1 - Math.min(collectionProgress * 2.5, 1));

  // Character and orbital background fade & scale down as cards collect towards Page 03 deck
  const characterScale = 1 - collectionProgress * 0.12;
  const characterOpacity = 1 - Math.min(collectionProgress * 1.4, 0.9);

  // Orbital layout configuration for Desktop (5 cards on left, 5 cards on right)
  // Card reveal stagger on Page 2
  const getCardRevealProgress = (index: number) => {
    // Reveal order: pairs from top to bottom (01&06, 02&07, 03&08, 04&09, 05&10)
    const pairIndex = index < 5 ? index : index - 5;
    const start = 0.45 + pairIndex * 0.08;
    const end = start + 0.18;
    return Math.min(Math.max((progress - start) / (end - start), 0), 1);
  };

  return (
    <div
      id="page-02-living-signal-root"
      className={`relative w-full h-full min-h-screen overflow-hidden select-none ${className}`}
    >
      {/* ========================================================
          ATMOSPHERIC SKY & SUNSET ENVIRONMENT BACKDROP
          Authentic pastel peach, soft sky-blue, warm ivory
          ======================================================== */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(244, 184, 150, 0.35) 0%, rgba(148, 185, 216, 0.25) 45%, rgba(24, 18, 16, 0.85) 90%), url("/assets/act-01-scenic-backdrop-pure.png") center/cover no-repeat',
          opacity: 1 - collectionProgress * 0.4,
        }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#181210] via-transparent to-[#181210]/60 pointer-events-none" />
      </div>

      {/* ========================================================
          CHARACTER & ORBITAL RINGS SYSTEM (3D Depth Layered)
          Aditya's authentic photographic portrait + 3 glowing rings
          ======================================================== */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none will-change-transform"
        style={{
          transform: `scale(${characterScale}) translateY(${collectionProgress * -25}px)`,
          opacity: characterOpacity,
          transition: 'transform 0.1s linear',
        }}
      >
        {/* Layer 1: BACK ARCS OF THE 3 ORBITAL RINGS (Passes behind Aditya's shoulders) */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          style={{ opacity: ringOpacity }}
          aria-hidden="true"
        >
          <svg
            className="w-full h-full max-w-5xl max-h-[85vh] overflow-visible"
            viewBox="0 0 1000 800"
            fill="none"
          >
            <defs>
              <linearGradient id="ringGlowPeach" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F4B896" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#E06D53" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#E5A862" stopOpacity="0.9" />
              </linearGradient>
              <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Back half of Ring 1 (Inner, tilted 14 deg) */}
            <path
              d="M 230 430 A 270 95 14 0 1 770 410"
              stroke="url(#ringGlowPeach)"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              opacity="0.8"
              filter="url(#softGlow)"
            />

            {/* Back half of Ring 2 (Middle, tilted -9 deg) */}
            <path
              d="M 180 435 A 320 115 -9 0 1 820 425"
              stroke="url(#ringGlowPeach)"
              strokeWidth="3"
              opacity="0.9"
              filter="url(#softGlow)"
            />

            {/* Back half of Ring 3 (Outer, tilted 22 deg) */}
            <path
              d="M 140 445 A 365 130 22 0 1 860 415"
              stroke="url(#ringGlowPeach)"
              strokeWidth="2"
              strokeDasharray="8 5"
              opacity="0.75"
              filter="url(#softGlow)"
            />
          </svg>
        </div>

        {/* Layer 2: ADITYA'S AUTHENTIC PHOTOGRAPHIC PORTRAIT (aditya.png) */}
        <div
          id="page-02-aditya-portrait-container"
          className="relative z-20 flex items-end justify-center pointer-events-none select-none max-h-[82vh] h-full"
        >
          <img
            src="/assets/aditya.png"
            alt="Aditya Dugar"
            className="max-h-[76vh] md:max-h-[82vh] w-auto object-contain drop-shadow-[0_20px_45px_rgba(0,0,0,0.65)] select-none pointer-events-none"
            loading="eager"
            decoding="async"
          />
        </div>

        {/* Layer 3: FRONT ARCS OF THE 3 ORBITAL RINGS (Passes in front of Aditya's chest/torso) */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          style={{ opacity: ringOpacity }}
          aria-hidden="true"
        >
          <svg
            className="w-full h-full max-w-5xl max-h-[85vh] overflow-visible"
            viewBox="0 0 1000 800"
            fill="none"
          >
            {/* Front half of Ring 1 (Inner, in front of chest) */}
            <path
              d="M 770 410 A 270 95 14 0 1 230 430"
              stroke="url(#ringGlowPeach)"
              strokeWidth="3.5"
              opacity="0.95"
              filter="url(#softGlow)"
            />
            {/* Traveling photons on Ring 1 */}
            <circle cx="340" cy="485" r="4" fill="#FFFFFF" filter="url(#softGlow)">
              <animate
                attributeName="opacity"
                values="0.4;1;0.4"
                dur="2.4s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Front half of Ring 2 (Middle, in front of chest) */}
            <path
              d="M 820 425 A 320 115 -9 0 1 180 435"
              stroke="url(#ringGlowPeach)"
              strokeWidth="4"
              opacity="1.0"
              filter="url(#softGlow)"
            />
            {/* Traveling photons on Ring 2 */}
            <circle cx="680" cy="495" r="4.5" fill="#FFFFFF" filter="url(#softGlow)">
              <animate
                attributeName="opacity"
                values="0.5;1;0.5"
                dur="3s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Front half of Ring 3 (Outer, in front of chest) */}
            <path
              d="M 860 415 A 365 130 22 0 1 140 445"
              stroke="url(#ringGlowPeach)"
              strokeWidth="2.5"
              strokeDasharray="8 5"
              opacity="0.85"
              filter="url(#softGlow)"
            />
            {/* Traveling photons on Ring 3 */}
            <circle cx="500" cy="530" r="3.5" fill="#FFE0D1" filter="url(#softGlow)">
              <animate
                attributeName="opacity"
                values="0.3;0.9;0.3"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        </div>
      </div>

      {/* ========================================================
          TEN OUTWARD CURVED CONNECTION PATHS & TERMINAL NODES
          Exactly 5 left, exactly 5 right (matching Reference Image 1)
          ======================================================== */}
      <div
        className="hidden lg:block absolute inset-0 pointer-events-none z-25 transition-opacity duration-300"
        style={{ opacity: connectorOpacity }}
        aria-hidden="true"
      >
        <svg
          className="w-full h-full overflow-visible"
          viewBox="0 0 1920 1080"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="connectorGradLeft" x1="100%" y1="50%" x2="0%" y2="50%">
              <stop offset="0%" stopColor="#F4B896" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#E06D53" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="connectorGradRight" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#F4B896" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#E06D53" stopOpacity="0.75" />
            </linearGradient>
          </defs>

          {/* LEFT 5 CONNECTOR PATHS (From Left Ring Apex at (760, 540) to 5 Left Cards at X=420) */}
          {/* Path 01: to Card 01 (Top Left) */}
          <path
            d="M 760 535 C 640 470, 540 180, 420 140"
            stroke="url(#connectorGradLeft)"
            strokeWidth="2"
            strokeDasharray="800"
            strokeDashoffset={800 * (1 - connectorProgress)}
            filter="drop-shadow(0 0 6px rgba(244, 184, 150, 0.6))"
          />
          <circle cx="420" cy="140" r="5" fill="#FAF6F0" stroke="#E06D53" strokeWidth="2.5" />

          {/* Path 02: to Card 02 (Upper Middle Left) */}
          <path
            d="M 750 540 C 650 510, 530 350, 420 320"
            stroke="url(#connectorGradLeft)"
            strokeWidth="2"
            strokeDasharray="600"
            strokeDashoffset={600 * (1 - connectorProgress)}
            filter="drop-shadow(0 0 6px rgba(244, 184, 150, 0.6))"
          />
          <circle cx="420" cy="320" r="5" fill="#FAF6F0" stroke="#E06D53" strokeWidth="2.5" />

          {/* Path 03: to Card 03 (Middle Left) */}
          <path
            d="M 740 545 C 640 545, 520 500, 420 500"
            stroke="url(#connectorGradLeft)"
            strokeWidth="2.2"
            strokeDasharray="500"
            strokeDashoffset={500 * (1 - connectorProgress)}
            filter="drop-shadow(0 0 6px rgba(244, 184, 150, 0.6))"
          />
          <circle cx="420" cy="500" r="5.5" fill="#FAF6F0" stroke="#E06D53" strokeWidth="2.5" />

          {/* Path 04: to Card 04 (Lower Middle Left) */}
          <path
            d="M 750 550 C 650 580, 530 680, 420 680"
            stroke="url(#connectorGradLeft)"
            strokeWidth="2"
            strokeDasharray="600"
            strokeDashoffset={600 * (1 - connectorProgress)}
            filter="drop-shadow(0 0 6px rgba(244, 184, 150, 0.6))"
          />
          <circle cx="420" cy="680" r="5" fill="#FAF6F0" stroke="#E06D53" strokeWidth="2.5" />

          {/* Path 05: to Card 05 (Bottom Left) */}
          <path
            d="M 760 555 C 640 620, 540 850, 420 860"
            stroke="url(#connectorGradLeft)"
            strokeWidth="2"
            strokeDasharray="800"
            strokeDashoffset={800 * (1 - connectorProgress)}
            filter="drop-shadow(0 0 6px rgba(244, 184, 150, 0.6))"
          />
          <circle cx="420" cy="860" r="5" fill="#FAF6F0" stroke="#E06D53" strokeWidth="2.5" />

          {/* RIGHT 5 CONNECTOR PATHS (From Right Ring Apex at (1160, 540) to 5 Right Cards at X=1500) */}
          {/* Path 06: to Card 06 (Top Right) */}
          <path
            d="M 1160 535 C 1280 470, 1380 180, 1500 140"
            stroke="url(#connectorGradRight)"
            strokeWidth="2"
            strokeDasharray="800"
            strokeDashoffset={800 * (1 - connectorProgress)}
            filter="drop-shadow(0 0 6px rgba(244, 184, 150, 0.6))"
          />
          <circle cx="1500" cy="140" r="5" fill="#FAF6F0" stroke="#E06D53" strokeWidth="2.5" />

          {/* Path 07: to Card 07 (Upper Middle Right) */}
          <path
            d="M 1170 540 C 1270 510, 1390 350, 1500 320"
            stroke="url(#connectorGradRight)"
            strokeWidth="2"
            strokeDasharray="600"
            strokeDashoffset={600 * (1 - connectorProgress)}
            filter="drop-shadow(0 0 6px rgba(244, 184, 150, 0.6))"
          />
          <circle cx="1500" cy="320" r="5" fill="#FAF6F0" stroke="#E06D53" strokeWidth="2.5" />

          {/* Path 08: to Card 08 (Middle Right) */}
          <path
            d="M 1180 545 C 1280 545, 1400 500, 1500 500"
            stroke="url(#connectorGradRight)"
            strokeWidth="2.2"
            strokeDasharray="500"
            strokeDashoffset={500 * (1 - connectorProgress)}
            filter="drop-shadow(0 0 6px rgba(244, 184, 150, 0.6))"
          />
          <circle cx="1500" cy="500" r="5.5" fill="#FAF6F0" stroke="#E06D53" strokeWidth="2.5" />

          {/* Path 09: to Card 09 (Lower Middle Right) */}
          <path
            d="M 1170 550 C 1270 580, 1390 680, 1500 680"
            stroke="url(#connectorGradRight)"
            strokeWidth="2"
            strokeDasharray="600"
            strokeDashoffset={600 * (1 - connectorProgress)}
            filter="drop-shadow(0 0 6px rgba(244, 184, 150, 0.6))"
          />
          <circle cx="1500" cy="680" r="5" fill="#FAF6F0" stroke="#E06D53" strokeWidth="2.5" />

          {/* Path 10: to Card 10 (Bottom Right) */}
          <path
            d="M 1160 555 C 1280 620, 1380 850, 1500 860"
            stroke="url(#connectorGradRight)"
            strokeWidth="2"
            strokeDasharray="800"
            strokeDashoffset={800 * (1 - connectorProgress)}
            filter="drop-shadow(0 0 6px rgba(244, 184, 150, 0.6))"
          />
          <circle cx="1500" cy="860" r="5" fill="#FAF6F0" stroke="#E06D53" strokeWidth="2.5" />
        </svg>
      </div>

      {/* ========================================================
          DESKTOP: TEN CHAPTER CARDS (5 Left, 5 Right)
          During Page 2, positioned vertically along sides.
          During Collection Runway (Stage C), detach and animate into stack!
          ======================================================== */}
      <div className="hidden lg:block absolute inset-0 z-35 pointer-events-none">
        {chapters.map((chapter, index) => {
          const isLeft = index < 5;
          const pairIndex = isLeft ? index : index - 5;
          const revealVal = getCardRevealProgress(index);

          // Orbital Layout Coordinates (in vw and vh)
          const orbitalX = isLeft ? 5 : 76; // 5vw or 76vw
          const orbitalY = 8 + pairIndex * 17.5; // 8vh, 25.5vh, 43vh, 60.5vh, 78vh

          // Page 3 Stack Layout Coordinates (Target positions for Stage C collection)
          // Center of the stack is around X = 32vw, Y = 28vh
          const deckX = 30 + index * 2.4; // Slightly offset right
          const deckY = 24; // Align horizontally in center stack
          const deckScale = 1.0;
          const orbitalScale = 0.95;

          // Interpolation based on collectionProgress
          const currentX = orbitalX + (deckX - orbitalX) * collectionProgress;
          const currentY = orbitalY + (deckY - orbitalY) * collectionProgress;
          const currentScale = orbitalScale + (deckScale - orbitalScale) * collectionProgress;
          const cardZIndex = collectionProgress > 0.5 ? 40 - index : 30;

          // Card opacity: reveals on Page 2, stays fully visible as it collects into Page 3
          const cardOpacity = Math.max(revealVal, collectionProgress > 0 ? 1 : 0);

          return (
            <div
              key={chapter.id}
              onClick={() => onOpenChapter(chapter)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenChapter(chapter);
                }
              }}
              aria-label={`${chapter.displayNumber}: ${chapter.title}`}
              style={{
                position: 'absolute',
                left: `${currentX}vw`,
                top: `${currentY}vh`,
                width: '19vw',
                maxWidth: '300px',
                minWidth: '220px',
                zIndex: cardZIndex,
                transform: `scale(${currentScale})`,
                opacity: cardOpacity,
                transition: 'box-shadow 0.25s ease, transform 0.25s ease',
              }}
              className="pointer-events-auto bg-[#FAF6F0] text-[#2A1B16] rounded-2xl p-4 lg:p-5 border border-[#E06D53]/25 shadow-[0_12px_28px_rgba(0,0,0,0.35)] hover:shadow-[0_18px_40px_rgba(224,109,83,0.3)] hover:-translate-y-1 cursor-pointer transition-all duration-300 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E06D53]"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-xs font-black text-[#E06D53] tracking-wider">
                  {chapter.number}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#2A1B16]/65 font-bold truncate max-w-[130px]">
                  {chapter.category.split('·')[0]}
                </span>
                <div className="w-6 h-6 rounded-full bg-[#E06D53]/10 flex items-center justify-center transition-transform group-hover:scale-110">
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#E06D53]" />
                </div>
              </div>

              <h4 className="font-serif text-base lg:text-lg font-bold text-[#2A1B16] leading-snug line-clamp-1 group-hover:text-[#E06D53] transition-colors">
                {chapter.title}
              </h4>
              <p className="font-sans text-[11px] lg:text-xs text-[#2A1B16]/75 mt-1 line-clamp-2 leading-relaxed">
                {chapter.headline}
              </p>
            </div>
          );
        })}
      </div>

      {/* ========================================================
          MOBILE & TABLET: PORTRAIT RESPONSIVE CARD CAROUSEL/GRID
          Face remains completely unobstructed! No cards over face.
          ======================================================== */}
      <div className="lg:hidden absolute bottom-6 left-0 right-0 z-35 px-4 flex flex-col items-center pointer-events-none">
        <div className="w-full max-w-md bg-[#FAF6F0]/95 backdrop-blur-md text-[#2A1B16] rounded-2xl p-5 border border-[#E06D53]/30 shadow-[0_15px_35px_rgba(0,0,0,0.5)] pointer-events-auto">
          {/* Display current active mobile card determined by progress */}
          {(() => {
            const activeIdx = Math.min(
              Math.max(Math.floor(progress * 10), 0),
              chapters.length - 1
            );
            const activeChapter = chapters[activeIdx];
            return (
              <div
                key={activeChapter.id}
                onClick={() => onOpenChapter(activeChapter)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-[#E06D53]">
                      {activeChapter.number}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#2A1B16]/60 font-bold">
                      {activeChapter.category.split('·')[0]}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#E06D53] font-bold inline-flex items-center gap-1">
                    Read Story <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>

                <h4 className="font-serif text-lg font-bold text-[#2A1B16]">
                  {activeChapter.title}
                </h4>
                <p className="font-sans text-xs text-[#2A1B16]/75 mt-1 line-clamp-2">
                  {activeChapter.headline}
                </p>

                {/* Mobile 10-Chapter Step Indicators */}
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#2A1B16]/10">
                  {chapters.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        activeIdx === i ? 'w-5 bg-[#E06D53]' : 'w-1.5 bg-[#2A1B16]/20'
                      }`}
                    />
                  ))}
                  <span className="ml-auto font-mono text-[9px] text-[#2A1B16]/50">
                    Scroll to advance
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
