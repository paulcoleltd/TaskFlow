/**
 * Seed data — mirrors sampleData.ts in the web app.
 * Used for first-launch population when no data exists.
 */
import type { Task, Project, User } from '../types';

export const CURRENT_USER_ID = 'user-1';

export const SEED_USERS: User[] = [
  { id: 'user-1', _id: 'user-1', name: 'Alex Johnson',    email: 'alex@taskflow.io',   colour: '#3B82F6', role: 'admin'  },
  { id: 'user-2', _id: 'user-2', name: 'Sarah Chen',      email: 'sarah@taskflow.io',  colour: '#8B5CF6', role: 'member' },
  { id: 'user-3', _id: 'user-3', name: 'Marcus Williams', email: 'marcus@taskflow.io', colour: '#10B981', role: 'viewer' },
];

export const SEED_PROJECTS: Project[] = [
  {
    id: 'proj-1', name: 'Product Redesign', colour: '#3B82F6',
    description: 'Complete overhaul of the product UI/UX',
    status: 'active', ownerId: 'user-1',
    startDate: '2024-01-01', endDate: '2024-06-30',
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'proj-2', name: 'Bug Backlog', colour: '#EF4444',
    description: 'Track and resolve all outstanding bugs',
    status: 'active', ownerId: 'user-1',
    createdAt: '2024-01-05T00:00:00Z', updatedAt: '2024-01-05T00:00:00Z',
  },
  {
    id: 'proj-3', name: 'Q3 Launch', colour: '#10B981',
    description: 'Prepare and execute the Q3 feature launch',
    status: 'active', ownerId: 'user-2',
    createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'proj-4', name: 'Infrastructure', colour: '#F59E0B',
    description: 'DevOps and infrastructure improvements',
    status: 'on-hold', ownerId: 'user-1',
    createdAt: '2024-02-15T00:00:00Z', updatedAt: '2024-02-15T00:00:00Z',
  },
];

export const SEED_TASKS: Task[] = [
  { id: 'task-1',  title: 'Design new dashboard layout',    status: 'in-progress', priority: 'high',   projectId: 'proj-1', assigneeId: 'user-1', createdBy: 'user-1', createdAt: '2024-01-10T00:00:00Z', updatedAt: '2024-01-10T00:00:00Z' },
  { id: 'task-2',  title: 'Fix login page bug',             status: 'todo',        priority: 'urgent', projectId: 'proj-2', assigneeId: 'user-2', createdBy: 'user-1', createdAt: '2024-01-11T00:00:00Z', updatedAt: '2024-01-11T00:00:00Z' },
  { id: 'task-3',  title: 'Write API documentation',        status: 'todo',        priority: 'medium', projectId: 'proj-1', assigneeId: 'user-3', createdBy: 'user-1', createdAt: '2024-01-12T00:00:00Z', updatedAt: '2024-01-12T00:00:00Z' },
  { id: 'task-4',  title: 'Code review: auth module',       status: 'in-review',   priority: 'high',   projectId: 'proj-1', assigneeId: 'user-1', createdBy: 'user-2', createdAt: '2024-01-13T00:00:00Z', updatedAt: '2024-01-13T00:00:00Z' },
  { id: 'task-5',  title: 'Set up CI/CD pipeline',          status: 'done',        priority: 'high',   projectId: 'proj-4', assigneeId: 'user-1', createdBy: 'user-1', createdAt: '2024-01-14T00:00:00Z', updatedAt: '2024-01-14T00:00:00Z' },
  { id: 'task-6',  title: 'User research interviews',       status: 'in-progress', priority: 'medium', projectId: 'proj-3', assigneeId: 'user-2', createdBy: 'user-2', createdAt: '2024-01-15T00:00:00Z', updatedAt: '2024-01-15T00:00:00Z' },
  { id: 'task-7',  title: 'Performance audit',              status: 'todo',        priority: 'low',    projectId: 'proj-4', assigneeId: 'user-3', createdBy: 'user-1', createdAt: '2024-01-16T00:00:00Z', updatedAt: '2024-01-16T00:00:00Z' },
  { id: 'task-8',  title: 'Implement dark mode toggle',     status: 'done',        priority: 'low',    projectId: 'proj-1', assigneeId: 'user-1', createdBy: 'user-1', createdAt: '2024-01-17T00:00:00Z', updatedAt: '2024-01-17T00:00:00Z' },
  { id: 'task-9',  title: 'Onboarding flow redesign',       status: 'todo',        priority: 'high',   projectId: 'proj-1', assigneeId: 'user-2', createdBy: 'user-1', createdAt: '2024-01-18T00:00:00Z', updatedAt: '2024-01-18T00:00:00Z' },
  { id: 'task-10', title: 'Database schema migration',      status: 'in-progress', priority: 'urgent', projectId: 'proj-4', assigneeId: 'user-1', createdBy: 'user-1', createdAt: '2024-01-19T00:00:00Z', updatedAt: '2024-01-19T00:00:00Z' },
];
