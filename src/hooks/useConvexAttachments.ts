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

// Dual-mode: the LOCAL version must NEVER call useQuery (no ConvexProvider in tree)
function _useConvexAttachmentsActive(taskId: string | null) {
  return useQuery(
    api.attachments.listByTask,
    taskId ? { taskId: taskId as Id<'tasks'> } : 'skip',
  );
}
function _useConvexAttachmentsLocal(_taskId: string | null) {
  return undefined;
}
export const useConvexAttachments = CONVEX_MODE
  ? _useConvexAttachmentsActive
  : _useConvexAttachmentsLocal;

// ── Write ─────────────────────────────────────────────────────────────────────

function _useGenerateUploadUrlConvex() { return useMutation(api.attachments.generateUploadUrl); }
function _useSaveAttachmentConvex()    { return useMutation(api.attachments.saveAttachment);    }
function _useRemoveAttachmentConvex()  { return useMutation(api.attachments.remove);            }
function _useNoopMutation()            { return noop; }

export const useGenerateUploadUrl = CONVEX_MODE ? _useGenerateUploadUrlConvex : _useNoopMutation;
export const useSaveAttachment    = CONVEX_MODE ? _useSaveAttachmentConvex    : _useNoopMutation;
export const useRemoveAttachment  = CONVEX_MODE ? _useRemoveAttachmentConvex  : _useNoopMutation;
