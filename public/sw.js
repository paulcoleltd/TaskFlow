/**
 * TaskFlow Service Worker — Push Notifications
 *
 * Handles Web Push events and notification clicks.
 * Registered by src/lib/pushSubscription.ts at app startup.
 *
 * Security notes (MITRE T1204 / OWASP A05):
 * - Push payload is parsed with a try/catch — malformed payloads are silently dropped.
 * - Notification body is plain text — no HTML rendered, no injection path.
 * - notificationclick navigates to a relative URL only — no open-redirect risk.
 */

const APP_ORIGIN = self.location.origin;

// ── Push event ────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Malformed JSON — drop silently
    return;
  }

  const title = String(data.title ?? 'TaskFlow').slice(0, 100);
  const body  = String(data.body  ?? '').slice(0, 200);
  const icon  = data.icon  ?? '/favicon.svg';
  const badge = data.badge ?? '/favicon.svg';
  const tag   = String(data.tag   ?? 'taskflow').slice(0, 64);
  const url   = String(data.url   ?? '/').replace(/[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]/g, '');

  const options = {
    body,
    icon,
    badge,
    tag,
    data: { url },
    // Vibrate: short-long-short pattern
    vibrate: [100, 50, 100],
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  // Navigate to the URL embedded in notification data — always relative to APP_ORIGIN
  const rawUrl = event.notification.data?.url ?? '/';
  // Only allow same-origin relative paths (no protocol, no external host)
  const safePath = rawUrl.startsWith('/') ? rawUrl : '/';
  const targetUrl = APP_ORIGIN + safePath;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus an existing tab if one is open on this origin
      for (const client of windowClients) {
        if (client.url.startsWith(APP_ORIGIN) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl);
          return;
        }
      }
      // No existing tab — open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Activate: take control immediately ───────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
