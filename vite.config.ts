import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  // script-src: in dev we need 'unsafe-inline' for Vite HMR hot-update scripts.
  // In production that vector is gone, so we drop it entirely.
  const scriptSrc = isProd
    ? "script-src 'self'"
    : "script-src 'self' 'unsafe-inline'";

  // connect-src: scoped tightly per environment.
  // Production: only known Convex cloud domains + Resend API (no localhost).
  // Development: allow localhost ports for Vite HMR, Socket.io proxy, and push API.
  // The broad "ws:" wildcard used previously allowed WebSocket connections to ANY
  // origin from the user's browser — an unnecessary attack surface (OWASP A05).
  const connectSrc = isProd
    ? "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://api.resend.com"
    : "connect-src 'self' ws://localhost:* wss://localhost:* http://localhost:3002 http://localhost:5174 http://localhost:5175";

  const securityHeaders: Record<string, string> = {
    'X-Content-Type-Options':  'nosniff',
    'X-Frame-Options':         'DENY',
    // X-XSS-Protection omitted: deprecated in all modern browsers, actively harmful
    // in some older IE versions, and superseded by CSP (OWASP A05 / CWE-1021).
    'Referrer-Policy':         'strict-origin-when-cross-origin',
    'Permissions-Policy':      'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      connectSrc,
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  };

  return {
    plugins: [react()],

    build: {
      rollupOptions: {
        output: {
          // Split large, stable vendor libraries into separate chunks.
          // They receive a long-lived cache fingerprint and only re-download
          // when the library version changes — not on every app deploy.
          manualChunks(id) {
            // Split stable vendor libraries into named chunks so they get
            // long-lived cache fingerprints and only re-download on version bumps.
            if (id.includes('/node_modules/recharts') || id.includes('/node_modules/d3-')) return 'vendor-recharts';
            if (id.includes('/node_modules/framer-motion')) return 'vendor-framer';
            if (id.includes('/node_modules/socket.io-client') || id.includes('/node_modules/engine.io-client')) return 'vendor-socketio';
            if (id.includes('/node_modules/date-fns')) return 'vendor-datefns';
            if (id.includes('/node_modules/react-hook-form') || id.includes('/node_modules/zod') || id.includes('/node_modules/@hookform')) return 'vendor-forms';
            if (id.includes('/node_modules/react-router') || id.includes('/node_modules/@remix-run')) return 'vendor-router';
            if (id.includes('/node_modules/zustand') || id.includes('/node_modules/immer')) return 'vendor-state';
            if (id.includes('/node_modules/react-dom')) return 'vendor-react-dom';
            if (id.includes('/node_modules/react/')) return 'vendor-react';
          },
        },
      },
      // Raise the inline-asset limit slightly — SVG icons stay inlined
      assetsInlineLimit: 4096,
      // Enable source maps for production debugging (stripped in prod by default)
      sourcemap: false,
      // Warn when a chunk exceeds 600 kB (Vite default is 500 kB)
      chunkSizeWarningLimit: 600,
    },

    server: {
      port: 5175,
      strictPort: true,
      headers: securityHeaders,
      proxy: {
        // Forward /socket.io WebSocket connections to the Socket.io server on :3001
        '/socket.io': {
          target: 'http://localhost:3002',
          ws: true,
          changeOrigin: true,
        },
        // Forward REST API calls (auth, health) to the same server — avoids CORS
        '/api': {
          target: 'http://localhost:3002',
          changeOrigin: true,
        },
      },
    },
    preview: {
      headers: securityHeaders,
    },
  };
});
