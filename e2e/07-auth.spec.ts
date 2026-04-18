import { test, expect } from '@playwright/test';

// Auth tests run without pre-loaded auth state — they test the login flow itself
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('unauthenticated user visiting a deep route is redirected to /login', async ({ page }) => {
    await page.goto('/my-tasks');
    await expect(page).toHaveURL('/login');
  });

  test('login page renders all required elements', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText('Sign in');
    // Demo accounts section
    await expect(page.getByText('Demo accounts')).toBeVisible();
  });

  test('admin can log in and reach dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'alex@taskflow.io');
    await page.fill('input[type="password"]', 'Admin1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await expect(page.locator('h1').getByText('Dashboard')).toBeVisible();
  });

  test('member can log in', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'sarah@taskflow.io');
    await page.fill('input[type="password"]', 'Member1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });

  test('viewer can log in', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'marcus@taskflow.io');
    await page.fill('input[type="password"]', 'Viewer1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });

  test('wrong password shows "Invalid email or password" error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'alex@taskflow.io');
    await page.fill('input[type="password"]', 'WrongPassword!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
  });

  test('unknown email shows "Invalid email or password" error (no enumeration)', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'nobody@example.com');
    await page.fill('input[type="password"]', 'SomePass123!');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
  });

  test('rate limit kicks in after 5 failed attempts', async ({ page }) => {
    // Mark as slow — 5 round-trips with error/re-enable wait each
    test.slow();
    await page.goto('/login');
    // Trigger 5 consecutive failures against the same email
    for (let i = 0; i < 5; i++) {
      await page.locator('input[type="email"]').fill('alex@taskflow.io');
      await page.locator('input[type="password"]').fill('WrongPass!');
      await page.locator('button[type="submit"]').click();
      // Wait for error and ensure submit button is re-enabled before next iteration
      await expect(page.getByText('Invalid email or password.')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 10000 });
    }
    // 6th attempt should be blocked by client-side rate limiter before the request fires
    await page.locator('input[type="email"]').fill('alex@taskflow.io');
    await page.locator('input[type="password"]').fill('Admin1234!');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/Too many attempts/i)).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL('/login');
  });

  test('logout clears session and redirects to /login', async ({ page }) => {
    // Log in first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'alex@taskflow.io');
    await page.fill('input[type="password"]', 'Admin1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    // Click logout button in header — two buttons with this title exist (sidebar + header); use first
    await page.locator('button[title="Sign out"]').first().click();
    await expect(page).toHaveURL('/login');
  });

  test('demo account button pre-fills admin credentials', async ({ page }) => {
    await page.goto('/login');
    // Click the Admin demo account button
    await page.getByText('Admin — alex@taskflow.io').click();
    await expect(page.locator('input[type="email"]')).toHaveValue('alex@taskflow.io');
    await expect(page.locator('input[type="password"]')).toHaveValue('Admin1234!');
  });

  test('demo account button pre-fills member credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Member — sarah@taskflow.io').click();
    await expect(page.locator('input[type="email"]')).toHaveValue('sarah@taskflow.io');
  });

  test('demo account button pre-fills viewer credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Viewer — marcus@taskflow.io').click();
    await expect(page.locator('input[type="email"]')).toHaveValue('marcus@taskflow.io');
  });

  test('after logout, navigating to protected route redirects to /login', async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.fill('input[type="email"]', 'alex@taskflow.io');
    await page.fill('input[type="password"]', 'Admin1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    // Log out — two buttons with this title exist (sidebar + header); use first
    await page.locator('button[title="Sign out"]').first().click();
    await page.waitForURL('/login');
    // Try accessing a protected route — React Router's auth guard redirects
    // asynchronously after mount; use waitForURL for an explicit reliable wait.
    await page.goto('/my-tasks');
    await page.waitForURL('/login', { timeout: 10000 });
  });
});
