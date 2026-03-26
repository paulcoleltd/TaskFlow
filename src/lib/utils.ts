import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'MMM d, yyyy');
  } catch {
    return '';
  }
}

export function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '';
  }
}

export function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  try {
    const date = new Date(dateStr);
    return isPast(date) && !isToday(date);
  } catch {
    return false;
  }
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function now(): string {
  return new Date().toISOString();
}
