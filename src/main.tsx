import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Page02PortraitPrototype } from './components/Page02PortraitPrototype';
import './index.css';

function Root() {
  const [isPrototype, setIsPrototype] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('preview') === 'page-02' ||
      params.has('prototype') ||
      window.location.hash === '#prototype'
    );
  });

  useEffect(() => {
    const handleHashChange = () => {
      setIsPrototype(
        window.location.hash === '#prototype' ||
        new URLSearchParams(window.location.search).get('preview') === 'page-02'
      );
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  if (isPrototype) {
    return (
      <Page02PortraitPrototype
        onExit={() => {
          window.location.hash = '';
          const url = new URL(window.location.href);
          url.searchParams.delete('preview');
          url.searchParams.delete('prototype');
          window.history.pushState({}, '', url.pathname);
          setIsPrototype(false);
        }}
      />
    );
  }

  return (
    <>
      <App />
      <button
        type="button"
        onClick={() => {
          window.location.hash = '#prototype';
          setIsPrototype(true);
        }}
        className="fixed bottom-4 right-4 z-50 px-3.5 py-1.5 rounded-full bg-[#181210]/90 backdrop-blur-md border border-[#FAF7F2]/20 text-xs font-mono text-[#FAF7F2]/90 hover:text-white hover:border-[#FF7E67]/70 transition-all shadow-xl cursor-pointer flex items-center gap-2 group"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF7E67] group-hover:scale-125 transition-transform" />
        <span>Preview Page 02 Prototype →</span>
      </button>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
