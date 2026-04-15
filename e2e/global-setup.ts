import { chromium } from '@playwright/test';

/**
 * Global E2E setup.
 *
 * LOCAL mode  — Calls the Socket.io /api/auth/login REST endpoint and injects
 *               the HMAC token into localStorage.  Produces:
 *               e2e/auth-state.json        (admin)
 *               e2e/member-auth-state.json (member)
 *
 * CONVEX mode — Fills the login form in the browser (port 5176) using the demo
 *               accounts that were seeded with `npx convex run seedAuth:run`.
 *               Produces:
 *               e2e/convex-auth-state.json (admin)
 */

interface LoginResponse {
  token: string;
  user: { id: string; name: string; email: string; colour: string; role: string };
}

async function loginUser(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch('http://localhost:3002/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '(no body)');
    throw new Error(`[global-setup] Login failed for ${email}: HTTP ${res.status} — ${body}`);
  }
  return res.json() as Promise<LoginResponse>;
}

async function saveLocalAuthState(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  loginData: LoginResponse,
  outputPath: string,
): Promise<void> {
  const persistedAuth = JSON.stringify({
    state: { currentUser: loginData.user, token: loginData.token, isAuthenticated: true },
    version: 0,
  });

  const context = await browser.newContext();
  const page    = await context.newPage();
  await page.goto('http://localhost:5175/login');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate((auth: string) => {
    localStorage.setItem('taskflow-auth', auth);
  }, persistedAuth);
  await context.storageState({ path: outputPath });
  await context.close();
}

async function saveConvexAuthState(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  email: string,
  password: string,
  outputPath: string,
): Promise<void> {
  const context = await browser.newContext();
  const page    = await context.newPage();

  await page.goto('http://localhost:5176/login');
  await page.waitForLoadState('networkidle');

  // Fill the login form
  await page.fill('input[type="email"]',    email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard (away from /login)
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 20000 });

  await context.storageState({ path: outputPath });
  await context.close();
}

export default async function globalSetup() {
  const browser = await chromium.launch();

  // ── Local mode (original specs) ──────────────────────────────────────────────
  let localSetupDone = false;
  try {
    const [adminData, memberData] = await Promise.all([
      loginUser('alex@taskflow.io',  'Admin1234!'),
      loginUser('sarah@taskflow.io', 'Member1234!'),
    ]);
    await Promise.all([
      saveLocalAuthState(browser, adminData,  'e2e/auth-state.json'),
      saveLocalAuthState(browser, memberData, 'e2e/member-auth-state.json'),
    ]);
    localSetupDone = true;
  } catch (err) {
    console.warn('[global-setup] Local mode auth skipped (server not running):', (err as Error).message);
  }

  // ── Convex mode (new specs 10–14) ─────────────────────────────────────────────
  try {
    await saveConvexAuthState(browser, 'alex@taskflow.io', 'Admin1234!', 'e2e/convex-auth-state.json');
  } catch (err) {
    console.warn('[global-setup] Convex mode auth skipped (server not running):', (err as Error).message);
  }

  await browser.close();

  if (!localSetupDone) {
    // Ensure placeholder files exist so local-mode tests can start
    const { writeFileSync, existsSync } = await import('fs');
    for (const f of ['e2e/auth-state.json', 'e2e/member-auth-state.json']) {
      if (!existsSync(f)) writeFileSync(f, JSON.stringify({ cookies: [], origins: [] }));
    }
  }
}
