/**
 * prod-smoke.spec.ts
 *
 * One-off smoke test that runs directly against the live Vercel deployment.
 * Tests all 3 demo users: login → dashboard → key pages → logout.
 *
 * Run with:
 *   npx playwright test e2e/prod-smoke.spec.ts --project=chromium --headed
 */

import { test, expect } from '@playwright/test';

const BASE = 'https://taskflow-app-weld.vercel.app';

// Clear any stored auth before every test
test.use({ storageState: { cookies: [], origins: [] } });

async function login(page: any, email: string, password: string) {
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 20000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`, { timeout: 20000 });
}

// ── 1. Admin (Alex Johnson) ────────────────────────────────────────────────────
test.describe('👑 Admin — alex@taskflow.io', () => {
  test('login lands on Dashboard', async ({ page }) => {
    await login(page, 'alex@taskflow.io', 'Admin1234!');
    await expect(page.locator('h1').getByText('Dashboard')).toBeVisible({ timeout: 15000 });
  });

  test('sidebar nav links work', async ({ page }) => {
    await login(page, 'alex@taskflow.io', 'Admin1234!');
    await page.waitForSelector('aside', { state: 'visible', timeout: 15000 });
    await page.locator('aside').getByText('My Tasks').click();
    await expect(page).toHaveURL(`${BASE}/my-tasks`);
    await page.locator('aside').getByText('Projects').first().click();
    await expect(page).toHaveURL(`${BASE}/projects`);
    await page.locator('aside').getByText('Analytics').click();
    await expect(page).toHaveURL(`${BASE}/analytics`);
    await page.locator('aside').getByText('Settings').click();
    await expect(page).toHaveURL(`${BASE}/settings`);
  });

  test('Settings shows Team Members section with all 3 users', async ({ page }) => {
    await login(page, 'alex@taskflow.io', 'Admin1234!');
    await page.goto(`${BASE}/settings`);
    await page.waitForSelector('h1', { state: 'visible', timeout: 20000 });
    const main = page.locator('main');
    await expect(main.getByText('Alex Johnson').first()).toBeVisible();
    await expect(main.getByText('Sarah Chen')).toBeVisible();
    await expect(main.getByText('Marcus Williams')).toBeVisible();
  });

  test('Add Member button is visible for admin', async ({ page }) => {
    await login(page, 'alex@taskflow.io', 'Admin1234!');
    await page.goto(`${BASE}/settings`);
    await page.waitForSelector('h1', { state: 'visible', timeout: 20000 });
    await expect(page.getByRole('button', { name: /Add Member/i })).toBeVisible();
  });

  test('can create a new task', async ({ page }) => {
    await login(page, 'alex@taskflow.io', 'Admin1234!');
    const taskTitle = `ProdSmoke-${Date.now()}`;
    await page.locator('header button', { hasText: 'New Task' }).click();
    await page.locator('input#task-title').fill(taskTitle);
    await page.getByRole('button', { name: 'Create Task' }).click();
    await expect(page.getByText(taskTitle).first()).toBeVisible({ timeout: 10000 });
  });

  test('logout redirects to /login', async ({ page }) => {
    await login(page, 'alex@taskflow.io', 'Admin1234!');
    await page.locator('button[title="Sign out"]').first().click();
    await expect(page).toHaveURL(`${BASE}/login`);
  });
});

// ── 2. Member (Sarah Chen) ─────────────────────────────────────────────────────
test.describe('👤 Member — sarah@taskflow.io', () => {
  test('login lands on Dashboard', async ({ page }) => {
    await login(page, 'sarah@taskflow.io', 'Member1234!');
    await expect(page.locator('h1').getByText('Dashboard')).toBeVisible({ timeout: 15000 });
  });

  test('My Tasks page loads', async ({ page }) => {
    await login(page, 'sarah@taskflow.io', 'Member1234!');
    await page.goto(`${BASE}/my-tasks`);
    await page.waitForSelector('main', { state: 'visible', timeout: 15000 });
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByText('Something went wrong')).not.toBeVisible();
  });

  test('Projects page loads', async ({ page }) => {
    await login(page, 'sarah@taskflow.io', 'Member1234!');
    await page.goto(`${BASE}/projects`);
    await page.waitForSelector('main', { state: 'visible', timeout: 15000 });
    await expect(page.locator('main')).toBeVisible();
  });

  test('Add Member button is NOT visible for member', async ({ page }) => {
    await login(page, 'sarah@taskflow.io', 'Member1234!');
    await page.goto(`${BASE}/settings`);
    await page.waitForSelector('h1', { state: 'visible', timeout: 20000 });
    await expect(page.getByRole('button', { name: /Add Member/i })).not.toBeVisible();
  });

  test('logout redirects to /login', async ({ page }) => {
    await login(page, 'sarah@taskflow.io', 'Member1234!');
    await page.locator('button[title="Sign out"]').first().click();
    await expect(page).toHaveURL(`${BASE}/login`);
  });
});

// ── 3. Viewer (Marcus Williams) ────────────────────────────────────────────────
test.describe('👁️ Viewer — marcus@taskflow.io', () => {
  test('login lands on Dashboard', async ({ page }) => {
    await login(page, 'marcus@taskflow.io', 'Viewer1234!');
    await expect(page.locator('h1').getByText('Dashboard')).toBeVisible({ timeout: 15000 });
  });

  test('Dashboard metric cards are visible', async ({ page }) => {
    await login(page, 'marcus@taskflow.io', 'Viewer1234!');
    await page.waitForSelector('main', { state: 'visible', timeout: 15000 });
    const main = page.locator('main');
    await expect(main.getByText('Total Tasks').first()).toBeVisible();
  });

  test('Analytics page loads', async ({ page }) => {
    await login(page, 'marcus@taskflow.io', 'Viewer1234!');
    await page.goto(`${BASE}/analytics`);
    await page.waitForSelector('main', { state: 'visible', timeout: 15000 });
    await expect(page.locator('h1').getByText('Analytics')).toBeVisible();
  });

  test('Add Member button is NOT visible for viewer', async ({ page }) => {
    await login(page, 'marcus@taskflow.io', 'Viewer1234!');
    await page.goto(`${BASE}/settings`);
    await page.waitForSelector('h1', { state: 'visible', timeout: 20000 });
    await expect(page.getByRole('button', { name: /Add Member/i })).not.toBeVisible();
  });

  test('logout redirects to /login', async ({ page }) => {
    await login(page, 'marcus@taskflow.io', 'Viewer1234!');
    await page.locator('button[title="Sign out"]').first().click();
    await expect(page).toHaveURL(`${BASE}/login`);
  });
});

// ── 4. Security checks ─────────────────────────────────────────────────────────
test.describe('🔒 Security — wrong credentials', () => {
  test('wrong password shows error', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 20000 });
    await page.fill('input[type="email"]', 'alex@taskflow.io');
    await page.fill('input[type="password"]', 'WrongPass!');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Invalid email or password.')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(`${BASE}/login`);
  });

  test('unauthenticated access to /my-tasks redirects to /login', async ({ page }) => {
    await page.goto(`${BASE}/my-tasks`);
    await page.waitForURL(`${BASE}/login`, { timeout: 15000 });
  });
});
