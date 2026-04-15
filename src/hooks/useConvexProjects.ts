/**
 * Convex-backed project hooks — no-ops in local mode.
 */
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

const CONVEX_MODE = !!import.meta.env.VITE_CONVEX_URL;
const noop = async (_args?: any) => undefined as any;

export function useProjects() {
  return useQuery(api.projects.list, CONVEX_MODE ? {} : 'skip');
}
export function useProject(id: Id<'projects'> | null) {
  return useQuery(api.projects.get, CONVEX_MODE && id ? { id } : 'skip');
}

function _useCreateProjectConvex()  { return useMutation(api.projects.create); }
function _useUpdateProjectConvex()  { return useMutation(api.projects.update); }
function _useDeleteProjectConvex()  { return useMutation(api.projects.remove); }
function _useEnableSharingConvex()  { return useMutation(api.projects.enableSharing); }
function _useNoopMutation()         { return noop; }

export const useCreateProject  = CONVEX_MODE ? _useCreateProjectConvex  : _useNoopMutation;
export const useUpdateProject  = CONVEX_MODE ? _useUpdateProjectConvex  : _useNoopMutation;
export const useDeleteProject  = CONVEX_MODE ? _useDeleteProjectConvex  : _useNoopMutation;
export const useEnableSharing  = CONVEX_MODE ? _useEnableSharingConvex  : _useNoopMutation;
