import React, { useEffect, forwardRef } from 'react';

interface BackgroundVideoProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const BackgroundVideo = forwardRef<HTMLDivElement, BackgroundVideoProps>(({ videoRef }, ref) => {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Browser policy: Autoplay must begin muted
    video.defaultMuted = true;
    video.muted = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Autoplay deferred by browser policy:', err);
      });
    }
  }, [videoRef]);

  return (
    <div
      id="background-video-layer"
      className="fixed inset-0 z-0 overflow-hidden bg-[#181210] pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* Inner animated wrapper for smooth GSAP cinematic camera zoom / pan */}
      <div
        ref={ref}
        id="camera-video-wrapper"
        className="relative w-full h-full will-change-transform"
        style={{
          transformOrigin: '35% 50%',
          transform: 'scale(1.0)',
        }}
      >
        <video
          ref={videoRef}
          src="/media/act-01-environment.mp4"
          poster="/media/act-01-environment-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="w-full h-full object-cover object-[22%_center] md:object-[30%_center] lg:object-center"
        />
      </div>

      {/* Atmospheric depth vignette ensuring text readability without hiding scenery */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/25 pointer-events-none" />
    </div>
  );
});

BackgroundVideo.displayName = 'BackgroundVideo';
