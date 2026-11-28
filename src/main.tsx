/// <reference types="vite/client" />
import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const RajasthanWorldPreview = lazy(() => import('./components/RajasthanWorldPreview'));

const isRajasthanWorldPreview =
  Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV) &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('preview') === 'rajasthan-world';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isRajasthanWorldPreview ? (
      <Suspense fallback={<div className="w-screen h-screen bg-[#181210]" />}>
        <RajasthanWorldPreview />
      </Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
