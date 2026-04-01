/**
 * collabEmit — fire-and-forget socket emission helpers.
 *
 * Components call their Zustand store action first (local state),
 * then call the matching helper here to broadcast to other clients.
 * All helpers are no-ops when the socket is not connected (offline mode).
 *
 * Echo-prevention: the server uses socket.broadcast / socket.to() so the
 * sender never receives their own events back.
 */

import { getSocket } from './socket';
import type { Task, Project, Comment, Status } from '../types';

function emit(event: string, payload: unknown) {
  try {
    getSocket().emit(event, payload);
  } catch {
    // Socket not connected — degrade silently
  }
}

// ── Task events ─────────────────────────────────────────────────────────────

/** Broadcast a newly-created task to all other clients. */
export function emitTaskCreate(task: Task) {
  // Strip attachments — base64 data is too large for the socket schema
  const { attachments: _a, ...safe } = task;
  emit('task:create', { task: safe });
}

/** Broadcast a partial task update to all other clients. */
export function emitTaskUpdate(taskId: string, updates: Partial<Task>) {
  // Attachments are excluded from the server schema
  const { attachments: _a, ...safe } = updates as Task & { attachments?: unknown };
  emit('task:update', { taskId, updates: safe });
}

/** Broadcast a task deletion to all other clients. */
export function emitTaskDelete(taskId: string) {
  emit('task:delete', { taskId });
}

/** Broadcast a task status move to all other clients. */
export function emitTaskMove(taskId: string, newStatus: Status) {
  emit('task:move', { taskId, newStatus });
}

/** Broadcast a new comment on a task. */
export function emitCommentAdd(taskId: string, comment: Comment) {
  emit('comment:add', { taskId, comment });
}

// ── Project events ───────────────────────────────────────────────────────────

/** Broadcast a newly-created project to all other clients. */
export function emitProjectCreate(project: Project) {
  emit('project:create', { project });
}

/** Broadcast a partial project update to all other clients. */
export function emitProjectUpdate(projectId: string, updates: Partial<Project>) {
  emit('project:update', { projectId, updates });
}

/** Broadcast a project deletion to all other clients. */
export function emitProjectDelete(projectId: string) {
  emit('project:delete', { projectId });
}
