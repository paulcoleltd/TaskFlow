import { test, expect } from '@playwright/test';

test.describe('Navigation & Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main', { state: 'visible' });
  });

  test('app loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle('TaskFlow — Task Management');
  });

  test('sidebar is visible on desktop', async ({ page }) => {
    await expect(page.locator('aside')).toBeVisible();
  });

  test('sidebar shows TaskFlow logo', async ({ page }) => {
    await expect(page.locator('aside').getByText('TaskFlow')).toBeVisible();
  });

  test('navigate to My Tasks page', async ({ page }) => {
    await page.locator('aside').getByText('My Tasks').click();
    await expect(page).toHaveURL('/my-tasks');
    await page.waitForSelector('h1', { state: 'visible' });
    await expect(page.locator('h1').getByText('My Tasks')).toBeVisible({ timeout: 15000 });
  });

  test('navigate to All Projects page', async ({ page }) => {
    await page.locator('aside').getByText('All Projects').click();
    await expect(page).toHaveURL('/projects');
    await page.waitForSelector('h1', { state: 'visible' });
    await expect(page.locator('h1').getByText('All Projects')).toBeVisible({ timeout: 15000 });
  });

  test('navigate to Calendar page', async ({ page }) => {
    await page.locator('aside').getByText('Calendar').click();
    await expect(page).toHaveURL('/calendar');
    await expect(page.locator('h1').getByText('Calendar')).toBeVisible();
  });

  test('navigate to Analytics page', async ({ page }) => {
    await page.locator('aside').getByText('Analytics').click();
    await expect(page).toHaveURL('/analytics');
    await page.waitForSelector('h1', { state: 'visible' });
    await expect(page.locator('h1').getByText('Analytics')).toBeVisible({ timeout: 15000 });
  });

  test('navigate to Settings page', async ({ page }) => {
    await page.locator('aside').getByText('Settings').click();
    await expect(page).toHaveURL('/settings');
    await expect(page.locator('h1').getByText('Settings')).toBeVisible();
  });

  test('sidebar collapses and expands', async ({ page }) => {
    const aside = page.locator('aside');
    await expect(aside).toHaveClass(/w-60/);
    // Click collapse button
    await aside.locator('button').last().click();
    await expect(aside).toHaveClass(/w-16/);
    // Click expand button
    await aside.locator('button').last().click();
    await expect(aside).toHaveClass(/w-60/);
  });

  test('header shows New Task button', async ({ page }) => {
    await expect(page.locator('header').getByText('New Task')).toBeVisible();
  });

  test('header shows search input', async ({ page }) => {
    await expect(page.locator('header input[placeholder*="Search"]')).toBeVisible();
  });

  test('Dashboard is the default route', async ({ page }) => {
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1').getByText('Dashboard')).toBeVisible();
  });
});
