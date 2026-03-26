/**
 * Auth Store — session management and role-based identity.
 *
 * ⚠️  DEMO MODE: Credentials are validated client-side for this localStorage-only SPA.
 *     In a production app with a real backend, credentials must NEVER be validated
 *     on the client — always send to a server endpoint and receive a signed JWT.
 *
 * Demo accounts:
 *   alex@taskflow.io  / Admin1234!   → role: admin   (full access)
 *   sarah@taskflow.io / Member1234!  → role: member  (create/edit own, no delete)
 *   marcus@taskflow.io/ Viewer1234!  → role: viewer  (read-only)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'admin' | 'member' | 'viewer';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  colour: string;
  role: Role;
}

interface AuthStore {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
}

// ── Demo credential registry ─────────────────────────────────────────────────
// In production this lookup never exists on the client — the server validates.
const DEMO_USERS: Array<AuthUser & { password: string }> = [
  {
    id: 'user-1',
    name: 'Alex Johnson',
    email: 'alex@taskflow.io',
    colour: '#3B82F6',
    role: 'admin',
    password: 'Admin1234!',
  },
  {
    id: 'user-2',
    name: 'Sarah Chen',
    email: 'sarah@taskflow.io',
    colour: '#8B5CF6',
    role: 'member',
    password: 'Member1234!',
  },
  {
    id: 'user-3',
    name: 'Marcus Williams',
    email: 'marcus@taskflow.io',
    colour: '#10B981',
    role: 'viewer',
    password: 'Viewer1234!',
  },
];

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      currentUser: null,
      isAuthenticated: false,

      login: (email, password) => {
        // Normalise email — prevents case-sensitivity bypass
        const match = DEMO_USERS.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase()
        );
        if (!match || match.password !== password) {
          return { success: false, error: 'Invalid email or password.' };
        }
        const { password: _pw, ...user } = match;
        set({ currentUser: user, isAuthenticated: true });
        return { success: true };
      },

      logout: () => set({ currentUser: null, isAuthenticated: false }),
    }),
    { name: 'taskflow-auth' }
  )
);
