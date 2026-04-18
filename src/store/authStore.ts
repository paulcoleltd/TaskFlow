/**
 * Auth Store — session management and role-based identity.
 *
 * Login validates credentials server-side via POST /api/auth/login.
 * The server issues an HMAC-signed token; the client stores only the
 * opaque token + the user profile returned by the server.
 *
 * ⚠️  The server still uses demo passwords in DEMO mode. This is fine for
 *     a demo/development build. In production, replace with a real user store.
 *
 * Demo accounts (shown in the login UI for convenience):
 *   alex@taskflow.io   → Admin
 *   sarah@taskflow.io  → Member
 *   marcus@taskflow.io → Viewer
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '../types';

export type { Role }; // re-export so existing imports from authStore still compile

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  colour: string;
  role: Role;
}

// ── Auth endpoint — relative so it works through the Vite proxy in dev
//    and a same-origin reverse proxy in production. No CORS required.
const AUTH_URL = '/api/auth/login';

// ── In-memory brute-force limiter (UX guard only) ─────────────────────────────
// Resets on page refresh — real rate limiting lives on the server.
const _attempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 60_000; // 60 seconds

function checkRateLimit(email: string): { allowed: boolean; error?: string } {
  const key    = email.trim().toLowerCase();
  const record = _attempts.get(key) ?? { count: 0, lockedUntil: 0 };
  if (Date.now() < record.lockedUntil) {
    const secs = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    return { allowed: false, error: `Too many attempts. Try again in ${secs}s.` };
  }
  return { allowed: true };
}

function recordFailure(email: string): void {
  const key    = email.trim().toLowerCase();
  const record = _attempts.get(key) ?? { count: 0, lockedUntil: 0 };
  const count  = record.count + 1;
  _attempts.set(key, {
    count,
    lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0,
  });
}

function clearAttempts(email: string): void {
  _attempts.delete(email.trim().toLowerCase());
}

interface AuthStore {
  currentUser:     AuthUser | null;
  token:           string | null;
  isAuthenticated: boolean;
  login:  (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      currentUser:     null,
      token:           null,
      isAuthenticated: false,

      login: async (email, password) => {
        // Client-side rate limit (UX guard — blocks the UI before the round-trip)
        const rateCheck = checkRateLimit(email);
        if (!rateCheck.allowed) return { success: false, error: rateCheck.error };

        try {
          const res = await fetch(AUTH_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email: email.trim(), password }),
          });

          if (!res.ok) {
            const data = (await res.json()) as { error?: string };
            recordFailure(email);
            return { success: false, error: data.error ?? 'Invalid email or password.' };
          }

          const data = (await res.json()) as { token: string; user: AuthUser };
          clearAttempts(email);
          set({ currentUser: data.user, token: data.token, isAuthenticated: true });
          return { success: true };
        } catch {
          // Network error — server unreachable
          return { success: false, error: 'Cannot reach the authentication server. Is the server running?' };
        }
      },

      logout: () => set({ currentUser: null, token: null, isAuthenticated: false }),
    }),
    { name: 'taskflow-auth' }
  )
);
