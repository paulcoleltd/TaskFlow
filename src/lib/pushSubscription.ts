/**
 * Web Push subscription helpers.
 *
 * Handles the full subscribe/unsubscribe lifecycle:
 *  1. Register the service worker (if not already registered)
 *  2. Fetch the VAPID public key from the server
 *  3. Subscribe the browser via PushManager
 *  4. POST the subscription to the server (server derives userId from the auth token)
 *
 * Security notes (MITRE T1557 / OWASP A01):
 * - The VAPID public key is fetched fresh each time to handle server key rotation.
 * - Subscription endpoint is always POST'd to /api/push/subscribe (same-origin proxy).
 * - userId is NOT sent in the request body; the server derives identity from the
 *   Authorization header (Bearer token from authStore) to prevent subscription
 *   hijacking by any caller who knows another user's ID.
 * - In local dev mode (no Convex URL), the userId is still sent in the body because
 *   there is no real auth token — acceptable for demo/dev environments only.
 */

const SW_PATH       = '/sw.js';
const PUSH_API_BASE = '/api/push';
const CONVEX_MODE   = !!import.meta.env.VITE_CONVEX_URL;

/** Read the current auth token from Zustand persist (avoids a circular import). */
function getAuthToken(): string | null {
  try {
    const raw = localStorage.getItem('taskflow-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string } };
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

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
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });
    }

    // Send subscription to the server.
    // In Convex mode the server derives userId from the Authorization token so we
    // do NOT include userId in the body (prevents subscription hijacking, OWASP A01).
    // In local dev mode there is no real token so we fall back to the userId param.
    const token = CONVEX_MODE ? getAuthToken() : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token && token !== 'local') headers['Authorization'] = `Bearer ${token}`;

    const body = CONVEX_MODE
      ? JSON.stringify({ subscription: sub.toJSON() })               // server reads userId from token
      : JSON.stringify({ userId, subscription: sub.toJSON() });      // local dev fallback only

    const res = await fetch(`${PUSH_API_BASE}/subscribe`, {
      method: 'POST',
      headers,
      body,
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
    const token = CONVEX_MODE ? getAuthToken() : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token && token !== 'local') headers['Authorization'] = `Bearer ${token}`;
    await fetch(`${PUSH_API_BASE}/subscribe`, {
      method: 'DELETE',
      headers,
      body: CONVEX_MODE
        ? JSON.stringify({})                    // server reads userId from token
        : JSON.stringify({ userId }),           // local dev fallback only
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
