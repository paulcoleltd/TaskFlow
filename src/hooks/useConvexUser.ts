/**
 * useCurrentUser — works in both Convex and local mode.
 *
 * CONVEX_MODE → reads from Convex DB (requires ConvexProvider).
 * LOCAL_MODE  → reads from Zustand authStore (no provider needed).
 *
 * CONVEX_MODE is a build-time constant so the exported function
 * is stable — React hooks rules are not violated.
 */
import { useQuery, useMutation, useConvexAuth as _useConvexAuthHook } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api';
import { useAuthStore } from '../store/authStore';
import { SEED_USERS } from '../lib/sampleData';

const CONVEX_MODE = !!import.meta.env.VITE_CONVEX_URL;

// ── Convex implementations ────────────────────────────────────────────────────

function _useCurrentUserConvex()   { return useQuery(api.users.current) as any; }
function _useAllUsersConvex()      { return useQuery(api.users.list)    as any; }
function _useUpdateProfileConvex() { return useMutation(api.users.updateProfile); }

// ── Local implementations (no ConvexProvider needed) ─────────────────────────

function _useCurrentUserLocal() {
  const user = useAuthStore(s => s.currentUser);
  if (!user) return undefined;
  return { ...user, _id: user.id };  // expose _id alias so components work in both modes
}
function _useAllUsersLocal()      { return SEED_USERS; }
function _useUpdateProfileLocal() { return async (_args: any) => {}; }

// ── Exported hooks — function reference is fixed at module load ───────────────

export const useCurrentUser   = CONVEX_MODE ? _useCurrentUserConvex   : _useCurrentUserLocal;
export const useAllUsers      = CONVEX_MODE ? _useAllUsersConvex      : _useAllUsersLocal;
export const useUpdateProfile = CONVEX_MODE ? _useUpdateProfileConvex : _useUpdateProfileLocal;

export function useConvexAuth() {
  if (CONVEX_MODE) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAuthActions();
  }
  const { logout } = useAuthStore();
  return { signIn: async () => {}, signOut: logout };
}

// ── Dual-mode isAuthenticated flag ────────────────────────────────────────────
// Use this instead of importing useConvexAuth from 'convex/react' directly.
function _useIsAuthConvex() { return _useConvexAuthHook().isAuthenticated; }
function _useIsAuthLocal()  { return useAuthStore(s => s.isAuthenticated); }
export const useIsAuthenticated = CONVEX_MODE ? _useIsAuthConvex : _useIsAuthLocal;
