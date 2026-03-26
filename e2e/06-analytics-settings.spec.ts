import { test, expect } from '@playwright/test';

test.describe('Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('Analytics page loads', async ({ page }) => {
    await expect(page.locator('h1').getByText('Analytics')).toBeVisible();
  });

  test('shows Total Tasks metric card', async ({ page }) => {
    await expect(page.locator('main').getByText('Total Tasks')).toBeVisible();
  });

  test('shows Overdue metric card', async ({ page }) => {
    await expect(page.locator('main').getByText('Overdue')).toBeVisible();
  });

  test('shows Completion Rate metric card', async ({ page }) => {
    await expect(page.locator('main').getByText('Completion Rate')).toBeVisible();
  });

  test('shows Completed metric card', async ({ page }) => {
    // Narrow to the analytics stat cards (first grid section)
    const statGrid = page.locator('main .grid').first();
    await expect(statGrid.getByText('Completed')).toBeVisible();
  });

  test('Completed Per Week chart renders', async ({ page }) => {
    await expect(page.getByText('Completed Per Week')).toBeVisible();
    await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
  });

  test('Status Distribution chart renders', async ({ page }) => {
    await expect(page.getByText('Status Distribution')).toBeVisible();
  });

  test('Priority Breakdown chart renders', async ({ page }) => {
    await expect(page.getByText('Priority Breakdown')).toBeVisible();
  });

  test('Completion Trend chart renders', async ({ page }) => {
    await expect(page.getByText('Completion Trend')).toBeVisible();
  });

  test('completion rate shows percentage', async ({ page }) => {
    await expect(page.locator('main').getByText(/%/)).toBeVisible();
  });
});

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('Settings page loads', async ({ page }) => {
    await expect(page.locator('h1').getByText('Settings')).toBeVisible();
  });

  test('Profile section heading is visible', async ({ page }) => {
    await expect(page.locator('h3', { hasText: 'Profile' })).toBeVisible();
  });

  test('current user name shown', async ({ page }) => {
    await expect(page.locator('p', { hasText: 'Alex Johnson' }).first()).toBeVisible();
  });

  test('Appearance section is visible', async ({ page }) => {
    await expect(page.locator('h3', { hasText: 'Appearance' })).toBeVisible();
    await expect(page.getByText('Dark').first()).toBeVisible();
  });

  test('Data Management section is visible', async ({ page }) => {
    await expect(page.locator('h3', { hasText: 'Data Management' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible();
  });

  test('Team Members section heading is visible', async ({ page }) => {
    await expect(page.locator('h3', { hasText: 'Team Members' })).toBeVisible();
  });

  test('all 3 team members listed', async ({ page }) => {
    await expect(page.locator('p', { hasText: 'Alex Johnson' }).first()).toBeVisible();
    await expect(page.locator('p', { hasText: 'Sarah Chen' })).toBeVisible();
    await expect(page.locator('p', { hasText: 'Marcus Williams' })).toBeVisible();
  });

  test('"You" badge shown for current user', async ({ page }) => {
    await expect(page.getByText('You')).toBeVisible();
  });

  test('Export button triggers toast', async ({ page }) => {
    await page.getByRole('button', { name: 'Export' }).click();
    await expect(page.getByText('Data exported!')).toBeVisible();
  });
});
