/// <reference types="vite/client" />
import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const preview = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('preview') : null;
const Preview = import.meta.env.DEV
  ? preview === 'rajasthan-world'
    ? lazy(() => import('./components/RajasthanWorldPreview'))
    : preview === 'rajasthan-cinematic' && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
      ? lazy(() => import('./components/RajasthanCinematicPreview'))
      : null
  : null;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {Preview ? (
      <Suspense fallback={<div className="w-screen h-screen bg-[#181210]" />}>
        <Preview />
      </Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
