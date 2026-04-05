/**
 * Convex-backed task hooks — no-ops in local mode.
 */
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

const CONVEX_MODE = !!import.meta.env.VITE_CONVEX_URL;
const noop = async (_args?: any) => undefined as any;

// ── Read hooks ────────────────────────────────────────────────────────────────

export function useTasksByProject(projectId: Id<'projects'> | null) {
  return useQuery(api.tasks.listByProject, CONVEX_MODE && projectId ? { projectId } : 'skip');
}
export function useTasksByAssignee(assigneeId: Id<'users'> | null) {
  return useQuery(api.tasks.listByAssignee, CONVEX_MODE && assigneeId ? { assigneeId } : 'skip');
}
export function useAllTasks() {
  return useQuery(api.tasks.listAll, CONVEX_MODE ? {} : 'skip');
}
export function useTask(id: Id<'tasks'> | null) {
  return useQuery(api.tasks.get, CONVEX_MODE && id ? { id } : 'skip');
}

// ── Write hooks ───────────────────────────────────────────────────────────────

function _useCreateTaskConvex()       { return useMutation(api.tasks.create);       }
function _useUpdateTaskConvex()       { return useMutation(api.tasks.update);       }
function _useUpdateTaskStatusConvex() { return useMutation(api.tasks.updateStatus); }
function _useDeleteTaskConvex()       { return useMutation(api.tasks.remove);       }
function _useDuplicateTaskConvex()    { return useMutation(api.tasks.duplicate);    }

function _useNoopMutation() { return noop; }

export const useCreateTask       = CONVEX_MODE ? _useCreateTaskConvex       : _useNoopMutation;
export const useUpdateTask       = CONVEX_MODE ? _useUpdateTaskConvex       : _useNoopMutation;
export const useUpdateTaskStatus = CONVEX_MODE ? _useUpdateTaskStatusConvex : _useNoopMutation;
export const useDeleteTask       = CONVEX_MODE ? _useDeleteTaskConvex       : _useNoopMutation;
export const useDuplicateTask    = CONVEX_MODE ? _useDuplicateTaskConvex    : _useNoopMutation;
