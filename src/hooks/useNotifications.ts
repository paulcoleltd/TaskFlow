import { useEffect, useRef, useState, useCallback } from 'react';
import { useTaskStore } from '../store/taskStore';
import { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush } from '../lib/pushSubscription';

/** How far ahead to notify before a task is due (15 minutes). */
const NOTIFY_WINDOW_MS = 15 * 60 * 1000;

/** How often to check for upcoming due tasks (every 60 seconds). */
const CHECK_INTERVAL_MS = 60 * 1000;

/**
 * Fires native browser Notifications for tasks due within the next 15 minutes.
 * Only active when `enabled` is true AND Notification.permission === 'granted'.
 *
 * Security notes (MITRE T1204 / OWASP A05):
 * - Notification body is plain text derived from task.title — no HTML injection path.
 * - `tag` deduplicates per-task so the same task never fires twice in one session.
 * - notifiedRef is in-memory only — cleared on page reload to catch newly-due tasks.
 */
export function useNotifications(enabled: boolean) {
  /** Track IDs already notified this session to avoid duplicate alerts. */
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const check = () => {
      const { tasks } = useTaskStore.getState();
      const now = Date.now();

      tasks.forEach(task => {
        if (!task.dueDate || task.status === 'done') {
          // Clear stale entries so rescheduled tasks get re-notified
          notifiedRef.current.delete(task.id);
          return;
        }

        const due = new Date(task.dueDate).getTime();
        const diff = due - now;

        if (diff > 0 && diff <= NOTIFY_WINDOW_MS && !notifiedRef.current.has(task.id)) {
          notifiedRef.current.add(task.id);
          const mins = Math.round(diff / 60_000);
          try {
            new Notification(mins <= 1 ? 'Task due now!' : `Due in ${mins} min`, {
              body: task.title,
              // `tag` deduplicates: OS will replace an existing notification with
              // the same tag rather than stacking duplicates.
              tag: `taskflow-${task.id}`,
              icon: '/favicon.ico',
            });
          } catch {
            // NotAllowedError if permission was revoked between checks — ignore.
          }
        }
      });
    };

    check(); // run immediately on mount / when enabled flips
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled]);
}

/**
 * Request browser notification permission and return the result.
 * Must be called from a user-gesture handler (button click, etc.).
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

/** Synchronously read the current permission state without prompting. */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// ── Web Push ──────────────────────────────────────────────────────────────────

export interface PushNotificationState {
  supported: boolean;
  subscribed: boolean;
  subscribing: boolean;
  subscribe:   () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
}

/**
 * Manages the Web Push subscription lifecycle.
 * `userId` must be a non-empty string identifying the current user on the server.
 *
 * Security notes (MITRE T1566):
 * - subscribeToPush validates Notification.permission before calling PushManager.
 * - userId is used server-side to key the subscription — it's not treated as a secret.
 */
export function usePushNotifications(userId: string): PushNotificationState {
  const supported = isPushSupported();
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  // Check current subscription state on mount
  useEffect(() => {
    if (!supported || !userId) return;
    isPushSubscribed().then(setSubscribed).catch(() => setSubscribed(false));
  }, [supported, userId]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!supported || !userId) return false;
    // Must have notification permission first
    if (Notification.permission !== 'granted') return false;
    setSubscribing(true);
    try {
      const ok = await subscribeToPush(userId);
      if (ok) setSubscribed(true);
      return ok;
    } finally {
      setSubscribing(false);
    }
  }, [supported, userId]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!supported || !userId) return;
    setSubscribing(true);
    try {
      await unsubscribeFromPush(userId);
      setSubscribed(false);
    } finally {
      setSubscribing(false);
    }
  }, [supported, userId]);

  return { supported, subscribed, subscribing, subscribe, unsubscribe };
}
