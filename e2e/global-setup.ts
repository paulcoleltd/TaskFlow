import { chromium } from '@playwright/test';

/**
 * Global E2E setup.
 *
 * LOCAL mode  — Logs in through the browser form so the httpOnly session cookie
 *               is captured in the browser context (direct REST calls don't work
 *               because Set-Cookie: httpOnly is not forwarded to Node.js fetch).
 *               Produces:
 *               e2e/auth-state.json        (admin)
 *               e2e/member-auth-state.json (member)
 *
 * CONVEX mode — Same browser-form approach on port 5176.
 *               Produces:
 *               e2e/convex-auth-state.json (admin)
 */

async function loginViaBrowser(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  baseURL: string,
  email: string,
  password: string,
  outputPath: string,
): Promise<void> {
  const context = await browser.newContext();
  const page    = await context.newPage();

  await page.goto(`${baseURL}/login`);
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"]',    email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect away from /login (dashboard loads)
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 20000 });

  await context.storageState({ path: outputPath });
  await context.close();
}

export default async function globalSetup() {
  const browser = await chromium.launch();

  // ── Local mode (original specs, port 5175) ────────────────────────────────
  try {
    await Promise.all([
      loginViaBrowser(browser, 'http://localhost:5175', 'alex@taskflow.io',  'Admin1234!',  'e2e/auth-state.json'),
      loginViaBrowser(browser, 'http://localhost:5175', 'sarah@taskflow.io', 'Member1234!', 'e2e/member-auth-state.json'),
    ]);
  } catch (err) {
    console.warn('[global-setup] Local mode auth skipped (server not running):', (err as Error).message);
    // Write placeholder files so tests can start (they will redirect to /login)
    const { writeFileSync, existsSync } = await import('fs');
    for (const f of ['e2e/auth-state.json', 'e2e/member-auth-state.json']) {
      if (!existsSync(f)) writeFileSync(f, JSON.stringify({ cookies: [], origins: [] }));
    }
  }

  // ── Convex mode (specs 10–14, port 5176) ──────────────────────────────────
  try {
    await loginViaBrowser(browser, 'http://localhost:5176', 'alex@taskflow.io', 'Admin1234!', 'e2e/convex-auth-state.json');
  } catch (err) {
    console.warn('[global-setup] Convex mode auth skipped (server not running):', (err as Error).message);
  }

  await browser.close();
}
