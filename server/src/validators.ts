import { z } from 'zod';

// Mirrors src/lib/storageValidation.ts — kept separate to avoid cross-package imports

const subtaskSchema = z.object({
  id: z.string().max(128),
  title: z.string().max(256),
  completed: z.boolean(),
});

const commentSchema = z.object({
  id: z.string().max(128),
  taskId: z.string().max(128),
  userId: z.string().max(128),
  content: z.string().max(4096),
  createdAt: z.string(),
  mentions: z.array(z.string().max(128)).optional(),
  reactions: z.record(z.array(z.string().max(128))).optional(),
});

const statusValues = ['todo', 'in-progress', 'review', 'done', 'blocked'] as const;
const priorityValues = ['low', 'medium', 'high', 'critical'] as const;
const recurrenceValues = ['none', 'daily', 'weekly', 'monthly'] as const;

export const taskSchema = z.object({
  id: z.string().max(128),
  title: z.string().min(1).max(256),
  description: z.string().max(4096).optional(),
  status: z.enum(statusValues),
  priority: z.enum(priorityValues),
  projectId: z.string().max(128),
  assigneeId: z.string().max(128).optional(),
  dueDate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  tags: z.array(z.string().max(64)).max(20),
  subtasks: z.array(subtaskSchema).max(50),
  comments: z.array(commentSchema).max(500),
  attachmentCount: z.number().int().min(0).max(100),
  estimatedHours: z.number().min(0).max(10000).optional(),
  loggedHours: z.number().min(0).max(10000).optional(),
  order: z.number().int().min(0),
  pinned: z.boolean().optional(),
  recurrence: z.enum(recurrenceValues).optional(),
  blockedBy: z.array(z.string().max(128)).max(50).optional(),
  sprintId: z.string().max(128).optional(),
});

const milestoneSchema = z.object({
  id: z.string().max(128),
  title: z.string().max(256),
  dueDate: z.string(),
  completed: z.boolean(),
  description: z.string().max(1024).optional(),
});

export const projectSchema = z.object({
  id: z.string().max(128),
  name: z.string().min(1).max(128),
  description: z.string().max(2048).optional(),
  notes: z.string().max(4096).optional(),
  colour: z.string().max(32),
  icon: z.string().max(8),
  ownerId: z.string().max(128),
  memberIds: z.array(z.string().max(128)).max(100),
  status: z.enum(['active', 'archived', 'completed']),
  dueDate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  milestones: z.array(milestoneSchema).max(50).optional(),
});

export const taskUpdatesSchema = taskSchema.partial().omit({ id: true });
export const projectUpdatesSchema = projectSchema.partial().omit({ id: true });

export const commentPayloadSchema = z.object({
  taskId: z.string().max(128),
  comment: commentSchema,
});

export const taskMoveSchema = z.object({
  taskId: z.string().max(128),
  newStatus: z.enum(statusValues),
});

export const taskUpdateSchema = z.object({
  taskId: z.string().max(128),
  updates: taskUpdatesSchema,
});

export const taskDeleteSchema = z.object({
  taskId: z.string().max(128),
});

export const projectUpdateSchema = z.object({
  projectId: z.string().max(128),
  updates: projectUpdatesSchema,
});

export const projectDeleteSchema = z.object({
  projectId: z.string().max(128),
});

export const syncRequestSchema = z.object({
  tasks: z.array(taskSchema).max(10000).optional(),
  projects: z.array(projectSchema).max(1000).optional(),
});
