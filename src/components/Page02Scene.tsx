import React, { useState } from 'react';
import { Page02SequenceCanvas, RenderedRect } from './Page02SequenceCanvas';
import { Page02ChapterCards } from './Page02ChapterCards';

interface Page02SceneProps {
  progress: number; // 0.0 to 1.0 (Page 2 internal scroll progress)
  className?: string;
}

export const Page02Scene: React.FC<Page02SceneProps> = ({ progress, className = '' }) => {
  const [renderedRect, setRenderedRect] = useState<RenderedRect | null>(null);

  return (
    <div
      id="page-02-scene-root"
      className={`relative w-full h-full min-h-screen overflow-hidden select-none ${className}`}
    >
      {/* 240 WebP Frame Sequence Player + Ambient Backdrop */}
      <Page02SequenceCanvas progress={progress} onRenderRectChange={setRenderedRect} />

      {/* Ten Chapter Cards attached to the actual ten terminal node positions */}
      <Page02ChapterCards progress={progress} renderedRect={renderedRect} />
    </div>
  );
};

export default Page02Scene;
