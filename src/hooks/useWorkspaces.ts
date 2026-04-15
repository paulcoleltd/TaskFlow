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

export function useWorkspaces() {
  return useQuery(api.workspaces.list, CONVEX_MODE ? {} : 'skip') ?? [];
}

export function useWorkspace(id: Id<'workspaces'> | null) {
  return useQuery(api.workspaces.get, CONVEX_MODE && id ? { id } : 'skip');
}

export function useWorkspaceMembers(workspaceId: Id<'workspaces'> | null) {
  return useQuery(
    api.workspaces.listMembers,
    CONVEX_MODE && workspaceId ? { workspaceId } : 'skip'
  ) ?? [];
}

function _useCreateWorkspaceConvex()  { return useMutation(api.workspaces.create); }
function _useSetActiveConvex()        { return useMutation(api.workspaces.setActive); }
function _useInviteMemberConvex()     { return useMutation(api.workspaces.inviteMember); }
function _useRemoveMemberConvex()     { return useMutation(api.workspaces.removeMember); }
function _useNoopMutation()           { return noop; }

export const useCreateWorkspace = CONVEX_MODE ? _useCreateWorkspaceConvex : _useNoopMutation;
export const useSetActiveWorkspace = CONVEX_MODE ? _useSetActiveConvex    : _useNoopMutation;
export const useInviteMember       = CONVEX_MODE ? _useInviteMemberConvex : _useNoopMutation;
export const useRemoveMember       = CONVEX_MODE ? _useRemoveMemberConvex : _useNoopMutation;
