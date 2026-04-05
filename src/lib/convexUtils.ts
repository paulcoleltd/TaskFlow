/**
 * convexUtils.ts
 *
 * Converts Convex document shapes → local Zustand store shapes.
 *
 * Convex documents use `_id` (an opaque string ID) and `_creationTime`
 * (Unix ms). The local stores use `id` (string) and ISO `createdAt`.
 *
 * Attachments and comments are normalised into their own Convex tables.
 * When syncing tasks we embed empty arrays; task detail loads them lazily
 * via `useConvexComments` / `useConvexAttachments`.
 */

import type { Task, Project, Sprint } from '../types';

// ── Task ──────────────────────────────────────────────────────────────────────

export function convexToTask(doc: Record<string, any>): Task {
  return {
    id: doc._id as string,
    title: doc.title,
    description: doc.description,
    status: doc.status,
    priority: doc.priority,
    projectId: doc.projectId as string,
    assigneeId: doc.assigneeId as string | undefined,
    dueDate: doc.dueDate,
    createdAt: new Date(doc._creationTime as number).toISOString(),
    updatedAt: new Date(doc._creationTime as number).toISOString(),
    tags: doc.tags ?? [],
    subtasks: doc.subtasks ?? [],
    // Comments and attachments are normalised — loaded per-task when detail opens
    comments: [],
    attachments: [],
    attachmentCount: doc.attachmentCount ?? 0,
    estimatedHours: doc.estimatedHours,
    loggedHours: doc.loggedHours,
    order: doc.order ?? 0,
    pinned: doc.pinned ?? false,
    recurrence: doc.recurrence ?? 'none',
    blockedBy: doc.blockedBy,
    sprintId: doc.sprintId as string | undefined,
  };
}

// ── Project ───────────────────────────────────────────────────────────────────

export function convexToProject(doc: Record<string, any>): Project {
  return {
    id: doc._id as string,
    name: doc.name,
    description: doc.description,
    notes: doc.notes,
    colour: doc.colour,
    icon: doc.icon,
    ownerId: doc.ownerId as string,
    memberIds: (doc.memberIds ?? []) as string[],
    status: doc.status,
    dueDate: doc.dueDate,
    createdAt: new Date(doc._creationTime as number).toISOString(),
    updatedAt: new Date(doc._creationTime as number).toISOString(),
    milestones: doc.milestones,
  };
}

// ── Sprint ────────────────────────────────────────────────────────────────────

export function convexToSprint(doc: Record<string, any>): Sprint {
  return {
    id: doc._id as string,
    projectId: doc.projectId as string,
    name: doc.name,
    goal: doc.goal,
    startDate: doc.startDate,
    endDate: doc.endDate,
    status: doc.status,
    createdAt: new Date(doc._creationTime as number).toISOString(),
    retrospective: doc.retrospective,
    velocity: doc.velocity,
  };
}
