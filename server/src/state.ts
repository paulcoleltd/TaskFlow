import type { Task, Project, PresenceEntry } from './types.js';
import type { PushSubscription } from 'web-push';

// In-memory shared state — no database
// Server restart clears all state; clients re-sync via sync:request on reconnect

/** Live task registry: taskId → Task */
export const tasks = new Map<string, Task>();

/** Live project registry: projectId → Project */
export const projects = new Map<string, Project>();

/** Presence registry: socketId → PresenceEntry */
export const presenceBySocket = new Map<string, PresenceEntry>();

/** Room viewers: roomKey ("project-{id}" | "task-{id}") → Set of socketIds */
export const roomViewers = new Map<string, Set<string>>();

/** Rate limiter: socketId → { count, resetAt } */
export const rateLimits = new Map<string, { count: number; resetAt: number }>();

/**
 * Push subscriptions: userId → PushSubscription
 * Keyed by userId so we can look up a user's subscription to send targeted pushes.
 * Max 1 subscription per user (last-write-wins).
 */
export const pushSubscriptions = new Map<string, PushSubscription>();

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getAllPresence(): PresenceEntry[] {
  return Array.from(presenceBySocket.values());
}

export function isRateLimited(socketId: string, limit = 30, windowMs = 10_000): boolean {
  const now = Date.now();
  let r = rateLimits.get(socketId) ?? { count: 0, resetAt: now + windowMs };
  if (now > r.resetAt) {
    r = { count: 0, resetAt: now + windowMs };
  }
  r.count += 1;
  rateLimits.set(socketId, r);
  return r.count > limit;
}

export function getViewersForRoom(roomKey: string): string[] {
  return Array.from(roomViewers.get(roomKey) ?? []);
}

export function addViewer(roomKey: string, socketId: string): void {
  if (!roomViewers.has(roomKey)) roomViewers.set(roomKey, new Set());
  roomViewers.get(roomKey)!.add(socketId);
}

export function removeViewer(roomKey: string, socketId: string): void {
  roomViewers.get(roomKey)?.delete(socketId);
}

/** Remove a socket from all rooms it was viewing */
export function removeSocketFromAllRooms(socketId: string): string[] {
  const affected: string[] = [];
  for (const [roomKey, viewers] of roomViewers.entries()) {
    if (viewers.has(socketId)) {
      viewers.delete(socketId);
      affected.push(roomKey);
    }
  }
  return affected;
}
