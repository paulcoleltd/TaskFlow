/**
 * localStorage Schema Validation (OWASP A08 – Software and Data Integrity)
 *
 * Validates data read back from localStorage before it enters the Zustand store.
 * Prevents prototype pollution, type confusion, and data corruption caused by
 * tampered or stale localStorage entries.
 */

import { z } from 'zod';

// ── Shared primitives ────────────────────────────────────────────────────────

const zId = z.string().max(128);
const zIso = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));
const zColour = z.string().regex(/^#[0-9A-Fa-f]{3,8}$/);

// ── Task schema ──────────────────────────────────────────────────────────────

const subtaskSchema = z.object({
  id: zId,
  title: z.string().max(512),
  completed: z.boolean(),
});

const commentSchema = z.object({
  id: zId,
  taskId: zId,
  userId: zId,
  content: z.string().max(4096),
  createdAt: zIso,
});

export const taskSchema = z.object({
  id: zId,
  title: z.string().min(1).max(256),
  description: z.string().max(4096).optional(),
  status: z.enum(['todo', 'in-progress', 'review', 'done', 'blocked']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  projectId: zId,
  assigneeId: zId.optional(),
  dueDate: z.string().optional(),
  createdAt: zIso,
  updatedAt: zIso,
  tags: z.array(zId).max(20),
  subtasks: z.array(subtaskSchema).max(50),
  comments: z.array(commentSchema).max(100),
  attachmentCount: z.number().int().min(0).max(9999),
  estimatedHours: z.number().min(0).max(9999).optional(),
  loggedHours: z.number().min(0).max(9999).optional(),
  order: z.number().int().min(0).max(99999),
});

// ── Project schema ───────────────────────────────────────────────────────────

export const projectSchema = z.object({
  id: zId,
  name: z.string().min(1).max(128),
  description: z.string().max(1024).optional(),
  colour: zColour,
  icon: z.string().max(64),
  ownerId: zId,
  memberIds: z.array(zId).max(100),
  status: z.enum(['active', 'archived', 'completed']),
  dueDate: z.string().optional(),
  createdAt: zIso,
  updatedAt: zIso,
});

// ── Sanitise helpers ─────────────────────────────────────────────────────────

/**
 * Strips any task that fails schema validation.
 * Returns only valid tasks — corrupt/tampered entries are silently dropped.
 */
export function sanitiseTasks(raw: unknown[]): z.infer<typeof taskSchema>[] {
  return raw.flatMap(item => {
    const result = taskSchema.safeParse(item);
    if (!result.success) {
      console.warn('[TaskFlow] Dropped invalid task from storage:', result.error.issues[0]?.message);
      return [];
    }
    return [result.data];
  });
}

/**
 * Strips any project that fails schema validation.
 */
export function sanitiseProjects(raw: unknown[]): z.infer<typeof projectSchema>[] {
  return raw.flatMap(item => {
    const result = projectSchema.safeParse(item);
    if (!result.success) {
      console.warn('[TaskFlow] Dropped invalid project from storage:', result.error.issues[0]?.message);
      return [];
    }
    return [result.data];
  });
}
