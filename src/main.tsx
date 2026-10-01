import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import './index.css';

window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason &&
    (String(event.reason).includes('play()') ||
     String(event.reason).includes('interrupted') ||
     String(event.reason).includes('media was removed') ||
     String(event.reason).includes('Cloud Firestore backend') ||
     String(event.reason).includes('code=unavailable'))
  ) {
    event.preventDefault();
  }
});

if (typeof window !== 'undefined' && typeof HTMLMediaElement !== 'undefined') {
  const originalPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    const promise = originalPlay.apply(this, arguments as any);
    if (promise && typeof promise.catch === 'function') {
      return promise.catch((err) => {
        if (err && (err.name === 'AbortError' || err.message?.includes('interrupted'))) {
          // Suppress benign abort/interruption errors
          return Promise.resolve();
        }
        return Promise.reject(err);
      });
    }
    return promise;
  };
}

window.addEventListener('error', (event) => {
  const msg = (event.message || '').toLowerCase();
  if (
    msg.includes('dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('unexpected token \'<\'')
  ) {
    const attempted = sessionStorage.getItem('glcm_main_chunk_retry');
    const now = Date.now();
    if (!attempted || now - parseInt(attempted, 10) > 10000) {
      sessionStorage.setItem('glcm_main_chunk_retry', now.toString());
      window.location.reload();
    }
  }
});

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (mountErr) {
    console.error('Fatal mount error:', mountErr);
    rootElement.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#fff;padding:24px;font-family:sans-serif;text-align:center;">
        <div style="background:#1e293b;padding:32px;border-radius:20px;max-width:400px;border:1px solid #334155;">
          <h2 style="font-size:18px;margin-bottom:8px;color:#38bdf8;">Gracia Learning Centre</h2>
          <p style="font-size:13px;color:#94a3b8;margin-bottom:20px;">An update was deployed. Click below to refresh.</p>
          <button onclick="window.location.reload(true)" style="background:#1e3a8a;color:#fff;border:none;padding:10px 20px;border-radius:10px;font-weight:bold;cursor:pointer;width:100%;">
            Refresh Application
          </button>
        </div>
      </div>
    `;
  }
}


