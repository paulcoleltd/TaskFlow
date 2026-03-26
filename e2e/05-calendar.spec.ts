import { test, expect } from '@playwright/test';

test.describe('Calendar Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
  });

  test('Calendar page loads', async ({ page }) => {
    await expect(page.locator('h1').getByText('Calendar')).toBeVisible();
  });

  test('shows current month and year', async ({ page }) => {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const year = String(now.getFullYear());
    await expect(page.getByText(new RegExp(`${month}.*${year}`))).toBeVisible();
  });

  test('shows day-of-week headers', async ({ page }) => {
    await expect(page.getByText('Sun')).toBeVisible();
    await expect(page.getByText('Mon')).toBeVisible();
    await expect(page.getByText('Sat')).toBeVisible();
  });

  test('Today button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
  });

  test('prev/next month nav buttons exist', async ({ page }) => {
    // The header row with month label and 3 buttons
    const headerRow = page.locator('div[class*="flex items-center justify-between mb-6"]');
    const buttons = headerRow.locator('button');
    await expect(buttons).toHaveCount(3);
  });

  test('next month navigation works', async ({ page }) => {
    const now = new Date();
    const headerRow = page.locator('div[class*="flex items-center justify-between mb-6"]');
    await headerRow.locator('button').last().click();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthName = nextMonth.toLocaleString('en-US', { month: 'long' });
    await expect(page.getByText(new RegExp(nextMonthName))).toBeVisible();
  });

  test('prev month navigation works', async ({ page }) => {
    const now = new Date();
    const headerRow = page.locator('div[class*="flex items-center justify-between mb-6"]');
    await headerRow.locator('button').first().click();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthName = prevMonth.toLocaleString('en-US', { month: 'long' });
    await expect(page.getByText(new RegExp(prevMonthName))).toBeVisible();
  });

  test('Today button resets to current month', async ({ page }) => {
    const now = new Date();
    const headerRow = page.locator('div[class*="flex items-center justify-between mb-6"]');
    await headerRow.locator('button').last().click();
    await headerRow.locator('button').last().click();
    await page.getByRole('button', { name: 'Today' }).click();
    const month = now.toLocaleString('en-US', { month: 'long' });
    await expect(page.getByText(new RegExp(month))).toBeVisible();
  });

  test('calendar grid has day cells', async ({ page }) => {
    // Each day cell has a number inside
    const cells = page.locator('div[class*="min-h-\\[80px\\]"]');
    const count = await cells.count();
    expect(count).toBeGreaterThanOrEqual(28);
  });
});
