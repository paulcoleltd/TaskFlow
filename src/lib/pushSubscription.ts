/**
 * Web Push subscription helpers.
 *
 * Handles the full subscribe/unsubscribe lifecycle:
 *  1. Register the service worker (if not already registered)
 *  2. Fetch the VAPID public key from the server
 *  3. Subscribe the browser via PushManager
 *  4. POST the subscription to the server keyed by userId
 *
 * Security notes (MITRE T1204 / OWASP A05):
 * - The VAPID public key is fetched fresh each time to handle server key rotation.
 * - Subscription endpoint is always POST'd to /api/push/subscribe (same-origin proxy).
 * - userId is validated by the server before storing; the server never trusts the client claim alone.
 */

const SW_PATH      = '/sw.js';
const PUSH_API_BASE = '/api/push';

/** Convert a URL-safe base64 string to a Uint8Array (required by PushManager). */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

/** True only if this browser fully supports Web Push. */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Register the service worker and return its registration. */
async function getSWRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_PATH, { scope: '/' });
}

/** Fetch the VAPID public key from the Socket.io server via the Vite proxy. */
async function fetchVapidPublicKey(): Promise<string> {
  const res = await fetch(`${PUSH_API_BASE}/vapid-key`);
  if (!res.ok) throw new Error(`VAPID key fetch failed: ${res.status}`);
  const data = await res.json() as { publicKey?: string };
  if (!data.publicKey) throw new Error('No publicKey in response');
  return data.publicKey;
}

/**
 * Subscribe the current browser to Web Push notifications.
 * Requires Notification.permission === 'granted' before calling.
 * Returns true on success, false if any step fails.
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const [reg, vapidKey] = await Promise.all([getSWRegistration(), fetchVapidPublicKey()]);

    // Subscribe or re-use existing subscription
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    // Send subscription to the server
    const res = await fetch(`${PUSH_API_BASE}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subscription: sub.toJSON() }),
    });

    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Unsubscribe the browser from Web Push notifications.
 * Also notifies the server to remove the stored subscription.
 */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
    }
    await fetch(`${PUSH_API_BASE}/subscribe`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  } catch {
    // Best-effort cleanup — ignore errors
  }
}

/**
 * Check if the browser is currently subscribed to push notifications.
 */
export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return sub !== null;
  } catch {
    return false;
  }
}
