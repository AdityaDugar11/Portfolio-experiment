import { forwardRef } from 'react';

export const PortraitLayer = forwardRef<HTMLDivElement>((_props, ref) => {
  return (
    <div
      id="portrait-layer"
      className="fixed inset-0 z-10 pointer-events-none overflow-hidden flex items-end justify-center pb-4 md:pb-8 lg:pb-10"
      aria-hidden="true"
    >
      <div
        ref={ref}
        id="portrait-container"
        className="relative flex items-center justify-center transition-none will-change-transform"
        style={{
          transform: 'translate3d(24vw, 2vh, 0) scale(0.96)',
        }}
      >
        {/* Aditya's Original Photographic Portrait */}
        <img
          id="aditya-portrait"
          src="/assets/aditya.png"
          alt="Aditya Dugar"
          className="max-h-[78vh] md:max-h-[82vh] lg:max-h-[86vh] w-auto object-contain drop-shadow-[0_15px_35px_rgba(0,0,0,0.5)] select-none pointer-events-none"
          loading="eager"
          decoding="async"
        />
      </div>
    </div>
  );
});

PortraitLayer.displayName = 'PortraitLayer';
