import type { TaskStatus, TaskPriority } from '../types';
import { Colors } from '../constants/theme';

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function statusLabel(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    'todo':        'To Do',
    'in-progress': 'In Progress',
    'in-review':   'In Review',
    'done':        'Done',
  };
  return map[status] ?? status;
}

export function statusColor(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    'todo':        Colors.textFaint,
    'in-progress': Colors.blue,
    'in-review':   Colors.violet,
    'done':        Colors.emerald,
  };
  return map[status] ?? Colors.textMuted;
}

export function priorityLabel(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    low:    'Low',
    medium: 'Medium',
    high:   'High',
    urgent: 'Urgent',
  };
  return map[priority] ?? priority;
}

export function priorityColor(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    low:    Colors.textFaint,
    medium: Colors.blue,
    high:   Colors.amber,
    urgent: Colors.red,
  };
  return map[priority] ?? Colors.textMuted;
}

export function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}
