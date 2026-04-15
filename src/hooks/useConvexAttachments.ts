/**
 * Convex-backed attachment hooks — no-ops in local mode.
 *
 * In CONVEX_MODE:
 *   - useConvexAttachments(taskId) subscribes to live attachment list with signed URLs
 *   - useGenerateUploadUrl() / useSaveAttachment() / useRemoveAttachment() are mutations
 *
 * In local mode (E2E / no VITE_CONVEX_URL):
 *   - All hooks are no-ops; TaskDetail falls back to base64/localStorage behaviour
 */
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

const CONVEX_MODE = !!import.meta.env.VITE_CONVEX_URL;
const noop = async (_args?: any) => undefined as any;

// ── Read ──────────────────────────────────────────────────────────────────────

export function useConvexAttachments(taskId: string | null) {
  return useQuery(
    api.attachments.listByTask,
    CONVEX_MODE && taskId ? { taskId: taskId as Id<'tasks'> } : 'skip',
  );
}

// ── Write ─────────────────────────────────────────────────────────────────────

function _useGenerateUploadUrlConvex() { return useMutation(api.attachments.generateUploadUrl); }
function _useSaveAttachmentConvex()    { return useMutation(api.attachments.saveAttachment);    }
function _useRemoveAttachmentConvex()  { return useMutation(api.attachments.remove);            }
function _useNoopMutation()            { return noop; }

export const useGenerateUploadUrl = CONVEX_MODE ? _useGenerateUploadUrlConvex : _useNoopMutation;
export const useSaveAttachment    = CONVEX_MODE ? _useSaveAttachmentConvex    : _useNoopMutation;
export const useRemoveAttachment  = CONVEX_MODE ? _useRemoveAttachmentConvex  : _useNoopMutation;
