import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  // script-src: in dev we need 'unsafe-inline' for Vite HMR hot-update scripts.
  // In production that vector is gone, so we drop it entirely.
  const scriptSrc = isProd
    ? "script-src 'self'"
    : "script-src 'self' 'unsafe-inline'";

  const securityHeaders: Record<string, string> = {
    'X-Content-Type-Options':  'nosniff',
    'X-Frame-Options':         'DENY',
    'X-XSS-Protection':        '1; mode=block',
    'Referrer-Policy':         'strict-origin-when-cross-origin',
    'Permissions-Policy':      'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' ws: wss: http://localhost:3002",  // WS for HMR + Socket.io + push API
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  };

  return {
    plugins: [react()],
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
