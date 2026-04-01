import { chromium } from '@playwright/test';

/**
 * Global E2E setup — obtains an admin session token by calling the auth API
 * directly from Node.js (no browser round-trip needed), then injects it into
 * a fresh browser localStorage so all test files start already authenticated.
 *
 * This approach is more reliable than driving the login form because it:
 *  - avoids UI timing issues
 *  - survives login-page refactors without breaking setup
 *  - cleanly separates "auth plumbing" from "UI test logic"
 */
export default async function globalSetup() {
  // ── 1. Obtain a session token from the auth server ──────────────────────────
  const res = await fetch('http://localhost:3002/api/auth/login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email: 'alex@taskflow.io', password: 'Admin1234!' }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '(no body)');
    throw new Error(`[global-setup] Login failed: HTTP ${res.status} — ${body}`);
  }

  const { token, user } = (await res.json()) as {
    token: string;
    user: { id: string; name: string; email: string; colour: string; role: string };
  };

  // ── 2. Build the Zustand persist payload (matches { name: 'taskflow-auth' }) ─
  const persistedAuth = JSON.stringify({
    state:   { currentUser: user, token, isAuthenticated: true },
    version: 0,
  });

  // ── 3. Inject the auth state into browser localStorage, then save it ─────────
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page    = await context.newPage();

  // Navigate to the origin so localStorage writes to the correct scope.
  // /login is fine — localStorage is shared across all paths on the same origin.
  await page.goto('http://localhost:5175/login');
  await page.waitForLoadState('domcontentloaded');

  await page.evaluate((auth: string) => {
    localStorage.setItem('taskflow-auth', auth);
  }, persistedAuth);

  await context.storageState({ path: 'e2e/auth-state.json' });
  await browser.close();
}
