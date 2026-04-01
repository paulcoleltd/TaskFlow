/**
 * Role-Based Access Control (RBAC) — OWASP A01 Broken Access Control
 *
 * Every write action in the UI is gated through this module.
 * Roles: admin > member > viewer
 *
 * admin  — full CRUD on all tasks and projects
 * member — create tasks/projects; edit/delete only their own
 * viewer — read-only; no mutations permitted
 */

import type { Role } from '../store/authStore';

// ── Task permissions ─────────────────────────────────────────────────────────

/** Can the user open the New Task modal? */
export const canCreateTask = (role: Role): boolean =>
  role === 'admin' || role === 'member';

/** Can the user edit a specific task?
 *  Admin: any task. Member: only tasks they own. Viewer: never. */
export const canEditTask = (
  role: Role,
  taskAssigneeId: string | undefined,
  currentUserId: string
): boolean => {
  if (role === 'admin') return true;
  if (role === 'member') return taskAssigneeId === currentUserId;
  return false;
};

/** Can the user delete a specific task? (admin-only) */
export const canDeleteTask = (role: Role): boolean => role === 'admin';

/** Can the user move a task between columns? */
export const canMoveTask = (
  role: Role,
  taskAssigneeId: string | undefined,
  currentUserId: string
): boolean => canEditTask(role, taskAssigneeId, currentUserId);

// ── Project permissions ──────────────────────────────────────────────────────

/** Can the user create a new project? */
export const canCreateProject = (role: Role): boolean =>
  role === 'admin' || role === 'member';

/** Can the user delete a project? (admin-only) */
export const canDeleteProject = (role: Role): boolean => role === 'admin';

// ── Settings permissions ─────────────────────────────────────────────────────

/** Can the user clear all data? (admin-only) */
export const canClearData = (role: Role): boolean => role === 'admin';

/** Can the user create, rename, or delete tags? (admin-only) */
export const canManageTags = (role: Role): boolean => role === 'admin';

/** Can the user export data? (admin + member) */
export const canExportData = (role: Role): boolean =>
  role === 'admin' || role === 'member';

// ── Helper ───────────────────────────────────────────────────────────────────

/** Human-readable role label with colour. */
export const ROLE_META: Record<Role, { label: string; colour: string; bg: string }> = {
  admin:  { label: 'Admin',  colour: 'text-red-400',   bg: 'bg-red-400/10 border-red-400/20' },
  member: { label: 'Member', colour: 'text-blue-400',  bg: 'bg-blue-400/10 border-blue-400/20' },
  viewer: { label: 'Viewer', colour: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-400/20' },
};
