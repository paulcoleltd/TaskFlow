/**
 * Dual-mode workspace hooks.
 *
 * CONVEX_MODE → real Convex queries/mutations.
 * LOCAL_MODE  → Zustand workspaceStore (localStorage-persisted).
 *
 * The local implementations mirror the Convex API shape so WorkspacesPage.tsx
 * works identically in both modes without any conditional logic.
 */
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';

const CONVEX_MODE = !!import.meta.env.VITE_CONVEX_URL;

// ── Convex implementations ────────────────────────────────────────────────────

function _useWorkspacesActive()  { return useQuery(api.workspaces.list, {}) ?? []; }
function _useWorkspaceActive(id: Id<'workspaces'> | null) {
  return useQuery(api.workspaces.get, id ? { id } : 'skip');
}
function _useWorkspaceMembersActive(workspaceId: Id<'workspaces'> | null) {
  return useQuery(api.workspaces.listMembers, workspaceId ? { workspaceId } : 'skip') ?? [];
}
function _useCreateWorkspaceConvex()  { return useMutation(api.workspaces.create); }
function _useSetActiveConvex()        { return useMutation(api.workspaces.setActive); }
function _useInviteMemberConvex()     { return useMutation(api.workspaces.inviteMember); }
function _useRemoveMemberConvex()     { return useMutation(api.workspaces.removeMember); }

// ── Local implementations (Zustand workspaceStore) ────────────────────────────

function _useWorkspacesLocal() {
  const currentUser  = useAuthStore(s => s.currentUser);
  const getForUser   = useWorkspaceStore(s => s.getWorkspacesForUser);
  if (!currentUser) return [];
  return getForUser(currentUser.id);
}

function _useWorkspaceLocal(_id: Id<'workspaces'> | null) {
  const workspaces = useWorkspaceStore(s => s.workspaces);
  if (!_id) return undefined;
  return workspaces.find(w => w._id === (_id as unknown as string));
}

function _useWorkspaceMembersLocal(workspaceId: Id<'workspaces'> | null) {
  const getMemberships = useWorkspaceStore(s => s.getMemberships);
  if (!workspaceId) return [];
  return getMemberships(workspaceId as unknown as string);
}

function _useCreateWorkspaceLocal() {
  const createWorkspace = useWorkspaceStore(s => s.createWorkspace);
  const currentUser     = useAuthStore(s => s.currentUser);
  return async ({ name }: { name: string }) => {
    if (!currentUser) throw new Error('Not authenticated');
    return createWorkspace({
      name,
      ownerId:      currentUser.id,
      ownerName:    currentUser.name,
      ownerEmail:   currentUser.email,
      ownerColour:  currentUser.colour,
    });
  };
}

function _useInviteMemberLocal() {
  const addMember  = useWorkspaceStore(s => s.addMember);
  const { users }  = useUserStore();
  return async ({ workspaceId, email, role }: { workspaceId: any; email: string; role: string }) => {
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found) throw new Error(`No user found with email "${email}". They must be added in Settings first.`);
    addMember({
      workspaceId: workspaceId as string,
      userId:      found.id,
      role:        role as 'owner' | 'admin' | 'member',
      user:        { name: found.name, email: found.email, colour: found.colour },
    });
  };
}

function _useRemoveMemberLocal() {
  const removeMember = useWorkspaceStore(s => s.removeMember);
  return async ({ workspaceId, userId }: { workspaceId: any; userId: any }) => {
    removeMember({ workspaceId: workspaceId as string, userId: userId as string });
  };
}

function _useSetActiveLocal() {
  return async (_args?: any) => undefined;
}

// ── Exported hooks — selection is fixed at module load time ───────────────────

export const useWorkspaces       = CONVEX_MODE ? _useWorkspacesActive       : _useWorkspacesLocal;
export const useWorkspace        = CONVEX_MODE ? _useWorkspaceActive        : _useWorkspaceLocal;
export const useWorkspaceMembers = CONVEX_MODE ? _useWorkspaceMembersActive : _useWorkspaceMembersLocal;
export const useCreateWorkspace  = CONVEX_MODE ? _useCreateWorkspaceConvex  : _useCreateWorkspaceLocal;
export const useSetActiveWorkspace = CONVEX_MODE ? _useSetActiveConvex      : _useSetActiveLocal;
export const useInviteMember     = CONVEX_MODE ? _useInviteMemberConvex     : _useInviteMemberLocal;
export const useRemoveMember     = CONVEX_MODE ? _useRemoveMemberConvex     : _useRemoveMemberLocal;
