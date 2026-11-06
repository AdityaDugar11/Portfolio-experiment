import React from 'react';
import { Volume2, VolumeX, ArrowUpRight } from 'lucide-react';

interface NavigationProps {
  onOpenContact: () => void;
  onNavigateSection?: (sectionId: string) => void;
  isMuted?: boolean;
  onToggleSound?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  onOpenContact,
  onNavigateSection,
  isMuted = true,
  onToggleSound,
}) => {
  return (
    <header
      id="main-navigation"
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 md:px-12 lg:px-16 py-6 pointer-events-auto select-none"
      role="banner"
    >
      {/* Brand Logo: AD with warm coral bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="group flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-coral rounded"
          aria-label="Aditya Dugar Home"
        >
          <span className="font-serif text-2xl font-bold tracking-tight text-signal-ivory group-hover:text-signal-coral transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            AD
          </span>
          <span className="w-8 h-[2px] bg-gradient-to-r from-signal-coral to-signal-peach rounded-full shadow-[0_0_8px_rgba(224,109,83,0.5)]" />
        </button>
      </div>

      {/* Nav Links & Controls */}
      <div className="flex items-center gap-6 md:gap-8">
        <nav className="hidden md:flex items-center gap-8 tracking-widest text-xs font-bold text-signal-ivory/80 uppercase">
          <button
            onClick={() => onNavigateSection?.('work')}
            className="hover:text-signal-coral transition-colors focus:outline-none focus-visible:text-signal-coral drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
          >
            Work
          </button>
          <button
            onClick={() => onNavigateSection?.('systems')}
            className="hover:text-signal-coral transition-colors focus:outline-none focus-visible:text-signal-coral drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
          >
            Systems
          </button>
          <button
            onClick={() => onNavigateSection?.('journey')}
            className="hover:text-signal-coral transition-colors focus:outline-none focus-visible:text-signal-coral drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
          >
            Journey
          </button>
          <button
            onClick={onOpenContact}
            className="hover:text-signal-coral transition-colors focus:outline-none focus-visible:text-signal-coral drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
          >
            Contact
          </button>
        </nav>

        {/* Native Environment Video Sound Controller */}
        <button
          type="button"
          onClick={onToggleSound}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-coral ${
            !isMuted
              ? 'bg-signal-coral/25 border-signal-coral text-signal-ivory shadow-[0_0_12px_rgba(224,109,83,0.4)]'
              : 'bg-black/40 hover:bg-black/60 border-white/20 text-signal-ivory/70 hover:text-signal-ivory'
          }`}
          aria-label={isMuted ? 'Sound is muted. Click to play environment audio.' : 'Sound is playing. Click to mute audio.'}
          title={isMuted ? 'Click to enable audio' : 'Click to mute audio'}
        >
          {!isMuted ? (
            <Volume2 className="w-3.5 h-3.5 text-signal-coral animate-pulse" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-signal-ivory/60" />
          )}
          <span className="text-[10px] font-bold tracking-widest uppercase">
            {!isMuted ? 'SOUND: ON' : 'SOUND: OFF'}
          </span>
        </button>

        {/* CTA Button: GET IN TOUCH ↗ */}
        <button
          onClick={onOpenContact}
          className="group flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase text-signal-ivory bg-[#181210]/80 hover:bg-signal-coral border border-signal-coral/60 hover:border-signal-coral backdrop-blur-md transition-all duration-300 shadow-[0_2px_12px_rgba(0,0,0,0.4)] hover:shadow-[0_4px_20px_rgba(224,109,83,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-coral"
        >
          <span>Get in Touch</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-signal-coral group-hover:text-signal-ivory group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </header>
  );
};
