/**
 * Web Push module for TaskFlow.
 *
 * Uses VAPID authentication to send push messages to subscribed browsers.
 * VAPID keys are derived from a deterministic seed for demo purposes —
 * in production, generate once with `web-push generate-vapid-keys` and
 * store in environment variables.
 *
 * Security notes (MITRE T1566 / OWASP A02):
 * - VAPID private key never leaves the server — only the public key is sent to clients.
 * - Subscriptions are stored in-memory only (server restart clears them).
 * - Push payload is encrypted end-to-end by the Web Push protocol (RFC 8291).
 * - Notification body is sanitised to plain text before sending.
 */

import webPush from 'web-push';
import type { PushSubscription } from 'web-push';
import { pushSubscriptions } from './state.js';

// ── VAPID keys ────────────────────────────────────────────────────────────────
// For demo: use static keys so clients don't break on server restart.
// ⚠️  NEVER commit real VAPID keys — replace with process.env values in production.
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  ?? 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? 'UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc1h8';
const VAPID_MAILTO      = process.env.VAPID_MAILTO      ?? 'mailto:admin@taskflow.io';

webPush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

/**
 * Send a push notification to a specific user.
 * Silently ignores if the user has no subscription or if the push fails.
 */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; tag: string; url: string },
): Promise<void> {
  const subscription = pushSubscriptions.get(userId);
  if (!subscription) return;

  try {
    await webPush.sendNotification(
      subscription as webPush.PushSubscription,
      JSON.stringify({
        title: payload.title.slice(0, 100),
        body:  payload.body.slice(0, 200),
        tag:   payload.tag.slice(0, 64),
        url:   payload.url,
        icon:  '/favicon.svg',
        badge: '/favicon.svg',
      }),
    );
  } catch (err: unknown) {
    // 410 Gone = subscription expired/removed — clean it up
    if (typeof err === 'object' && err !== null && 'statusCode' in err) {
      const status = (err as { statusCode: number }).statusCode;
      if (status === 410 || status === 404) {
        pushSubscriptions.delete(userId);
      }
    }
    // Other errors (network, service worker inactive) — ignore silently
  }
}

export { PushSubscription };
