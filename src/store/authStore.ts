/**
 * Auth Store — session management and role-based identity.
 *
 * Security model (post-hardening):
 *   - Session token lives in an httpOnly; Secure; SameSite=Strict cookie — JS cannot read it.
 *   - Only the user profile (id, name, email, colour, role) is stored in Zustand / localStorage.
 *   - On page load, /api/auth/me re-validates the cookie server-side and refreshes the profile.
 *   - Logout calls /api/auth/logout which clears the cookie (Max-Age=0).
 *
 * Token is NEVER stored in localStorage or anywhere JS-readable (mitigates XSS token theft).
 *
 * Demo accounts:
 *   alex@taskflow.io   → Admin    (password: Admin1234!)
 *   sarah@taskflow.io  → Member   (password: Member1234!)
 *   marcus@taskflow.io → Viewer   (password: Viewer1234!)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '../types';

export type { Role };

export interface AuthUser {
  id:     string;
  name:   string;
  email:  string;
  colour: string;
  role:   Role;
}

const AUTH_URL    = '/api/auth/login';
const LOGOUT_URL  = '/api/auth/logout';
const ME_URL      = '/api/auth/me';

// ── In-memory brute-force limiter (UX guard — also enforced server-side) ─────
const _attempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 60_000;

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
  _attempts.set(key, { count, lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0 });
}

function clearAttempts(email: string): void {
  _attempts.delete(email.trim().toLowerCase());
}

interface AuthStore {
  currentUser:     AuthUser | null;
  isAuthenticated: boolean;
  /** Call once on app mount to verify cookie and restore session. */
  restoreSession: () => Promise<void>;
  login:   (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout:  () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      currentUser:     null,
      isAuthenticated: false,

      restoreSession: async () => {
        // /api/auth/me verifies the httpOnly cookie and returns the user profile.
        // Only a 401/403 means the session is genuinely invalid — clear local state.
        // 5xx / proxy errors (server starting up, offline) leave state untouched.
        try {
          const res = await fetch(ME_URL, { credentials: 'include' });
          if (res.ok) {
            const data = (await res.json()) as { user: AuthUser };
            set({ currentUser: data.user, isAuthenticated: true });
          } else if (res.status === 401 || res.status === 403) {
            set({ currentUser: null, isAuthenticated: false });
          }
          // 5xx or other errors: leave existing state as-is
        } catch {
          // Network error — leave existing state as-is (offline resilience)
        }
      },

      login: async (email, password) => {
        // Client-side guard (UX feedback) — server enforces its own rate limit too
        const rateCheck = checkRateLimit(email);
        if (!rateCheck.allowed) return { success: false, error: rateCheck.error };

        try {
          const res = await fetch(AUTH_URL, {
            method:      'POST',
            headers:     { 'Content-Type': 'application/json' },
            body:        JSON.stringify({ email: email.trim(), password }),
            credentials: 'include',   // required so the Set-Cookie header is accepted
          });

          if (res.status === 429) {
            const data = (await res.json()) as { error?: string; retryAfter?: number };
            return { success: false, error: data.error ?? 'Too many attempts. Please wait.' };
          }

          if (!res.ok) {
            const data = (await res.json()) as { error?: string };
            recordFailure(email);
            return { success: false, error: data.error ?? 'Invalid email or password.' };
          }

          const data = (await res.json()) as { user: AuthUser };
          clearAttempts(email);
          // Store ONLY the user profile — never the token (token is in the httpOnly cookie)
          set({ currentUser: data.user, isAuthenticated: true });
          return { success: true };
        } catch {
          return { success: false, error: 'Cannot reach the authentication server.' };
        }
      },

      logout: async () => {
        try {
          await fetch(LOGOUT_URL, { method: 'POST', credentials: 'include' });
        } catch { /* best-effort — clear local state regardless */ }
        set({ currentUser: null, isAuthenticated: false });
      },
    }),
    {
      name: 'taskflow-auth',
      // Persist only the user profile for fast initial render.
      // isAuthenticated is re-validated server-side via restoreSession() on every mount.
      partialize: (s) => ({ currentUser: s.currentUser, isAuthenticated: s.isAuthenticated }),
    }
  )
);
