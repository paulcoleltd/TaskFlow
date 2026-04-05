/**
 * Convex user hooks — replaces authStore for the current user.
 * `useCurrentUser()` returns null while loading, or the user document once authenticated.
 */
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";

export function useCurrentUser() {
  return useQuery(api.users.current);
}

export function useAllUsers() {
  return useQuery(api.users.list);
}

export function useUpdateProfile() {
  return useMutation(api.users.updateProfile);
}

/** Thin wrapper so components don't need to import from @convex-dev/auth/react directly */
export function useConvexAuth() {
  const { signIn, signOut } = useAuthActions();
  return { signIn, signOut };
}
