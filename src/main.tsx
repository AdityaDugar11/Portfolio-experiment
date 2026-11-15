import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Page02EditorialScene } from './components/Page02EditorialScene';
import { Page02StoryExperience } from './components/Page02StoryExperience';
import { Page02LivingTrace } from './components/Page02LivingTrace';
import './index.css';

function Root() {
  const [activePreview, setActivePreview] = useState<'none' | 'editorial' | 'story' | 'trace'>(() => {
    if (typeof window === 'undefined') return 'none';
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') === 'trace' || params.get('preview') === 'living-trace' || window.location.hash === '#trace') {
      return 'trace';
    }
    if (params.get('preview') === 'page-02-story' || window.location.hash === '#story') {
      return 'story';
    }
    if (
      params.get('preview') === 'page-02' ||
      params.has('prototype') ||
      window.location.hash === '#prototype'
    ) {
      return 'editorial';
    }
    return 'none';
  });

  const [traceProgress, setTraceProgress] = useState(0.15);

  useEffect(() => {
    const handleHashOrPopState = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('preview') === 'trace' || params.get('preview') === 'living-trace' || window.location.hash === '#trace') {
        setActivePreview('trace');
      } else if (params.get('preview') === 'page-02-story' || window.location.hash === '#story') {
        setActivePreview('story');
      } else if (
        params.get('preview') === 'page-02' ||
        params.has('prototype') ||
        window.location.hash === '#prototype'
      ) {
        setActivePreview('editorial');
      } else {
        setActivePreview('none');
      }
    };
    window.addEventListener('hashchange', handleHashOrPopState);
    window.addEventListener('popstate', handleHashOrPopState);
    return () => {
      window.removeEventListener('hashchange', handleHashOrPopState);
      window.removeEventListener('popstate', handleHashOrPopState);
    };
  }, []);

  const exitPreview = () => {
    window.location.hash = '';
    const url = new URL(window.location.href);
    url.searchParams.delete('preview');
    url.searchParams.delete('prototype');
    window.history.pushState({}, '', url.pathname);
    setActivePreview('none');
  };

  if (activePreview === 'trace') {
    return (
      <div className="relative w-full h-screen overflow-hidden">
        <Page02LivingTrace progress={traceProgress} isVisible={true} />
        {/* Interactive Scrub Control for Direct Preview Inspection */}
        <div className="fixed bottom-6 inset-x-0 z-50 flex flex-col items-center gap-2 pointer-events-auto px-6">
          <div className="bg-[#1A1412]/90 backdrop-blur-md px-5 py-3 rounded-2xl border border-[#FAF7F2]/20 shadow-2xl flex items-center gap-4 text-xs font-mono text-white max-w-md w-full">
            <span className="text-[#E06D53] font-bold whitespace-nowrap">SCRUB: {(traceProgress * 100).toFixed(0)}%</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={traceProgress}
              onChange={(e) => setTraceProgress(parseFloat(e.target.value))}
              className="w-full accent-[#E06D53] cursor-pointer"
            />
            <span className="text-stone-400 whitespace-nowrap text-[11px]">
              {traceProgress < 0.35 ? 'Ch 01' : traceProgress < 0.60 ? 'Transition' : 'Ch 02'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={exitPreview}
          className="fixed top-4 right-4 z-50 px-3.5 py-1.5 rounded-full bg-[#1A1412]/80 hover:bg-[#1A1412] backdrop-blur-md border border-[#FAF7F2]/20 text-xs font-mono text-[#FAF7F2] transition-colors cursor-pointer"
        >
          Exit Preview ✕
        </button>
      </div>
    );
  }

  if (activePreview === 'story') {
    return <Page02StoryExperience onExit={exitPreview} />;
  }

  if (activePreview === 'editorial') {
    return (
      <div className="relative w-full h-screen overflow-hidden">
        <Page02EditorialScene progress={0.15} isVisible={true} />
        <button
          type="button"
          onClick={exitPreview}
          className="fixed top-4 right-4 z-50 px-3.5 py-1.5 rounded-full bg-[#1A1412]/80 hover:bg-[#1A1412] backdrop-blur-md border border-[#FAF7F2]/20 text-xs font-mono text-[#FAF7F2] transition-colors cursor-pointer"
        >
          Exit Preview ✕
        </button>
      </div>
    );
  }

  return (
    <>
      <App />
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            window.location.hash = '#trace';
            setActivePreview('trace');
          }}
          className="px-4 py-2 rounded-full bg-[#E06D53] hover:bg-[#D65538] text-white text-xs font-mono font-semibold shadow-xl transition-all cursor-pointer flex items-center gap-2 group"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>Launch Living Trace (Ch 01–02) →</span>
        </button>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
