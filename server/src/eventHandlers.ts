import type { Server, Socket } from 'socket.io';
import type { Role } from './types.js';
import type { TokenPayload } from './index.js';
import {
  tasks, projects, presenceBySocket,
  isRateLimited, addViewer, removeViewer,
  removeSocketFromAllRooms, getAllPresence, getViewersForRoom,
} from './state.js';
import {
  taskSchema, projectSchema, taskUpdateSchema, taskDeleteSchema,
  taskMoveSchema, commentPayloadSchema, projectUpdateSchema,
  projectDeleteSchema, syncRequestSchema,
} from './validators.js';

// ── RBAC helpers ──────────────────────────────────────────────────────────────

function canWrite(role: Role): boolean {
  return role === 'admin' || role === 'member';
}

function canDelete(role: Role): boolean {
  return role === 'admin';
}

// ── HTML entity encoder (replaces unsafe regex — encodes all special chars) ───
// Used to sanitise any user-supplied display strings before storing/broadcasting.
// Unlike a simple tag-strip regex this handles encoded entities and attribute
// injection vectors. It does NOT allow any HTML through — output is plain text.
function encodeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .slice(0, 100);
}

// ── Structured audit logger ───────────────────────────────────────────────────
// Writes one JSON line per mutating event so every write operation is traceable.
// In production pipe this to a log aggregator (Datadog, Loki, CloudWatch, etc.).
function audit(
  event: string,
  userId: string,
  role: Role,
  detail: Record<string, unknown> = {},
): void {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    event,
    userId,
    role,
    ...detail,
  }));
}

// ── Max items returned in a sync snapshot (DoS guard) ────────────────────────
const SYNC_ITEM_LIMIT = 500;

// ── Main handler registration ─────────────────────────────────────────────────

export function registerHandlers(io: Server, socket: Socket): void {
  // ── Identity from verified token (set by middleware in index.ts) ─────────────
  // The client CANNOT influence senderId / role — they come from the signed token.
  const user      = socket.data.user as TokenPayload;
  const senderId  = user.userId;
  const senderName   = encodeHtml(user.name);   // extra encode as defence-in-depth
  const senderColour = String(user.colour ?? '#64748B').slice(0, 32);
  const role: Role   = user.role;

  // Register presence
  presenceBySocket.set(socket.id, { userId: senderId, userName: senderName, userColour: senderColour });

  // Notify others of new online user
  socket.broadcast.emit('presence:online', { userId: senderId, userName: senderName, userColour: senderColour });

  // Send snapshot of current online users to the connecting client
  socket.emit('presence:snapshot', { users: getAllPresence() });

  // ── Rate limit guard ──────────────────────────────────────────────────────────
  function rateGuard(): boolean {
    if (isRateLimited(socket.id)) {
      socket.emit('error', { code: 'RATE_LIMITED', message: 'Too many events. Slow down.' });
      audit('rate_limited', senderId, role, { socketId: socket.id });
      return true;
    }
    return false;
  }

  // ── ROOM: join-project ────────────────────────────────────────────────────────
  socket.on('join-project', (payload: unknown) => {
    if (rateGuard()) return;
    const projectId = (payload as { projectId?: string })?.projectId;
    if (!projectId || typeof projectId !== 'string') return;
    const roomKey = `project-${projectId}`;
    socket.join(roomKey);
    addViewer(roomKey, socket.id);
    socket.to(roomKey).emit('viewer:joined-project', { projectId, userId: senderId, userName: senderName, userColour: senderColour });
    const viewerSocketIds = getViewersForRoom(roomKey).filter(id => id !== socket.id);
    const viewers = viewerSocketIds.map(id => presenceBySocket.get(id)).filter(Boolean);
    socket.emit('viewer:snapshot-project', { projectId, viewers });
  });

  socket.on('leave-project', (payload: unknown) => {
    const projectId = (payload as { projectId?: string })?.projectId;
    if (!projectId || typeof projectId !== 'string') return;
    const roomKey = `project-${projectId}`;
    socket.leave(roomKey);
    removeViewer(roomKey, socket.id);
    socket.to(roomKey).emit('viewer:left-project', { projectId, userId: senderId });
  });

  // ── ROOM: join-task ───────────────────────────────────────────────────────────
  socket.on('join-task', (payload: unknown) => {
    if (rateGuard()) return;
    const taskId = (payload as { taskId?: string })?.taskId;
    if (!taskId || typeof taskId !== 'string') return;
    const roomKey = `task-${taskId}`;
    socket.join(roomKey);
    addViewer(roomKey, socket.id);
    socket.to(roomKey).emit('viewer:joined-task', { taskId, userId: senderId, userName: senderName, userColour: senderColour });
    const viewerSocketIds = getViewersForRoom(roomKey).filter(id => id !== socket.id);
    const viewers = viewerSocketIds.map(id => presenceBySocket.get(id)).filter(Boolean);
    socket.emit('viewer:snapshot-task', { taskId, viewers });
  });

  socket.on('leave-task', (payload: unknown) => {
    const taskId = (payload as { taskId?: string })?.taskId;
    if (!taskId || typeof taskId !== 'string') return;
    const roomKey = `task-${taskId}`;
    socket.leave(roomKey);
    removeViewer(roomKey, socket.id);
    socket.to(roomKey).emit('viewer:left-task', { taskId, userId: senderId });
  });

  // ── SYNC: state snapshot on connect ──────────────────────────────────────────
  socket.on('sync:request', (payload: unknown) => {
    if (rateGuard()) return;
    const parsed = syncRequestSchema.safeParse(payload ?? {});
    if (!parsed.success) {
      socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid sync payload' });
      return;
    }
    // Seed server state from the first connected client if the server is empty
    if (tasks.size === 0 && parsed.data.tasks?.length) {
      for (const t of parsed.data.tasks) tasks.set(t.id, t);
    }
    if (projects.size === 0 && parsed.data.projects?.length) {
      for (const p of parsed.data.projects) projects.set(p.id, p);
    }
    // Cap snapshot size to prevent oversized responses (DoS guard — LOW-1)
    socket.emit('sync:snapshot', {
      tasks:    Array.from(tasks.values()).slice(0, SYNC_ITEM_LIMIT),
      projects: Array.from(projects.values()).slice(0, SYNC_ITEM_LIMIT),
    });
  });

  // ── TASK: create ──────────────────────────────────────────────────────────────
  socket.on('task:create', (payload: unknown) => {
    if (rateGuard()) return;
    if (!canWrite(role)) {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Insufficient permissions to create tasks.' });
      audit('task:create_forbidden', senderId, role);
      return;
    }
    const parsed = taskSchema.safeParse((payload as { task?: unknown })?.task ?? payload);
    if (!parsed.success) {
      socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid task data.' });
      return;
    }
    const task = parsed.data;
    tasks.set(task.id, task);
    audit('task:create', senderId, role, { taskId: task.id, title: task.title });
    socket.broadcast.emit('task:created', { task, senderId, senderName });
  });

  // ── TASK: update ──────────────────────────────────────────────────────────────
  socket.on('task:update', (payload: unknown) => {
    if (rateGuard()) return;
    if (!canWrite(role)) {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Insufficient permissions to update tasks.' });
      audit('task:update_forbidden', senderId, role);
      return;
    }
    const parsed = taskUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid task update.' });
      return;
    }
    const { taskId, updates } = parsed.data;
    const existing = tasks.get(taskId);
    if (existing) tasks.set(taskId, { ...existing, ...updates });
    audit('task:update', senderId, role, { taskId });
    socket.broadcast.emit('task:updated', { taskId, updates, senderId, senderName });
  });

  // ── TASK: delete ──────────────────────────────────────────────────────────────
  socket.on('task:delete', (payload: unknown) => {
    if (rateGuard()) return;
    if (!canDelete(role)) {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Only admins can delete tasks.' });
      audit('task:delete_forbidden', senderId, role);
      return;
    }
    const parsed = taskDeleteSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid task delete.' });
      return;
    }
    const { taskId } = parsed.data;
    tasks.delete(taskId);
    audit('task:delete', senderId, role, { taskId });
    socket.broadcast.emit('task:deleted', { taskId, senderId, senderName });
  });

  // ── TASK: move (status change) ────────────────────────────────────────────────
  socket.on('task:move', (payload: unknown) => {
    if (rateGuard()) return;
    if (!canWrite(role)) {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Insufficient permissions.' });
      audit('task:move_forbidden', senderId, role);
      return;
    }
    const parsed = taskMoveSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid task move.' });
      return;
    }
    const { taskId, newStatus } = parsed.data;
    const existing = tasks.get(taskId);
    if (existing) tasks.set(taskId, { ...existing, status: newStatus });
    audit('task:move', senderId, role, { taskId, newStatus });
    socket.broadcast.emit('task:moved', { taskId, newStatus, senderId, senderName });
  });

  // ── COMMENT: add ──────────────────────────────────────────────────────────────
  socket.on('comment:add', (payload: unknown) => {
    if (rateGuard()) return;
    if (!canWrite(role)) {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Insufficient permissions to comment.' });
      audit('comment:add_forbidden', senderId, role);
      return;
    }
    const parsed = commentPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid comment.' });
      return;
    }
    const { taskId, comment } = parsed.data;
    const task = tasks.get(taskId);
    if (task) {
      tasks.set(taskId, { ...task, comments: [...task.comments, comment] });
    }
    audit('comment:add', senderId, role, { taskId, commentId: comment.id });
    socket.broadcast.emit('comment:added', { taskId, comment, senderId, senderName });
  });

  // ── PROJECT: create ───────────────────────────────────────────────────────────
  socket.on('project:create', (payload: unknown) => {
    if (rateGuard()) return;
    if (!canWrite(role)) {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Insufficient permissions.' });
      audit('project:create_forbidden', senderId, role);
      return;
    }
    const parsed = projectSchema.safeParse((payload as { project?: unknown })?.project ?? payload);
    if (!parsed.success) {
      socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid project data.' });
      return;
    }
    const project = parsed.data;
    projects.set(project.id, project);
    audit('project:create', senderId, role, { projectId: project.id, name: project.name });
    socket.broadcast.emit('project:created', { project, senderId, senderName });
  });

  // ── PROJECT: update ───────────────────────────────────────────────────────────
  socket.on('project:update', (payload: unknown) => {
    if (rateGuard()) return;
    if (!canWrite(role)) {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Insufficient permissions.' });
      audit('project:update_forbidden', senderId, role);
      return;
    }
    const parsed = projectUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid project update.' });
      return;
    }
    const { projectId, updates } = parsed.data;
    const existing = projects.get(projectId);
    if (existing) projects.set(projectId, { ...existing, ...updates });
    audit('project:update', senderId, role, { projectId });
    socket.broadcast.emit('project:updated', { projectId, updates, senderId, senderName });
  });

  // ── PROJECT: delete ───────────────────────────────────────────────────────────
  socket.on('project:delete', (payload: unknown) => {
    if (rateGuard()) return;
    if (!canDelete(role)) {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Only admins can delete projects.' });
      audit('project:delete_forbidden', senderId, role);
      return;
    }
    const parsed = projectDeleteSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid project delete.' });
      return;
    }
    const { projectId } = parsed.data;
    projects.delete(projectId);
    audit('project:delete', senderId, role, { projectId });
    socket.broadcast.emit('project:deleted', { projectId, senderId, senderName });
  });

  // ── DISCONNECT ────────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    presenceBySocket.delete(socket.id);
    socket.broadcast.emit('presence:offline', { userId: senderId });

    const affectedRooms = removeSocketFromAllRooms(socket.id);
    for (const roomKey of affectedRooms) {
      if (roomKey.startsWith('project-')) {
        const projectId = roomKey.slice('project-'.length);
        socket.to(roomKey).emit('viewer:left-project', { projectId, userId: senderId });
      } else if (roomKey.startsWith('task-')) {
        const taskId = roomKey.slice('task-'.length);
        socket.to(roomKey).emit('viewer:left-task', { taskId, userId: senderId });
      }
    }
  });
}
