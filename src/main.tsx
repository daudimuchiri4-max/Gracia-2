import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


