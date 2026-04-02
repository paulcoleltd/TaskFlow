import type { Priority, Status, Recurrence } from '../types';

export const STATUS_OPTIONS: { value: Status; label: string; colour: string }[] = [
  { value: 'todo', label: 'To Do', colour: '#64748B' },
  { value: 'in-progress', label: 'In Progress', colour: '#4B8CF7' },
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
  { id: 'tag-1', name: 'Frontend', colour: '#4B8CF7' },
  { id: 'tag-2', name: 'Backend', colour: '#8B5CF6' },
  { id: 'tag-3', name: 'Design', colour: '#EC4899' },
  { id: 'tag-4', name: 'Bug', colour: '#EF4444' },
  { id: 'tag-5', name: 'Feature', colour: '#10B981' },
  { id: 'tag-6', name: 'Docs', colour: '#F59E0B' },
];

export const RECURRENCE_OPTIONS: { value: Recurrence; label: string; interval: string }[] = [
  { value: 'none',    label: 'Does not repeat', interval: '' },
  { value: 'daily',   label: 'Daily',           interval: 'every day' },
  { value: 'weekly',  label: 'Weekly',          interval: 'every week' },
  { value: 'monthly', label: 'Monthly',         interval: 'every month' },
];

export const PROJECT_COLOURS = [
  '#4B8CF7', '#8B5CF6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#06B6D4', '#84CC16',
];

export interface TaskTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  priority: Priority;
  subtasks: string[];
  tags: string[];
  estimatedHours?: number;
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'tpl-bug',
    name: 'Bug Report',
    icon: '🐛',
    description: 'Steps to reproduce:\n1. \n\nExpected behaviour:\n\nActual behaviour:\n\nEnvironment:',
    priority: 'high',
    subtasks: ['Reproduce the issue', 'Identify root cause', 'Write fix', 'Add regression test', 'Deploy & verify'],
    tags: ['tag-4'],
    estimatedHours: 3,
  },
  {
    id: 'tpl-feature',
    name: 'Feature Request',
    icon: '✨',
    description: 'User story:\nAs a [role], I want to [action] so that [benefit].\n\nAcceptance criteria:\n- ',
    priority: 'medium',
    subtasks: ['Design & spec review', 'Backend implementation', 'Frontend implementation', 'Write tests', 'Documentation'],
    tags: ['tag-5'],
    estimatedHours: 8,
  },
  {
    id: 'tpl-review',
    name: 'Code Review',
    icon: '🔍',
    description: 'PR link:\n\nReview focus areas:\n- ',
    priority: 'medium',
    subtasks: ['Review logic & correctness', 'Check edge cases', 'Verify tests pass', 'Leave review comments', 'Approve / request changes'],
    tags: ['tag-1'],
    estimatedHours: 1,
  },
  {
    id: 'tpl-meeting',
    name: 'Meeting Follow-up',
    icon: '📋',
    description: 'Meeting date:\nAttendees:\n\nKey decisions:\n\nAction items:',
    priority: 'low',
    subtasks: ['Send meeting notes', 'Assign action items', 'Schedule next meeting'],
    tags: ['tag-6'],
    estimatedHours: 0.5,
  },
  {
    id: 'tpl-deploy',
    name: 'Deployment Checklist',
    icon: '🚀',
    description: 'Version:\nTarget environment:\n\nRelease notes:',
    priority: 'critical',
    subtasks: ['Run full test suite', 'Update changelog', 'Create release tag', 'Deploy to staging', 'Smoke test', 'Deploy to production', 'Monitor for errors'],
    tags: ['tag-2'],
    estimatedHours: 2,
  },
];
