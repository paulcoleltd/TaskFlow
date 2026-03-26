import type { Priority, Status } from '../types';

export const STATUS_OPTIONS: { value: Status; label: string; colour: string }[] = [
  { value: 'todo', label: 'To Do', colour: '#64748B' },
  { value: 'in-progress', label: 'In Progress', colour: '#3B82F6' },
  { value: 'review', label: 'Review', colour: '#F59E0B' },
  { value: 'done', label: 'Done', colour: '#10B981' },
  { value: 'blocked', label: 'Blocked', colour: '#EF4444' },
];

export const PRIORITY_OPTIONS: { value: Priority; label: string; colour: string }[] = [
  { value: 'low', label: 'Low', colour: '#22C55E' },
  { value: 'medium', label: 'Medium', colour: '#F59E0B' },
  { value: 'high', label: 'High', colour: '#EF4444' },
  { value: 'critical', label: 'Critical', colour: '#8B5CF6' },
];

export const TAG_OPTIONS = [
  { id: 'tag-1', name: 'Frontend', colour: '#3B82F6' },
  { id: 'tag-2', name: 'Backend', colour: '#8B5CF6' },
  { id: 'tag-3', name: 'Design', colour: '#EC4899' },
  { id: 'tag-4', name: 'Bug', colour: '#EF4444' },
  { id: 'tag-5', name: 'Feature', colour: '#10B981' },
  { id: 'tag-6', name: 'Docs', colour: '#F59E0B' },
];

export const PROJECT_COLOURS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#06B6D4', '#84CC16',
];
