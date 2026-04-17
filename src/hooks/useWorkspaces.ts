/**
 * Dual-mode workspace hooks.
 *
 * CONVEX_MODE → real Convex queries/mutations.
 * LOCAL_MODE  → no-ops / empty arrays.
 */
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

const CONVEX_MODE = !!import.meta.env.VITE_CONVEX_URL;
const noop = async (_args?: any) => undefined as any;

// Dual-mode: LOCAL versions must NEVER call useQuery (no ConvexProvider in tree)

function _useWorkspacesActive() {
  return useQuery(api.workspaces.list, {}) ?? [];
}
function _useWorkspacesLocal() { return []; }
export const useWorkspaces = CONVEX_MODE ? _useWorkspacesActive : _useWorkspacesLocal;

function _useWorkspaceActive(id: Id<'workspaces'> | null) {
  return useQuery(api.workspaces.get, id ? { id } : 'skip');
}
function _useWorkspaceLocal(_id: Id<'workspaces'> | null) { return undefined; }
export const useWorkspace = CONVEX_MODE ? _useWorkspaceActive : _useWorkspaceLocal;

function _useWorkspaceMembersActive(workspaceId: Id<'workspaces'> | null) {
  return useQuery(
    api.workspaces.listMembers,
    workspaceId ? { workspaceId } : 'skip',
  ) ?? [];
}
function _useWorkspaceMembersLocal(_workspaceId: Id<'workspaces'> | null) { return []; }
export const useWorkspaceMembers = CONVEX_MODE
  ? _useWorkspaceMembersActive
  : _useWorkspaceMembersLocal;

function _useCreateWorkspaceConvex()  { return useMutation(api.workspaces.create); }
function _useSetActiveConvex()        { return useMutation(api.workspaces.setActive); }
function _useInviteMemberConvex()     { return useMutation(api.workspaces.inviteMember); }
function _useRemoveMemberConvex()     { return useMutation(api.workspaces.removeMember); }
function _useNoopMutation()           { return noop; }

export const useCreateWorkspace = CONVEX_MODE ? _useCreateWorkspaceConvex : _useNoopMutation;
export const useSetActiveWorkspace = CONVEX_MODE ? _useSetActiveConvex    : _useNoopMutation;
export const useInviteMember       = CONVEX_MODE ? _useInviteMemberConvex : _useNoopMutation;
export const useRemoveMember       = CONVEX_MODE ? _useRemoveMemberConvex : _useNoopMutation;
