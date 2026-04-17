import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

async function mount() {
  if (convexUrl) {
    // Convex configured — wrap with real-time provider
    const { ConvexAuthProvider } = await import('@convex-dev/auth/react');
    const { ConvexReactClient } = await import('convex/react');
    const convex = new ConvexReactClient(convexUrl);
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ConvexAuthProvider client={convex}>
          <App />
        </ConvexAuthProvider>
      </StrictMode>
    );
  } else {
    // Local mode — no ConvexProvider needed
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  }
}

mount();

// ── Service Worker registration ───────────────────────────────────────────────
// Register on startup for ALL users so the app-shell cache is always active.
// The push-subscription flow (pushSubscription.ts) reuses this registration via
// navigator.serviceWorker.getRegistration() — no double registration occurs.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(() => {
        // SW registration failure is non-fatal — app works without it
      });
  });
}
