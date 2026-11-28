/// <reference types="vite/client" />
import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const RajasthanWorldPreview =
  import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'rajasthan-world'
    ? lazy(() => import('./components/RajasthanWorldPreview'))
    : null;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {RajasthanWorldPreview ? (
      <Suspense fallback={<div className="w-screen h-screen bg-[#181210]" />}>
        <RajasthanWorldPreview />
      </Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
